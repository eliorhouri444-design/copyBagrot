import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, User, Target } from "lucide-react";
import { motion } from "framer-motion";
import ReadinessCard from "@/components/home/ReadinessCard";
import DailyTasksCard from "@/components/home/DailyTasksCard";
import QuickContinueCard from "@/components/home/QuickContinueCard";
import QuickSubjects from "@/components/home/QuickSubjects";
import RecentExamCard from "@/components/home/RecentExamCard";
import WeeklyProgressChart from "@/components/home/WeeklyProgressChart";
import AIMessageCard from "@/components/home/AIMessageCard";
import QuickNav from "@/components/home/QuickNav";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [practiceAttempts, setPracticeAttempts] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (!currentUser.subject_selected) {
        navigate(createPageUrl("Onboarding"));
        return;
      }

      const subject = currentUser.selected_subject || 'אנגלית';
      const units = parseInt(currentUser.selected_units || 3);

      const [allTopics, allAttempts, allExamAttempts] = await Promise.all([
        base44.entities.TopicNew.list(),
        base44.entities.AttemptNew.list("-created_date", 2000),
        base44.entities.ExamAttempt.list("-created_date", 100)
      ]);

      const relevantTopics = allTopics.filter(
        t => t.subject_id === subject && parseInt(t.unit_level) === units && t.is_active
      );
      setTopics(relevantTopics);

      const userAttempts = allAttempts.filter(
        a => a.created_by === currentUser.email && 
             a.subject_id === subject && 
             parseInt(a.unit_level) === units
      );
      setPracticeAttempts(userAttempts);

      const userExamAttempts = allExamAttempts.filter(
        e => e.subject === subject && parseInt(e.unit_level) === units
      );
      setExamAttempts(userExamAttempts);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const readinessData = useReadinessCalculator(user, topics, practiceAttempts, examAttempts);

  const dailyTasks = useMemo(() => {
    if (!readinessData) return [];

    return [
      {
        id: "learn",
        type: "learn",
        title: "ללמוד: " + (topics[0]?.name || "נושא חדש"),
        description: "לימוד נושא חדש"
      },
      {
        id: "practice",
        type: "practice",
        title: `לפתור: ${readinessData.daily.questions} שאלות`,
        description: "תרגול יומי"
      },
      {
        id: "review",
        type: "review",
        title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות`,
        description: "חיזוק נקודות חולשה"
      },
      {
        id: "exam",
        type: "exam",
        title: "סימולציה קצרה: 15 דקות",
        description: "תרגול מבחן"
      }
    ];
  }, [readinessData, topics]);

  const weekData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAttempts = practiceAttempts.filter(a => 
        a.created_date?.startsWith(dateStr)
      );
      
      last7Days.push({
        date: dateStr,
        minutes: dayAttempts.length * 2
      });
    }
    return last7Days;
  }, [practiceAttempts]);

  const lastActivity = useMemo(() => {
    if (practiceAttempts.length === 0 && examAttempts.length === 0) return null;

    const lastPractice = practiceAttempts[0];
    const lastExam = examAttempts[0];

    const mostRecent = !lastExam || (lastPractice && new Date(lastPractice.created_date) > new Date(lastExam.created_date))
      ? { type: 'practice', topic: lastPractice?.topic_id || 'תרגול', date: lastPractice?.created_date }
      : { type: 'exam', topic: 'בגרות', date: lastExam?.created_date };

    const timeAgo = mostRecent.date 
      ? Math.floor((new Date() - new Date(mostRecent.date)) / (1000 * 60 * 60)) + ' שעות'
      : 'לאחרונה';

    return { ...mostRecent, timeAgo };
  }, [practiceAttempts, examAttempts]);

  const daysUntilExam = user?.exam_date 
    ? Math.max(0, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : 90;

  const lastExamData = useMemo(() => {
    if (examAttempts.length === 0) return null;
    
    const latest = examAttempts[0];
    const hoursAgo = Math.floor((new Date() - new Date(latest.created_date)) / (1000 * 60 * 60));
    const timeAgo = hoursAgo < 24 
      ? `לפני ${hoursAgo} שעות`
      : `לפני ${Math.floor(hoursAgo / 24)} ימים`;

    return {
      score: Math.round(latest.score_percent || 0),
      timeAgo
    };
  }, [examAttempts]);

  const quickSubjects = useMemo(() => {
    if (!user) return [];
    
    return [
      { 
        id: "main", 
        name: user.selected_subject || "אנגלית", 
        icon: "🇬🇧", 
        units: user.selected_units || 3, 
        progress: readinessData?.scores.overall || 0 
      }
    ];
  }, [user, readinessData]);

  const handleSubjectClick = (subject) => {
    navigate(createPageUrl("SubjectSelection"));
  };

  const handleQuickNav = (navId) => {
    if (navId === "practice") navigate(createPageUrl("Practice"));
    else if (navId === "subjects") navigate(createPageUrl("SubjectSelection"));
    else if (navId === "mistakes") navigate(createPageUrl("WeakAreaSelection"));
    else if (navId === "exams") navigate(createPageUrl("Exams"));
  };

  const handleContinue = () => {
    if (lastActivity?.type === 'practice') {
      navigate(createPageUrl("Practice"));
    } else {
      navigate(createPageUrl("Exams"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">בגרות פלוס</div>
              <div className="text-xs text-gray-600">{user?.selected_subject}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors">
              <Bell className="w-5 h-5 text-blue-600" />
            </button>
            <button 
              onClick={() => navigate(createPageUrl("Profile"))}
              className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"
            >
              <User className="w-5 h-5 text-blue-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* כרטיס מצב + מוכנות */}
        <ReadinessCard
          readinessPercent={readinessData?.scores.overall || 0}
          daysUntilExam={daysUntilExam}
          targetScore={user?.target_score || 85}
        />

        {/* המשימות היומיות */}
        <DailyTasksCard tasks={dailyTasks} />

        {/* המשך מאיפה שהפסקת */}
        {lastActivity && (
          <QuickContinueCard 
            lastActivity={lastActivity}
            onContinue={handleContinue}
          />
        )}

        {/* מקצועות מרכזיים */}
        <QuickSubjects 
          subjects={quickSubjects}
          onSubjectClick={handleSubjectClick}
        />

        {/* בגרות אחרונה */}
        <RecentExamCard
          lastExam={lastExamData}
          onViewResults={() => navigate(createPageUrl("Statistics"))}
          onNewExam={() => navigate(createPageUrl("Exams"))}
        />

        {/* התקדמות שבועית */}
        <WeeklyProgressChart weekData={weekData} />

        {/* הודעה מהרובוט */}
        <AIMessageCard 
          message={`היי ${user?.full_name?.split(' ')[0] || 'תלמיד'}! ${
            readinessData 
              ? `היום אתה צריך להשלים ${readinessData.daily.questions} שאלות כדי להתקרב לציון ${user?.target_score || 85}+.`
              : 'התחל לתרגל כדי שאוכל לעזור לך!'
          }`}
        />

        {/* ניווט מהיר */}
        <QuickNav onNavigate={handleQuickNav} />
      </div>
    </div>
  );
}