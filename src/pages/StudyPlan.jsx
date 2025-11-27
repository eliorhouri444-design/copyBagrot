import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Loader2, Target, CheckCircle, BookOpen, Repeat, AlertTriangle,
  Clock, Play, Zap, Crown, Lock, TrendingUp, FileCheck,
  Calendar, Award, ChevronLeft, Trophy, BarChart3 } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  fetchUserPerformanceData,
  calculateFullReadiness,
  calculateGapAndRequirements,
  buildCompleteDailyPlan,
  checkPaceStatus,
  TARGET_REQUIREMENTS
} from "@/components/studyplan/ReadinessEngine";

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [paceStatus, setPaceStatus] = useState(null);

  const isPremium = user?.is_premium;

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const subject = currentUser?.selected_subject || 'אנגלית';
        const unitLevel = currentUser?.selected_units || 5;
        const targetScore = currentUser?.target_score || 85;
        const examDate = currentUser?.exam_date ? new Date(currentUser.exam_date) : null;
        const daysUntilExam = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24))) : 60;

        // קריאת נתוני ביצוע אמיתיים
        const perfData = await fetchUserPerformanceData(base44, currentUser.email, subject, unitLevel);
        setPerformanceData(perfData);

        if (perfData) {
          // חישוב מוכנות מלא
          const readinessData = calculateFullReadiness(perfData, subject, unitLevel);
          setReadiness(readinessData);

          // חישוב פער ודרישות
          const reqs = calculateGapAndRequirements({
            targetScore,
            readinessScore: readinessData.readinessScore,
            performanceData: perfData,
            subject,
            unitLevel,
            daysUntilExam
          });
          setRequirements(reqs);

          // בניית תוכנית יומית
          const plan = buildCompleteDailyPlan({
            performanceData: perfData,
            requirements: reqs,
            targetScore,
            daysUntilExam,
            subject,
            unitLevel,
            dayOfWeek: new Date().getDay()
          });
          setDailyPlan(plan);

          // בדיקת קצב
          const pace = checkPaceStatus({
            targetScore,
            currentReadiness: readinessData.readinessScore,
            daysUntilExam,
            startReadiness: currentUser?.start_readiness || 30,
            startDaysUntilExam: currentUser?.start_days_until_exam || 90
          });
          setPaceStatus(pace);
        }

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const displaySubject = user?.selected_subject || 'אנגלית';
  const displayUnits = user?.selected_units || 5;
  const targetScore = user?.target_score || 85;
  const examDate = user?.exam_date ? new Date(user.exam_date) : null;
  const daysUntilExam = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24))) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const readinessScore = readiness?.readinessScore || 0;
  const gap = requirements?.gap || 0;

  return (
    <div className="bg-blue-50 pb-24 min-h-screen">
      {/* Header - סגנון אחיד עם שאר הדפים */}
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("SubjectSelection"))}
          className="text-right flex-1 hover:opacity-90 transition-opacity"
        >
          <h1 className="text-[16px] font-bold text-white">התוכנית שלי</h1>
          <p className="text-[11px] text-white/90">{displaySubject} • {displayUnits} יחידות</p>
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Readiness Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold">מוכנות לבגרות</h3>
                <p className="text-xs opacity-90">יעד: {targetScore} נקודות</p>
              </div>
              <Target className="w-7 h-7" />
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${readinessScore}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{readinessScore}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">
                  {gap > 0 ? `חסרות ${gap} נקודות` : 'הגעת ליעד!'}
                </div>
                {daysUntilExam !== null && (
                  <div className="text-sm font-bold text-blue-600">
                    {daysUntilExam} ימים לבגרות
                  </div>
                )}
              </div>
            </div>
            
            {/* Breakdown */}
            {readiness?.breakdown && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <div className="font-bold text-blue-900">{readiness.breakdown.content.score}%</div>
                  <div className="text-[10px] text-gray-600">שליטה</div>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl">
                  <div className="font-bold text-blue-900">{readiness.breakdown.practice.score}%</div>
                  <div className="text-[10px] text-gray-600">תרגול</div>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl">
                  <div className="font-bold text-blue-900">{readiness.breakdown.exam.score}%</div>
                  <div className="text-[10px] text-gray-600">בגרויות</div>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl">
                  <div className="font-bold text-blue-900">{readiness.breakdown.speed.score}%</div>
                  <div className="text-[10px] text-gray-600">מהירות</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Exam Day Message */}
        {daysUntilExam === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-6 text-center shadow-xl"
          >
            <h2 className="text-2xl font-bold text-white mb-2">היום הגדול הגיע!</h2>
            <p className="text-white/90 text-lg mb-1">
              בהצלחה בבגרות ב{displaySubject}!
            </p>
            <p className="text-white/80 text-sm">
              אתה מוכן לזה - תאמין בעצמך!
            </p>
          </motion.div>
        )}

        {/* Pace Status */}
        {paceStatus && daysUntilExam !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3 border-r-4 ${
              paceStatus.status === 'ahead' ? 'border-r-green-500' :
              paceStatus.status === 'on_track' ? 'border-r-blue-500' :
              paceStatus.status === 'behind' ? 'border-r-yellow-500' :
              'border-r-red-500'
            }`}
          >
            <span className="text-3xl">{paceStatus.icon}</span>
            <div className="flex-1">
              <div className="font-bold text-gray-900">{paceStatus.message}</div>
              <div className="text-sm text-gray-600">
                {daysUntilExam !== null && `${daysUntilExam} ימים לבגרות`}
              </div>
            </div>
          </motion.div>
        )}

        {/* Alert from Daily Plan */}
        {dailyPlan?.alert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-2xl shadow-lg p-4 border-r-4 ${
              dailyPlan.alert.type === 'success' 
                ? 'border-r-green-500'
                : dailyPlan.alert.type === 'critical'
                  ? 'border-r-red-500'
                  : 'border-r-amber-500'
            }`}
          >
            <p className={`font-medium text-sm ${
              dailyPlan.alert.type === 'success' 
                ? 'text-green-800'
                : dailyPlan.alert.type === 'critical'
                  ? 'text-red-800'
                  : 'text-amber-800'
            }`}>
              {dailyPlan.alert.message}
            </p>
          </motion.div>
        )}

        {/* Gap & Requirements Card */}
        {requirements && gap > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-[#3B82F6] p-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex-1 text-right">
                  <h3 className="text-base font-bold">מה צריך כדי להגיע ל-{targetScore}</h3>
                  <p className="text-xs opacity-90">התוכנית שלך להצלחה</p>
                </div>
                <Target className="w-7 h-7" />
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">שאלות לפתור</span>
                  <span className="font-bold text-blue-600">
                    {requirements.requirements.questionsNeeded} ({requirements.requirements.questionsPerDay}/יום)
                  </span>
                </div>
                <Progress value={Math.min(100, (performanceData?.totalQuestions || 0) / (requirements.requirements.questionsNeeded + (performanceData?.totalQuestions || 0)) * 100)} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">בגרויות מלאות</span>
                  <span className="font-bold text-purple-600">
                    {requirements.requirements.examsNeeded} ({requirements.requirements.examsPerWeek}/שבוע)
                  </span>
                </div>
                <Progress value={Math.min(100, (performanceData?.totalExams || 0) / (requirements.requirements.examsNeeded + (performanceData?.totalExams || 0)) * 100)} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">נושאים לשליטה</span>
                  <span className="font-bold text-green-600">
                    {requirements.requirements.topicsToMaster}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">טעויות לתקן</span>
                  <span className="font-bold text-red-600">
                    {requirements.requirements.mistakesToFix} ({requirements.requirements.mistakesPerDay}/יום)
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-xl text-center">
                <span className="text-sm text-blue-800">
                  צפי להגעה ליעד: <strong>{requirements.estimatedDaysToTarget} ימים</strong>
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold">הביצועים שלך</h3>
                <p className="text-xs opacity-90">סטטיסטיקות למידה</p>
              </div>
              <BarChart3 className="w-7 h-7" />
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-sm text-blue-800 font-semibold mb-1">שאלות שנפתרו</div>
                <div className="text-2xl font-bold text-blue-900">{performanceData?.totalQuestions || 0}</div>
                <div className="text-xs text-blue-600">דיוק: {performanceData?.overallAccuracy || 0}%</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-sm text-purple-800 font-semibold mb-1">בגרויות</div>
                <div className="text-2xl font-bold text-purple-900">{performanceData?.totalExams || 0}</div>
                <div className="text-xs text-purple-600">ממוצע: {performanceData?.avgExamScore || 0}</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-xl">
                <div className="text-sm text-orange-800 font-semibold mb-1">נושאים חלשים</div>
                <div className="text-2xl font-bold text-orange-900">{performanceData?.weakTopics?.length || 0}</div>
                <div className="text-xs text-orange-600">צריכים חיזוק</div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-xl">
                <div className="text-sm text-red-800 font-semibold mb-1">טעויות פעילות</div>
                <div className="text-2xl font-bold text-red-900">{performanceData?.activeMistakes || 0}</div>
                <div className="text-xs text-red-600">לתרגול חוזר</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Daily Tasks - Dynamic from Engine */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold">המשימות להיום</h3>
                <p className="text-xs opacity-90">
                  {dailyPlan ? `${dailyPlan.estimatedMinutes} דקות` : 'התוכנית היומית שלך'}
                </p>
              </div>
              <CheckCircle className="w-7 h-7" />
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {dailyPlan?.tasks?.map((task, idx) => {
                const iconMap = {
                  'mistakes': Repeat,
                  'topic': Target,
                  'questions': BookOpen,
                  'exam': FileCheck,
                  'vocabulary': BookOpen
                };
                const colorMap = {
                  'mistakes': { bg: 'bg-red-50', icon: 'bg-red-500', text: 'text-red-800' },
                  'topic': { bg: 'bg-orange-50', icon: 'bg-orange-500', text: 'text-orange-800' },
                  'questions': { bg: 'bg-blue-50', icon: 'bg-blue-500', text: 'text-blue-800' },
                  'exam': { bg: 'bg-green-50', icon: 'bg-green-500', text: 'text-green-800' },
                  'vocabulary': { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-800' }
                };
                const Icon = iconMap[task.type] || BookOpen;
                const colors = colorMap[task.type] || colorMap['questions'];
                
                return (
                  <div key={task.id || idx} className={`flex items-center justify-between ${colors.bg} p-4 rounded-xl`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${colors.icon} rounded-full flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className={`font-semibold ${colors.text}`}>{task.title}</div>
                        <div className="text-sm text-gray-600">{task.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-700">{task.duration} דק'</div>
                      {task.count && <div className="text-xs text-gray-500">{task.count} פריטים</div>}
                    </div>
                  </div>
                );
              })}

              {(!dailyPlan?.tasks || dailyPlan.tasks.length === 0) && (
                <>
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">פתרון שאלות</div>
                        <div className="text-sm text-gray-600">{isPremium ? '30 שאלות' : '10 שאלות'}</div>
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
                        <div className="font-semibold text-gray-900">תיקון טעויות</div>
                        <div className="text-sm text-gray-600">{isPremium ? '8 טעויות' : '3 טעויות'}</div>
                      </div>
                    </div>
                    {!isPremium && <Lock className="w-5 h-5 text-gray-400" />}
                  </div>
                </>
              )}
            </div>

            {dailyPlan?.expectedImprovement > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-center">
                <span className="text-sm text-green-800">
                  שיפור צפוי: <strong>+{dailyPlan.expectedImprovement}%</strong> במוכנות
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Premium Upsell for Free Users */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">שדרג לפרימיום</h3>
                <p className="text-sm text-gray-600">פתח את כל התכונות</p>
              </div>
            </div>
            <ul className="text-gray-700 text-sm space-y-2 mb-4">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> שאלות ללא הגבלה</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> כל הנושאים פתוחים</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> סימולציות מלאות</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> ללא פרסומות</li>
            </ul>
            <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full bg-[#3B82F6] hover:bg-blue-700 text-white font-bold h-12 rounded-[14px]"
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
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-14 text-sm font-bold rounded-[14px] flex flex-col items-center justify-center gap-1"
          >
            <Repeat className="w-5 h-5" />
            תקן טעויות
          </Button>
          
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-14 text-sm font-bold rounded-[14px] flex flex-col items-center justify-center gap-1"
          >
            <Play className="w-5 h-5" />
            המשך לתרגל
          </Button>
          
          <Button
            onClick={() => navigate(createPageUrl("WeakAreaSelection"))}
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-14 text-sm font-bold rounded-[14px] col-span-2 flex items-center justify-center gap-2"
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
            className={`h-14 text-sm font-bold rounded-[14px] flex flex-col items-center justify-center gap-1 ${
              isPremium ?
              'bg-[#3B82F6] hover:bg-blue-700' :
              'bg-gray-400 hover:bg-gray-500'
            } text-white`}
          >
            <FileCheck className="w-5 h-5" />
            בגרות מלאה
            {!isPremium && <Lock className="w-3 h-3" />}
          </Button>
          
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-14 text-sm font-bold rounded-[14px] flex flex-col items-center justify-center gap-1"
          >
            <Target className="w-5 h-5" />
            משימה יומית
          </Button>
        </motion.div>

        {/* Smart Alert */}
        {performanceData?.weakTopics?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-4 flex items-start gap-3 border-r-4 border-r-yellow-500"
          >
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900">יש לך {performanceData.weakTopics.length} נושאים חלשים</div>
              <div className="text-sm text-gray-600">מומלץ לחזור עליהם היום כדי לשפר את המוכנות</div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}