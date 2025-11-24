import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, FileCheck, ChevronDown, Clock, MessageSquare, TrendingUp, Zap, CheckCircle, Award, Calendar, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import { motion } from "framer-motion";

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

    // חישוב זמן ממוצע לשאלה
    const attemptsWithTime = practiceAttempts.filter(a => a.time_seconds && a.time_seconds > 0);
    const avgTimePerQuestion = attemptsWithTime.length > 0 
      ? Math.round(attemptsWithTime.reduce((sum, a) => sum + a.time_seconds, 0) / attemptsWithTime.length)
      : 0;

    // טעויות השבוע
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekErrors = practiceAttempts.filter(a => 
      a.status === "incorrect" && new Date(a.created_date) >= weekAgo
    ).length;

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
      .filter(([_, stats]) => stats.total >= 3)
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .slice(0, 5);

    const strongTopics = Object.entries(topicStats)
      .filter(([_, stats]) => stats.total >= 3)
      .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
      .slice(0, 5);

    // התקדמות חודשית
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthPractice = practiceAttempts.filter(a => new Date(a.created_date) >= monthAgo);
    const monthExams = examAttempts.filter(a => new Date(a.created_date) >= monthAgo);
    const monthMinutes = monthPractice.length * 2;

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

    // חישוב קצב שיפור בבגרויות
    const sortedExams = [...examAttempts].sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );
    let examTrend = 0;
    if (sortedExams.length >= 2) {
      const recentAvg = sortedExams.slice(-3).reduce((sum, e) => sum + e.score_percent, 0) / Math.min(3, sortedExams.length);
      const olderAvg = sortedExams.slice(0, 3).reduce((sum, e) => sum + e.score_percent, 0) / Math.min(3, sortedExams.length);
      examTrend = recentAvg - olderAvg;
    }

    return { 
      totalPractice, 
      totalExams, 
      practiceAccuracy, 
      avgTimePerQuestion,
      weekErrors,
      weakTopics, 
      strongTopics, 
      last7Days,
      monthMinutes,
      monthPractice: monthPractice.length,
      monthExams: monthExams.length,
      examTrend
    };
  }, [practiceAttempts, examAttempts, allTopics]);

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>
    );
  }

  const hasData = statistics.totalPractice > 0 || statistics.totalExams > 0;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 mb-6 flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">הנתונים שלי</h1>
          <p className="text-[11px] text-white/70">{displaySubject} • {displayUnits} יחידות</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
      </div>

      {!hasData ? (
        <div className="px-5">
          <CardSimple>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-[18px] font-bold text-[#2B2B2B] mb-2">התחל ללמוד</h3>
              <p className="text-[15px] text-[#6E6E6E] mb-6">עדיין לא ביצעת תרגולים או בחינות</p>
              <Button
                onClick={() => navigate(createPageUrl("Practice"))}
                className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]"
              >
                <BookOpen className="w-5 h-5 ml-2" />
                התחל תרגול
              </Button>
            </div>
          </CardSimple>
        </div>
      ) : (
        <div className="px-5 space-y-5 pb-6">
          {/* 1. מדד מוכנות - 4 מדדים */}
          {readinessData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-[16px] font-bold text-gray-900">מדד מוכנות</h3>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-2">
                    <span className="text-[18px] font-black text-blue-700">{readinessData.scores.mastery}%</span>
                  </div>
                  <div className="text-[11px] text-gray-600">שליטה בחומר</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-2">
                    <span className="text-[18px] font-black text-purple-700">{readinessData.scores.practice}%</span>
                  </div>
                  <div className="text-[11px] text-gray-600">תרגול</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-2">
                    <span className="text-[18px] font-black text-green-700">{readinessData.scores.exams}%</span>
                  </div>
                  <div className="text-[11px] text-gray-600">בגרויות</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-2">
                    <span className="text-[18px] font-black text-orange-700">{readinessData.scores.speed}%</span>
                  </div>
                  <div className="text-[11px] text-gray-600">מהירות</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. סטטיסטיקת הצלחה אמיתית */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-[16px] font-bold text-gray-900">סטטיסטיקת הצלחה</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-[24px] font-black text-blue-600">{statistics.totalPractice}</div>
                <div className="text-[11px] text-gray-600">סה״כ שאלות נענו</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-[24px] font-black text-green-600">{Math.round(statistics.practiceAccuracy)}%</div>
                <div className="text-[11px] text-gray-600">אחוז הצלחה</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-[24px] font-black text-purple-600">{statistics.avgTimePerQuestion}s</div>
                <div className="text-[11px] text-gray-600">זמן ממוצע לשאלה</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-[24px] font-black text-red-600">{statistics.weekErrors}</div>
                <div className="text-[11px] text-gray-600">טעויות השבוע</div>
              </div>
            </div>
          </motion.div>

          {/* 3. התקדמות חודשית */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-[16px] font-bold text-gray-900">התקדמות חודשית</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-[22px] font-black text-indigo-600">{statistics.monthMinutes}</div>
                <div className="text-[10px] text-gray-600">דקות למידה</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-[22px] font-black text-blue-600">{statistics.monthPractice}</div>
                <div className="text-[10px] text-gray-600">שאלות פתרת</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-[22px] font-black text-purple-600">{statistics.monthExams}</div>
                <div className="text-[10px] text-gray-600">סימולציות</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statistics.last7Days}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #E9F0FF', 
                    borderRadius: '12px',
                    direction: 'rtl',
                    fontSize: '11px'
                  }}
                  formatter={(value) => [`${value} דקות`]}
                />
                <Bar dataKey="minutes" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* 4. הנושאים שלך - חזקים וחלשים */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="text-[16px] font-bold text-gray-900">הנושאים שלך</h3>
            </div>
            
            {/* נושאים חזקים */}
            <div className="mb-4">
              <div className="text-[13px] font-bold text-green-600 mb-2">💪 הכי חזקים</div>
              <div className="space-y-2">
                {statistics.strongTopics.slice(0, 5).map(([topicId, stats], idx) => (
                  <div key={topicId} className="bg-green-50 rounded-lg p-3 border border-green-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-green-700">{idx + 1}.</span>
                      <span className="text-[13px] font-semibold text-gray-900">{stats.name}</span>
                    </div>
                    <span className="text-[14px] font-black text-green-600">
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* נושאים חלשים */}
            <div>
              <div className="text-[13px] font-bold text-red-600 mb-2">⚠️ הכי חלשים</div>
              <div className="space-y-2">
                {statistics.weakTopics.slice(0, 5).map(([topicId, stats], idx) => (
                  <div key={topicId} className="bg-red-50 rounded-lg p-3 border border-red-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-red-700">{idx + 1}.</span>
                      <span className="text-[13px] font-semibold text-gray-900">{stats.name}</span>
                    </div>
                    <span className="text-[14px] font-black text-red-600">
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 5. התקדמות בבגרויות */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-[16px] font-bold text-gray-900">התקדמות בבגרויות</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-[22px] font-black text-blue-600">{examAttempts.length}</div>
                <div className="text-[10px] text-gray-600">סה״כ בגרויות</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-[22px] font-black text-green-600">
                  {examAttempts.length > 0 ? Math.round(examAttempts.reduce((sum, e) => sum + e.score_percent, 0) / examAttempts.length) : 0}
                </div>
                <div className="text-[10px] text-gray-600">ממוצע ציונים</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                {statistics.examTrend > 0 ? (
                  <ArrowUp className="w-5 h-5 text-green-600 mb-1" />
                ) : statistics.examTrend < 0 ? (
                  <ArrowDown className="w-5 h-5 text-red-600 mb-1" />
                ) : (
                  <div className="w-5 h-0.5 bg-gray-400 mb-1" />
                )}
                <div className="text-[10px] text-gray-600">קצב שיפור</div>
              </div>
            </div>

            {/* טבלת ציונים אחרונים */}
            <div className="space-y-2">
              {examAttempts.slice(0, 3).map((exam, idx) => (
                <div key={exam.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-[12px] text-gray-600">
                    {new Date(exam.created_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`text-[16px] font-black ${exam.score_percent >= 56 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(exam.score_percent)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 6. מפת הדרך לציון המטרה */}
          {readinessData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-5 border-2 border-amber-200"
            >
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="text-[16px] font-bold text-gray-900">מפת דרך לציון {user?.target_score || 85}</h3>
              </div>
              
              <div className="bg-white rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-700">שאלות החודש</span>
                  <span className="text-[16px] font-black text-amber-600">
                    {readinessData.daily.questions * 30}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-700">בגרויות החודש</span>
                  <span className="text-[16px] font-black text-amber-600">
                    {readinessData.daily.examsPerWeek * 4}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-700">נושאים לחזק</span>
                  <span className="text-[16px] font-black text-amber-600">
                    {readinessData.remaining.weakTopics}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-700">להוריד טעויות ל-</span>
                  <span className="text-[16px] font-black text-amber-600">
                    {readinessData.targets.requirements.errorRate}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 7. תובנות AI חודשיות */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg p-5 border border-blue-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="text-[16px] font-bold text-gray-900">תובנות חכמות</h3>
            </div>
            
            <div className="space-y-3">
              {statistics.strongTopics.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-blue-200">
                  <div className="text-[12px] font-semibold text-green-600 mb-1">🎯 הישג החודש</div>
                  <p className="text-[13px] text-gray-700">
                    הנושא שהכי חיזקת החודש: <span className="font-bold">{statistics.strongTopics[0][1].name}</span>
                  </p>
                </div>
              )}
              
              {statistics.examTrend !== 0 && (
                <div className="bg-white rounded-xl p-3 border border-blue-200">
                  <div className="text-[12px] font-semibold text-blue-600 mb-1">📈 קצב התקדמות</div>
                  <p className="text-[13px] text-gray-700">
                    {statistics.examTrend > 0 
                      ? `אתה משתפר! הציונים עלו ב-${Math.abs(Math.round(statistics.examTrend))} נקודות`
                      : statistics.examTrend < 0
                      ? `הציונים ירדו ב-${Math.abs(Math.round(statistics.examTrend))} נקודות - שווה להתמקד`
                      : 'הציונים יציבים'}
                  </p>
                </div>
              )}

              {statistics.last7Days.length > 0 && (() => {
                const bestDay = statistics.last7Days.reduce((max, day) => 
                  day.minutes > max.minutes ? day : max
                , statistics.last7Days[0]);
                return (
                  <div className="bg-white rounded-xl p-3 border border-blue-200">
                    <div className="text-[12px] font-semibold text-purple-600 mb-1">⏰ דפוס למידה</div>
                    <p className="text-[13px] text-gray-700">
                      היום הכי פרודוקטיבי שלך: <span className="font-bold">{bestDay.day}</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </motion.div>

          {/* כפתורי ניווט */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]"
            >
              <BookOpen className="w-4 h-4 ml-2" />
              תרגול
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="h-12 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-[14px] text-[15px]"
            >
              <FileCheck className="w-4 h-4 ml-2" />
              בגרויות
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}