import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, FileCheck, ChevronDown, Clock, MessageSquare, TrendingUp, Zap, CheckCircle, Award, Calendar, AlertCircle, ArrowUp, ArrowDown, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import { motion } from "framer-motion";
import LockedFeatureCard, { PremiumUpsell } from "@/components/premium/LockedFeatureCard";

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
      return topics.filter((t) => t.subject_id === displaySubject && t.unit_level === displayUnits && t.is_active);
    },
    enabled: isUserLoaded,
    initialData: []
  });

  const readinessData = useReadinessCalculator(user, allTopics, practiceAttempts, examAttempts);

  const statistics = useMemo(() => {
    const totalPractice = practiceAttempts.length;
    const totalExams = examAttempts.length;

    const correctPractice = practiceAttempts.filter((a) => a.status === "correct").length;
    const practiceAccuracy = totalPractice > 0 ? correctPractice / totalPractice * 100 : 0;

    // חישוב זמן ממוצע לשאלה
    const attemptsWithTime = practiceAttempts.filter((a) => a.time_seconds && a.time_seconds > 0);
    const avgTimePerQuestion = attemptsWithTime.length > 0 ?
    Math.round(attemptsWithTime.reduce((sum, a) => sum + a.time_seconds, 0) / attemptsWithTime.length) :
    0;

    // טעויות השבוע
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekErrors = practiceAttempts.filter((a) =>
    a.status === "incorrect" && new Date(a.created_date) >= weekAgo
    ).length;

    const topicStats = {};
    allTopics.forEach((topic) => {
      topicStats[topic.topic_id] = { name: topic.name, total: 0, correct: 0 };
    });

    practiceAttempts.forEach((attempt) => {
      const topic = attempt.topic_id;
      if (topicStats[topic]) {
        topicStats[topic].total++;
        if (attempt.status === "correct") topicStats[topic].correct++;
      }
    });

    const weakTopics = Object.entries(topicStats).
    filter(([_, stats]) => stats.total >= 3).
    sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total).
    slice(0, 5);

    const strongTopics = Object.entries(topicStats).
    filter(([_, stats]) => stats.total >= 3).
    sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total).
    slice(0, 5);

    // התקדמות חודשית
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthPractice = practiceAttempts.filter((a) => new Date(a.created_date) >= monthAgo);
    const monthExams = examAttempts.filter((a) => new Date(a.created_date) >= monthAgo);
    const monthMinutes = monthPractice.length * 2;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayPractice = practiceAttempts.filter((a) => a.created_date?.split('T')[0] === dateStr);
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
      </div>);

  }

  const hasData = statistics.totalPractice > 0 || statistics.totalExams > 0;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-gradient-to-r mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] from-blue-500 to-indigo-500 flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">הנתונים שלי</h1>
          <p className="text-[11px] text-white/90">{displaySubject} • {displayUnits} יחידות</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
      </div>

      {!hasData ?
      <div className="px-5">
          <CardSimple>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-[18px] font-bold text-[#2B2B2B] mb-2">התחל ללמוד</h3>
              <p className="text-[15px] text-[#6E6E6E] mb-6">עדיין לא ביצעת תרגולים או בחינות</p>
              <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]">

                <BookOpen className="w-5 h-5 ml-2" />
                התחל תרגול
              </Button>
            </div>
          </CardSimple>
        </div> :

      <div className="px-5 space-y-4">
          {/* 1. מדד מוכנות - 4 מדדים */}
          {readinessData &&
        <CardSimple delay={0.05}>
              <CardTitle icon={Target}>מדד מוכנות</CardTitle>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-1">
                    <span className="text-[16px] font-black text-blue-700">{readinessData.scores.mastery}%</span>
                  </div>
                  <div className="text-[10px] text-[#6E6E6E]">שליטה</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-1">
                    <span className="text-[16px] font-black text-purple-700">{readinessData.scores.practice}%</span>
                  </div>
                  <div className="text-[10px] text-[#6E6E6E]">תרגול</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-1">
                    <span className="text-[16px] font-black text-green-700">{readinessData.scores.exams}%</span>
                  </div>
                  <div className="text-[10px] text-[#6E6E6E]">בגרויות</div>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-1">
                    <span className="text-[16px] font-black text-orange-700">{readinessData.scores.speed}%</span>
                  </div>
                  <div className="text-[10px] text-[#6E6E6E]">מהירות</div>
                </div>
              </div>
            </CardSimple>
        }

          {/* 2. סטטיסטיקת הצלחה אמיתית */}
          <CardSimple delay={0.1}>
            <CardTitle icon={CheckCircle}>סטטיסטיקת הצלחה</CardTitle>
            
            <div className="grid grid-cols-2 gap-3">
              <StatCard value={statistics.totalPractice} label="סה״כ שאלות" color="#3B82F6" />
              <StatCard value={`${Math.round(statistics.practiceAccuracy)}%`} label="אחוז הצלחה" color="#10B981" />
              <StatCard value={`${statistics.avgTimePerQuestion}s`} label="זמן לשאלה" color="#8B5CF6" />
              <StatCard value={statistics.weekErrors} label="טעויות שבוע" color="#EF4444" />
            </div>
          </CardSimple>

          {/* 3. התקדמות חודשית */}
          <CardSimple delay={0.15}>
            <CardTitle icon={Calendar}>התקדמות חודשית</CardTitle>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center bg-white rounded-lg p-2 border border-[#E9F0FF]">
                <div className="text-[20px] font-black text-indigo-600">{statistics.monthMinutes}</div>
                <div className="text-[10px] text-[#6E6E6E]">דקות</div>
              </div>
              <div className="text-center bg-white rounded-lg p-2 border border-[#E9F0FF]">
                <div className="text-[20px] font-black text-blue-600">{statistics.monthPractice}</div>
                <div className="text-[10px] text-[#6E6E6E]">שאלות</div>
              </div>
              <div className="text-center bg-white rounded-lg p-2 border border-[#E9F0FF]">
                <div className="text-[20px] font-black text-purple-600">{statistics.monthExams}</div>
                <div className="text-[10px] text-[#6E6E6E]">סימולציות</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={100}>
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
                formatter={(value) => [`${value} דקות`]} />

                <Bar dataKey="minutes" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardSimple>

          {/* 4. הנושאים שלך - TOP 5 - פרימיום לניתוח מלא */}
          <CardSimple delay={0.2}>
            <div className="flex items-center justify-between mb-3">
              <CardTitle icon={Target}>הנושאים שלך - TOP 5</CardTitle>
              {!user?.is_premium && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            
            {/* חזקים - בסיסי לכולם */}
            {statistics.strongTopics.length > 0 &&
          <div className="mb-3">
                <div className="text-[12px] font-bold text-green-600 mb-2 flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  הכי חזקים
                </div>
                <div className="space-y-1.5">
                  {statistics.strongTopics.slice(0, user?.is_premium ? 5 : 2).map(([topicId, stats], idx) =>
              <div key={topicId} className="bg-white rounded-lg p-2 border border-[#E9F0FF] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-green-600 w-4">{idx + 1}</span>
                        <span className="text-[12px] font-semibold text-[#2B2B2B]">{stats.name}</span>
                      </div>
                      <span className="text-[13px] font-black text-green-600">
                        {Math.round(stats.correct / stats.total * 100)}%
                      </span>
                    </div>
              )}
                </div>
              </div>
          }

            {/* חלשים - בסיסי לכולם */}
            {statistics.weakTopics.length > 0 &&
          <div>
                <div className="text-[12px] font-bold text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  הכי חלשים
                </div>
                <div className="space-y-1.5">
                  {statistics.weakTopics.slice(0, user?.is_premium ? 5 : 2).map(([topicId, stats], idx) =>
              <div key={topicId} className="bg-white rounded-lg p-2 border border-[#E9F0FF] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-red-600 w-4">{idx + 1}</span>
                        <span className="text-[12px] font-semibold text-[#2B2B2B]">{stats.name}</span>
                      </div>
                      <span className="text-[13px] font-black text-red-600">
                        {Math.round(stats.correct / stats.total * 100)}%
                      </span>
                    </div>
              )}
                </div>
              </div>
          }

            {!user?.is_premium && (statistics.strongTopics.length > 2 || statistics.weakTopics.length > 2) &&
          <PremiumUpsell
            message="שדרג לפרימיום לניתוח מלא של כל הנושאים"
            className="mt-3" />

          }
          </CardSimple>

          {/* 5. התקדמות בבגרויות */}
          <CardSimple delay={0.25}>
            <CardTitle icon={FileCheck}>התקדמות בבגרויות</CardTitle>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <StatCard value={examAttempts.length} label="בגרויות" color="#3B82F6" />
              <StatCard
              value={examAttempts.length > 0 ? Math.round(examAttempts.reduce((sum, e) => sum + e.score_percent, 0) / examAttempts.length) : 0}
              label="ממוצע"
              color="#10B981" />

              <div className="text-center">
                <div className="flex items-center justify-center mb-1 h-10">
                  {statistics.examTrend > 0 ?
                <ArrowUp className="w-8 h-8 text-green-600" /> :
                statistics.examTrend < 0 ?
                <ArrowDown className="w-8 h-8 text-red-600" /> :

                <div className="w-8 h-1 bg-gray-400 rounded" />
                }
                </div>
                <div className="text-[10px] text-[#6E6E6E]">מגמה</div>
              </div>
            </div>

            <div className="space-y-2">
              {examAttempts.slice(0, 3).map((exam) =>
            <div key={exam.id} className="bg-white rounded-lg p-2 flex items-center justify-between border border-[#E9F0FF]">
                  <span className="text-[11px] text-[#6E6E6E]">
                    {new Date(exam.created_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`text-[15px] font-black ${exam.score_percent >= 56 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(exam.score_percent)}
                  </span>
                </div>
            )}
            </div>
          </CardSimple>

          {/* 6. מפת דרך לציון המטרה - פרימיום בלבד */}
          {readinessData && (
        user?.is_premium ?
        <CardSimple delay={0.3}>
                <CardTitle icon={Award}>מפת דרך ל-{user?.target_score || 85}</CardTitle>
                
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                    <span className="text-[13px] font-semibold text-[#2B2B2B]">שאלות החודש</span>
                    <span className="text-2xl font-black text-amber-600">
                      {readinessData.daily.questions * 30}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                    <span className="text-[13px] font-semibold text-[#2B2B2B]">בגרויות החודש</span>
                    <span className="text-2xl font-black text-amber-600">
                      {readinessData.daily.examsPerWeek * 4}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                    <span className="text-[13px] font-semibold text-[#2B2B2B]">נושאים לחזק</span>
                    <span className="text-2xl font-black text-amber-600">
                      {readinessData.remaining.weakTopics}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                    <span className="text-[13px] font-semibold text-[#2B2B2B]">יעד טעויות</span>
                    <span className="text-2xl font-black text-amber-600">
                      {readinessData.targets.requirements.errorRate}%
                    </span>
                  </div>
                </div>
              </CardSimple> :

        <LockedFeatureCard
          title="מפת דרך לציון המטרה"
          description="שדרג לפרימיום כדי לראות בדיוק כמה שאלות ובגרויות צריך להגיע ל-85." />)


        }

          {/* 7. תובנות AI חודשיות */}
          <CardSimple delay={0.35}>
            <CardTitle icon={Zap}>תובנות חכמות</CardTitle>
            
            <div className="space-y-2">
              {statistics.strongTopics.length > 0 &&
            <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="text-[11px] font-semibold text-green-600 mb-0.5">🎯 הישג החודש</div>
                  <p className="text-[12px] text-[#2B2B2B]">
                    {statistics.strongTopics[0][1].name}
                  </p>
                </div>
            }
              
              {statistics.examTrend !== 0 &&
            <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="text-[11px] font-semibold text-blue-600 mb-0.5">📈 קצב שיפור</div>
                  <p className="text-[12px] text-[#2B2B2B]">
                    {statistics.examTrend > 0 ?
                `עלית ב-${Math.abs(Math.round(statistics.examTrend))} נקודות` :
                statistics.examTrend < 0 ?
                `ירדת ב-${Math.abs(Math.round(statistics.examTrend))} נקודות` :
                'יציב'}
                  </p>
                </div>
            }

              {statistics.last7Days.length > 0 && (() => {
              const bestDay = statistics.last7Days.reduce((max, day) =>
              day.minutes > max.minutes ? day : max,
              statistics.last7Days[0]);
              return (
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                    <div className="text-[11px] font-semibold text-purple-600 mb-0.5">⏰ יום מוצלח</div>
                    <p className="text-[12px] text-[#2B2B2B]">
                      <span className="font-bold">{bestDay.day}</span>
                    </p>
                  </div>);

            })()}
            </div>
          </CardSimple>

          {/* צפי ציון */}
          {readinessData && examAttempts.length > 0 &&
        <CardSimple delay={0.4}>
              <CardTitle icon={Award}>צפי ציון</CardTitle>
              
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200 text-center">
                <div className="text-[11px] text-amber-700 mb-1">לפי הביצועים האחרונים</div>
                <div className="text-[48px] font-black text-amber-600 mb-1">
                  {Math.round(readinessData.scores.overall * (user?.target_score || 85) / 100)}
                </div>
                <div className="text-[13px] text-amber-800 font-semibold">
                  {readinessData.scores.overall >= 80 ? '🎯 מצוין!' : readinessData.scores.overall >= 60 ? '💪 בדרך הנכונה' : '📚 כדאי להתאמץ יותר'}
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-[#E9F0FF] mt-3 text-center">
                <div className="text-[11px] text-[#6E6E6E] mb-1">סיכוי להשיג {user?.target_score || 85}</div>
                <div className="text-[24px] font-black text-[#3B82F6]">
                  {readinessData.scores.overall}%
                </div>
              </div>
            </CardSimple>
        }
        </div>
      }
    </div>);

}