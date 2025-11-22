import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, TrendingDown, Target, Award, AlertCircle, BookOpen, FileCheck, ArrowLeft, Zap, Brain, Clock, CheckCircle, XCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

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
      const attempts = await base44.entities.PracticeAttempt.list("-created_date", 200);
      return attempts.filter((a) => a.subject === displaySubject && a.unit_level === displayUnits);
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

  const statistics = useMemo(() => {
    const totalPractice = practiceAttempts.length;
    const totalExams = examAttempts.length;
    
    const correctPractice = practiceAttempts.filter(a => a.is_correct).length;
    const practiceAccuracy = totalPractice > 0 ? (correctPractice / totalPractice * 100) : 0;
    
    const passedExams = examAttempts.filter(e => e.passed).length;
    const avgExamScore = examAttempts.length > 0 
      ? examAttempts.reduce((sum, e) => sum + (e.score_percent || 0), 0) / examAttempts.length 
      : 0;
    
    const failedExams = examAttempts.filter(e => !e.passed);
    
    // Topic analysis
    const topicStats = {};
    practiceAttempts.forEach(attempt => {
      const topic = attempt.topic_id || 'unknown';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0, incorrect: 0 };
      }
      topicStats[topic].total++;
      if (attempt.is_correct) {
        topicStats[topic].correct++;
      } else {
        topicStats[topic].incorrect++;
      }
    });

    const topicArray = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? (stats.correct / stats.total * 100) : 0,
      total: stats.total,
      correct: stats.correct,
      incorrect: stats.incorrect
    })).sort((a, b) => a.accuracy - b.accuracy);

    const weakTopics = topicArray.filter(t => t.accuracy < 60 && t.total >= 3);
    const strongTopics = topicArray.filter(t => t.accuracy >= 80 && t.total >= 3).reverse();

    // Recent trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPractice = practiceAttempts.filter(a => 
      new Date(a.created_date) >= thirtyDaysAgo
    );
    
    const recentExams = examAttempts.filter(e => 
      new Date(e.created_date) >= thirtyDaysAgo
    );

    const recentPracticeAccuracy = recentPractice.length > 0
      ? (recentPractice.filter(a => a.is_correct).length / recentPractice.length * 100)
      : 0;

    const trend = recentPracticeAccuracy > practiceAccuracy ? 'up' : recentPracticeAccuracy < practiceAccuracy ? 'down' : 'stable';

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
      trend
    };
  }, [practiceAttempts, examAttempts]);

  const getFuturePrediction = () => {
    if (statistics.totalExams === 0) {
      return {
        prediction: "עדיין לא ביצעת מספיק בחינות לחיזוי מדויק",
        recommendation: "המלצה: בצע לפחות 3 בחינות מלאות כדי לקבל חיזוי מדויק יותר"
      };
    }

    if (statistics.avgExamScore >= 80) {
      return {
        prediction: "מצוין! אתה על המסלול הנכון להצלחה בבגרות 🎯",
        recommendation: "המשך לתרגל באופן קבוע ושמור על הרמה הגבוהה"
      };
    } else if (statistics.avgExamScore >= 60) {
      return {
        prediction: "אתה בדרך הנכונה, עם תרגול ממוקד תוכל להגיע ל-90+ 📈",
        recommendation: "התמקד בנושאים החלשים ותרגל לפחות 30 דקות ביום"
      };
    } else {
      return {
        prediction: "יש צורך בשיפור משמעותי - תרגול יומי יכול להעלות את הציון שלך ⚡",
        recommendation: "המלצה: תרגל 45 דקות ביום, התמקד בנושאים הבסיסיים"
      };
    }
  };

  const prediction = getFuturePrediction();

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${headerColor} rounded-b-[2rem] p-6 shadow-xl mb-6`}
      >
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <Activity className="w-5 h-5 text-white" />
            <span className="text-xl font-bold text-white">הסטטיסטיקה שלי</span>
          </div>
        </div>
        
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-1">{displaySubject}</h2>
          <p className="text-sm opacity-90">{displayUnits} יחידות</p>
        </div>
      </motion.div>

      <div className="px-6 space-y-6">
        {/* Overall Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            סטטיסטיקות כלליות
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{statistics.totalPractice}</div>
              <div className="text-sm text-gray-600">תרגולים</div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <FileCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{statistics.totalExams}</div>
              <div className="text-sm text-gray-600">בגרויות</div>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{Math.round(statistics.practiceAccuracy)}%</div>
              <div className="text-sm text-gray-600">דיוק תרגולים</div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{Math.round(statistics.avgExamScore)}</div>
              <div className="text-sm text-gray-600">ממוצע בגרויות</div>
            </div>
          </div>
        </motion.div>

        {/* Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            {statistics.trend === 'up' ? (
              <TrendingUp className="w-6 h-6 text-green-600" />
            ) : statistics.trend === 'down' ? (
              <TrendingDown className="w-6 h-6 text-red-600" />
            ) : (
              <Activity className="w-6 h-6 text-blue-600" />
            )}
            מגמה אחרונה (30 יום)
          </h3>
          
          <div className={`p-4 rounded-xl ${
            statistics.trend === 'up' ? 'bg-green-50 border-2 border-green-200' : 
            statistics.trend === 'down' ? 'bg-red-50 border-2 border-red-200' : 
            'bg-blue-50 border-2 border-blue-200'
          }`}>
            <p className={`text-lg font-semibold ${
              statistics.trend === 'up' ? 'text-green-800' : 
              statistics.trend === 'down' ? 'text-red-800' : 
              'text-blue-800'
            }`}>
              {statistics.trend === 'up' && '📈 התקדמות מצוינת! אתה משתפר'}
              {statistics.trend === 'down' && '📉 ירידה קלה - זמן לחזור למסלול'}
              {statistics.trend === 'stable' && '➡️ רמה יציבה - המשך כך'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              ב-30 הימים האחרונים: {statistics.recentPractice} תרגולים • {statistics.recentExams} בגרויות
            </p>
          </div>
        </motion.div>

        {/* Strong Topics */}
        {statistics.strongTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-green-600" />
              נקודות חוזק 💪
            </h3>
            
            <div className="space-y-3">
              {statistics.strongTopics.slice(0, 5).map((topic, idx) => (
                <div key={idx} className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">{topic.topic}</span>
                    <span className="text-green-700 font-bold">{Math.round(topic.accuracy)}%</span>
                  </div>
                  <Progress value={topic.accuracy} className="h-2 bg-green-100" />
                  <p className="text-xs text-gray-600 mt-1">
                    {topic.correct} נכונות מתוך {topic.total} תרגולים
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Weak Topics */}
        {statistics.weakTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              נקודות לשיפור 🎯
            </h3>
            
            <div className="space-y-3">
              {statistics.weakTopics.slice(0, 5).map((topic, idx) => (
                <div key={idx} className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">{topic.topic}</span>
                    <span className="text-orange-700 font-bold">{Math.round(topic.accuracy)}%</span>
                  </div>
                  <Progress value={topic.accuracy} className="h-2 bg-orange-100" />
                  <p className="text-xs text-gray-600 mt-1">
                    {topic.incorrect} טעויות מתוך {topic.total} תרגולים
                  </p>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(createPageUrl("CustomPractice"))}
              className="w-full mt-4 bg-orange-600 hover:bg-orange-700 h-12"
            >
              <Zap className="w-5 h-5 ml-2" />
              תרגול מותאם אישית על הנושאים החלשים
            </Button>
          </motion.div>
        )}

        {/* Failed Exams */}
        {statistics.failedExams.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              בגרויות שנכשלו
            </h3>
            
            <div className="space-y-3">
              {statistics.failedExams.slice(0, 5).map((exam, idx) => (
                <div key={idx} className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {new Date(exam.created_date).toLocaleDateString('he-IL')}
                      </p>
                      <p className="text-sm text-gray-600">
                        ציון: {Math.round(exam.score_percent)} / {exam.passing_grade} נדרש
                      </p>
                    </div>
                    <div className="text-red-700 font-bold text-2xl">
                      {Math.round(exam.score_percent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Future Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg p-6 text-white"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain className="w-6 h-6" />
            צפי התקדמות
          </h3>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-lg font-semibold mb-2">{prediction.prediction}</p>
            <p className="text-sm opacity-90">{prediction.recommendation}</p>
          </div>

          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full bg-white text-purple-600 hover:bg-gray-100 h-12 font-bold"
          >
            <Clock className="w-5 h-5 ml-2" />
            התחל תרגול עכשיו
          </Button>
        </motion.div>

        {/* Personalized Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-600" />
            המלצות מותאמות אישית
          </h3>
          
          <div className="space-y-3">
            {statistics.weakTopics.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900 mb-2">תרגול ממוקד</p>
                <p className="text-sm text-gray-700">
                  המלצה: תרגל את הנושאים {statistics.weakTopics.slice(0, 2).map(t => t.topic).join(', ')} 
                  למשך 20 דקות ביום
                </p>
              </div>
            )}
            
            {statistics.avgExamScore < 70 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900 mb-2">עבוד על בחינות</p>
                <p className="text-sm text-gray-700">
                  כדי להעלות את הממוצע שלך, נסה לפתור לפחות 2 בחינות שלמות בשבוע
                </p>
              </div>
            )}
            
            {statistics.totalPractice < 50 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900 mb-2">תרגול יומי</p>
                <p className="text-sm text-gray-700">
                  המלצה: תרגל לפחות 10 שאלות ביום כדי לשפר את הדיוק
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}