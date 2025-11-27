import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Loader2, Target, CheckCircle, BookOpen, Repeat, 
  Clock, Play, Crown, Lock, TrendingUp, FileCheck,
  Calendar, BarChart3 } from
'lucide-react';
import { Button } from "@/components/ui/button";
import {
  fetchUserPerformanceData,
  calculateFullReadiness,
  calculateGapAndRequirements,
  buildCompleteDailyPlan,
  checkPaceStatus
} from "@/components/studyplan/ReadinessEngine";

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [dailyPlan, setDailyPlan] = useState(null);

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

        const perfData = await fetchUserPerformanceData(base44, currentUser.email, subject, unitLevel);
        setPerformanceData(perfData);

        if (perfData) {
          const readinessData = calculateFullReadiness(perfData, subject, unitLevel);
          setReadiness(readinessData);

          const reqs = calculateGapAndRequirements({
            targetScore,
            readinessScore: readinessData.readinessScore,
            performanceData: perfData,
            subject,
            unitLevel,
            daysUntilExam
          });
          setRequirements(reqs);

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
  const gap = Math.max(0, targetScore - readinessScore);

  return (
    <div className="bg-blue-50 pb-24 min-h-screen">
      {/* Header */}
      <div className="bg-[#3B82F6] px-5 py-4 rounded-b-2xl">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(createPageUrl("SubjectSelection"))}
            className="text-right flex-1 hover:opacity-90 transition-opacity"
          >
            <h1 className="text-lg font-bold text-white">תוכנית לבגרות – {displaySubject} {displayUnits} יחידות</h1>
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-white text-sm">
          <span>מוכנות כוללת: <strong>{readinessScore}%</strong></span>
          <span className="mx-2">|</span>
          <span>יעד: <strong>{targetScore}</strong></span>
        </div>
        
        {gap > 0 && (
          <div className="text-white/90 text-sm mt-1">
            נותרו: <strong>{gap} נקודות</strong> להשגת היעד
          </div>
        )}
        
        {daysUntilExam !== null && (
          <div className="bg-white/10 rounded-lg px-3 py-2 mt-3 text-center">
            <div className="flex items-center justify-center gap-2 text-white text-sm">
              <Calendar className="w-4 h-4" />
              <span>יום הבגרות: {daysUntilExam === 0 ? 'היום' : `בעוד ${daysUntilExam} ימים`}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        
        {/* Section 1: מצב נוכחי */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden"
        >
          <div className="bg-[#3B82F6] px-4 py-3">
            <h3 className="text-white font-bold text-base">מדדי מוכנות</h3>
          </div>
          <div className="p-4">
            {/* 4 Readiness Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <div className="text-xl font-bold text-blue-900">{readiness?.breakdown?.content?.score || 0}%</div>
                <div className="text-xs text-gray-600 mt-1">שליטה בחומר</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-center">
                <div className="text-xl font-bold text-purple-900">{readiness?.breakdown?.practice?.score || 0}%</div>
                <div className="text-xs text-gray-600 mt-1">תרגול</div>
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-center">
                <div className="text-xl font-bold text-green-900">{readiness?.breakdown?.exam?.score || 0}%</div>
                <div className="text-xs text-gray-600 mt-1">בגרויות</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl text-center">
                <div className="text-xl font-bold text-orange-900">{readiness?.breakdown?.speed?.score || 0}%</div>
                <div className="text-xs text-gray-600 mt-1">מהירות</div>
              </div>
            </div>
            
            {/* Performance Stats */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                נתוני ביצועים
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">שאלות שנפתרו:</span>
                  <span className="font-bold">{performanceData?.totalQuestions || 0} <span className="text-gray-500 font-normal">(דיוק: {performanceData?.overallAccuracy || 0}%)</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">בגרויות:</span>
                  <span className="font-bold">{performanceData?.totalExams || 0} <span className="text-gray-500 font-normal">(ממוצע: {performanceData?.avgExamScore || 0})</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">נושאים חלשים:</span>
                  <span className="font-bold text-orange-600">{performanceData?.weakTopics?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">טעויות פעילות:</span>
                  <span className="font-bold text-red-600">{performanceData?.activeMistakes || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 2: מה נדרש ליעד */}
        {gap > 0 && requirements && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md overflow-hidden"
          >
            <div className="bg-[#3B82F6] px-4 py-3">
              <h3 className="text-white font-bold text-base">משימות הדרושות להשגת היעד</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-900">{requirements.requirements?.questionsNeeded || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">שאלות לפתור</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-900">{requirements.requirements?.examsNeeded || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">בגרויות מלאות</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-orange-900">{requirements.requirements?.topicsToMaster || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">נושאים לשליטה</div>
                </div>
                <div className="bg-red-50 p-3 rounded-xl text-center">
                  <div className="text-2xl font-bold text-red-900">{requirements.requirements?.mistakesToFix || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">טעויות לתקן</div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">זמן מוערך להגעה ליעד: <strong>{requirements.estimatedDaysToTarget || 0} ימים</strong></span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 3: המשימות להיום */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden"
        >
          <div className="bg-[#3B82F6] px-4 py-3 flex items-center justify-between">
            <h3 className="text-white font-bold text-base">המשימות להיום</h3>
            {dailyPlan?.estimatedMinutes && (
              <span className="text-white/80 text-sm">{dailyPlan.estimatedMinutes} דק'</span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {dailyPlan?.tasks?.length > 0 ? (
              dailyPlan.tasks.map((task, idx) => {
                const iconMap = {
                  'mistakes': Repeat,
                  'topic': Target,
                  'questions': BookOpen,
                  'exam': FileCheck,
                  'vocabulary': BookOpen
                };
                const colorMap = {
                  'mistakes': { bg: 'bg-red-50', icon: 'bg-red-500', border: 'border-red-200' },
                  'topic': { bg: 'bg-orange-50', icon: 'bg-orange-500', border: 'border-orange-200' },
                  'questions': { bg: 'bg-blue-50', icon: 'bg-blue-500', border: 'border-blue-200' },
                  'exam': { bg: 'bg-green-50', icon: 'bg-green-500', border: 'border-green-200' },
                  'vocabulary': { bg: 'bg-purple-50', icon: 'bg-purple-500', border: 'border-purple-200' }
                };
                const Icon = iconMap[task.type] || BookOpen;
                const colors = colorMap[task.type] || colorMap['questions'];
                
                return (
                  <div 
                    key={task.id || idx} 
                    className={`${colors.bg} border ${colors.border} rounded-xl p-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${colors.icon} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-600">{task.description}</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {task.count && <div className="text-sm font-bold text-gray-800">{task.count} פריטים</div>}
                        <div className="text-xs text-gray-500">{task.duration} דק'</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center">
                      <Repeat className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">תיקון טעויות</div>
                      <div className="text-xs text-gray-600">15 טעויות לחזרה</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">45 דק'</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">חיזוק נושא חלש</div>
                      <div className="text-xs text-gray-600">אוצר מילים – 15 פריטים</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">30 דק'</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">תרגול מילים יומי</div>
                      <div className="text-xs text-gray-600">10 מילים</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">10 דק'</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-400 rounded-full flex items-center justify-center">
                      <FileCheck className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-500 text-sm">בגרות מלאה</div>
                      <div className="text-xs text-gray-400">פרימיום בלבד</div>
                    </div>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <Button
            onClick={() => navigate(createPageUrl("CustomWeakPractice"))}
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-12 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Repeat className="w-4 h-4" />
            תקן טעויות
          </Button>
          
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-12 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            המשך לתרגל
          </Button>
          
          <Button
            onClick={() => navigate(createPageUrl("WeakAreaSelection"))}
            className="bg-[#3B82F6] hover:bg-blue-700 text-white h-12 text-sm font-bold rounded-xl col-span-2 flex items-center justify-center gap-2"
          >
            <Target className="w-4 h-4" />
            נושאים חלשים
          </Button>
        </motion.div>

        {/* Premium Upsell */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-md p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">שדרג לפרימיום</h3>
                <p className="text-xs text-gray-600">גישה מלאה לכל התכונות</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 mb-3">
              <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> שאלות ללא הגבלה</div>
              <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> כל הנושאים פתוחים</div>
              <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> סימולציות מלאות</div>
              <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> ללא פרסומות</div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full bg-[#3B82F6] hover:bg-blue-700 text-white font-bold h-10 rounded-xl"
            >
              <Crown className="w-4 h-4 ml-2" />
              שדרג עכשיו
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}