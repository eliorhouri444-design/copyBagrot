import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, TrendingDown, Target, Award, AlertCircle, BookOpen, FileCheck, ArrowLeft, Zap, Brain, Clock, CheckCircle, XCircle, Activity, BarChart3, Calendar, Flame, Star, ChevronLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  
  const [cachedData, setCachedData] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        subject: localStorage.getItem('selected_subject') || 'אנגלית',
        units: localStorage.getItem('selected_units') || '3'
      };
    }
    return { subject: 'אנגלית', units: '3' };
  });

  const displaySubject = user?.selected_subject || cachedData.subject || "מקצוע";
  const displayUnits = parseInt(user?.selected_units || cachedData.units || "0");

  const subjectColors = {
    "אנגלית": "from-blue-500 to-blue-600",
    "מתמטיקה": "from-purple-500 to-purple-600",
    "פיזיקה": "from-green-500 to-green-600"
  };

  const headerColor = subjectColors[displaySubject] || "from-blue-500 to-blue-600";

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsUserLoaded(true);
        
        if (currentUser?.selected_subject) {
          setCachedData({
            subject: currentUser.selected_subject,
            units: currentUser.selected_units || 3
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setIsUserLoaded(true);
      }
    };
    loadUser();
  }, []);

  const { data: practiceAttempts = [] } = useQuery({
    queryKey: ['practice-attempts-stats', displaySubject, displayUnits],
    queryFn: async () => {
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      return attempts.filter((a) => a.subject_id === displaySubject);
    },
    enabled: isUserLoaded && !!displaySubject && displayUnits > 0,
    initialData: []
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts-stats', displaySubject, displayUnits, user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const attempts = await base44.entities.ExamAttempt.list("-created_date", 100);
      return attempts.filter((a) => 
        a.subject === displaySubject && a.unit_level === displayUnits && a.created_by === user.email
      );
    },
    enabled: !!user?.email && isUserLoaded,
    initialData: []
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['topics-stats', displaySubject, displayUnits],
    queryFn: async () => {
      const topics = await base44.entities.TopicNew.list();
      return topics.filter(t => t.subject_id === displaySubject && t.unit_level === displayUnits && t.is_active);
    },
    enabled: isUserLoaded,
    initialData: []
  });

  const statistics = useMemo(() => {
    const totalPractice = practiceAttempts.length;
    const totalExams = examAttempts.length;
    
    const correctPractice = practiceAttempts.filter(a => a.status === "correct").length;
    const partialPractice = practiceAttempts.filter(a => a.status === "partial").length;
    const practiceAccuracy = totalPractice > 0 ? ((correctPractice + partialPractice * 0.7) / totalPractice * 100) : 0;
    
    const passedExams = examAttempts.filter(e => e.passed).length;
    const avgExamScore = examAttempts.length > 0 
      ? examAttempts.reduce((sum, e) => sum + (e.score_percent || 0), 0) / examAttempts.length 
      : 0;
    
    const failedExams = examAttempts.filter(e => !e.passed);
    
    // Topic analysis with all topics
    const topicStats = {};
    
    allTopics.forEach(topic => {
      topicStats[topic.topic_id] = {
        name: topic.name,
        total: 0,
        correct: 0,
        incorrect: 0,
        partial: 0,
        avgScore: 0
      };
    });

    practiceAttempts.forEach(attempt => {
      const topic = attempt.topic_id || 'unknown';
      if (!topicStats[topic]) {
        topicStats[topic] = { name: topic, total: 0, correct: 0, incorrect: 0, partial: 0, avgScore: 0 };
      }
      topicStats[topic].total++;
      topicStats[topic].avgScore += (attempt.percentage || 0);
      
      if (attempt.status === "correct") {
        topicStats[topic].correct++;
      } else if (attempt.status === "partial") {
        topicStats[topic].partial++;
      } else {
        topicStats[topic].incorrect++;
      }
    });

    Object.keys(topicStats).forEach(topicId => {
      const stats = topicStats[topicId];
      if (stats.total > 0) {
        stats.avgScore = stats.avgScore / stats.total;
      }
    });

    const topicArray = Object.entries(topicStats)
      .filter(([_, stats]) => stats.total > 0)
      .map(([topic, stats]) => ({
        topic,
        name: stats.name,
        accuracy: stats.total > 0 ? ((stats.correct + stats.partial * 0.7) / stats.total * 100) : 0,
        total: stats.total,
        correct: stats.correct,
        partial: stats.partial,
        incorrect: stats.incorrect,
        avgScore: stats.avgScore
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const weakTopics = topicArray.filter(t => t.accuracy < 60 && t.total >= 3);
    const strongTopics = topicArray.filter(t => t.accuracy >= 80 && t.total >= 3).reverse();

    // Last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPractice = practiceAttempts.filter(a => 
        a.created_date?.split('T')[0] === dateStr
      );
      
      const dayExams = examAttempts.filter(e => 
        e.created_date?.split('T')[0] === dateStr
      );
      
      last7DaysActivity.push({
        date: dateStr,
        day: date.toLocaleDateString('he-IL', { weekday: 'short' }),
        practice: dayPractice.length,
        exams: dayExams.length,
        total: dayPractice.length + dayExams.length
      });
    }

    // Recent trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPractice = practiceAttempts.filter(a => 
      new Date(a.created_date) >= thirtyDaysAgo
    );
    
    const recentExams = examAttempts.filter(e => 
      new Date(e.created_date) >= thirtyDaysAgo
    );

    const recentCorrect = recentPractice.filter(a => a.status === "correct").length;
    const recentPartial = recentPractice.filter(a => a.status === "partial").length;
    const recentPracticeAccuracy = recentPractice.length > 0
      ? ((recentCorrect + recentPartial * 0.7) / recentPractice.length * 100)
      : 0;

    const trend = recentPracticeAccuracy > practiceAccuracy ? 'up' : recentPracticeAccuracy < practiceAccuracy ? 'down' : 'stable';

    // Calculate study time
    const totalStudyMinutes = (practiceAttempts.length * 3) + (examAttempts.length * 60);
    const totalStudyHours = Math.floor(totalStudyMinutes / 60);

    return {
      totalPractice,
      totalExams,
      practiceAccuracy,
      avgExamScore,
      passedExams,
      failedExams,
      weakTopics,
      strongTopics,
      recentPractice: recentPractice.length,
      recentExams: recentExams.length,
      trend,
      last7DaysActivity,
      topicArray,
      totalStudyHours,
      totalStudyMinutes
    };
  }, [practiceAttempts, examAttempts, allTopics]);

  const getRecommendation = (predictedScore, stats) => {
    if (predictedScore >= 85) {
      return "המשך לתרגל באופן קבוע כדי לשמור על הרמה הגבוהה";
    } else if (predictedScore >= 70) {
      if (stats.weakTopics.length > 0) {
        return `חזק את הנושאים: ${stats.weakTopics.slice(0, 2).map(t => t.name || t.topic).join(', ')}`;
      }
      return "תרגל עוד בחינות מלאות כדי להגיע ל-90+";
    } else if (predictedScore >= 55) {
      return "תרגל 30-45 דקות ביום, התמקד בנושאים החלשים";
    } else {
      return "נדרש תרגול יומי אינטנסיבי - לפחות שעה ביום";
    }
  };

  const predictedScore = useMemo(() => {
    // Advanced prediction algorithm
    const { avgExamScore, practiceAccuracy, totalExams, totalPractice } = statistics;
    
    if (totalExams === 0 && totalPractice === 0) {
      return { score: 0, confidence: 0, message: "אין מספיק נתונים לחיזוי" };
    }

    let baseScore = 0;
    let confidence = 0;

    if (totalExams >= 5) {
      // High confidence - based mainly on exam performance
      baseScore = avgExamScore;
      confidence = Math.min(95, 60 + (totalExams * 5));
      
      // Adjust based on practice accuracy
      if (practiceAccuracy > avgExamScore + 10) {
        baseScore += (practiceAccuracy - avgExamScore) * 0.3; // Trending up
      } else if (practiceAccuracy < avgExamScore - 10) {
        baseScore -= (avgExamScore - practiceAccuracy) * 0.2; // May be declining
      }
    } else if (totalExams >= 2) {
      // Medium confidence - weighted average
      baseScore = (avgExamScore * 0.6) + (practiceAccuracy * 0.4);
      confidence = 40 + (totalExams * 10) + Math.min(20, totalPractice);
    } else if (totalPractice >= 30) {
      // Practice-based prediction
      baseScore = practiceAccuracy * 0.85; // Practice tends to be easier
      confidence = Math.min(60, 20 + totalPractice);
    } else {
      // Low confidence
      baseScore = practiceAccuracy * 0.8;
      confidence = Math.min(40, totalPractice * 2);
    }

    // Cap at realistic bounds
    baseScore = Math.max(0, Math.min(100, baseScore));
    
    let message = "";
    if (baseScore >= 85) {
      message = "מצוין! אתה בדרך למעולה 🌟";
    } else if (baseScore >= 70) {
      message = "טוב מאוד! עוד קצת ותגיע למעולה 📈";
    } else if (baseScore >= 55) {
      message = "עובר, אבל יש מקום לשיפור 💪";
    } else {
      message = "נדרש שיפור משמעותי ⚡";
    }

    return {
      score: Math.round(baseScore),
      confidence: Math.round(confidence),
      message,
      recommendation: getRecommendation(baseScore, statistics)
    };
  }, [statistics]);

  const pieData = useMemo(() => {
    if (!practiceAttempts || practiceAttempts.length === 0) return [];
    
    const correct = practiceAttempts.filter(a => a.status === "correct").length;
    const partial = practiceAttempts.filter(a => a.status === "partial").length;
    const incorrect = practiceAttempts.filter(a => a.status === "incorrect").length;
    
    return [
      { name: 'נכון', value: correct, color: '#10B981' },
      { name: 'חלקי', value: partial, color: '#F59E0B' },
      { name: 'שגוי', value: incorrect, color: '#EF4444' }
    ].filter(d => d.value > 0);
  }, [practiceAttempts]);

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const hasData = statistics.totalPractice > 0 || statistics.totalExams > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10">
          <button
            onClick={() => navigate(createPageUrl("SubjectSelection"))}
            className="flex items-center gap-3 hover:bg-white/10 rounded-lg p-2 transition-colors w-full"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg flex-shrink-0">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div className="text-right flex-1">
              <h1 className="text-2xl font-bold text-white">הנתונים שלי</h1>
              <p className="text-sm text-white/90">{displaySubject} • {displayUnits} יחידות</p>
            </div>
          </button>
        </div>
      </motion.div>

      {!hasData ? (
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">התחל ללמוד</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              עדיין לא ביצעת תרגולים או בחינות.
              <br/>
              התחל לתרגל כדי לראות את הסטטיסטיקות שלך!
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Practice"))}
                className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold shadow-lg"
              >
                <BookOpen className="w-5 h-5 ml-2" />
                התחל תרגול
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Exams"))}
                variant="outline"
                className="w-full h-14 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 text-lg font-bold"
              >
                <FileCheck className="w-5 h-5 ml-2" />
                עבור לבגרויות
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="px-4 space-y-5 pb-6">
          {/* Predicted Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-7 h-7" />
                <h3 className="text-xl font-bold">חיזוי הציון שלך</h3>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 mb-4">
                <div className="text-center">
                  <div className="text-7xl font-black mb-2">{predictedScore.score}</div>
                  <div className="text-sm opacity-90 mb-3">ציון צפוי בבגרות</div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Target className="w-4 h-4" />
                    <span>רמת ביטחון: {predictedScore.confidence}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-3">
                <p className="text-base font-semibold mb-2">{predictedScore.message}</p>
                <p className="text-sm opacity-90">{predictedScore.recommendation}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{statistics.totalExams}</div>
                  <div className="text-xs opacity-90">בגרויות נבדקו</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold">{statistics.totalPractice}</div>
                  <div className="text-xs opacity-90">תרגולים בוצעו</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-white rounded-2xl shadow-lg p-5 h-28">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600">דיוק תרגולים</div>
                  <div className="text-2xl font-bold text-gray-900">{Math.round(statistics.practiceAccuracy)}%</div>
                </div>
              </div>
              <Progress value={statistics.practiceAccuracy} className="h-2 bg-blue-100" />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 h-28">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <FileCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600">ממוצע בגרויות</div>
                  <div className="text-2xl font-bold text-gray-900">{Math.round(statistics.avgExamScore)}</div>
                </div>
              </div>
              <Progress value={statistics.avgExamScore} className="h-2 bg-blue-100" />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 h-28">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600">שעות לימוד</div>
                  <div className="text-2xl font-bold text-gray-900">{statistics.totalStudyHours}h</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{statistics.totalStudyMinutes} דקות</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 h-28">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  {statistics.trend === 'up' ? <TrendingUp className="w-6 h-6 text-white" /> :
                   statistics.trend === 'down' ? <TrendingDown className="w-6 h-6 text-white" /> :
                   <Activity className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600">מגמה</div>
                  <div className={`text-xl font-bold ${
                    statistics.trend === 'up' ? 'text-green-600' :
                    statistics.trend === 'down' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {statistics.trend === 'up' ? 'משתפר' : statistics.trend === 'down' ? 'יורד' : 'יציב'}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">30 הימים האחרונים</div>
            </div>
          </motion.div>

          {/* 7 Days Activity Chart */}
          {statistics.last7DaysActivity.some(d => d.total > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">פעילות 7 הימים האחרונים</h3>
              </div>
              
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statistics.last7DaysActivity}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '2px solid #E5E7EB', 
                      borderRadius: '12px',
                      direction: 'rtl'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Bar dataKey="practice" fill="#3B82F6" name="תרגולים" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="exams" fill="#6366F1" name="בגרויות" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Performance Distribution */}
          {pieData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">התפלגות ביצועים</h3>
              </div>
              
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '2px solid #E5E7EB', 
                        borderRadius: '12px',
                        direction: 'rtl'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {pieData.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Strong Topics */}
          {statistics.strongTopics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <Award className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">נקודות חוזק שלך 💪</h3>
              </div>
              
              <div className="space-y-3">
                {statistics.strongTopics.slice(0, 5).map((topic, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-gray-900">{topic.name || topic.topic}</span>
                      </div>
                      <span className="text-green-700 font-black text-xl">{Math.round(topic.accuracy)}%</span>
                    </div>
                    <Progress value={topic.accuracy} className="h-2.5 bg-green-200" />
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                      <span>{topic.correct} ✓ {topic.partial > 0 && `• ${topic.partial} ~`}</span>
                      <span>{topic.total} תרגולים</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Overall Performance Overview */}
          {(statistics.topicArray.length > 0 || examAttempts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">סטטוס לפי נושאים ושאלונים</h3>
              </div>

              {/* Topics from Practice */}
              {statistics.topicArray.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    נושאים בתרגול
                  </h4>
                  <div className="space-y-2">
                    {statistics.topicArray.map((topic, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-900 text-sm">{topic.name || topic.topic}</span>
                          <span className={`text-sm font-bold ${
                            topic.accuracy >= 80 ? 'text-green-600' :
                            topic.accuracy >= 60 ? 'text-blue-600' :
                            'text-orange-600'
                          }`}>
                            {Math.round(topic.accuracy)}%
                          </span>
                        </div>
                        <Progress value={topic.accuracy} className="h-2 bg-blue-200" />
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-xs text-gray-600">
                            {topic.correct} נכון • {topic.incorrect} טעויות • {topic.total} סה"כ
                          </div>
                          {topic.accuracy < 80 && (
                            <Button
                              onClick={() => {
                                sessionStorage.setItem('selectedTopicForPractice', topic.topic);
                                navigate(createPageUrl("TopicPracticeNew") + `?topic=${encodeURIComponent(topic.topic)}`);
                              }}
                              className="h-7 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-3 rounded-lg"
                            >
                              <BookOpen className="w-3 h-3 ml-1" />
                              תרגל
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modules from Exams */}
              {(() => {
                const moduleStats = {};
                examAttempts.forEach(attempt => {
                  const moduleId = attempt.module_id || 'לא ידוע';
                  if (!moduleStats[moduleId]) {
                    moduleStats[moduleId] = { total: 0, passed: 0, totalScore: 0 };
                  }
                  moduleStats[moduleId].total++;
                  moduleStats[moduleId].totalScore += attempt.score_percent || 0;
                  if (attempt.passed) {
                    moduleStats[moduleId].passed++;
                  }
                });

                const moduleArray = Object.entries(moduleStats)
                  .map(([module, stats]) => ({
                    module,
                    avgScore: stats.total > 0 ? stats.totalScore / stats.total : 0,
                    total: stats.total,
                    passed: stats.passed
                  }))
                  .sort((a, b) => a.avgScore - b.avgScore);

                return moduleArray.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      שאלונים בבגרויות
                    </h4>
                    <div className="space-y-2">
                      {moduleArray.map((module, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-900 text-sm">שאלון {module.module}</span>
                            <span className={`text-sm font-bold ${
                              module.avgScore >= 80 ? 'text-green-600' :
                              module.avgScore >= 60 ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {Math.round(module.avgScore)}%
                            </span>
                          </div>
                          <Progress value={module.avgScore} className="h-2 bg-blue-200" />
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-gray-600">
                              {module.passed} עבר • {module.total} סה"כ
                            </div>
                            {module.avgScore < 80 && (
                              <Button
                                onClick={() => {
                                  if (user?.is_premium) {
                                    sessionStorage.setItem('weakExamModule', module.module);
                                    navigate(createPageUrl("CustomWeakExam"));
                                  } else {
                                    navigate(createPageUrl("Premium"));
                                  }
                                }}
                                className={`h-7 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-xs font-bold px-3 rounded-lg`}
                              >
                                {user?.is_premium ? (
                                  <>
                                    <FileCheck className="w-3 h-3 ml-1" />
                                    מבחן
                                  </>
                                ) : (
                                  <>
                                    <Crown className="w-3 h-3 ml-1" />
                                    שדרג
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Improvement Actions */}
          {(statistics.weakTopics.length > 0 || examAttempts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">פעולות לשיפור 🎯</h3>
              </div>

              {statistics.weakTopics.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900 text-base">תרגולים לשיפור</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    תרגול על כל השאלות שטעית בהן בתרגולים - ללא כפילויות
                  </p>
                  <Button
                    onClick={() => {
                      if (user?.is_premium) {
                        navigate(createPageUrl("CustomWeakPractice"));
                      } else {
                        navigate(createPageUrl("Premium"));
                      }
                    }}
                    className={`w-full h-12 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-base font-bold rounded-xl shadow-lg`}
                  >
                    {user?.is_premium ? (
                      <>
                        <Target className="w-5 h-5 ml-2" />
                        תרגל שאלות שטעית בהן
                      </>
                    ) : (
                      <>
                        <Crown className="w-5 h-5 ml-2" />
                        שדרג לפרימיום
                      </>
                    )}
                  </Button>
                </div>
              )}

              {examAttempts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900 text-base">תרגל נושאים שאתה חלש בהם</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    בגרות מותאמת אישית על כל הנושאים שבהם אתה צריך שיפור
                  </p>
                  <Button
                    onClick={() => {
                      if (user?.is_premium) {
                        navigate(createPageUrl("CustomWeakExam"));
                      } else {
                        navigate(createPageUrl("Premium"));
                      }
                    }}
                    className={`w-full h-12 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-base font-bold rounded-xl shadow-lg`}
                  >
                    {user?.is_premium ? (
                      <>
                        <Target className="w-5 h-5 ml-2" />
                        בגרות מותאמת לחולשות שלך
                      </>
                    ) : (
                      <>
                        <Crown className="w-5 h-5 ml-2" />
                        שדרג לפרימיום
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* What to Improve - Combined Topics & Exams */}
          {(statistics.topicArray.length > 0 || examAttempts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <Target className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">תרגל נושאים שאתה חלש בהם</h3>
              </div>
              
              {/* Weak Topics from Practice */}
              {statistics.weakTopics.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    נושאים לשיפור מתרגולים
                  </h4>
                  <div className="space-y-2">
                    {statistics.weakTopics.slice(0, 3).map((topic, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-900 text-sm">{topic.name || topic.topic}</span>
                          <span className="text-blue-700 font-black text-lg">{Math.round(topic.accuracy)}%</span>
                        </div>
                        <Progress value={topic.accuracy} className="h-2 bg-blue-200" />
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-xs text-gray-600">
                            {topic.incorrect} טעויות • {topic.total} תרגולים
                          </div>
                          <Button
                            onClick={() => {
                              sessionStorage.setItem('selectedTopicForPractice', topic.topic);
                              navigate(createPageUrl("TopicPracticeNew") + `?topic=${encodeURIComponent(topic.topic)}`);
                            }}
                            className="h-7 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-3 rounded-lg"
                          >
                            <BookOpen className="w-3 h-3 ml-1" />
                            תרגל
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak Topics from Exams */}
              {(() => {
                const examMistakesByTopic = {};
                examAttempts.forEach(attempt => {
                  if (attempt.answers && Array.isArray(attempt.answers)) {
                    attempt.answers.forEach(answer => {
                      if (!answer.is_correct && answer.topic_key) {
                        if (!examMistakesByTopic[answer.topic_key]) {
                          examMistakesByTopic[answer.topic_key] = { count: 0, total: 0 };
                        }
                        examMistakesByTopic[answer.topic_key].count++;
                        examMistakesByTopic[answer.topic_key].total++;
                      }
                    });
                  }
                });

                const examWeakTopics = Object.entries(examMistakesByTopic)
                  .map(([topic, data]) => ({
                    topic,
                    mistakes: data.count,
                    total: data.total
                  }))
                  .sort((a, b) => b.mistakes - a.mistakes)
                  .slice(0, 3);

                return examWeakTopics.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      נושאים לשיפור מבגרויות
                    </h4>
                    <div className="space-y-2">
                      {examWeakTopics.map((topic, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-900 text-sm">{topic.topic}</span>
                            <span className="text-blue-700 font-black text-lg">{topic.mistakes} טעויות</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-600">
                              {topic.total} שאלות במבחנים
                            </div>
                            <Button
                              onClick={() => {
                                if (user?.is_premium) {
                                  sessionStorage.setItem('selectedTopicForPractice', topic.topic);
                                  navigate(createPageUrl("TopicPracticeNew") + `?topic=${encodeURIComponent(topic.topic)}`);
                                } else {
                                  navigate(createPageUrl("Premium"));
                                }
                              }}
                              className={`h-7 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-xs font-bold px-3 rounded-lg`}
                            >
                              {user?.is_premium ? (
                                <>
                                  <BookOpen className="w-3 h-3 ml-1" />
                                  תרגל
                                </>
                              ) : (
                                <>
                                  <Crown className="w-3 h-3 ml-1" />
                                  שדרג
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}



          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-3"
          >
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg font-bold text-base"
            >
              <BookOpen className="w-5 h-5 ml-2" />
              התחל תרגול
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg font-bold text-base"
            >
              <FileCheck className="w-5 h-5 ml-2" />
              עבור לבגרויות
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}