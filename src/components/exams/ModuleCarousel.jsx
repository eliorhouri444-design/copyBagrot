import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, FileText, Edit2, Play, Crown, Target, TrendingUp, TrendingDown, Shuffle, AlertTriangle, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import MasteryStatsCard from "@/components/mastery/MasteryStatsCard";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";

export default function ModuleCarousel({
  modules,
  onSelectExam,
  onRandomExam,
  onEditModule,
  isPremium,
  onUpgrade,
  examAttempts: initialExamAttempts = [],
  practiceAttempts = [],
  topicStats = {},
  onShowAd
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [todayExamCount, setTodayExamCount] = useState(0);
  const [examAttempts, setExamAttempts] = useState(initialExamAttempts);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [pendingExamCallback, setPendingExamCallback] = useState(null);
  const FREE_DAILY_EXAM = 1; // בגרות אחת בחינם ליום

  // עדכון examAttempts כשה-prop משתנה
  useEffect(() => {
    setExamAttempts(initialExamAttempts);
  }, [initialExamAttempts]);

  // פונקציה לטעינת נתונים מעודכנים
  const refreshExamAttempts = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      const allAttempts = await base44.entities.ExamAttempt.list("-created_date", 500);
      const userAttempts = allAttempts.filter((a) => a.created_by === user.email);
      setExamAttempts(userAttempts);
      console.log('🔄 ModuleCarousel: Refreshed exam attempts', userAttempts.length);
    } catch (error) {
      console.error('Error refreshing exam attempts:', error);
    }
  }, []);

  // בדוק כמה בגרויות עשה היום
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `exam_count_${today}`;
    const count = parseInt(localStorage.getItem(storageKey) || '0');
    setTodayExamCount(count);

    // נקה ימים ישנים
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `exam_count_${yesterday.toISOString().split('T')[0]}`;
    localStorage.removeItem(yesterdayKey);
  }, []);

  // האזנה לאירועי עדכון גלובליים
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 ModuleCarousel: Received update event');
      refreshExamAttempts();
    };

    // גם כשחוזרים לדף
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 ModuleCarousel: Page visible - refreshing');
        refreshExamAttempts();
      }
    };

    window.addEventListener('mastery-update', handleUpdate);
    window.addEventListener('practice-complete', handleUpdate);
    window.addEventListener('exam-complete', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('mastery-update', handleUpdate);
      window.removeEventListener('practice-complete', handleUpdate);
      window.removeEventListener('exam-complete', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [refreshExamAttempts]);

  // בדוק אם יש שאלון נבחר אחרי שה-modules נטענו
  useEffect(() => {
    if (modules && modules.length > 0) {
      const selectedModuleId = sessionStorage.getItem('selectedModuleId');
      if (selectedModuleId) {
        const moduleIdx = modules.findIndex((m) => m.id === selectedModuleId);
        if (moduleIdx !== -1) {
          setCurrentIndex(moduleIdx);
          // גלול למעלה כדי לראות את הקרוסלה
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        sessionStorage.removeItem('selectedModuleId');
      }
    }
  }, [modules]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => prev === 0 ? modules.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev === modules.length - 1 ? 0 : prev + 1);
  };

  const incrementExamCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `exam_count_${today}`;
    const newCount = todayExamCount + 1;
    localStorage.setItem(storageKey, newCount.toString());
    setTodayExamCount(newCount);
  };

  const handleModuleClick = (module) => {
    if (module.entity === 'practice') {
      navigate(createPageUrl("Practice"));
    } else if (onSelectExam) {
      onSelectExam(module.id);
    }
  };

  const handleStartExam = (callback) => {
    // משתמש פרימיום - תמיד עובר ישירות
    if (isPremium === true) {
      callback();
      return;
    }

    // בדוק אם צריך לראות פרסומת (משתמש לא פרימיום וכבר עשה בגרות היום)
    if (todayExamCount >= FREE_DAILY_EXAM) {
      // הצג דיאלוג קטן במקום פרסומת
      setPendingExamCallback(() => callback);
      setShowAdDialog(true);
      return;
    }

    // בגרות חינמית
    incrementExamCount();
    callback();
  };

  const handleWatchAdAndContinue = () => {
    if (onShowAd && pendingExamCallback) {
      onShowAd(() => {
        incrementExamCount();
        pendingExamCallback();
        setShowAdDialog(false);
        setPendingExamCallback(null);
      });
    }
    setShowAdDialog(false);
  };

  const currentModule = modules[currentIndex];

  // חישוב מד מוכנות לשאלון לפי הנוסחה:
  // ExamReadiness = 0.50 * TopicMastery + 0.30 * PracticePerformance + 0.20 * ExamPerformance
  const moduleStats = useMemo(() => {
    if (!currentModule) {
      return {
        totalAttempts: 0,
        passedAttempts: 0,
        avgScore: 0,
        progress: 0,
        readiness: 0,
        topicMastery: 0,
        practicePerformance: 0,
        examPerformance: 0,
        maxExams: isPremium === true ? 100 : 5,
        excellentAttempts: 0,
        mediumAttempts: 0,
        failedAttempts: 0
      };
    }

    // סינון מבחנים לפי מודול
    const moduleAttempts = (examAttempts || []).filter((attemptItem) => {
      if (currentModule.entity === 'ModuleAExam' && attemptItem.exam_type === 'module_a') return true;
      if (currentModule.entity === 'ModuleBExam' && attemptItem.exam_type === 'module_b') return true;
      if (currentModule.entity === 'ModuleCExam' && attemptItem.exam_type === 'module_c') return true;
      if (currentModule.entity === 'GenericExam' && attemptItem.module_id === currentModule.id) return true;
      return false;
    });

    const totalAttempts = moduleAttempts.length;
    const passedAttempts = moduleAttempts.filter((attemptItem) => (attemptItem.score_percent || 0) >= 56).length;
    
    // חלוקה לפי טווחי ציונים
    const excellentAttempts = moduleAttempts.filter((attemptItem) => (attemptItem.score_percent || 0) >= 86).length;
    const mediumAttempts = moduleAttempts.filter((attemptItem) => {
      const score = attemptItem.score_percent || 0;
      return score >= 56 && score < 86;
    }).length;
    const failedAttempts = moduleAttempts.filter((attemptItem) => (attemptItem.score_percent || 0) < 56).length;

    // === חישוב TopicMastery (50%) ===
    // ממוצע הדיוק בנושאים הרלוונטיים לשאלון
    let topicMastery = 0;
    const moduleTopics = currentModule.parts || [];
    if (Object.keys(topicStats).length > 0 && moduleTopics.length > 0) {
      const relevantTopicScores = moduleTopics
        .map(part => topicStats[part]?.accuracy || topicStats[part.toLowerCase()]?.accuracy || 0)
        .filter(score => score > 0);
      if (relevantTopicScores.length > 0) {
        topicMastery = relevantTopicScores.reduce((a, b) => a + b, 0) / relevantTopicScores.length;
      }
    } else if (practiceAttempts.length > 0) {
      // אם אין topicStats, חשב מתוך practiceAttempts
      const correctCount = practiceAttempts.filter(a => a.status === 'correct' || a.percentage >= 70).length;
      topicMastery = practiceAttempts.length > 0 ? (correctCount / practiceAttempts.length) * 100 : 0;
    }

    // === חישוב PracticePerformance (30%) ===
    // 0.70 * Accuracy + 0.20 * SpeedScore + 0.10 * ReducedErrors
    let practicePerformance = 0;
    if (practiceAttempts.length > 0) {
      const correctPractice = practiceAttempts.filter(a => a.status === 'correct' || a.percentage >= 70).length;
      const accuracy = (correctPractice / practiceAttempts.length) * 100;
      
      // חישוב מהירות (אם יש)
      const avgTime = practiceAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 60), 0) / practiceAttempts.length;
      const speedScore = avgTime < 30 ? 100 : avgTime < 60 ? 80 : avgTime < 120 ? 60 : 40;
      
      // חישוב הפחתת שגיאות (השוואה בין ניסיונות ראשונים לאחרונים)
      const recentAttempts = practiceAttempts.slice(-10);
      const olderAttempts = practiceAttempts.slice(0, Math.max(10, practiceAttempts.length - 10));
      const recentErrors = recentAttempts.filter(a => a.status === 'incorrect' || a.percentage < 50).length;
      const olderErrors = olderAttempts.filter(a => a.status === 'incorrect' || a.percentage < 50).length;
      const reducedErrors = olderErrors > 0 && recentErrors < olderErrors ? 100 : recentErrors === 0 ? 100 : 50;
      
      practicePerformance = 0.70 * accuracy + 0.20 * speedScore + 0.10 * reducedErrors;
    }

    // === חישוב ExamPerformance (20%) ===
    // ממוצע ציונים במבחנים של השאלון
    let examPerformance = 0;
    if (moduleAttempts.length > 0) {
      examPerformance = moduleAttempts.reduce((sum, a) => sum + (a.score_percent || 0), 0) / moduleAttempts.length;
    }

    // === חישוב מד מוכנות סופי ===
    const readiness = Math.round(
      0.50 * topicMastery +
      0.30 * practicePerformance +
      0.20 * examPerformance
    );

    const maxExams = isPremium === true ? 100 : 5;
    const progress = totalAttempts > 0 ? Math.min(100, Math.round(totalAttempts / maxExams * 100)) : 0;
    const avgScore = moduleAttempts.length > 0 
      ? Math.round(moduleAttempts.reduce((sum, a) => sum + (a.score_percent || 0), 0) / moduleAttempts.length)
      : 0;

    return {
      totalAttempts,
      passedAttempts,
      avgScore,
      progress,
      readiness,
      topicMastery: Math.round(topicMastery),
      practicePerformance: Math.round(practicePerformance),
      examPerformance: Math.round(examPerformance),
      maxExams,
      excellentAttempts,
      mediumAttempts,
      failedAttempts
    };
  }, [currentModule, examAttempts, practiceAttempts, topicStats, isPremium]);

  const getProgressColor = (p) => {
    if (p < 30) return '#EF4444';
    if (p < 70) return '#F59E0B';
    return '#10B981';
  };

  const isLocked = currentModule.is_premium && !(isPremium === true);

  return (
    <div className="relative w-full py-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentModule?.id || currentModule?.module_id || currentIndex}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            const threshold = 50;
            if (info.offset.x > threshold && modules.length > 1) {
              handlePrevious();
            } else if (info.offset.x < -threshold && modules.length > 1) {
              handleNext();
            }
          }}>

          <div className="bg-[#ffffff] p-4 rounded-2xl">
            {/* Header with gradient */}
            <div className="bg-[#3B82F6] text-white mb-3 p-4 rounded-xl relative">
              {onEditModule &&
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditModule(currentModule);
                }}
                className="absolute top-2 left-2 text-white hover:bg-white/20">
                  <Edit2 className="w-5 h-5" />
                </Button>
              }
              
              <div className="flex items-center gap-4">
                {/* Icon Circle */}
                <div className="relative w-16 h-16 flex-shrink-0 bg-white/20 rounded-2xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1 text-right">
                  <h2 className="text-white text-lg font-bold mb-0.5">{currentModule.title}</h2>
                  <div className="text-3xl font-black text-white">{moduleStats.readiness}%</div>
                  <p className="text-white/80 text-sm">{moduleStats.totalAttempts} בגרויות בוצעו</p>
                </div>
              </div>
              
              {isLocked &&
              <div className="inline-flex items-center gap-1 bg-amber-500 px-2 py-1 rounded-full text-xs font-bold mt-2">
                  <Crown className="w-3 h-3" />
                  פרימיום
                </div>
              }
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-slate-100 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">מצוין</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{moduleStats.excellentAttempts || 0}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ציון: 100–86</div>
                </div>
                <div className="bg-slate-100 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">בינוני</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{moduleStats.mediumAttempts || 0}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ציון: 85–56</div>
                </div>
                <div className="bg-slate-100 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">נמוך</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{moduleStats.failedAttempts || 0}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ציון: 55–0</div>
                </div>
            </div>

              {/* Action buttons */}
              <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-2">

                {isLocked ?
              <Button
                onClick={onUpgrade}
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-[13px] font-bold flex items-center justify-center gap-2 rounded-[14px]">

                    <Crown className="w-4 h-4" />
                    שדרג לפרימיום
                  </Button> :

              <>
                    {/* מבחן אקראי - למעלה - לכולם */}
                    {currentModule.entity !== 'practice' && onRandomExam &&
                <div className="space-y-2">
                        <Button
                    onClick={() => handleStartExam(() => onRandomExam(currentModule.id))}
                    className="bg-[#3B82F6] text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-11 hover:bg-blue-700 active:bg-blue-800">

                          <Play className="w-4 h-4 ml-2" />
                          התחל בגרות
                        </Button>

                        {isPremium === true ?
                  <Button
                    onClick={() => {
                      sessionStorage.setItem('weakExamModule', currentModule.module_id || currentModule.id);
                      navigate(createPageUrl("CustomWeakExam"));
                    }} className="bg-blue-500 text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full h-10 from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">


                            <Target className="w-4 h-4 ml-2" />
                            בוחן טעויות מהשאלון
                          </Button> :

                  <Button
                    onClick={() => navigate(createPageUrl("Premium"))}
                    className="bg-[#3B82F6] text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-10 hover:bg-blue-700 active:bg-blue-800">

                            <Lock className="w-4 h-4 ml-2" />
                            בוחן טעויות
                          </Button>
                  }
                      </div>
                }

                    {/* בחר מבחן ספציפי - למטה - רק לפרימיום */}
                    {currentModule.entity !== 'practice' &&
                <>
                        {isPremium === true ?
                  <Button
                    onClick={() => handleModuleClick(currentModule)}
                    variant="outline"
                    className="w-full h-10 text-[12px] font-semibold border-2 border-[#E9F0FF] hover:bg-[#F5F8FF] rounded-[14px]">

                            בחר בגרות ספציפית (מעל 100 בגרויות)
                          </Button> :

                  <div className="bg-slate-100 p-2.5 rounded-lg border border-[#E9F0FF]">
                            <div className="text-center mb-2">
                              <h4 className="text-[11px] font-bold text-[#2B2B2B] mb-0.5">מוגבל ל-5 בגרויות</h4>
                              <p className="text-[9px] text-[#6E6E6E]">מוגבל ל-5 הבגרויות הראשונות</p>
                            </div>
                            <Button
                      onClick={() => handleModuleClick(currentModule)}
                      variant="outline"
                      className="w-full h-9 text-[11px] font-semibold border border-[#E9F0FF] text-[#3B82F6] hover:bg-[#F5F8FF] rounded-[14px] mb-1.5">

                              בחר מבחן (מוגבל ל-5)
                            </Button>
                            <Button
                      onClick={onUpgrade}
                      className="w-full h-9 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-[11px] font-bold flex items-center justify-center gap-2 rounded-[14px]">

                              <Crown className="w-3.5 h-3.5" />
                              לגישה מלאה 100+ בגרויות
                            </Button>
                          </div>
                  }
                      </>
                }

                    {/* אם זה תרגול */}
                    {currentModule.entity === 'practice' &&
                <Button
                  onClick={() => handleModuleClick(currentModule)}
                  className={`w-full bg-gradient-to-r ${currentModule.color || 'from-blue-500 to-indigo-600'} text-white h-11 text-[13px] font-bold transition-all flex items-center justify-center gap-2 rounded-[14px]`}>

                        התחל תרגול
                        <Play className="w-4 h-4" />
                      </Button>
                }
                  </>
              }
              </motion.div>
            </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0 pointer-events-none z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          className="rounded-full shadow-lg bg-white hover:bg-gray-50 w-9 h-9 pointer-events-auto -translate-x-3 border-0">

          <ChevronRight className="w-5 h-5 text-[#3B82F6]" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="rounded-full shadow-lg bg-white hover:bg-gray-50 w-9 h-9 pointer-events-auto translate-x-3 border-0">

          <ChevronLeft className="w-5 h-5 text-[#3B82F6]" />
        </Button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {modules.map((_, idx) =>
        <button
          key={idx}
          onClick={() => setCurrentIndex(idx)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
          idx === currentIndex ?
          'w-6 bg-[#3B82F6]' :
          'w-1.5 bg-gray-300 hover:bg-gray-400'}`
          } />

        )}
      </div>

      {/* Ad Dialog */}
      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              נדרשת צפייה בפרסומת
            </DialogTitle>
            <DialogDescription className="text-center">
              ניצלת את הבגרות החינמית שלך להיום
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
              <div className="text-4xl mb-2">📺</div>
              <p className="text-gray-700 text-sm">
                צפה בפרסומת קצרה כדי להמשיך לבגרות נוספת
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 text-center border border-amber-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-amber-900">או שדרג לפרימיום</span>
              </div>
              <p className="text-amber-800 text-xs">
                בגרויות ללא הגבלה, ללא פרסומות
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleWatchAdAndContinue}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">

              📺 צפה בפרסומת והמשך
            </Button>
            <Button
              onClick={() => {
                setShowAdDialog(false);
                navigate(createPageUrl("Premium"));
              }}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-xl">

              <Crown className="w-5 h-5 ml-2" />
              שדרג לפרימיום
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowAdDialog(false)}
              className="w-full text-gray-500">

              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}