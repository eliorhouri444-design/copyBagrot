import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SubjectSelector from "@/components/onboarding/SubjectSelector";
import UnitsSelector from "@/components/onboarding/UnitsSelector";
import GoalSelector from "@/components/onboarding/GoalSelector";
import AvailabilitySelector from "@/components/onboarding/AvailabilitySelector";
import LearningStyleSelector from "@/components/onboarding/LearningStyleSelector";
import ExamDateSelector from "@/components/onboarding/ExamDateSelector";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    selectedSubjects: [],
    subjectUnits: {},
    subjectGoals: {},
    subjectExamDates: {},
    dailyAvailability: null,
    learningStyle: null,
    takeInitialTest: false
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.onboarding_completed) {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    checkUser();
  }, [navigate]);

  const toggleSubject = (subjectId) => {
    setOnboardingData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(s => s !== subjectId)
        : [...prev.selectedSubjects, subjectId]
    }));
  };

  const setSubjectUnits = (subject, units) => {
    setOnboardingData(prev => ({
      ...prev,
      subjectUnits: { ...prev.subjectUnits, [subject]: units }
    }));
  };

  const setSubjectGoal = (subject, goal) => {
    setOnboardingData(prev => ({
      ...prev,
      subjectGoals: { ...prev.subjectGoals, [subject]: goal }
    }));
  };

  const setSubjectExamDate = (subject, date) => {
    setOnboardingData(prev => ({
      ...prev,
      subjectExamDates: { ...prev.subjectExamDates, [subject]: date }
    }));
  };

  const handleComplete = async () => {
    setIsCreating(true);
    try {
      const primarySubject = onboardingData.selectedSubjects[0];
      
      // Convert daily availability to minutes
      const timeMap = { "15min": 15, "30min": 30, "45min": 45, "1hour": 60, "2hours": 120 };
      const dailyMinutes = timeMap[onboardingData.dailyAvailability] || 45;
      
      // Update user settings
      await base44.auth.updateMe({
        onboarding_completed: true,
        selected_subject: primarySubject,
        selected_units: onboardingData.subjectUnits[primarySubject],
        exam_date: onboardingData.subjectExamDates[primarySubject],
        subject_selected: true,
        learning_preferences: {
          daily_availability: dailyMinutes,
          learning_style: onboardingData.learningStyle,
          subjects: onboardingData.selectedSubjects
        }
      });
      
      // Create learning profiles for each subject
      for (const subject of onboardingData.selectedSubjects) {
        const units = onboardingData.subjectUnits[subject];
        const goal = onboardingData.subjectGoals[subject] || 'good';
        const examDate = onboardingData.subjectExamDates[subject];
        
        if (!units || !examDate) continue;
        
        const targetScore = goal === 'pass' ? 60 : goal === 'good' ? 75 : 95;
        
        // Call the calculation function
        await base44.functions.invoke('calculateLearningPlan', {
          subject_id: subject,
          unit_level: units,
          target_score: targetScore,
          exam_date: examDate
        });
      }
      
      // Generate first day tasks
      await base44.functions.invoke('generateDailyTasksFromCurriculum', {});
      
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error:", error);
      alert('שגיאה ביצירת התכנית');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    if (stage === 0) return onboardingData.selectedSubjects.length > 0;
    if (stage === 1) {
      return onboardingData.selectedSubjects.every(s => onboardingData.subjectUnits[s]);
    }
    if (stage === 2) {
      return onboardingData.selectedSubjects.every(s => onboardingData.subjectGoals[s]);
    }
    if (stage === 3) return onboardingData.dailyAvailability !== null;
    if (stage === 4) return onboardingData.learningStyle !== null;
    if (stage === 5) {
      return onboardingData.selectedSubjects.every(s => onboardingData.subjectExamDates[s]);
    }
    return false;
  };

  const handleNext = () => {
    if (stage < 5 && canProceed()) {
      setStage(stage + 1);
    } else if (stage === 5 && canProceed()) {
      handleComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-start p-2 pb-4 pt-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
          בגרות פלוס
        </h1>
        <p className="text-xs text-gray-600 text-center mt-0.5">נבנה תכנית לימוד אישית בשבילך</p>
      </motion.div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-4"
            >
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">📚</div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">לאילו בגרויות תתכונן?</h2>
                <p className="text-xs text-gray-600">בחר מקצוע אחד או יותר</p>
              </div>

              <SubjectSelector 
                selectedSubjects={onboardingData.selectedSubjects}
                onToggleSubject={toggleSubject}
              />
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div
              key="units"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-4"
            >
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">🎓</div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">כמה יחידות?</h2>
                <p className="text-xs text-gray-600">בחר רמת יחידות לכל מקצוע</p>
              </div>

              <div className="space-y-2">
                {onboardingData.selectedSubjects.map((subject, idx) => (
                  <motion.div
                    key={subject}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-gray-50 rounded-2xl p-2"
                  >
                    <UnitsSelector
                      subject={subject}
                      selectedUnit={onboardingData.subjectUnits[subject]}
                      onSelectUnit={(units) => setSubjectUnits(subject, units)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 2 && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-4"
            >
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">🎯</div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">מה היעד שלך?</h2>
                <p className="text-xs text-gray-600">
                  {onboardingData.selectedSubjects.length > 1 ? 'בחר יעד משותף או יעד לכל מקצוע' : 'בחר יעד ציון'}
                </p>
              </div>

              {onboardingData.selectedSubjects.length > 1 && (
                <div className="mb-3">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-3 border-2 border-blue-200">
                    <h3 className="text-xs font-bold text-gray-900 mb-2 text-center">יעד משותף לכולם</h3>
                    <GoalSelector
                      selectedGoal={null}
                      onSelectGoal={(goal) => {
                        onboardingData.selectedSubjects.forEach(subject => {
                          setSubjectGoal(subject, goal);
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {onboardingData.selectedSubjects.map((subject, idx) => (
                  <motion.div
                    key={subject}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-gray-50 rounded-2xl p-2"
                  >
                    <h3 className="text-xs font-bold text-gray-900 mb-1.5 text-center">
                      {subject} - {onboardingData.subjectUnits[subject]} יחידות
                    </h3>
                    <GoalSelector
                      selectedGoal={onboardingData.subjectGoals[subject]}
                      onSelectGoal={(goal) => setSubjectGoal(subject, goal)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 3 && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-4"
            >
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">⏰</div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">כמה זמן יש לך ביום?</h2>
                <p className="text-xs text-gray-600">בחר את הזמינות היומית שלך</p>
              </div>

              <AvailabilitySelector
                selectedTime={onboardingData.dailyAvailability}
                onSelectTime={(time) => setOnboardingData({ ...onboardingData, dailyAvailability: time })}
              />
            </motion.div>
          )}

          {stage === 4 && (
            <motion.div
              key="learning-style"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-4"
            >
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">🎓</div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">איך תרצה ללמוד?</h2>
                <p className="text-xs text-gray-600">בחר את סגנון הלמידה שמתאים לך</p>
              </div>

              <LearningStyleSelector
                selectedStyle={onboardingData.learningStyle}
                onSelectStyle={(style) => setOnboardingData({ ...onboardingData, learningStyle: style })}
              />
            </motion.div>
          )}

          {stage === 5 && (
            <motion.div
              key="exam-dates"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-4"
            >
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">📅</div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">מתי הבגרויות?</h2>
                <p className="text-xs text-gray-600">הזן מועדי בחינה לכל מקצוע</p>
              </div>

              <div className="space-y-2">
                {onboardingData.selectedSubjects.map((subject, idx) => (
                  <motion.div
                    key={subject}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <ExamDateSelector
                      subject={subject}
                      examDate={onboardingData.subjectExamDates[subject] || ''}
                      onDateChange={(date) => setSubjectExamDate(subject, date)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === stage ? 'w-6 bg-gradient-to-r from-blue-600 to-purple-600' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <motion.div 
          className="mt-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isCreating}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>בונה תכנית לימוד...</span>
              </span>
            ) : stage === 5 ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>צור תכנית אישית</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>הבא</span>
                <ChevronLeft className="w-5 h-5" />
              </span>
            )}
          </Button>
        </motion.div>

        {stage > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-2"
          >
            <Button
              variant="ghost"
              onClick={() => setStage(stage - 1)}
              className="text-gray-600 hover:text-gray-900 h-8 text-sm"
              disabled={isCreating}
            >
              חזרה
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}