import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, FileCheck, ChevronDown, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
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

    return { totalPractice, totalExams, practiceAccuracy, weakTopics, strongTopics, last7Days };
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
      <div className="bg-[#112D57] p-6 mb-6">
        <div className="text-center">
          <h1 className="text-[22px] font-bold text-white mb-1">הנתונים שלי</h1>
          <p className="text-[13px] text-white/80">{displaySubject} • {displayUnits} יחידות</p>
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
                className="w-full h-12 bg-[#1E4BA1] hover:bg-[#112D57] text-white font-bold rounded-[14px] text-[15px]"
              >
                <BookOpen className="w-5 h-5 ml-2" />
                התחל תרגול
              </Button>
            </div>
          </CardSimple>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {/* מדד מוכנות */}
          {readinessData && (
            <CardSimple delay={0.05}>
              <CardTitle icon={Target}>מדד מוכנות</CardTitle>
              
              <div className="text-center mb-4">
                <div className="text-7xl font-black text-[#1E4BA1] mb-2">{readinessData.scores.overall}%</div>
                <div className="text-[13px] text-[#6E6E6E]">מוכנות לבגרות</div>
              </div>
              <Progress value={readinessData.scores.overall} className="h-3 mb-4" />

              <Button
                onClick={() => setShowDetailedView(!showDetailedView)}
                variant="outline"
                className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#112D57]"
              >
                {showDetailedView ? 'הסתר' : 'ראה פירוט מלא'}
                <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showDetailedView ? 'rotate-180' : ''}`} />
              </Button>

              {showDetailedView && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-white rounded-lg p-3 border border-[#E9F0FF] text-center">
                    <div className="text-2xl font-black text-[#1E4BA1]">{readinessData.scores.mastery}%</div>
                    <div className="text-[13px] text-[#6E6E6E]">שליטה בחומר</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E9F0FF] text-center">
                    <div className="text-2xl font-black text-[#9333EA]">{readinessData.scores.practice}%</div>
                    <div className="text-[13px] text-[#6E6E6E]">תרגול</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E9F0FF] text-center">
                    <div className="text-2xl font-black text-[#10B981]">{readinessData.scores.exams}%</div>
                    <div className="text-[13px] text-[#6E6E6E]">בגרויות</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E9F0FF] text-center">
                    <div className="text-2xl font-black text-[#F59E0B]">{readinessData.scores.speed}%</div>
                    <div className="text-[13px] text-[#6E6E6E]">מהירות</div>
                  </div>
                </div>
              )}
            </CardSimple>
          )}

          {/* מה חסר לך */}
          {readinessData && (
            <CardSimple delay={0.1}>
              <CardTitle icon={Target}>כדי להגיע ל־{user?.target_score || 85} אתה צריך:</CardTitle>

              <div className="space-y-2 mb-3">
                <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                  <span className="text-[15px] font-semibold text-[#2B2B2B]">בגרויות</span>
                  <span className="text-3xl font-black text-[#1E4BA1]">{readinessData.remaining.exams}</span>
                </div>
                <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                  <span className="text-[15px] font-semibold text-[#2B2B2B]">שאלות</span>
                  <span className="text-3xl font-black text-[#1E4BA1]">{readinessData.remaining.practice}</span>
                </div>
                <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-[#E9F0FF]">
                  <span className="text-[15px] font-semibold text-[#2B2B2B]">נושאים</span>
                  <span className="text-3xl font-black text-[#1E4BA1]">{readinessData.remaining.weakTopics}</span>
                </div>
              </div>

              <Button
                onClick={() => navigate(createPageUrl("Readiness"))}
                variant="outline"
                className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#112D57]"
              >
                ראה פירוט מלא
              </Button>
            </CardSimple>
          )}

          {/* המיקוד שלך */}
          <CardSimple delay={0.15}>
            <CardTitle>המיקוד שלך</CardTitle>
            
            <div className="grid grid-cols-2 gap-3">
              {statistics.weakTopics.length > 0 && (
                <div className="bg-white rounded-lg p-4 border-2 border-red-200 text-center">
                  <div className="text-[13px] text-[#6E6E6E] mb-1">חלש</div>
                  <div className="font-bold text-red-600 text-[15px] leading-tight">
                    {statistics.weakTopics[0][1].name || 'נושא'}
                  </div>
                </div>
              )}
              
              {statistics.strongTopics.length > 0 && (
                <div className="bg-white rounded-lg p-4 border-2 border-green-200 text-center">
                  <div className="text-[13px] text-[#6E6E6E] mb-1">חזק</div>
                  <div className="font-bold text-green-600 text-[15px] leading-tight">
                    {statistics.strongTopics[0][1].name || 'נושא'}
                  </div>
                </div>
              )}
            </div>
          </CardSimple>

          {/* זמן לימוד */}
          <CardSimple delay={0.2}>
            <CardTitle icon={Clock}>זמן לימוד</CardTitle>
            
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={statistics.last7Days}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #E9F0FF', 
                    borderRadius: '12px',
                    direction: 'rtl',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} דקות`]}
                />
                <Bar dataKey="minutes" fill="#1E4BA1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="text-center mt-3">
              <span className="text-[13px] text-[#6E6E6E]">השבוע: </span>
              <span className="text-2xl font-black text-[#1E4BA1]">
                {statistics.last7Days.reduce((sum, d) => sum + d.minutes, 0)}
              </span>
              <span className="text-[13px] text-[#6E6E6E]"> דקות</span>
            </div>
          </CardSimple>

          {/* ההודעה של הרובוט */}
          <CardSimple delay={0.25}>
            <CardTitle icon={MessageSquare}>הודעה מהרובוט</CardTitle>

            <div className="bg-white rounded-lg p-4 border border-[#E9F0FF]">
              <p className="text-[#2B2B2B] font-semibold text-[15px] leading-relaxed">
                {readinessData 
                  ? `היום אתה צריך ${readinessData.daily.questions} שאלות כדי להתקדם לקראת היעד שלך: ${user?.target_score || 85}+`
                  : 'התחל לתרגל כדי לקבל המלצות מותאמות אישית!'}
              </p>
            </div>
          </CardSimple>

          {/* כפתורים */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="h-12 bg-[#1E4BA1] hover:bg-[#112D57] text-white font-bold rounded-[14px] text-[15px]"
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