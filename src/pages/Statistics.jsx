import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, Target, AlertCircle, BookOpen, FileCheck, ChevronLeft, Brain, MessageSquare, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";

export default function StatisticsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
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
    const practiceAccuracy = totalPractice > 0 ? (correctPractice / totalPractice * 100) : 0;
    
    const avgExamScore = examAttempts.length > 0 
      ? examAttempts.reduce((sum, e) => sum + (e.score_percent || 0), 0) / examAttempts.length 
      : 0;

    const topicStats = {};
    allTopics.forEach(topic => {
      topicStats[topic.topic_id] = { name: topic.name, total: 0, correct: 0 };
    });

    practiceAttempts.forEach(attempt => {
      const topic = attempt.topic_id;
      if (topicStats[topic]) {
        topicStats[topic].total++;
        if (attempt.status === "correct") topicStats[topic].correct++;
      }
    });

    const weakTopics = Object.entries(topicStats)
      .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total * 100) < 60)
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .slice(0, 1);

    const strongTopics = Object.entries(topicStats)
      .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total * 100) >= 80)
      .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
      .slice(0, 1);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPractice = practiceAttempts.filter(a => a.created_date?.split('T')[0] === dateStr);
      
      last7Days.push({
        day: date.toLocaleDateString('he-IL', { weekday: 'short' }),
        minutes: dayPractice.length * 2
      });
    }

    return {
      totalPractice,
      totalExams,
      practiceAccuracy,
      avgExamScore,
      weakTopics,
      strongTopics,
      last7Days
    };
  }, [practiceAttempts, examAttempts, allTopics]);

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const hasData = statistics.totalPractice > 0 || statistics.totalExams > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">הנתונים שלי</h1>
          <p className="text-base text-white/90">{displaySubject} • {displayUnits} יחידות</p>
        </div>
      </motion.div>

      {!hasData ? (
        <div className="px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">התחל ללמוד</h3>
            <p className="text-gray-600 mb-6">עדיין לא ביצעת תרגולים או בחינות</p>
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl"
            >
              <BookOpen className="w-5 h-5 ml-2" />
              התחל תרגול
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-4 pb-6">
          {/* 1️⃣ מדד מוכנות אחד בלבד */}
          {readinessData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl shadow-lg p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">מדד מוכנות</h3>
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              
              <div className="text-center mb-4">
                <div className="text-7xl font-black text-blue-600 mb-2">{readinessData.scores.overall}%</div>
                <div className="text-sm text-gray-600">מוכנות לבגרות</div>
              </div>
              <Progress value={readinessData.scores.overall} className="h-3 mb-4" />

              <Button
                onClick={() => setShowDetailedView(!showDetailedView)}
                variant="outline"
                className="w-full h-10 text-sm rounded-xl border-2 border-gray-200"
              >
                {showDetailedView ? 'הסתר' : 'ראה פירוט מלא'}
                <ChevronLeft className={`w-4 h-4 mr-2 transition-transform ${showDetailedView ? 'rotate-90' : ''}`} />
              </Button>

              {showDetailedView && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-2 gap-3 mt-4"
                >
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                    <div className="text-2xl font-black text-blue-600">{readinessData.scores.mastery}%</div>
                    <div className="text-xs text-gray-600">שליטה בחומר</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
                    <div className="text-2xl font-black text-purple-600">{readinessData.scores.practice}%</div>
                    <div className="text-xs text-gray-600">תרגול</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                    <div className="text-2xl font-black text-green-600">{readinessData.scores.exams}%</div>
                    <div className="text-xs text-gray-600">בגרויות</div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                    <div className="text-2xl font-black text-orange-600">{readinessData.scores.speed}%</div>
                    <div className="text-xs text-gray-600">מהירות</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 2️⃣ מה חסר לך כדי להגיע לציון */}
          {readinessData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-5 border-2 border-amber-200"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-gray-900">
                  כדי להגיע ל־{user?.target_score || 85} אתה צריך:
                </h3>
              </div>

              <div className="space-y-2 mb-3">
                <div className="bg-white rounded-xl p-3 flex items-center justify-between border border-amber-200">
                  <span className="text-sm font-semibold text-gray-900">בגרויות מלאות</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.exams}</span>
                </div>

                <div className="bg-white rounded-xl p-3 flex items-center justify-between border border-amber-200">
                  <span className="text-sm font-semibold text-gray-900">שאלות תרגול</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.practice}</span>
                </div>

                <div className="bg-white rounded-xl p-3 flex items-center justify-between border border-amber-200">
                  <span className="text-sm font-semibold text-gray-900">נושאים ללמוד</span>
                  <span className="text-3xl font-black text-amber-600">{readinessData.remaining.weakTopics}</span>
                </div>
              </div>

              <Button
                onClick={() => navigate(createPageUrl("Readiness"))}
                variant="outline"
                className="w-full h-10 text-sm rounded-xl border-2 border-amber-300"
              >
                ראה פירוט מלא
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Button>
            </motion.div>
          )}

          {/* 3️⃣ המיקוד שלך */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <h3 className="text-base font-bold text-gray-900 mb-3">המיקוד שלך</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {statistics.weakTopics.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200 text-center">
                  <div className="text-xs text-gray-600 mb-1">חלש</div>
                  <div className="font-bold text-red-600 text-sm leading-tight">
                    {statistics.weakTopics[0][1].name || statistics.weakTopics[0][0]}
                  </div>
                </div>
              )}
              
              {statistics.strongTopics.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200 text-center">
                  <div className="text-xs text-gray-600 mb-1">חזק</div>
                  <div className="font-bold text-green-600 text-sm leading-tight">
                    {statistics.strongTopics[0][1].name || statistics.strongTopics[0][0]}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 4️⃣ זמן לימוד */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-gray-900">זמן לימוד</h3>
            </div>
            
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={statistics.last7Days}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #E5E7EB', 
                    borderRadius: '12px',
                    direction: 'rtl',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} דקות`]}
                />
                <Bar dataKey="minutes" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="text-center mt-3">
              <span className="text-sm text-gray-600">השבוע: </span>
              <span className="text-2xl font-black text-blue-600">
                {statistics.last7Days.reduce((sum, d) => sum + d.minutes, 0)}
              </span>
              <span className="text-sm text-gray-600"> דקות</span>
            </div>
          </motion.div>

          {/* 5️⃣ ההודעה של הרובוט */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-5 border-2 border-indigo-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900">הודעה מהרובוט</h3>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-indigo-200">
              <p className="text-gray-900 font-semibold text-sm leading-relaxed">
                {readinessData 
                  ? `היום אתה צריך ${readinessData.daily.questions} שאלות כדי להתקדם לקראת היעד שלך: ${user?.target_score || 85}+`
                  : 'התחל לתרגל כדי לקבל המלצות מותאמות אישית!'}
              </p>
            </div>
          </motion.div>

          {/* כפתורים מרכזיים */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
          >
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl"
            >
              <BookOpen className="w-4 h-4 ml-2" />
              תרגול
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl"
            >
              <FileCheck className="w-4 h-4 ml-2" />
              בגרויות
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}