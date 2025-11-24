import React, { useState, useMemo } from "react";
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
  examAttempts = []
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => prev === 0 ? modules.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev === modules.length - 1 ? 0 : prev + 1);
  };

  const handleModuleClick = (module) => {
    if (module.entity === 'practice') {
      navigate(createPageUrl("Practice"));
    } else if (onSelectExam) {
      onSelectExam(module.id);
    }
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
    const progress = totalAttempts > 0 ? Math.min(100, Math.round((totalAttempts / maxExams) * 100)) : 0;

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

          <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 ${isLocked ? 'opacity-75' : ''}`}>
            {/* Header with gradient */}
            <div className={`bg-gradient-to-br ${currentModule.color || 'from-blue-500 to-indigo-600'} p-5 text-white relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-10 -translate-x-10" />
              
              <div className="relative z-10 flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl flex-shrink-0">

                  <FileText className="w-7 h-7 text-white" />
                </motion.div>
                
                <div className="flex-1">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[18px] font-bold mb-1">

                    {currentModule.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/90 text-[12px]">

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
            <div className="bg-white p-5 space-y-4">
              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-700 text-sm leading-relaxed">

                {currentModule.details}
              </motion.p>

              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gray-50 rounded-xl p-4 border border-gray-100">

                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-bold text-gray-900">התקדמות בשאלון</span>
                  <span className="text-[17px] font-bold text-blue-600">
                    {moduleStats.progress}%
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 mb-2">
                  {moduleStats.totalAttempts} / {moduleStats.maxExams} בגרויות {!(isPremium === true) && '(חינם)'}
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${moduleStats.progress}%` }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-blue-600 transition-all rounded-full" />

                </div>
              </motion.div>

              {/* Stats grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-3 gap-2">

                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                  <div className="text-[19px] font-bold text-blue-600">{moduleStats.totalAttempts}</div>
                  <div className="text-[10px] text-blue-700 font-medium">ניסיונות</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                  <div className="text-[19px] font-bold text-green-600">{moduleStats.passedAttempts}</div>
                  <div className="text-[10px] text-green-700 font-medium">עברו</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
                  <div className="text-[19px] font-bold text-blue-600">{moduleStats.avgScore}</div>
                  <div className="text-[10px] text-purple-700 font-medium">ממוצע</div>
                </div>
              </motion.div>

              {/* Module info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between text-[12px] text-gray-600 pt-2 border-t border-gray-200">

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{currentModule.duration} דקות</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>{currentModule.points} נקודות</span>
                </div>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-3 pt-2">

                {isLocked ?
                <Button
                  onClick={onUpgrade}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-md rounded-xl">

                    <Crown className="w-5 h-5" />
                    שדרג לפרימיום
                  </Button> :

                <>
                    {/* מבחן אקראי - למעלה - לכולם */}
                    {currentModule.entity !== 'practice' && onRandomExam &&
                  <div className="space-y-2">
                        <Button
                      onClick={() => onRandomExam(currentModule.id)}
                      className={`w-full bg-gradient-to-r ${currentModule.color || 'from-blue-500 to-indigo-600'} text-white h-12 text-[14px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 rounded-xl`}>

                          <Shuffle className="w-5 h-5" />
                          בגרות אקראית
                        </Button>

                        {isPremium === true ?
                    <Button
                      onClick={() => navigate(createPageUrl("CustomWeakExam"))}
                      className="w-full h-11 text-[13px] font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white">

                            בגרות אישית
                          </Button> :

                    <Button
                      onClick={() => navigate(createPageUrl("Premium"))}
                      className="w-full h-11 text-[13px] font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white opacity-60">

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
                      className="w-full h-11 text-[13px] font-semibold border hover:bg-gray-50 rounded-xl">

                            בחר בגרות ספציפית (מעל 100 בגרויות)
                          </Button> :

                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <div className="text-center mb-2">
                              <h4 className="text-[12px] font-bold text-gray-900 mb-0.5">מוגבל ל-5 בגרויות</h4>
                              <p className="text-[10px] text-gray-600">מוגבל ל-5 הבגרויות הראשונות</p>
                            </div>
                            <Button
                        onClick={() => handleModuleClick(currentModule)}
                        variant="outline"
                        className="w-full h-10 text-[12px] font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl mb-2">

                              בחר מבחן (מוגבל ל-5)
                            </Button>
                            <Button
                        onClick={onUpgrade}
                        className="w-full h-10 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-[12px] font-bold flex items-center justify-center gap-2 shadow-md rounded-xl">

                              <Crown className="w-4 h-4" />
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
                    className={`w-full bg-gradient-to-r ${currentModule.color || 'from-blue-500 to-indigo-600'} text-white h-12 text-[14px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 rounded-xl`}>

                        התחל תרגול
                        <Play className="w-5 h-5" />
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
          className="rounded-full shadow-lg bg-white hover:bg-gray-50 w-10 h-10 pointer-events-auto -translate-x-2 border border-gray-100">

          <ChevronRight className="w-5 h-5 text-gray-700" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="rounded-full shadow-lg bg-white hover:bg-gray-50 w-10 h-10 pointer-events-auto translate-x-2 border border-gray-100">

          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-5">
        {modules.map((_, idx) =>
        <button
          key={idx}
          onClick={() => setCurrentIndex(idx)}
          className={`h-2 rounded-full transition-all duration-300 ${
          idx === currentIndex ?
          'w-8 bg-blue-600' :
          'w-2 bg-gray-300 hover:bg-gray-400'}`
          } />

        )}
      </div>
    </div>);

}