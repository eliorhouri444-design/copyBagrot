import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, PlayCircle, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import OverallMasteryCard from "@/components/mastery/OverallMasteryCard";
import { useMasteryData } from "@/components/mastery/useMasteryData";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import DailyPlanCard from "@/components/home/DailyPlanCard";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [practiceAttempts, setPracticeAttempts] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [modules, setModules] = useState([]);

  // Track referral clicks when someone opens a shared link
  useEffect(() => {
    const trackReferral = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode) {
        try {
          // Check if this visitor already clicked (using localStorage)
          const clickedRefs = JSON.parse(localStorage.getItem('clicked_refs') || '[]');
          
          if (!clickedRefs.includes(refCode)) {
            // Record the click
            await base44.entities.ReferralClick.create({
              referral_code: refCode,
              clicked_at: new Date().toISOString(),
              visitor_id: Math.random().toString(36).substring(7)
            });
            
            // Mark as clicked
            clickedRefs.push(refCode);
            localStorage.setItem('clicked_refs', JSON.stringify(clickedRefs));
          }
          
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error("Error tracking referral:", error);
        }
      }
    };
    
    trackReferral();
  }, []);

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

      const [allTopics, allAttempts, allExamAttempts, allModules] = await Promise.all([
      base44.entities.TopicNew.list(),
      base44.entities.AttemptNew.list("-created_date", 2000),
      base44.entities.ExamAttempt.list("-created_date", 100),
      base44.entities.ModuleDefinition.list()]
      );

      const relevantTopics = allTopics.filter(
        (t) => t.subject_id === subject && parseInt(t.unit_level) === units && t.is_active
      );
      setTopics(relevantTopics);

      const userAttempts = allAttempts.filter(
        (a) => a.created_by === currentUser.email &&
        a.subject_id === subject &&
        parseInt(a.unit_level) === units
      );
      setPracticeAttempts(userAttempts);

      const userExamAttempts = allExamAttempts.filter(
        (e) => e.subject === subject && parseInt(e.unit_level) === units
      );
      setExamAttempts(userExamAttempts);

      // בניית רשימת מודולים (כולל ברירות מחדל)
      const defaultModulesStructure = {
        "אנגלית": {
          3: [
          { id: "C", title: "מודול C", color: "from-purple-500 to-purple-600" },
          { id: "A", title: "מודול A", color: "from-blue-500 to-blue-600" },
          { id: "B", title: "מודול B", color: "from-cyan-500 to-cyan-600" }],

          4: [
          { id: "C", title: "מודול C", color: "from-blue-500 to-blue-600" },
          { id: "D", title: "מודול D", color: "from-orange-500 to-orange-600" },
          { id: "E", title: "מודול E", color: "from-pink-500 to-pink-600" }],

          5: [
          { id: "E", title: "מודול E", color: "from-indigo-500 to-indigo-600" },
          { id: "F", title: "מודול F", color: "from-rose-500 to-rose-600" },
          { id: "G", title: "מודול G", color: "from-green-500 to-green-600" }]

        },
        "מתמטיקה": {
          3: [
          { id: "801", title: "שאלון 801", color: "from-purple-500 to-purple-600" },
          { id: "802", title: "שאלון 802", color: "from-blue-500 to-blue-600" }],

          4: [
          { id: "803", title: "שאלון 803", color: "from-green-500 to-green-600" },
          { id: "804", title: "שאלון 804", color: "from-purple-500 to-purple-600" }],

          5: [
          { id: "805", title: "שאלון 805", color: "from-indigo-500 to-indigo-600" },
          { id: "806", title: "שאלון 806", color: "from-purple-500 to-purple-600" }]

        }
      };

      const defaultMods = defaultModulesStructure[subject]?.[units] || [];
      const customMods = allModules.filter((m) => m.subject === subject && parseInt(m.unit_level) === units);

      const modulesMap = new Map();
      defaultMods.forEach((mod) => modulesMap.set(mod.id, mod));
      customMods.forEach((mod) => {
        const existing = modulesMap.get(mod.module_id);
        if (existing) {
          modulesMap.set(mod.module_id, { ...existing, ...mod, id: mod.module_id });
        } else {
          modulesMap.set(mod.module_id, { ...mod, id: mod.module_id });
        }
      });

      const finalModules = Array.from(modulesMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
      setModules(finalModules);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const readinessData = useReadinessCalculator(user, topics, practiceAttempts, examAttempts);

  // מדדי Mastery מחושבים דינמית
  const { overallMastery, isLoading: masteryLoading } = useMasteryData(
    user?.selected_subject, 
    user?.selected_units
  );

  const daysUntilExam = user?.exam_date ?
  Math.max(0, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24))) :
  90;



  const lastActivity = useMemo(() => {
    // מצא את התרגול האחרון שלא הושלם
    const sortedPractice = [...practiceAttempts].
    filter((a) => !a.is_completed).
    sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    // מצא את הבגרות האחרונה שלא הושלמה
    const sortedExams = [...examAttempts].
    filter((e) => !e.is_completed).
    sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    const incompletePractice = sortedPractice[0];
    const incompleteExam = sortedExams[0];

    if (!incompletePractice && !incompleteExam) return null;

    // בחר את האחרון לפי תאריך
    if (!incompleteExam || incompletePractice && new Date(incompletePractice.created_date) > new Date(incompleteExam.created_date)) {
      return {
        type: 'practice',
        topic: topics.find((t) => t.topic_id === incompletePractice.topic_id)?.name || 'תרגול',
        sessionId: incompletePractice.session_id,
        topicId: incompletePractice.topic_id
      };
    } else {
      // מצא את המודול של הבגרות
      const examModule = modules.find((m) => incompleteExam.module_id === m.id);
      return {
        type: 'exam',
        topic: examModule?.title || incompleteExam.module_id || 'שאלון',
        examId: incompleteExam.exam_id,
        moduleId: incompleteExam.module_id
      };
    }
  }, [practiceAttempts, examAttempts, topics, modules]);

  const toggleTask = (taskId) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter((t) => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 from-blue-500 to-indigo-500 flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">שלום, {user?.full_name?.split(' ')[0] || 'תלמיד'}! 👋</h1>
          <p className="text-[11px] text-white/90">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* מוכנות כללית - כרטיס מאוחד */}
        <OverallMasteryCard 
          overallMastery={overallMastery} 
          isLoading={masteryLoading} 
        />

        {/* נושאים ושאלונים + משימות היום */}
        <DailyPlanCard
          readinessData={readinessData}
          topics={topics}
          modules={modules}
          practiceAttempts={practiceAttempts}
          examAttempts={examAttempts}
          isPremium={user?.is_premium}
          completedTasks={completedTasks}
          onToggleTask={toggleTask} />

        {/* המשך מאיפה שהפסקת */}
        {lastActivity &&
        <CardSimple delay={0.3}>
            <CardTitle icon={PlayCircle}>המשך מאיפה שהפסקת</CardTitle>
            <div className="mb-3">
              <div className="text-[15px] font-bold text-[#2B2B2B]">{lastActivity.topic}</div>
              <div className="text-[13px] text-[#6E6E6E]">{lastActivity.type === 'practice' ? 'תרגול נושא' : 'בגרות'}</div>
            </div>

            <Button
            onClick={() => {
              if (lastActivity.type === 'practice') {
                navigate(`${createPageUrl("TopicPracticeNew")}?topicId=${lastActivity.topicId}&setNumber=1`);
              } else {
                sessionStorage.setItem('currentExamId', lastActivity.examId);
                navigate(`${createPageUrl("ExamGeneric")}?examId=${lastActivity.examId}`);
              }
            }}
            className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]">

              <PlayCircle className="w-5 h-5 ml-2" />
              המשך
            </Button>
          </CardSimple>
        }

      </div>
    </div>);

}