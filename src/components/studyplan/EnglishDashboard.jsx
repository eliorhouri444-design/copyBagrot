import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Target, BookOpen, Clock, AlertTriangle, CheckCircle, 
  Play, Brain, Volume2, PenTool, Zap, TrendingUp,
  Calendar, Award, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { differenceInDays } from 'date-fns';
import {
  buildDailyPlan,
  calculateMovingAverage,
  identifyWeakAreas,
  getSkillName,
  SKILL_TYPES
} from './EnglishStudyEngine';

export default function EnglishDashboard({ 
  user, 
  attempts = [], 
  examAttempts = [],
  vocabularyProgress = [],
  onStartTask,
  onBack
}) {
  const [dailyPlan, setDailyPlan] = useState(null);
  const [completedTasks, setCompletedTasks] = useState([]);

  // חישוב נתונים
  const stats = useMemo(() => {
    const targetScore = user?.target_score || 85;
    const examDate = user?.exam_date ? new Date(user.exam_date) : null;
    const daysUntilExam = examDate ? differenceInDays(examDate, new Date()) : 60;
    const moduleLevel = user?.selected_units === 5 ? 'E' : user?.selected_units === 4 ? 'C' : 'A';
    
    // חישוב ממוצע נע מ-5 תרגולים אחרונים
    const recentScores = examAttempts
      .filter(e => e.score_percent)
      .slice(-5)
      .map(e => e.score_percent);
    const currentAverage = calculateMovingAverage(recentScores);
    
    // זיהוי נקודות חלשות
    const weakAreas = identifyWeakAreas(attempts);
    
    return {
      targetScore,
      currentAverage: currentAverage || 65,
      gap: targetScore - (currentAverage || 65),
      daysUntilExam,
      moduleLevel,
      weakAreas,
      recentScores
    };
  }, [user, attempts, examAttempts]);

  // בניית תוכנית יומית
  useEffect(() => {
    const dayOfWeek = new Date().getDay();
    const plan = buildDailyPlan({
      dayOfWeek,
      targetScore: stats.targetScore,
      currentAverage: stats.currentAverage,
      daysUntilExam: stats.daysUntilExam,
      moduleLevel: stats.moduleLevel,
      weakAreas: stats.weakAreas,
      vocabularyWords: vocabularyProgress,
      completedToday: completedTasks
    });
    setDailyPlan(plan);
  }, [stats, vocabularyProgress, completedTasks]);

  const handleCompleteTask = (taskId) => {
    setCompletedTasks(prev => [...prev, taskId]);
  };

  const getTaskIcon = (type) => {
    const icons = {
      [SKILL_TYPES.VOCABULARY]: Brain,
      [SKILL_TYPES.GRAMMAR]: PenTool,
      [SKILL_TYPES.READING]: BookOpen,
      [SKILL_TYPES.LISTENING]: Volume2,
      [SKILL_TYPES.WRITING]: PenTool,
      'simulation': Target
    };
    return icons[type] || Zap;
  };

  const getTaskColor = (type, priority) => {
    if (priority === 'critical') return 'from-red-500 to-orange-500';
    if (priority === 'high') return 'from-blue-500 to-indigo-500';
    
    const colors = {
      [SKILL_TYPES.VOCABULARY]: 'from-purple-500 to-pink-500',
      [SKILL_TYPES.GRAMMAR]: 'from-green-500 to-teal-500',
      [SKILL_TYPES.READING]: 'from-blue-500 to-cyan-500',
      [SKILL_TYPES.LISTENING]: 'from-amber-500 to-orange-500',
      [SKILL_TYPES.WRITING]: 'from-rose-500 to-pink-500',
      'simulation': 'from-indigo-500 to-purple-500'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  if (!dailyPlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header עם סטטוס */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
        
        {onBack && (
          <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">התוכנית שלך להיום</h2>
              <p className="text-white/80 text-sm">שאלון {stats.moduleLevel} | {stats.daysUntilExam} ימים לבגרות</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black">{stats.currentAverage}</div>
              <div className="text-xs text-white/80">ציון נוכחי</div>
            </div>
          </div>
          
          <div className="bg-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">היעד שלך: {stats.targetScore}</span>
              <span className="text-sm font-bold">
                {stats.gap > 0 ? `עוד ${stats.gap} נקודות` : '🎉 עברת את היעד!'}
              </span>
            </div>
            <Progress 
              value={(stats.currentAverage / stats.targetScore) * 100} 
              className="h-3 bg-white/30"
            />
          </div>
        </div>
      </motion.div>

      {/* התראה אם לא עומדים בקצב */}
      {dailyPlan.alert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">שים לב</h4>
              <p className="text-amber-800 text-sm">{dailyPlan.alert.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* נקודות חלשות שזוהו */}
      {stats.weakAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-900">נושאים לחיזוק</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.weakAreas.slice(0, 3).map((area, idx) => (
              <div 
                key={idx}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  area.priority === 'high' 
                    ? 'bg-red-200 text-red-800' 
                    : 'bg-orange-200 text-orange-800'
                }`}
              >
                {getSkillName(area.skill)} ({area.accuracy}%)
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* רשימת משימות */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">המשימות שלך</h3>
          <span className="text-sm text-gray-500">
            {dailyPlan.estimatedMinutes} דקות סה"כ
          </span>
        </div>
        
        {dailyPlan.tasks.map((task, idx) => {
          const TaskIcon = getTaskIcon(task.type);
          const isCompleted = completedTasks.includes(task.id);
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white rounded-xl border-2 overflow-hidden ${
                isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${getTaskColor(task.type, task.priority)}`} />
              
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTaskColor(task.type, task.priority)} flex items-center justify-center flex-shrink-0`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <TaskIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{task.duration} דק'</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    
                    {task.isReview && task.weakArea && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <TrendingUp className="w-3 h-3" />
                        המערכת זיהתה חולשה
                      </div>
                    )}
                  </div>
                </div>
                
                {!isCompleted && (
                  <Button
                    onClick={() => onStartTask ? onStartTask(task) : handleCompleteTask(task.id)}
                    className={`w-full mt-4 bg-gradient-to-r ${getTaskColor(task.type, task.priority)} text-white font-bold`}
                  >
                    <Play className="w-4 h-4 ml-2" />
                    התחל
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* סטטיסטיקות */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
          <Brain className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-900">
            {vocabularyProgress.filter(w => w.isMastered).length}
          </div>
          <div className="text-xs text-purple-700">מילים נשלטות</div>
        </div>
        
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
          <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-900">
            {examAttempts.length}
          </div>
          <div className="text-xs text-blue-700">סימולציות</div>
        </div>
        
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">
            {examAttempts.filter(e => e.score_percent >= stats.targetScore).length}
          </div>
          <div className="text-xs text-green-700">עברו יעד</div>
        </div>
      </motion.div>
    </div>
  );
}