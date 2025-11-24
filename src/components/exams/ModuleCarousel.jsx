import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, FileText, Edit2, Play, Crown, Target, TrendingUp, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function ModuleCarousel({
  modules,
  onSelectExam,
  onRandomExam,
  onEditModule,
  isPremium,
  onUpgrade,
  examAttempts = [],
  onShowAd
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [todayExamCount, setTodayExamCount] = useState(0);
  const FREE_DAILY_EXAM = 1; // בגרות אחת בחינם ליום

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
    // בדוק אם צריך לראות פרסומת (משתמש לא פרימיום וכבר עשה בגרות היום)
    if (isPremium !== true && todayExamCount >= FREE_DAILY_EXAM) {
      // צריך לראות פרסומת קודם
      if (onShowAd) {
        onShowAd(() => {
          // אחרי הפרסומת - המשך לבגרות
          incrementExamCount();
          callback();
        });
      }
      return;
    }

    // בגרות חינמית או פרימיום
    incrementExamCount();
    callback();
  };

  const currentModule = modules[currentIndex];

  const moduleStats = useMemo(() => {
    if (!currentModule || !examAttempts || examAttempts.length === 0) {
      return {
        totalAttempts: 0,
        passedAttempts: 0,
        avgScore: 0,
        progress: 0,
        maxExams: isPremium === true ? 100 : 5
      };
    }

    const moduleAttempts = examAttempts.filter((attemptItem) => {
      if (currentModule.entity === 'ModuleAExam' && attemptItem.exam_type === 'module_a') return true;
      if (currentModule.entity === 'ModuleBExam' && attemptItem.exam_type === 'module_b') return true;
      if (currentModule.entity === 'ModuleCExam' && attemptItem.exam_type === 'module_c') return true;
      if (currentModule.entity === 'GenericExam' && attemptItem.module_id === currentModule.id) return true;
      return false;
    });

    const totalAttempts = moduleAttempts.length;
    const passedAttempts = moduleAttempts.filter((attemptItem) => (attemptItem.score_percent || 0) >= 56).length;
    const avgScore = totalAttempts > 0 ?
    Math.round(moduleAttempts.reduce((sum, attemptItem) => sum + (attemptItem.score_percent || 0), 0) / totalAttempts) :
    0;

    const maxExams = isPremium === true ? 100 : 5;
    const progress = totalAttempts > 0 ? Math.min(100, Math.round(totalAttempts / maxExams * 100)) : 0;

    return {
      totalAttempts,
      passedAttempts,
      avgScore,
      progress,
      maxExams
    };
  }, [currentModule, examAttempts, isPremium]);

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

          <div className={`bg-indigo-50 rounded-2xl p-4 ${isLocked ? 'opacity-75' : ''}`}>
            {/* Header with gradient */}
            <div className="bg-[#3B82F6] text-white mb-3 p-4 rounded-xl from-blue-500 to-blue-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
              
              <div className="relative z-10 flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">

                  <FileText className="w-6 h-6 text-white" />
                </motion.div>
                
                <div className="flex-1">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[16px] font-bold mb-0.5">

                    {currentModule.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/90 text-[11px]">

                    {currentModule.description}
                  </motion.p>
                  
                  {isLocked &&
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="inline-flex items-center gap-1 bg-amber-500 px-2 py-1 rounded-full text-xs font-bold mt-2">

                      <Crown className="w-3 h-3" />
                      פרימיום
                    </motion.div>
                  }
                </div>

                {onEditModule &&
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditModule(currentModule);
                  }}
                  className="text-white hover:bg-white/20 flex-shrink-0">

                    <Edit2 className="w-5 h-5" />
                  </Button>
                }
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl p-3 space-y-2.5">
              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[#2B2B2B] text-[12px] leading-relaxed">

                {currentModule.details}
              </motion.p>

              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-[#F5F8FF] rounded-xl p-3 border border-[#E9F0FF]">

                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[12px] font-bold text-[#2B2B2B]">התקדמות בשאלון</span>
                  <span className="text-[15px] font-bold text-[#3B82F6]">
                    {moduleStats.progress}%
                  </span>
                </div>
                <div className="text-[10px] text-[#6E6E6E] mb-1.5">
                  {moduleStats.totalAttempts} / {moduleStats.maxExams} בגרויות {!(isPremium === true) && '(חינם)'}
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${moduleStats.progress}%` }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-[#3B82F6] transition-all rounded-full" />

                </div>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-3 gap-1.5">

                <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
                  <div className="text-[16px] font-bold text-blue-600">{moduleStats.totalAttempts}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ניסיונות</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                  <div className="text-[16px] font-bold text-green-600">{moduleStats.passedAttempts}</div>
                  <div className="text-[9px] text-[#6E6E6E]">עברו</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200">
                  <div className="text-[16px] font-bold text-[#3B82F6]">{moduleStats.avgScore}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ממוצע</div>
                </div>
              </motion.div>

              {/* Module info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between text-[11px] text-[#6E6E6E] pt-2 border-t border-[#E9F0FF]">

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentModule.duration} דקות</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>{currentModule.points} נקודות</span>
                </div>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-2 pt-2">

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
                        {/* הודעה על בגרויות נותרות */}
                        {isPremium !== true && (
                          <div className="text-center text-[11px] text-gray-500 mb-1">
                            {todayExamCount < FREE_DAILY_EXAM ? (
                              <span className="text-green-600 font-semibold">✓ בגרות חינמית זמינה היום</span>
                            ) : (
                              <span className="text-amber-600 font-semibold">📺 נדרשת צפייה בפרסומת</span>
                            )}
                          </div>
                        )}

                        <Button
                      onClick={() => handleStartExam(() => onRandomExam(currentModule.id))} className="bg-[#3B82F6] text-[13px] px-4 py-2 font-bold rounded-[14px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full from-blue-500 to-blue-600 h-11 transition-all flex items-center justify-center gap-2">


                          <Shuffle className="w-5 h-5" />
                          בגרות אקראית
                        </Button>

                        {isPremium === true ?
                    <Button
                      onClick={() => navigate(createPageUrl("CustomWeakExam"))}
                      className="w-full h-10 text-[12px] font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-[14px] text-white">

                            בגרות אישית
                          </Button> :

                    <Button
                      onClick={() => navigate(createPageUrl("Premium"))}
                      className="w-full h-10 text-[12px] font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-[14px] text-white opacity-60">

                            בגרות אישית
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
                      className="w-full h-10 text-[12px] font-semibold border hover:bg-gray-50 rounded-[14px]">

                            בחר בגרות ספציפית (מעל 100 בגרויות)
                          </Button> :

                    <div className="bg-white rounded-lg p-2.5 border border-[#E9F0FF]">
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
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0 pointer-events-none z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          className="rounded-full shadow-md bg-white hover:bg-gray-50 w-8 h-8 pointer-events-auto -translate-x-2 border border-[#E9F0FF]">

          <ChevronRight className="w-4 h-4 text-[#3B82F6]" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="rounded-full shadow-md bg-white hover:bg-gray-50 w-8 h-8 pointer-events-auto translate-x-2 border border-[#E9F0FF]">

          <ChevronLeft className="w-4 h-4 text-[#3B82F6]" />
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
    </div>);

}