import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, TrendingDown, Target, Award, AlertCircle, BookOpen, FileCheck, ArrowLeft, Zap, Brain, Clock, CheckCircle, XCircle, Activity, BarChart3, Calendar, Flame, Star, ChevronLeft, Crown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from "recharts";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";

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

  const readinessData = useReadinessCalculator(user, allTopics, practiceAttempts, examAttempts);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const hasData = statistics.totalPractice > 0 || statistics.totalExams > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-3xl p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10">
          <button
            onClick={() => navigate(createPageUrl("SubjectSelection"))}
            className="flex items-center gap-3 hover:bg-white/10 rounded-2xl p-3 transition-colors w-full"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="text-right flex-1">
              <h1 className="text-3xl font-bold text-white">הנתונים שלי</h1>
              <p className="text-base text-white/90">{displaySubject} • {displayUnits} יחידות</p>
            </div>
          </button>
        </div>
      </motion.div>

      {!hasData ? (
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md mx-auto"
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
                className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold shadow-2xl rounded-2xl"
              >
                <BookOpen className="w-5 h-5 ml-2" />
                התחל תרגול
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Exams"))}
                variant="outline"
                className="w-full h-14 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 text-lg font-bold rounded-2xl"
              >
                <FileCheck className="w-5 h-5 ml-2" />
                עבור לבגרויות
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="px-6 space-y-6 pb-6">
          {/* 1️⃣ מדד מוכנות לבגרות (Ready Score) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-7 h-7" />
                  <h3 className="text-2xl font-bold">מוכנות לבגרות</h3>
                </div>
                <div className="text-right text-sm">
                  <div>המטרה: {user?.target_score || 85}+</div>
                  <div>{readinessData?.timeline.daysUntilExam || 90} ימים לבגרות</div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5">
                <div className="text-center mb-4">
                  <div className="text-6xl font-black mb-2">{readinessData?.scores.overall || 0}%</div>
                  <div className="text-sm opacity-90">Ready Score</div>
                </div>
                <Progress value={readinessData?.scores.overall || 0} className="h-3 bg-white/30" />
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData?.scores.mastery || 0, fill: "#3B82F6" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData?.scores.mastery || 0}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700 mt-1">📘 שליטה בחומר</div>
              </div>

              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData?.scores.practice || 0, fill: "#8B5CF6" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData?.scores.practice || 0}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700 mt-1">📝 תרגול</div>
              </div>

              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData?.scores.exams || 0, fill: "#10B981" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData?.scores.exams || 0}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700 mt-1">🎓 בגרויות מלאות</div>
              </div>

              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData?.scores.speed || 0, fill: "#F59E0B" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData?.scores.speed || 0}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700 mt-1">⚡ מהירות פתרון</div>
              </div>
            </div>
          </motion.div>

          {/* 2️⃣ מה אתה צריך כדי להגיע לציון המטרה */}
          {readinessData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-amber-200"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-7 h-7 text-amber-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  כדי להגיע ל־{user?.target_score || 85} אתה צריך:
                </h3>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200">
                  <span className="text-gray-900 font-semibold">לפתור עוד שאלות</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.practice}</span>
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200">
                  <span className="text-gray-900 font-semibold">לבצע עוד בגרויות מלאות</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.exams}</span>
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200">
                  <span className="text-gray-900 font-semibold">ללמוד נושאים שלא נגעת</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.untouchedTopics}</span>
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200">
                  <span className="text-gray-900 font-semibold">לחזור על נושאים חלשים</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.weakTopics}</span>
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200">
                  <span className="text-gray-900 font-semibold">להוריד טעויות ל-</span>
                  <span className="text-3xl font-black text-amber-600">&lt;18%</span>
                </div>

                <div className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200">
                  <span className="text-gray-900 font-semibold">לשפר מהירות ב-</span>
                  <span className="text-3xl font-black text-amber-600">15%</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <Button
                  onClick={() => navigate(createPageUrl("Readiness"))}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl"
                >
                  <Target className="w-5 h-5 ml-2" />
                  צפה בתוכנית המלאה
                </Button>
              </div>
            </motion.div>
          )}

          {/* 4️⃣ תרגול – כל הסטטיסטיקות */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">תרגול - סטטיסטיקות מלאות</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="text-sm text-gray-600 mb-1">שאלות שנענו</div>
                <div className="text-3xl font-black text-blue-600">{statistics.totalPractice}</div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                <div className="text-sm text-gray-600 mb-1">הצלחה</div>
                <div className="text-3xl font-black text-green-600">{Math.round(statistics.practiceAccuracy)}%</div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-200">
                <div className="text-sm text-gray-600 mb-1">ממוצע טעויות</div>
                <div className="text-3xl font-black text-red-600">{Math.round(100 - statistics.practiceAccuracy)}%</div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                <div className="text-sm text-gray-600 mb-1">זמן ממוצע לשאלה</div>
                <div className="text-3xl font-black text-purple-600">
                  {(() => {
                    const withTime = practiceAttempts.filter(a => a.time_seconds);
                    const avg = withTime.length > 0 
                      ? withTime.reduce((sum, a) => sum + a.time_seconds, 0) / withTime.length 
                      : 120;
                    return Math.round(avg);
                  })()}s
                </div>
              </div>
            </div>

            {statistics.weakTopics.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200 mb-3">
                <div className="text-sm font-semibold text-gray-700 mb-2">הכי הרבה טעויות בנושא:</div>
                <div className="text-lg font-black text-red-600">{statistics.weakTopics[0].name || statistics.weakTopics[0].topic}</div>
              </div>
            )}

            {statistics.strongTopics.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">הכי מעט טעויות בנושא:</div>
                <div className="text-lg font-black text-green-600">{statistics.strongTopics[0].name || statistics.strongTopics[0].topic}</div>
              </div>
            )}

            <Button
              onClick={() => {
                if (user?.is_premium) {
                  navigate(createPageUrl("CustomWeakPractice"));
                } else {
                  navigate(createPageUrl("Premium"));
                }
              }}
              className={`w-full h-12 ${user?.is_premium ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' : 'bg-gray-400'} text-white font-bold rounded-xl`}
            >
              {user?.is_premium ? '🔥 לפתור טעויות עכשיו' : '👑 שדרג לפרימיום'}
            </Button>
          </motion.div>

          {/* 3️⃣ כמה למדת השבוע */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">זמן לימוד השבוע</h3>
            </div>
            
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statistics.last7DaysActivity}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: 'דקות', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #E5E7EB', 
                    borderRadius: '12px',
                    direction: 'rtl'
                  }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(value) => [`${value * 2} דקות`]}
                />
                <Bar dataKey="practice" fill="#3B82F6" name="תרגולים" radius={[8, 8, 0, 0]} />
                <Bar dataKey="exams" fill="#6366F1" name="בגרויות" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 text-center">
              <div className="inline-block bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 py-2 border-2 border-blue-200">
                <span className="text-sm text-gray-600">סה״כ: </span>
                <span className="text-2xl font-black text-blue-600">{statistics.totalStudyMinutes}</span>
                <span className="text-sm text-gray-600"> דקות</span>
              </div>
            </div>
          </motion.div>

          {/* 5️⃣ בגרויות שביצעת + ציונים */}
          {examAttempts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <FileCheck className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">בגרויות שביצעת</h3>
              </div>

              <div className="space-y-2 mb-4">
                {examAttempts.slice(0, 10).map((exam, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-sm">
                          {exam.exam_type || 'בגרות'} {exam.exam_year || ''}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(exam.created_date).toLocaleDateString('he-IL', {
                            day: 'numeric',
                            month: 'short'
                          })} • {exam.duration_minutes || 90} דק׳
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-black ${
                          exam.score_percent >= 80 ? 'text-green-600' :
                          exam.score_percent >= 60 ? 'text-blue-600' :
                          'text-orange-600'
                        }`}>
                          {Math.round(exam.score_percent || 0)}
                        </div>
                        <div className="text-xs text-gray-500">ציון</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => navigate(createPageUrl("Exams"))}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl"
              >
                <FileCheck className="w-5 h-5 ml-2" />
                בצע בגרות חדשה
              </Button>
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
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">נקודות חוזק שלך 💪</h3>
              </div>
              
              <div className="space-y-3">
                {statistics.strongTopics.slice(0, 5).map((topic, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 shadow-lg">
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

          {/* 6️⃣ הנושאים שלך - מפת התקדמות מלאה */}
          {allTopics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">הנושאים שלך - מפת התקדמות</h3>
              </div>

              <div className="space-y-2">
                {allTopics
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((topic, idx) => {
                    const topicData = statistics.topicArray.find(t => t.topic === topic.topic_id);
                    const accuracy = topicData?.accuracy || 0;
                    const total = topicData?.total || 0;
                    
                    return (
                      <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-base">{topic.name}</div>
                            <div className="text-xs text-gray-600">{total} תרגולים</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-3xl font-black ${
                              accuracy >= 80 ? 'text-green-600' :
                              accuracy >= 60 ? 'text-blue-600' :
                              total > 0 ? 'text-orange-600' : 'text-gray-400'
                            }`}>
                              {total > 0 ? `${Math.round(accuracy)}%` : '—'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress value={accuracy} className="h-3" />
                          </div>
                          <Button
                            onClick={() => {
                              sessionStorage.setItem('selectedTopicForPractice', topic.topic_id);
                              navigate(createPageUrl("TopicPracticeNew") + `?topic=${encodeURIComponent(topic.topic_id)}`);
                            }}
                            className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 rounded-xl"
                          >
                            לתרגל עכשיו
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* בגרויות שאלונים */}
          {(examAttempts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.37 }}
              className="bg-white rounded-2xl shadow-lg p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">שאלוני בגרות</h3>
              </div>

              {/* Modules Table */}
              {(() => {
                const defaultModulesStructure = {
                  "אנגלית": {
                    3: [
                      { id: "C", order: 0 },
                      { id: "A", order: 1 },
                      { id: "B", order: 2 }
                    ],
                    4: [
                      { id: "C", order: 0 },
                      { id: "D", order: 1 },
                      { id: "E", order: 2 }
                    ],
                    5: [
                      { id: "E", order: 0 },
                      { id: "F", order: 1 },
                      { id: "G", order: 2 }
                    ]
                  },
                  "מתמטיקה": {
                    3: [
                      { id: "801", order: 0 },
                      { id: "802", order: 1 }
                    ],
                    4: [
                      { id: "803", order: 0 },
                      { id: "804", order: 1 }
                    ],
                    5: [
                      { id: "805", order: 0 },
                      { id: "806", order: 1 }
                    ]
                  },
                  "פיזיקה": {
                    5: [
                      { id: "581", order: 0 },
                      { id: "582", order: 1 }
                    ]
                  }
                };

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

                const moduleOrder = defaultModulesStructure[displaySubject]?.[displayUnits] || [];
                const moduleArray = moduleOrder
                  .map(({ id }) => {
                    const stats = moduleStats[id];
                    return {
                      module: id,
                      avgScore: stats ? (stats.total > 0 ? stats.totalScore / stats.total : 0) : 0,
                      total: stats?.total || 0,
                      passed: stats?.passed || 0
                    };
                  });

                return moduleArray.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      שאלוני בגרות
                    </h4>
                    <div className="space-y-1.5">
                      {moduleArray.map((module, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="font-semibold text-gray-900 text-xs">
                              שאלון {module.module}
                            </div>
                            <span className={`text-sm font-bold flex-shrink-0 ${
                              module.total === 0 ? 'text-gray-400' :
                              module.avgScore >= 80 ? 'text-green-600' :
                              module.avgScore >= 60 ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {module.total > 0 ? `${Math.round(module.avgScore)}%` : '—'}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                module.avgScore >= 80 ? 'bg-green-500' :
                                module.avgScore >= 60 ? 'bg-blue-500' :
                                'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(module.avgScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Quick Action Buttons */}
          {(statistics.weakTopics.length > 0 || examAttempts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 gap-3"
            >
              {statistics.weakTopics.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-5 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-6 h-6 text-blue-600" />
                    <h4 className="font-bold text-gray-900 text-lg">תרגול כל הטעויות</h4>
                  </div>
                  <p className="text-base text-gray-600 mb-4">
                    תרגול ממוקד על כל השאלות שטעית בהן - ללא כפילויות
                  </p>
                  <Button
                    onClick={() => {
                      if (user?.is_premium) {
                        navigate(createPageUrl("CustomWeakPractice"));
                      } else {
                        navigate(createPageUrl("Premium"));
                      }
                    }}
                    className={`w-full h-14 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-base font-bold rounded-2xl shadow-lg`}
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-5 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck className="w-6 h-6 text-blue-600" />
                    <h4 className="font-bold text-gray-900 text-lg">תרגל נושאים שאתה חלש בהם</h4>
                  </div>
                  <p className="text-base text-gray-600 mb-4">
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
                    className={`w-full h-14 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-base font-bold rounded-2xl shadow-lg`}
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
                      <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
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
                            className="h-7 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-3 rounded-2xl"
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
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
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
                              className={`h-7 ${user?.is_premium ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-400 hover:bg-gray-500'} text-white text-xs font-bold px-3 rounded-2xl`}
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



          {/* 7️⃣ הודעות אישיות מהרובוט (AI Insights) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-indigo-200"
          >
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-gray-900">תובנות אישיות מהרובוט 🤖</h3>
            </div>

            <div className="space-y-3">
              {(() => {
                const insights = [];
                
                // שיפור
                if (statistics.trend === 'up') {
                  insights.push({
                    emoji: '🎉',
                    text: `אתה משתפר יפה! עלית ${Math.round(statistics.practiceAccuracy - (statistics.practiceAccuracy * 0.88))}% השבוע.`,
                    color: 'from-green-50 to-emerald-50 border-green-200'
                  });
                }

                // נושא חלש
                if (statistics.weakTopics.length > 0) {
                  insights.push({
                    emoji: '⚠️',
                    text: `הנושא הכי חלש שלך כרגע: ${statistics.weakTopics[0].name || statistics.weakTopics[0].topic}.`,
                    color: 'from-orange-50 to-red-50 border-orange-200'
                  });
                }

                // יעד יומי
                if (readinessData) {
                  insights.push({
                    emoji: '🎯',
                    text: `כדי להגיע ל־${user?.target_score || 85} עליך לבצע לפחות ${readinessData.daily.questions} שאלות ביום.`,
                    color: 'from-blue-50 to-indigo-50 border-blue-200'
                  });
                }

                // פעילות אתמול
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const yesterdayActivity = statistics.last7DaysActivity.find(d => d.date === yesterdayStr);
                if (yesterdayActivity && yesterdayActivity.total === 0) {
                  insights.push({
                    emoji: '📅',
                    text: 'אתמול למדת 0 דקות. בוא נחזור לקצב היום.',
                    color: 'from-red-50 to-pink-50 border-red-200'
                  });
                } else if (yesterdayActivity && yesterdayActivity.total > 0) {
                  insights.push({
                    emoji: '🔥',
                    text: `כל הכבוד! אתמול תרגלת ${yesterdayActivity.total * 2} דקות. המשך כך!`,
                    color: 'from-green-50 to-emerald-50 border-green-200'
                  });
                }

                return insights.map((insight, idx) => (
                  <div key={idx} className={`bg-gradient-to-r ${insight.color} border-2 rounded-xl p-4`}>
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{insight.emoji}</div>
                      <p className="text-gray-900 font-semibold text-sm leading-relaxed flex-1">{insight.text}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </motion.div>

          {/* כפתורי Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4"
          >
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl shadow-lg font-bold text-base"
            >
              <BookOpen className="w-5 h-5 ml-2" />
              התחל תרגול
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-2xl shadow-lg font-bold text-base"
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