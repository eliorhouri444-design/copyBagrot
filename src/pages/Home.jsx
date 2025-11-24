import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, PlayCircle, CheckCircle, ChevronDown, User, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import WhatToStudyCard from "@/components/home/WhatToStudyCard";
import { motion } from "framer-motion";

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
        base44.entities.ModuleDefinition.list()
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

      // בניית רשימת מודולים (כולל ברירות מחדל)
      const defaultModulesStructure = {
        "אנגלית": {
          3: [
            { id: "C", title: "מודול C", color: "from-purple-500 to-purple-600" },
            { id: "A", title: "מודול A", color: "from-blue-500 to-blue-600" },
            { id: "B", title: "מודול B", color: "from-cyan-500 to-cyan-600" }
          ],
          4: [
            { id: "C", title: "מודול C", color: "from-blue-500 to-blue-600" },
            { id: "D", title: "מודול D", color: "from-orange-500 to-orange-600" },
            { id: "E", title: "מודול E", color: "from-pink-500 to-pink-600" }
          ],
          5: [
            { id: "E", title: "מודול E", color: "from-indigo-500 to-indigo-600" },
            { id: "F", title: "מודול F", color: "from-rose-500 to-rose-600" },
            { id: "G", title: "מודול G", color: "from-green-500 to-green-600" }
          ]
        },
        "מתמטיקה": {
          3: [
            { id: "801", title: "שאלון 801", color: "from-purple-500 to-purple-600" },
            { id: "802", title: "שאלון 802", color: "from-blue-500 to-blue-600" }
          ],
          4: [
            { id: "803", title: "שאלון 803", color: "from-green-500 to-green-600" },
            { id: "804", title: "שאלון 804", color: "from-purple-500 to-purple-600" }
          ],
          5: [
            { id: "805", title: "שאלון 805", color: "from-indigo-500 to-indigo-600" },
            { id: "806", title: "שאלון 806", color: "from-purple-500 to-purple-600" }
          ]
        }
      };

      const defaultMods = defaultModulesStructure[subject]?.[units] || [];
      const customMods = allModules.filter(m => m.subject === subject && parseInt(m.unit_level) === units);
      
      const modulesMap = new Map();
      defaultMods.forEach(mod => modulesMap.set(mod.id, mod));
      customMods.forEach(mod => {
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

  const daysUntilExam = user?.exam_date 
    ? Math.max(0, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : 90;

  const dailyTasks = useMemo(() => {
    if (!readinessData) return [];
    return [
      { id: "practice", title: `לפתור ${readinessData.daily.questions} שאלות` },
      { id: "learn", title: `ללמוד ${readinessData.daily.topics} נושאים` },
      { id: "review", title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות` }
    ];
  }, [readinessData]);

  const lastActivity = useMemo(() => {
    if (practiceAttempts.length === 0 && examAttempts.length === 0) return null;
    const lastPractice = practiceAttempts[0];
    const lastExam = examAttempts[0];
    const mostRecent = !lastExam || (lastPractice && new Date(lastPractice.created_date) > new Date(lastExam.created_date))
      ? { type: 'practice', topic: topics.find(t => t.topic_id === lastPractice?.topic_id)?.name || 'תרגול' }
      : { type: 'exam', topic: 'בגרות מלאה' };
    return mostRecent;
  }, [practiceAttempts, examAttempts, topics]);

  const handleToggleTask = (taskIdx) => {
    const taskId = dailyTasks[taskIdx]?.id;
    if (!taskId) return;
    
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter(t => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 mb-6 flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">שלום, {user?.full_name?.split(' ')[0] || 'תלמיד'}! 👋</h1>
          <p className="text-[11px] text-white/70">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* 1. המצב שלך */}
        <CardSimple delay={0.05}>
          <CardTitle icon={Target}>המצב שלך</CardTitle>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatCard value={`${readinessData?.scores.overall || 0}%`} label="מוכנות" color="#3B82F6" />
            <StatCard value={daysUntilExam} label="ימים לבגרות" color="#3B82F6" />
            <StatCard value={user?.target_score || 85} label="ציון מטרה" color="#3B82F6" />
          </div>

          <Button
            onClick={() => navigate(createPageUrl("Statistics"))}
            variant="outline"
            className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#3B82F6]"
          >
            ראה פירוט מלא
          </Button>
        </CardSimple>

        {/* 2. מה לעשות היום */}
        <CardSimple delay={0.1}>
          <CardTitle>מה לעשות היום</CardTitle>
          
          <div className="space-y-2">
            {dailyTasks.map((task, idx) => {
              const isCompleted = completedTasks.includes(task.id);
              return (
                <motion.button
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  onClick={() => handleToggleTask(idx)}
                  className={`w-full text-right p-3 rounded-lg transition-all border ${
                    isCompleted 
                      ? 'bg-white border-[#E9F0FF] opacity-60' 
                      : 'bg-white border-[#3B82F6] hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isCompleted ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#3B82F6]'
                    }`}>
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 bg-white rounded-full"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-[14px] font-semibold ${isCompleted ? 'line-through text-[#6E6E6E]' : 'text-[#2B2B2B]'}`}>
                        {task.title}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </CardSimple>

        {/* 3. המשך למידה */}
        <CardSimple delay={0.15}>
          <CardTitle>המשך למידה</CardTitle>
          
          <Button
            onClick={() => {
              if (lastActivity) {
                if (lastActivity.type === 'practice') {
                  navigate(createPageUrl("Practice"));
                } else {
                  navigate(createPageUrl("Exams"));
                }
              } else {
                navigate(createPageUrl("Practice"));
              }
            }}
            className="w-full h-16 bg-gradient-to-r from-[#3B82F6] to-[#1E40AF] hover:from-blue-700 hover:to-blue-900 text-white font-bold rounded-[14px] text-[16px] flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6" />
            המשך איפה שהפסקת
          </Button>
        </CardSimple>
      </div>
    </div>
  );
}