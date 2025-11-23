import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Target, AlertCircle, Crown, User, TrendingUp, FileCheck, Clock, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { differenceInDays, differenceInHours } from "date-fns";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [studyGoals, setStudyGoals] = useState(null);
  const [timeUntilExam, setTimeUntilExam] = useState(null);
  const [isStartingExam, setIsStartingExam] = useState(false);

  const [cachedData, setCachedData] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        subject: localStorage.getItem('selected_subject') || 'אנגלית',
        units: localStorage.getItem('selected_units') || '3'
      };
    }
    return { subject: 'אנגלית', units: '3' };
  });

  const subjectColors = {
    "אנגלית": "bg-blue-600",
    "מתמטיקה": "bg-purple-600",
    "פיזיקה": "bg-green-600",
    "ספרות": "bg-pink-600",
    "היסטוריה": "bg-amber-600",
    "גאוגרפיה": "bg-cyan-600",
    "כימיה": "bg-orange-600",
    "ביולוגיה": "bg-rose-600"
  };

  const headerColor = user?.selected_subject || cachedData.subject ?
    subjectColors[user?.selected_subject || cachedData.subject] || "bg-blue-600" :
    "bg-blue-600";

  const displayName = user?.full_name?.split(' ')[0] || cachedData.name || 'תלמיד';
  const displaySubject = user?.selected_subject || cachedData.subject || "מקצוע";
  const displayUnits = parseInt(user?.selected_units || cachedData.units || "0");

  const defaultModulesStructure = {
    "אנגלית": {
      3: [
        { id: "C", entity: "ModuleCExam" },
        { id: "A", entity: "ModuleAExam" },
        { id: "B", entity: "ModuleBExam" }
      ],
      4: [
        { id: "C", entity: "ModuleCExam" },
        { id: "D", entity: "GenericExam" },
        { id: "E", entity: "GenericExam" }
      ],
      5: [
        { id: "E", entity: "GenericExam" },
        { id: "F", entity: "GenericExam" },
        { id: "G", entity: "GenericExam" }
      ]
    },
    "מתמטיקה": {
      3: [{ id: "801", entity: "GenericExam" }, { id: "802", entity: "GenericExam" }],
      4: [{ id: "803", entity: "GenericExam" }, { id: "804", entity: "GenericExam" }],
      5: [{ id: "805", entity: "GenericExam" }, { id: "806", entity: "GenericExam" }]
    },
    "פיזיקה": {
      5: [{ id: "581", entity: "GenericExam" }, { id: "582", entity: "GenericExam" }]
    },
    "כימיה": {
      5: [{ id: "043381", entity: "GenericExam" }, { id: "043382", entity: "GenericExam" }, { id: "043383", entity: "GenericExam" }]
    },
    "ביולוגיה": {
      5: [{ id: "054581", entity: "GenericExam" }, { id: "054582", entity: "GenericExam" }, { id: "054583", entity: "GenericExam" }]
    },
    "ספרות": {
      2: [{ id: "2101", entity: "GenericExam" }],
      5: [{ id: "2102", entity: "GenericExam" }, { id: "2103", entity: "GenericExam" }]
    },
    "היסטוריה": {
      2: [{ id: "2211", entity: "GenericExam" }],
      5: [{ id: "2212", entity: "GenericExam" }, { id: "2213", entity: "GenericExam" }]
    },
    "גאוגרפיה": {
      5: [{ id: "046511", entity: "GenericExam" }, { id: "046512", entity: "GenericExam" }, { id: "046581", entity: "GenericExam" }]
    },
    "אזרחות": {
      2: [{ id: "1121", entity: "GenericExam" }, { id: "1122", entity: "GenericExam" }]
    },
    "תנ\"ך": {
      2: [{ id: "1211", entity: "GenericExam" }],
      5: [{ id: "1212", entity: "GenericExam" }, { id: "1213", entity: "GenericExam" }]
    }
  };

  const { data: practiceAttempts = [] } = useQuery({
    queryKey: ['practice-attempts-home', displaySubject, displayUnits],
    queryFn: async () => {
      const attempts = await base44.entities.PracticeAttempt.list("-created_date", 50);
      return attempts.filter((a) => a.subject === displaySubject && a.unit_level === displayUnits);
    },
    initialData: [],
    enabled: isUserLoaded && !!displaySubject && displayUnits > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts-home', displaySubject, displayUnits, user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const attempts = await base44.entities.ExamAttempt.list("-created_date", 30);
      return attempts.filter((a) =>
        a.subject === displaySubject && a.unit_level === displayUnits && a.created_by === user.email
      );
    },
    enabled: !!user?.email && isUserLoaded,
    initialData: [],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const { data: allGenericExams = [] } = useQuery({
    queryKey: ['generic-exams-home'],
    queryFn: () => base44.entities.GenericExam.list(),
    enabled: isUserLoaded,
    staleTime: 10 * 60 * 1000
  });

  const { data: allModuleAExams = [] } = useQuery({
    queryKey: ['module-a-home'],
    queryFn: () => base44.entities.ModuleAExam.list(),
    enabled: isUserLoaded,
    staleTime: 10 * 60 * 1000
  });

  const { data: allModuleBExams = [] } = useQuery({
    queryKey: ['module-b-home'],
    queryFn: () => base44.entities.ModuleBExam.list(),
    enabled: isUserLoaded,
    staleTime: 10 * 60 * 1000
  });

  const { data: allModuleCExams = [] } = useQuery({
    queryKey: ['module-c-home'],
    queryFn: () => base44.entities.ModuleCExam.list(),
    enabled: isUserLoaded,
    staleTime: 10 * 60 * 1000
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsUserLoaded(true);

        if (currentUser?.selected_subject) {
          localStorage.setItem('selected_subject', currentUser.selected_subject);
        }
        if (currentUser?.selected_units) {
          localStorage.setItem('selected_units', currentUser.selected_units.toString());
        }
        if (currentUser?.full_name) {
          const firstName = currentUser.full_name.split(' ')[0];
          localStorage.setItem('user_first_name', firstName);
        }

        setCachedData({
          subject: currentUser?.selected_subject || 'אנגלית',
          units: currentUser?.selected_units || 3,
          name: currentUser?.full_name?.split(' ')[0] || 'תלמיד'
        });

        if (!currentUser?.onboarding_completed) {
          navigate(createPageUrl("Onboarding"));
        } else if (!currentUser?.subject_selected) {
          navigate(createPageUrl("SubjectSelection"));
        }

        await loadStudyGoals(currentUser);

        if (currentUser?.exam_date) {
          calculateTimeUntilExam(currentUser.exam_date);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setIsUserLoaded(true);
      }
    };
    loadUser();
  }, [navigate]);

  const loadStudyGoals = async (currentUser) => {
    if (!currentUser?.email || !currentUser?.selected_subject) return;
    
    try {
      const goals = await base44.entities.StudyGoals.filter({
        subject: currentUser.selected_subject,
        created_by: currentUser.email
      });

      if (goals.length > 0) {
        setStudyGoals(goals[0]);
      } else {
        const recommendedGoals = getRecommendedGoals(currentUser.selected_units, currentUser.exam_date);
        const newGoals = await base44.entities.StudyGoals.create({
          subject: currentUser.selected_subject,
          unit_level: currentUser.selected_units,
          exam_date: currentUser.exam_date,
          ...recommendedGoals
        });
        setStudyGoals(newGoals);
      }
    } catch (error) {
      console.error("Error loading study goals:", error);
    }
  };

  const getRecommendedGoals = (units, examDate) => {
    const recommendations = {
      3: {
        daily: { practice_minutes: 30, questions: 10 },
        weekly: { practice_sessions: 4, exams: 1, hours: 3.5 },
        monthly: { practice_sessions: 16, exams: 4, hours: 14 },
        totals: { total_practice_before_exam: 80, total_exams_before_exam: 15, total_hours_before_exam: 60 }
      },
      4: {
        daily: { practice_minutes: 45, questions: 15 },
        weekly: { practice_sessions: 5, exams: 1, hours: 5 },
        monthly: { practice_sessions: 20, exams: 5, hours: 20 },
        totals: { total_practice_before_exam: 120, total_exams_before_exam: 25, total_hours_before_exam: 100 }
      },
      5: {
        daily: { practice_minutes: 60, questions: 20 },
        weekly: { practice_sessions: 6, exams: 2, hours: 7 },
        monthly: { practice_sessions: 25, exams: 8, hours: 28 },
        totals: { total_practice_before_exam: 150, total_exams_before_exam: 35, total_hours_before_exam: 150 }
      }
    };

    return {
      daily_goal: recommendations[units]?.daily || recommendations[3].daily,
      weekly_goal: recommendations[units]?.weekly || recommendations[3].weekly,
      monthly_goal: recommendations[units]?.monthly || recommendations[3].monthly,
      recommended_totals: recommendations[units]?.totals || recommendations[3].totals,
      current_progress: {
        total_practice: 0,
        total_exams: 0,
        total_hours: 0,
        today_minutes: 0,
        this_week_sessions: 0,
        this_month_sessions: 0
      },
      missed_goals: []
    };
  };

  const calculateTimeUntilExam = (examDate) => {
    if (!examDate) return;
    const now = new Date();
    const exam = new Date(examDate);
    const days = differenceInDays(exam, now);
    const hours = differenceInHours(exam, now) % 24;
    setTimeUntilExam({ days, hours });
  };

  useEffect(() => {
    if (user?.exam_date) {
      const interval = setInterval(() => {
        calculateTimeUntilExam(user.exam_date);
      }, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.exam_date]);

  const weeklyStudyHours = React.useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPractice = (practiceAttempts || []).filter((a) =>
      a.created_date && new Date(a.created_date) >= sevenDaysAgo
    );

    const recentExams = (examAttempts || []).filter((a) =>
      a.created_date && new Date(a.created_date) >= sevenDaysAgo
    );

    const practiceMinutes = recentPractice.length * 5;
    const examMinutes = recentExams.length * 60;

    return Math.round((practiceMinutes + examMinutes) / 60 * 10) / 10;
  }, [practiceAttempts, examAttempts]);

  const weeklyProgress = studyGoals?.weekly_goal?.hours && studyGoals.weekly_goal.hours > 0 ?
    Math.min(100, (weeklyStudyHours || 0) / studyGoals.weekly_goal.hours * 100) :
    0;

  const currentSubjectStats = React.useMemo(() => {
    return {
      practiceSessionsCount: (practiceAttempts || []).length,
      topicsCompleted: 0,
      examsCompleted: (examAttempts || []).length
    };
  }, [practiceAttempts, examAttempts]);

  const totalProgress = studyGoals?.recommended_totals?.total_practice_before_exam > 0
    ? Math.min(100, (currentSubjectStats.practiceSessionsCount / studyGoals.recommended_totals.total_practice_before_exam) * 100)
    : 0;

  const examProgress = studyGoals?.recommended_totals?.total_exams_before_exam > 0
    ? Math.min(100, (currentSubjectStats.examsCompleted / studyGoals.recommended_totals.total_exams_before_exam) * 100)
    : 0;

  const handleStartRandomExam = async () => {
    setIsStartingExam(true);
    
    try {
      const firstModule = defaultModulesStructure[displaySubject]?.[displayUnits]?.[0];
      if (!firstModule) {
        alert('לא נמצאו מודולים זמינים');
        setIsStartingExam(false);
        return;
      }

      let exams = [];
      const moduleId = firstModule.id;

      if (displaySubject === 'אנגלית') {
        if (moduleId === "A") {
          exams = [...allModuleAExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits),
                  ...allGenericExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits && e.module_id === moduleId)];
        } else if (moduleId === "B") {
          exams = [...allModuleBExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits),
                  ...allGenericExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits && e.module_id === moduleId)];
        } else if (moduleId === "C") {
          exams = [...allModuleCExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level || e.units) === displayUnits),
                  ...allGenericExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits && e.module_id === moduleId)];
        } else {
          exams = allGenericExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits && e.module_id === moduleId);
        }
      } else {
        exams = allGenericExams.filter(e => e.subject === displaySubject && parseInt(e.unit_level) === displayUnits && e.module_id === moduleId);
      }

      if (exams.length === 0) {
        alert('לא נמצאו מבחנים זמינים');
        setIsStartingExam(false);
        return;
      }

      const attemptedIds = examAttempts.map(a => a.exam_id);
      const unattempted = exams.filter(e => !attemptedIds.includes(e.id));
      const randomExam = unattempted.length > 0 ? unattempted[Math.floor(Math.random() * unattempted.length)] : exams[Math.floor(Math.random() * exams.length)];

      window.location.href = createPageUrl("ExamGeneric") + `?examId=${encodeURIComponent(randomExam.id)}`;
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('שגיאה בטעינת המבחן');
      setIsStartingExam(false);
    }
  };

  const quickAccessCards = [
    {
      icon: BookOpen,
      title: "תרגול מהיר",
      description: "התחל תרגול עכשיו",
      color: "from-blue-500 to-blue-600",
      onClick: () => navigate(createPageUrl("Practice")),
      delay: 0.3,
      isPremium: false
    },
    {
      icon: FileCheck,
      title: "בחינות בגרות",
      description: "תרגל במבחנים מלאים",
      color: "from-green-500 to-green-600",
      onClick: () => navigate(createPageUrl("Exams")),
      delay: 0.4,
      isPremium: false
    },
    {
      icon: Target,
      title: "תרגול מותאם",
      description: "חזור על השאלות שטעית בהן",
      color: "from-blue-500 to-cyan-600",
      onClick: () => navigate(createPageUrl("CustomWeakPractice")),
      delay: 0.45,
      isPremium: true
    },
    {
      icon: Target,
      title: "מבחן מותאם מבגרויות",
      description: "בגרות מותאמת אישית על בסיס הטעויות שלך",
      color: "from-orange-500 to-red-600",
      onClick: () => navigate(createPageUrl("WeakExamSelection")),
      delay: 0.55,
      isPremium: true
    }
  ];

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">טוען...</p>
        </div>
      </div>
    );
  }

  const todayProgress = studyGoals?.current_progress?.today_minutes || 0;
  const todayGoal = studyGoals?.daily_goal?.practice_minutes || 30;
  const todayPercentage = Math.min(100, (todayProgress / todayGoal) * 100);

  const weeklySessionsProgress = studyGoals?.current_progress?.this_week_sessions || 0;
  const weeklySessionsGoal = studyGoals?.weekly_goal?.practice_sessions || 4;
  const weeklyPercentage = Math.min(100, (weeklySessionsProgress / weeklySessionsGoal) * 100);

  const daysLeft = timeUntilExam?.days ?? null;
  const questionsNeeded = studyGoals?.recommended_totals?.total_practice_before_exam - currentSubjectStats.practiceSessionsCount;
  const examsNeeded = studyGoals?.recommended_totals?.total_exams_before_exam - currentSubjectStats.examsCompleted;

  const dailyQuestionsNeeded = daysLeft && daysLeft > 0 && questionsNeeded > 0
    ? Math.ceil(questionsNeeded / daysLeft)
    : 0;

  const dailyExamsNeeded = daysLeft && daysLeft > 0 && examsNeeded > 0
    ? Math.ceil(examsNeeded / daysLeft)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`${headerColor} rounded-b-[2rem] p-4 shadow-xl mb-4 relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10">
          <button
            onClick={() => navigate(createPageUrl("SubjectSelection"))}
            className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-2 transition-colors w-full"
          >
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="text-right flex-1">
              <h1 className="text-base font-bold text-white">שלום, {displayName}!</h1>
              <p className="text-xs text-white/90">{displaySubject} • {displayUnits} יחידות</p>
            </div>
          </button>
        </div>
      </motion.div>

      <div className="px-4 space-y-3 max-w-screen-lg mx-auto">
        {/* ספירה לאחור לבגרות */}
        {timeUntilExam && timeUntilExam.days >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl p-4 shadow-xl text-white"
          >
            <div className="flex items-center justify-between">
              <div className="text-right flex-1">
                <div className="text-xs opacity-90 mb-1">זמן עד הבגרות</div>
                <div className="text-3xl font-black mb-1">
                  {timeUntilExam.days} ימים
                </div>
                <div className="text-xs opacity-80">
                  {displaySubject} • {displayUnits} יחידות
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Clock className="w-12 h-12" />
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}

        {/* מה צריך לעשות היום */}
        {studyGoals && daysLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-3">
              <div className="flex items-center gap-2 text-white">
                <Target className="w-5 h-5" />
                <h3 className="text-base font-bold">מה צריך לעשות היום כדי להצליח?</h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {questionsNeeded > 0 && dailyQuestionsNeeded > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-gray-900">תרגול יומי</div>
                    <div className="text-2xl font-black text-blue-600">{dailyQuestionsNeeded}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    שאלות ביום - סה"כ נותרו {questionsNeeded} שאלות ל-{daysLeft} ימים
                  </div>
                </div>
              )}

              {examsNeeded > 0 && dailyExamsNeeded > 0 && (
                <div className="bg-green-50 rounded-xl p-3 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-gray-900">בגרויות מלאות</div>
                    <div className="text-2xl font-black text-green-600">
                      {dailyExamsNeeded > 0.5 ? `${dailyExamsNeeded}` : '1 בשבוע'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {dailyExamsNeeded > 0.5 
                      ? `בגרויות ביום - נותרו ${examsNeeded} מבחנים` 
                      : `נותרו ${examsNeeded} מבחנים בגרות`}
                  </div>
                </div>
              )}

              {todayGoal && (
                <div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-gray-900">זמן למידה יומי</div>
                    <div className="text-2xl font-black text-amber-600">{todayGoal}</div>
                  </div>
                  <div className="text-xs text-gray-600">דקות ביום</div>
                  <div className="h-2 bg-amber-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${todayPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {todayProgress} / {todayGoal} דקות היום
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* קיצורי דרך */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3">
            <h3 className="text-base font-bold text-white text-center">גישה מהירה</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            {quickAccessCards.map((card, idx) => {
              const Icon = card.icon;
              const isLocked = card.isPremium && !user?.is_premium;
              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: card.delay, duration: 0.3 }}
                  whileHover={{ scale: isLocked ? 1 : 1.03 }}
                  whileTap={{ scale: isLocked ? 1 : 0.97 }}
                  onClick={isLocked ? () => navigate(createPageUrl("Premium")) : card.onClick}
                  className={`bg-gradient-to-r ${card.color} rounded-xl p-3 shadow-md text-white text-right hover:shadow-lg transition-all relative ${isLocked ? 'opacity-75' : ''}`}
                >
                  {card.isPremium && (
                    <Crown className="w-3 h-3 absolute top-2 left-2 text-yellow-300" />
                  )}
                  <Icon className="w-6 h-6 mb-2" />
                  <h3 className="text-xs font-bold mb-0.5">{card.title}</h3>
                  <p className="text-[10px] opacity-90 leading-tight">{card.description}</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ההתקדמות הכוללת */}
        {studyGoals?.recommended_totals && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3">
              <div className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-base font-bold">ההתקדמות הכוללת שלך</h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700 font-medium">תרגולים</span>
                  <span className="text-sm font-bold text-blue-600">
                    {currentSubjectStats.practiceSessionsCount} / {studyGoals.recommended_totals.total_practice_before_exam}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700 font-medium">בגרויות</span>
                  <span className="text-sm font-bold text-green-600">
                    {currentSubjectStats.examsCompleted} / {studyGoals.recommended_totals.total_exams_before_exam}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${examProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <Button
                onClick={handleStartRandomExam}
                disabled={isStartingExam}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 font-bold rounded-xl shadow-md"
              >
                {isStartingExam ? (
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                ) : (
                  <FileCheck className="w-5 h-5 ml-2" />
                )}
                התחל בגרות אקראית
              </Button>
            </div>
          </motion.div>
        )}

        {/* Alert if behind schedule */}
        {studyGoals && weeklyProgress < 50 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Alert className="bg-red-50 border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-xs">
                <strong>שים לב!</strong> אתה מתחת ליעד השבועי.
                תרגל עוד {(((studyGoals.weekly_goal?.hours || 4) - (weeklyStudyHours || 0))).toFixed(1)} שעות השבוע
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </div>
    </div>
  );
}