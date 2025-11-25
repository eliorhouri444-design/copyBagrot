import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  Loader2, Target, CheckCircle, BookOpen, Repeat, AlertTriangle, 
  Clock, Play, Zap, Crown, Lock, TrendingUp, FileCheck, 
  Calendar, Award, ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    completedQuestions: 0,
    totalExams: 0,
    completedExams: 0,
    weakTopics: 0,
    activeMistakes: 0
  });

  const isPremium = user?.is_premium;

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Load real stats
        const [attempts, sessions, weakTopics] = await Promise.all([
          base44.entities.AttemptNew.filter({ created_by: currentUser.email }, '-created_date', 500),
          base44.entities.PracticeSessionNew.filter({ created_by: currentUser.email, is_completed: true }, '-created_date', 100),
          base44.entities.WeakTopic.filter({}, null, 50)
        ]);

        const correctAttempts = attempts.filter(a => a.status === 'correct').length;
        const wrongAttempts = attempts.filter(a => a.status === 'incorrect' || a.status === 'partial').length;

        setStats({
          totalQuestions: 700,
          completedQuestions: attempts.length,
          totalExams: 6,
          completedExams: sessions.filter(s => s.session_type === 'exam').length,
          weakTopics: weakTopics.length,
          activeMistakes: wrongAttempts
        });

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate readiness
  const practiceProgress = stats.totalQuestions > 0 ? Math.round((stats.completedQuestions / stats.totalQuestions) * 100) : 0;
  const examProgress = stats.totalExams > 0 ? Math.round((stats.completedExams / stats.totalExams) * 100) : 0;
  const overallReadiness = Math.round((practiceProgress * 0.5 + examProgress * 0.3 + Math.max(0, 100 - stats.weakTopics * 10) * 0.2));

  // Days until exam
  const examDate = user?.exam_date ? new Date(user.exam_date) : null;
  const daysUntilExam = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24))) : null;

  // Daily limits for free users
  const freeUserLimits = {
    questionsPerDay: 10,
    topicsPerDay: 1,
    mistakesPerDay: 3
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const displaySubject = user?.selected_subject || 'אנגלית';
  const displayUnits = user?.selected_units || 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-b-[2rem] p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between text-white mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold">התוכנית האישית לבגרות</h1>
            <p className="text-sm opacity-90">{displaySubject} • {displayUnits} יחידות</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Readiness Gauge */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center"
        >
          <div className="relative w-32 h-32 mx-auto mb-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <circle 
                cx="18" cy="18" r="15.9" fill="none" 
                stroke="white" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${overallReadiness}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{overallReadiness}%</span>
            </div>
          </div>
          <p className="text-white font-semibold text-lg">מוכנות לבגרות</p>
          <p className="text-white/80 text-sm mt-1">מבוסס על תרגול, שאלונים ותוכנית אישית</p>
          
          <div className="flex justify-around mt-4 text-white/90 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg">{practiceProgress}%</div>
              <div className="text-xs opacity-80">תרגול</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{examProgress}%</div>
              <div className="text-xs opacity-80">שאלונים</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{Math.max(0, 100 - stats.weakTopics * 10)}%</div>
              <div className="text-xs opacity-80">שליטה</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 space-y-4">
        {/* Timeline Alert */}
        {daysUntilExam !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 flex items-center gap-3 ${
              daysUntilExam <= 7 ? 'bg-red-100 border-2 border-red-300' : 
              daysUntilExam <= 14 ? 'bg-yellow-100 border-2 border-yellow-300' : 
              'bg-green-100 border-2 border-green-300'
            }`}
          >
            <Calendar className={`w-8 h-8 ${
              daysUntilExam <= 7 ? 'text-red-600' : 
              daysUntilExam <= 14 ? 'text-yellow-600' : 'text-green-600'
            }`} />
            <div className="flex-1">
              <div className="font-bold text-gray-900">{daysUntilExam} ימים לבגרות</div>
              <div className="text-sm text-gray-600">
                {daysUntilExam <= 7 ? 'זמן להגביר מאמצים!' : 
                 daysUntilExam <= 14 ? 'המשך בקצב הנוכחי' : 'אתה על המסלול הנכון'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            איפה אתה עומד כרגע
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-sm text-blue-800 font-semibold mb-1">שאלות</div>
              <div className="text-2xl font-bold text-blue-900">{stats.completedQuestions}</div>
              <div className="text-xs text-blue-600">מתוך {stats.totalQuestions}</div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${practiceProgress}%` }} />
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-xl">
              <div className="text-sm text-purple-800 font-semibold mb-1">בגרויות</div>
              <div className="text-2xl font-bold text-purple-900">{stats.completedExams}</div>
              <div className="text-xs text-purple-600">מתוך {stats.totalExams}</div>
              <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${examProgress}%` }} />
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl">
              <div className="text-sm text-orange-800 font-semibold mb-1">נושאים חלשים</div>
              <div className="text-2xl font-bold text-orange-900">{stats.weakTopics}</div>
              <div className="text-xs text-orange-600">צריכים חיזוק</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-xl">
              <div className="text-sm text-red-800 font-semibold mb-1">טעויות פעילות</div>
              <div className="text-2xl font-bold text-red-900">{stats.activeMistakes}</div>
              <div className="text-xs text-red-600">לתרגול חוזר</div>
            </div>
          </div>
        </motion.div>

        {/* Daily Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            המשימות להיום
            {!isPremium && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full mr-auto">גרסת חינם</span>}
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">לפתור שאלות</div>
                  <div className="text-sm text-gray-600">
                    {isPremium ? '70 שאלות' : `${freeUserLimits.questionsPerDay} שאלות`}
                  </div>
                </div>
              </div>
              {!isPremium && <Lock className="w-5 h-5 text-gray-400" />}
            </div>
            
            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">ללמוד נושאים</div>
                  <div className="text-sm text-gray-600">
                    {isPremium ? '2 נושאים חדשים' : `${freeUserLimits.topicsPerDay} נושא`}
                  </div>
                </div>
              </div>
              {!isPremium && <Lock className="w-5 h-5 text-gray-400" />}
            </div>
            
            <div className="flex items-center justify-between bg-orange-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Repeat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">לחזור על טעויות</div>
                  <div className="text-sm text-gray-600">
                    {isPremium ? '8 טעויות' : `${freeUserLimits.mistakesPerDay} טעויות`}
                  </div>
                </div>
              </div>
              {!isPremium && <Lock className="w-5 h-5 text-gray-400" />}
            </div>
            
            <div className={`flex items-center justify-between p-4 rounded-xl ${isPremium ? 'bg-green-50' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-green-500' : 'bg-gray-400'}`}>
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className={`font-semibold ${isPremium ? 'text-gray-900' : 'text-gray-500'}`}>לבצע סימולציה</div>
                  <div className={`text-sm ${isPremium ? 'text-gray-600' : 'text-gray-400'}`}>
                    {isPremium ? 'בגרות מלאה' : 'פרימיום בלבד'}
                  </div>
                </div>
              </div>
              {!isPremium && <Lock className="w-5 h-5 text-gray-400" />}
            </div>
          </div>

          {!isPremium && (
            <div className="mt-4 text-center text-sm text-gray-500">
              זמן לימוד יומי: <span className="font-bold">30 דקות</span>
              <span className="text-gray-400"> (פרימיום: 90 דקות)</span>
            </div>
          )}
        </motion.div>

        {/* Premium Upsell for Free Users */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl shadow-lg p-5 text-center"
          >
            <Crown className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">שדרג לפרימיום</h3>
            <p className="text-white/90 text-sm mb-4">
              פתח את כל התכונות: ללא פרסומות, ללא מגבלות, תוכנית AI מלאה
            </p>
            <ul className="text-white/90 text-sm space-y-1 mb-4 text-right">
              <li>✓ שאלות ללא הגבלה</li>
              <li>✓ כל הנושאים פתוחים</li>
              <li>✓ סימולציות מלאות</li>
              <li>✓ תרגול טעויות ללא הגבלה</li>
              <li>✓ ללא פרסומות</li>
            </ul>
            <Button 
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full bg-white text-amber-600 hover:bg-gray-100 font-bold h-12 rounded-xl"
            >
              <Crown className="w-5 h-5 ml-2" />
              שדרג עכשיו
            </Button>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <Button 
            onClick={() => navigate(createPageUrl("CustomWeakPractice"))}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-14 text-sm font-bold rounded-xl flex flex-col items-center justify-center gap-1"
          >
            <Repeat className="w-5 h-5" />
            תרגל טעויות
          </Button>
          
          <Button 
            onClick={() => navigate(createPageUrl("Practice"))}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-14 text-sm font-bold rounded-xl flex flex-col items-center justify-center gap-1"
          >
            <Play className="w-5 h-5" />
            המשך לתרגל
          </Button>
          
          <Button 
            onClick={() => navigate(createPageUrl("WeakAreaSelection"))}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 h-14 text-sm font-bold rounded-xl col-span-2 flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            תרגל נושאים חלשים
          </Button>
          
          <Button 
            onClick={() => {
              if (isPremium) {
                navigate(createPageUrl("Exams"));
              } else {
                navigate(createPageUrl("Premium"));
              }
            }}
            className={`h-14 text-sm font-bold rounded-xl flex flex-col items-center justify-center gap-1 ${
              isPremium 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            <FileCheck className="w-5 h-5" />
            בגרות מלאה
            {!isPremium && <Lock className="w-3 h-3" />}
          </Button>
          
          <Button 
            onClick={() => navigate(createPageUrl("Practice"))}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 h-14 text-sm font-bold rounded-xl flex flex-col items-center justify-center gap-1"
          >
            <Target className="w-5 h-5" />
            משימה יומית
          </Button>
        </motion.div>

        {/* Smart Alert */}
        {stats.weakTopics > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-100 border-2 border-yellow-300 rounded-2xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-yellow-900">יש לך {stats.weakTopics} נושאים חלשים</div>
              <div className="text-sm text-yellow-800">מומלץ לחזור עליהם היום כדי לשפר את המוכנות</div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}