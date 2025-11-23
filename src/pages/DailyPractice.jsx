import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckCircle, 
  Clock, 
  Target, 
  Flame, 
  Star,
  BookOpen,
  Trophy,
  Zap,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function DailyPracticePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todayPractice, refetch } = useQuery({
    queryKey: ['daily-practice', today, user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const practices = await base44.entities.DailyPractice.filter({
        date: today,
        user_email: user.email
      });
      
      if (practices.length === 0) {
        // Generate tasks for today if not exist
        await base44.functions.invoke('generateDailyTasks', {});
        
        // Refetch after generation
        const newPractices = await base44.entities.DailyPractice.filter({
          date: today,
          user_email: user.email
        });
        
        return newPractices[0] || null;
      }
      
      return practices[0];
    },
    enabled: !!user?.email,
    staleTime: 30000
  });
  
  const handleCompleteTask = async (taskId) => {
    if (!todayPractice) return;
    
    const updatedTasks = todayPractice.tasks.map(task => {
      if (task.task_id === taskId && task.status === 'pending') {
        return {
          ...task,
          status: 'done',
          completed_at: new Date().toISOString()
        };
      }
      return task;
    });
    
    const completedCount = updatedTasks.filter(t => t.status === 'done').length;
    const totalTasks = updatedTasks.length;
    const isAllCompleted = completedCount === totalTasks;
    
    await base44.entities.DailyPractice.update(todayPractice.id, {
      tasks: updatedTasks,
      completed_questions: todayPractice.completed_questions + (updatedTasks.find(t => t.task_id === taskId)?.question_count || 0),
      is_completed: isAllCompleted,
      completion_time: isAllCompleted ? new Date().toISOString() : null
    });
    
    refetch();
    
    // Trigger completion notification if all done
    if (isAllCompleted) {
      await base44.functions.invoke('sendDailyNotifications', {});
    }
  };
  
  const getTaskIcon = (taskType) => {
    switch (taskType) {
      case 'review': return BookOpen;
      case 'new_content': return Star;
      case 'quiz': return Target;
      case 'exam': return Trophy;
      case 'bonus': return Zap;
      default: return CheckCircle;
    }
  };
  
  const getTaskTitle = (task) => {
    if (task.chapter_name) {
      return task.task_type === 'review' 
        ? `חזרה: ${task.chapter_name}`
        : `${task.chapter_name}`;
    }
    
    switch (task.task_type) {
      case 'review': return 'חזרה על חומר';
      case 'new_content': return 'תוכן חדש';
      case 'quiz': return 'בוחן יומי';
      case 'exam': return 'סימולציית מבחן';
      case 'bonus': return 'משימת בונוס 🎁';
      default: return 'משימה';
    }
  };
  
  if (!user || !todayPractice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  
  const progress = (todayPractice.completed_questions / todayPractice.total_questions) * 100;
  const completedTasks = todayPractice.tasks.filter(t => t.status === 'done').length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 pb-24 animate-background-flow">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">התרגול היומי שלך</h1>
            <p className="text-white/90">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </motion.div>
      
      <div className="px-6 space-y-6">
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 animate-hover-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">יעד היום</h3>
                <p className="text-sm text-gray-600">{todayPractice.total_questions} שאלות</p>
              </div>
            </div>
            
            {todayPractice.streak_days > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
                <Flame className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-bold text-orange-900">{todayPractice.streak_days} ימים</span>
              </div>
            )}
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">התקדמות</span>
              <span className="text-lg font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-blue-100" />
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{todayPractice.completed_questions} הושלמו</span>
            <span>{todayPractice.total_questions - todayPractice.completed_questions} נותרו</span>
          </div>
        </motion.div>
        
        {/* Tasks List */}
        <div className="space-y-3">
          {todayPractice.tasks.map((task, idx) => {
            const TaskIcon = getTaskIcon(task.task_type);
            const isDone = task.status === 'done';
            
            return (
              <motion.div
                key={task.task_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
                className={`bg-white rounded-2xl shadow-lg p-5 animate-hover-card ${isDone ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDone ? 'bg-green-100' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                    {isDone ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <TaskIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-gray-900 mb-1">
                      {getTaskTitle(task)}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{task.question_count} שאלות</span>
                    </div>
                    
                    {!isDone ? (
                      <Button
                        onClick={() => handleCompleteTask(task.task_id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      >
                        התחל תרגול
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 font-semibold text-sm animate-task-bounce">
                        <CheckCircle className="w-4 h-4" />
                        <span>הושלם!</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Completion Message */}
        {todayPractice.is_completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white text-center animate-task-bounce"
          >
            <Trophy className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">יום מושלם! 🎉</h3>
            <p className="text-white/90">סיימת את כל המשימות להיום!</p>
            <p className="text-sm text-white/80 mt-2">
              רצף של {todayPractice.streak_days} ימים
            </p>
          </motion.div>
        )}
        
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center animate-hover-card">
            <div className="text-3xl font-bold text-blue-600">{completedTasks}</div>
            <div className="text-sm text-gray-600">משימות הושלמו</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center animate-hover-card">
            <div className="text-3xl font-bold text-blue-600">{todayPractice.streak_days}</div>
            <div className="text-sm text-gray-600">ימים רצופים</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}