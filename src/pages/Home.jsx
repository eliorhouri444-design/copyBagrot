import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, ChevronLeft, PlayCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [practiceAttempts, setPracticeAttempts] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);

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

  const daysUntilExam = user?.exam_date 
    ? Math.max(0, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : 90;

  const dailyTasks = useMemo(() => {
    if (!readinessData) return [];

    return [
      { id: "practice", title: `לפתור ${readinessData.daily.questions} שאלות`, completed: false },
      { id: "learn", title: `ללמוד ${readinessData.daily.topics} נושאים`, completed: false },
      { id: "review", title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות`, completed: false }
    ];
  }, [readinessData]);

  const lastActivity = useMemo(() => {
    if (practiceAttempts.length === 0 && examAttempts.length === 0) return null;

    const lastPractice = practiceAttempts[0];
    const lastExam = examAttempts[0];

    const mostRecent = !lastExam || (lastPractice && new Date(lastPractice.created_date) > new Date(lastExam.created_date))
      ? { type: 'practice', topic: topics.find(t => t.topic_id === lastPractice?.topic_id)?.name || 'תרגול', id: lastPractice?.topic_id }
      : { type: 'exam', topic: 'בגרות מלאה', id: lastExam?.id };

    return mostRecent;
  }, [practiceAttempts, examAttempts, topics]);

  const toggleTask = (taskId) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter(t => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">שלום, {user?.full_name?.split(' ')[0] || 'תלמיד'}! 👋</h1>
          <p className="text-base text-white/90">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </div>
      </motion.div>

      <div className="px-6 space-y-4 pb-4">
        {/* 1️⃣ מה המצב שלך - 3 נתונים בלבד */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <h3 className="text-base font-bold text-gray-900 mb-4">מה המצב שלך</h3>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-4xl font-black text-blue-600 mb-1">{readinessData?.scores.overall || 0}%</div>
              <div className="text-xs text-gray-600">מוכנות</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-purple-600 mb-1">{daysUntilExam}</div>
              <div className="text-xs text-gray-600">ימים לבגרות</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-green-600 mb-1">{user?.target_score || 85}</div>
              <div className="text-xs text-gray-600">ציון מטרה</div>
            </div>
          </div>

          <Button
            onClick={() => navigate(createPageUrl("Statistics"))}
            variant="outline"
            className="w-full h-10 text-sm rounded-xl border-2 border-gray-200"
          >
            ראה פירוט מלא
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Button>
        </motion.div>

        {/* 2️⃣ מה לעשות היום */}
        {dailyTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <h3 className="text-base font-bold text-gray-900 mb-3">מה לעשות היום</h3>
            
            <div className="space-y-2 mb-4">
              {dailyTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    completedTasks.includes(task.id)
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      completedTasks.includes(task.id)
                        ? 'bg-green-500 border-green-500' 
                        : 'bg-white border-blue-400'
                    }`}>
                      {completedTasks.includes(task.id) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm font-semibold ${
                      completedTasks.includes(task.id) ? 'text-green-800 line-through' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl"
            >
              התחל עכשיו
            </Button>
          </motion.div>
        )}

        {/* 3️⃣ המשך מאיפה שהפסקת */}
        {lastActivity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-5 border-2 border-purple-200"
          >
            <div className="mb-3">
              <div className="text-xs text-gray-600 mb-1">התחלת</div>
              <div className="text-lg font-bold text-gray-900">{lastActivity.topic}</div>
            </div>

            <Button
              onClick={() => {
                if (lastActivity.type === 'practice') {
                  navigate(createPageUrl("Practice"));
                } else {
                  navigate(createPageUrl("Exams"));
                }
              }}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl"
            >
              <PlayCircle className="w-5 h-5 ml-2" />
              המשך עכשיו
            </Button>
          </motion.div>
        )}

        {/* 4️⃣ מקצועות - 3 בלבד */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <h3 className="text-base font-bold text-gray-900 mb-3">המקצועות שלי</h3>
          
          <div className="space-y-2 mb-3">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-gray-900">{user?.selected_subject || 'אנגלית'}</div>
                  <div className="text-xs text-gray-600">{user?.selected_units || 3} יחידות</div>
                </div>
                <div className="text-3xl font-black text-blue-600">
                  {readinessData?.scores.overall || 0}%
                </div>
              </div>
              <Progress value={readinessData?.scores.overall || 0} className="h-2" />
            </div>
          </div>

          <Button
            onClick={() => navigate(createPageUrl("SubjectSelection"))}
            variant="outline"
            className="w-full h-10 text-sm rounded-xl border-2 border-gray-200"
          >
            ראה כל המקצועות
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}