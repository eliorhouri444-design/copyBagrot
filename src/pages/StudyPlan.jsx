import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2, Target, CheckCircle, BookOpen, Repeat, AlertTriangle,
  Play, Zap, Crown, Lock, TrendingUp, FileCheck, BarChart3, Clock, Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ============================================
// 🧠 READINESS MODEL - 4 PILLARS OF SUCCESS
// ============================================
// 1. Topic Mastery (40%) - All topics at 85%+
// 2. Exam Mastery (50%) - 5-6 exams with target score avg
// 3. Error Mastery (10%) - Less than 20% active errors
// 4. Speed Mastery (bonus) - 15% improvement in solve time

// IMPROVEMENT RATES (how much each action improves readiness):
// - 20 questions → +1-2% (depends on accuracy)
// - 10 mistakes fixed → +1.5%
// - Weak topic to 85% → +5-12% (most significant!)
// - Full exam → +7-15% (strongest near end)
// - Speed improvement → +2-4%

const READINESS_WEIGHTS = {
  exams: 0.50,
  topics: 0.40,
  errors: 0.10
};

const TARGET_REQUIREMENTS = {
  90: { questions: 700, exams: 8, topicMastery: 90 },
  85: { questions: 600, exams: 6, topicMastery: 85 },
  70: { questions: 400, exams: 5, topicMastery: 75 },
  56: { questions: 250, exams: 4, topicMastery: 60 }
};

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [motivationMessage, setMotivationMessage] = useState(null);

  const isPremium = user?.is_premium;

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const subject = currentUser?.selected_subject || 'אנגלית';
        const unitLevel = currentUser?.selected_units || 3;
        const targetScore = currentUser?.target_score || 85;
        const examDate = currentUser?.exam_date ? new Date(currentUser.exam_date) : null;
        const daysUntilExam = examDate ? Math.max(1, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24))) : 60;

        // Fetch all required data in parallel
        const [attempts, examAttempts, practiceSessions, topics] = await Promise.all([
          base44.entities.AttemptNew.filter({ created_by: currentUser.email, subject_id: subject }, '-created_date', 2000),
          base44.entities.ExamAttempt.filter({ created_by: currentUser.email, subject: subject }, '-created_date', 100),
          base44.entities.PracticeSessionNew.filter({ created_by: currentUser.email, subject_id: subject }, '-created_date', 200),
          base44.entities.TopicNew.filter({ subject_id: subject, unit_level: unitLevel, is_active: true }, null, 50)
        ]);

        // ============================================
        // 📊 CALCULATE PERFORMANCE DATA
        // ============================================
        const totalQuestions = attempts.length;
        const correctAnswers = attempts.filter(a => a.status === 'correct' || a.percentage >= 70).length;
        const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        const totalExams = examAttempts.length;
        const last6Exams = examAttempts.slice(0, 6);
        const avgExamScore = last6Exams.length > 0 
          ? Math.round(last6Exams.reduce((sum, e) => sum + (e.score_percent || 0), 0) / last6Exams.length) 
          : 0;

        // Calculate topic mastery for each topic
        const topicStats = {};
        attempts.forEach(a => {
          if (a.topic_id) {
            if (!topicStats[a.topic_id]) {
              topicStats[a.topic_id] = { correct: 0, total: 0, times: [] };
            }
            topicStats[a.topic_id].total++;
            if (a.status === 'correct' || a.percentage >= 70) {
              topicStats[a.topic_id].correct++;
            }
            if (a.time_spent_seconds) {
              topicStats[a.topic_id].times.push(a.time_spent_seconds);
            }
          }
        });

        const topicMasteryList = Object.entries(topicStats).map(([topicId, stats]) => ({
          topicId,
          mastery: Math.round((stats.correct / stats.total) * 100),
          total: stats.total,
          avgTime: stats.times.length > 0 ? Math.round(stats.times.reduce((a,b) => a+b, 0) / stats.times.length) : null
        }));

        // Weak topics = mastery < 85% (changed from 70%)
        const weakTopics = topicMasteryList.filter(t => t.mastery < 85 && t.total >= 3);
        const masteredTopics = topicMasteryList.filter(t => t.mastery >= 85 && t.total >= 5);
        
        // Active mistakes = incorrect answers not yet corrected
        const activeMistakes = attempts.filter(a => 
          (a.status === 'incorrect' || a.percentage < 50) && 
          !a.corrected
        ).length;

        // ============================================
        // 🎯 CALCULATE 4 MASTERY PILLARS
        // ============================================
        
        // 1. TOPIC MASTERY (are all topics at 85%+?)
        const totalTopicsCount = topics.length || 10;
        const topicsAt85Plus = masteredTopics.length;
        const topicsMastery = Math.round((topicsAt85Plus / totalTopicsCount) * 100);

        // 2. EXAM MASTERY (5-6 exams with target avg?)
        const requiredExams = 6;
        const examCountScore = Math.min(100, (totalExams / requiredExams) * 50);
        const examScoreScore = Math.min(100, (avgExamScore / targetScore) * 50);
        const examsMastery = Math.round(examCountScore + examScoreScore);

        // 3. ERROR MASTERY (less than 20% active errors?)
        const errorRatio = totalQuestions > 0 ? activeMistakes / totalQuestions : 0;
        const errorMastery = Math.round(Math.max(0, 100 - (errorRatio * 500))); // 20% errors = 0%

        // 4. SPEED MASTERY (improvement over time)
        const recentAttempts = attempts.slice(0, 50);
        const oldAttempts = attempts.slice(-50);
        const recentAvgTime = recentAttempts.filter(a => a.time_spent_seconds).length > 0
          ? recentAttempts.filter(a => a.time_spent_seconds).reduce((s, a) => s + a.time_spent_seconds, 0) / recentAttempts.filter(a => a.time_spent_seconds).length
          : null;
        const oldAvgTime = oldAttempts.filter(a => a.time_spent_seconds).length > 0
          ? oldAttempts.filter(a => a.time_spent_seconds).reduce((s, a) => s + a.time_spent_seconds, 0) / oldAttempts.filter(a => a.time_spent_seconds).length
          : null;
        const speedImprovement = (recentAvgTime && oldAvgTime && oldAvgTime > recentAvgTime) 
          ? Math.round(((oldAvgTime - recentAvgTime) / oldAvgTime) * 100) 
          : 0;
        const speedMastery = Math.min(100, 50 + speedImprovement * 3.33); // 15% improvement = 100%

        // ============================================
        // 📈 FULL READINESS FORMULA
        // ============================================
        // FullReadiness = 0.50 * ExamsMastery + 0.40 * TopicsMastery + 0.10 * ErrorMastery
        const fullReadiness = Math.round(
          READINESS_WEIGHTS.exams * examsMastery +
          READINESS_WEIGHTS.topics * topicsMastery +
          READINESS_WEIGHTS.errors * errorMastery
        );

        const perfData = {
          totalQuestions,
          correctAnswers,
          overallAccuracy,
          totalExams,
          avgExamScore,
          weakTopics,
          masteredTopics,
          activeMistakes,
          topicsMastery,
          examsMastery,
          errorMastery,
          speedMastery,
          speedImprovement,
          topicMasteryList,
          totalTopicsCount
        };
        setPerformanceData(perfData);

        // Set readiness with gap calculation
        const gap = Math.max(0, targetScore - fullReadiness);
        setReadiness({
          readinessScore: fullReadiness,
          gap,
          breakdown: {
            topics: topicsMastery,
            practice: overallAccuracy,
            exams: examsMastery,
            speed: speedMastery
          }
        });

        // ============================================
        // 📋 CALCULATE REQUIREMENTS TO REACH TARGET
        // ============================================
        const targetReqs = TARGET_REQUIREMENTS[targetScore >= 90 ? 90 : targetScore >= 85 ? 85 : targetScore >= 70 ? 70 : 56];
        const questionsNeeded = Math.max(0, targetReqs.questions - totalQuestions);
        const examsNeeded = Math.max(0, targetReqs.exams - totalExams);
        const topicsToMaster = weakTopics.length;
        const mistakesToFix = activeMistakes;

        // Calculate daily workload based on days until exam
        const questionsPerDay = Math.ceil(questionsNeeded / daysUntilExam);
        const examsPerWeek = Math.ceil(examsNeeded / Math.ceil(daysUntilExam / 7));
        const mistakesPerDay = Math.ceil(mistakesToFix / Math.min(daysUntilExam, 10));

        // Estimated days to reach target (based on improvement rates)
        // Each day: ~2% from questions, ~1.5% from mistakes, occasional ~8% from topics/exams
        const dailyImprovement = isPremium ? 3.5 : 1.5;
        const estimatedDays = gap > 0 ? Math.ceil(gap / dailyImprovement) : 0;

        setRequirements({
          questionsTarget: targetReqs.questions,
          questionsSolved: totalQuestions,
          questionsNeeded,
          questionsPerDay: Math.min(questionsPerDay, isPremium ? 50 : 10),
          examsTarget: targetReqs.exams,
          examsDone: totalExams,
          examsNeeded,
          examsPerWeek: Math.min(examsPerWeek, 3),
          topicsToMaster,
          mistakesToFix,
          mistakesPerDay: Math.min(mistakesPerDay, isPremium ? 15 : 3),
          estimatedDays: Math.max(estimatedDays, 1),
          daysUntilExam
        });

        // ============================================
        // 📅 GENERATE SMART DAILY PLAN
        // ============================================
        const dailyTasks = [];
        let totalMinutes = 0;
        let expectedDailyImprovement = 0;

        // Priority order: 1. Mistakes, 2. Weak Topics, 3. Questions, 4. Exam/Vocab
        
        // Task 1: Fix mistakes (HIGHEST PRIORITY - +1.5% per 10 mistakes)
        if (activeMistakes > 0) {
          const mistakeCount = isPremium ? Math.min(15, Math.max(9, mistakesPerDay)) : 3;
          const duration = mistakeCount * 3;
          dailyTasks.push({
            id: 'mistakes',
            type: 'mistakes',
            title: 'תיקון טעויות',
            description: `חזרה על ${mistakeCount} טעויות`,
            duration,
            count: mistakeCount,
            isPremiumOnly: true,
            isLocked: !isPremium,
            improvement: Math.round(mistakeCount / 10 * 1.5 * 10) / 10
          });
          totalMinutes += duration;
          if (isPremium) expectedDailyImprovement += mistakeCount / 10 * 1.5;
        }

        // Task 2: Strengthen weak topics (HIGH PRIORITY - +5-12% per topic mastered)
        if (weakTopics.length > 0) {
          const weakTopic = weakTopics[0];
          const topicName = topics.find(t => t.topic_id === weakTopic?.topicId)?.name || 'נושא חלש';
          const questionsToMaster = 15;
          const duration = 30;
          dailyTasks.push({
            id: 'weak_topic',
            type: 'topic',
            title: 'חיזוק נושאים חלשים',
            description: `חיזוק: ${topicName}`,
            duration,
            count: questionsToMaster,
            isPremiumOnly: true,
            isLocked: !isPremium,
            improvement: 2.5 // Average contribution towards topic mastery
          });
          totalMinutes += duration;
          if (isPremium) expectedDailyImprovement += 2.5;
        }

        // Task 3: Solve questions (MEDIUM PRIORITY - +1-2% per 20 questions)
        const questionCount = isPremium ? Math.min(30, Math.max(20, questionsPerDay)) : 10;
        const questionDuration = questionCount * 2;
        dailyTasks.push({
          id: 'questions',
          type: 'questions',
          title: 'פתרון שאלות מגוונות',
          description: `${questionCount} שאלות`,
          duration: questionDuration,
          count: questionCount,
          isPremiumOnly: false,
          isLocked: false,
          improvement: Math.round(questionCount / 20 * 1.5 * 10) / 10
        });
        totalMinutes += questionDuration;
        expectedDailyImprovement += questionCount / 20 * 1.5;

        // Task 4: Vocabulary (for English) or Exam prep
        if (subject === 'אנגלית') {
          dailyTasks.push({
            id: 'vocabulary',
            type: 'vocabulary',
            title: 'אוצר מילים יומי',
            description: 'תרגול מילים יומי',
            duration: 10,
            count: 10,
            isPremiumOnly: false,
            isLocked: false,
            improvement: 0.5
          });
          totalMinutes += 10;
          expectedDailyImprovement += 0.5;
        }

        // If close to exam and need exams, add exam task
        if (daysUntilExam <= 14 && examsNeeded > 0) {
          dailyTasks.push({
            id: 'exam_prep',
            type: 'exam',
            title: 'סימולציית בגרות',
            description: 'בגרות מלאה השבוע',
            duration: 90,
            count: 1,
            isPremiumOnly: false,
            isLocked: false,
            improvement: 10
          });
        }

        setDailyPlan({
          tasks: dailyTasks,
          estimatedMinutes: Math.min(totalMinutes, 90), // Cap at 90 minutes
          expectedImprovement: Math.round(expectedDailyImprovement * 10) / 10
        });

        // ============================================
        // 💬 SET MOTIVATION MESSAGE
        // ============================================
        if (fullReadiness >= 80) {
          setMotivationMessage({
            type: 'success',
            icon: '📗',
            title: 'אתה כמעט שם!',
            message: 'המשך בקצב הזה – אתה יכול להגיע ליעד!'
          });
        } else if (fullReadiness >= 40) {
          setMotivationMessage({
            type: 'effort',
            icon: '🟧',
            title: 'אתה בדרך הנכונה',
            message: 'נשאר עוד מאמץ קטן כדי להגיע ליעד.'
          });
        } else {
          setMotivationMessage({
            type: 'intensive',
            icon: '🔴',
            title: `פער של ${gap} נקודות`,
            message: 'נדרש מאמץ מוגבר. נתמקד בטעויות ונושאים חלשים.'
          });
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
  const displayUnits = user?.selected_units || 3;
  const targetScore = user?.target_score || 85;
  const examDate = user?.exam_date ? new Date(user.exam_date) : null;
  const daysUntilExam = examDate ? Math.max(0, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24))) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const readinessScore = readiness?.readinessScore || 0;
  const gap = readiness?.gap || 0;

  return (
    <div className="bg-blue-100 pb-24 min-h-screen">
      {/* 1️⃣ Header */}
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
        {/* 2️⃣ Readiness Box */}
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
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={readinessScore >= 80 ? '#22C55E' : readinessScore >= 40 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${readinessScore}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{readinessScore}%</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-gray-600">
                  {gap > 0 ? `חסרות ${gap} נקודות` : '🎉 הגעת ליעד!'}
                </div>
                {daysUntilExam !== null && (
                  <div className="text-sm font-bold text-blue-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {daysUntilExam} ימים לבגרות
                  </div>
                )}
              </div>
            </div>
            
            {/* 4 Mastery Indicators */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-blue-50 p-3 rounded-xl">
                <div className="relative w-12 h-12 mx-auto mb-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${performanceData?.topicsMastery || 0}, 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold">{performanceData?.topicsMastery || 0}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 font-medium">שליטה</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl">
                <div className="relative w-12 h-12 mx-auto mb-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${performanceData?.overallAccuracy || 0}, 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold">{performanceData?.overallAccuracy || 0}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 font-medium">תרגול</div>
              </div>
              <div className="bg-green-50 p-3 rounded-xl">
                <div className="relative w-12 h-12 mx-auto mb-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${performanceData?.examsMastery || 0}, 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold">{performanceData?.examsMastery || 0}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 font-medium">בגרויות</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl">
                <div className="relative w-12 h-12 mx-auto mb-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${performanceData?.speedMastery || 0}, 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold">{performanceData?.speedMastery || 0}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 font-medium">מהירות</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3️⃣ Motivation Message */}
        {motivationMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3 border-r-4 ${
              motivationMessage.type === 'success' ? 'border-r-green-500' :
              motivationMessage.type === 'effort' ? 'border-r-amber-500' :
              'border-r-red-500'
            }`}
          >
            <span className="text-3xl">{motivationMessage.icon}</span>
            <div className="flex-1">
              <div className="font-bold text-gray-900">{motivationMessage.title}</div>
              <div className="text-sm text-gray-600">{motivationMessage.message}</div>
            </div>
          </motion.div>
        )}

        {/* 4️⃣ Requirements Box */}
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
                  <h3 className="text-base font-bold">מה צריך כדי להגיע ליעד</h3>
                  <p className="text-xs opacity-90">התוכנית שלך להצלחה</p>
                </div>
                <Target className="w-7 h-7" />
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 mb-1">שאלות לפתור:</div>
                  <div className="font-bold text-blue-600 text-lg">
                    {requirements.questionsSolved} מתוך {requirements.questionsTarget}
                  </div>
                  <div className="text-xs text-gray-500">{requirements.questionsPerDay} ליום</div>
                </div>
                <Progress value={(requirements.questionsSolved / requirements.questionsTarget) * 100} className="w-24 h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 mb-1">בגרויות מלאות:</div>
                  <div className="font-bold text-purple-600 text-lg">
                    {requirements.examsDone} מתוך {requirements.examsTarget}
                  </div>
                  <div className="text-xs text-gray-500">{requirements.examsPerWeek} לשבוע</div>
                </div>
                <Progress value={(requirements.examsDone / requirements.examsTarget) * 100} className="w-24 h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 mb-1">נושאים לשליטה:</div>
                  <div className="font-bold text-orange-600 text-lg">
                    {requirements.topicsToMaster} שאינם ברמת שליטה (85%+)
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-700 mb-1">טעויות לתקן:</div>
                  <div className="font-bold text-red-600 text-lg">
                    {requirements.mistakesToFix} טעויות פעילות
                  </div>
                  <div className="text-xs text-gray-500">{requirements.mistakesPerDay} ליום</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-xl text-center border-2 border-blue-200">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    זמן משוער להגעה ליעד: <strong>{requirements.estimatedDays} ימים</strong>
                  </span>
                </div>
                {requirements.daysUntilExam && requirements.estimatedDays > requirements.daysUntilExam && (
                  <div className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ נדרש מאמץ מוגבר - הבגרות בעוד {requirements.daysUntilExam} ימים!
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 5️⃣ Learning Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold">סטטיסטיקות למידה</h3>
                <p className="text-xs opacity-90">הביצועים שלך</p>
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
                <div className="text-sm text-purple-800 font-semibold mb-1">בגרויות שנעשו</div>
                <div className="text-2xl font-bold text-purple-900">{performanceData?.totalExams || 0}</div>
                <div className="text-xs text-purple-600">ממוצע ציון: {performanceData?.avgExamScore || 0}</div>
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

        {/* 6️⃣ Daily Tasks */}
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
                  'mistakes': { bg: 'bg-red-50', icon: 'bg-red-500', text: 'text-red-800', border: 'border-red-200' },
                  'topic': { bg: 'bg-orange-50', icon: 'bg-orange-500', text: 'text-orange-800', border: 'border-orange-200' },
                  'questions': { bg: 'bg-blue-50', icon: 'bg-blue-500', text: 'text-blue-800', border: 'border-blue-200' },
                  'exam': { bg: 'bg-green-50', icon: 'bg-green-500', text: 'text-green-800', border: 'border-green-200' },
                  'vocabulary': { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-800', border: 'border-purple-200' }
                };
                const Icon = iconMap[task.type] || BookOpen;
                const colors = colorMap[task.type] || colorMap['questions'];
                
                return (
                  <div key={task.id || idx} className={`${colors.bg} p-4 rounded-xl border-2 ${colors.border} ${task.isLocked ? 'opacity-70' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${colors.icon} rounded-full flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className={`font-semibold ${colors.text} flex items-center gap-2`}>
                            {task.title}
                            {task.isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className="text-sm text-gray-600">{task.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-700">{task.duration} דק'</div>
                        {task.count && <div className="text-xs text-gray-500">{task.count} פריטים</div>}
                      </div>
                    </div>
                    {task.isPremiumOnly && !isPremium && (
                      <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        פרימיום בלבד
                      </div>
                    )}
                    {task.improvement && isPremium && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        📈 +{task.improvement}% במוכנות
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {dailyPlan?.expectedImprovement > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl border-2 border-green-200">
                <div className="text-center">
                  <div className="text-sm text-green-800 font-medium">
                    אם תסיים את כל המשימות היום:
                  </div>
                  <div className="text-lg font-bold text-green-700 mt-1">
                    +{dailyPlan.expectedImprovement}% במוכנות
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* 7️⃣ Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {/* Button 1: Fix Mistakes */}
          <Button
            onClick={() => {
              if (isPremium) {
                navigate(createPageUrl("CustomWeakPractice"));
              } else {
                navigate(createPageUrl("Premium"));
              }
            }}
            className={`w-full h-14 text-base font-bold rounded-[14px] flex items-center justify-center gap-2 ${
              isPremium ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-400 hover:bg-gray-500'
            } text-white`}
          >
            <Repeat className="w-5 h-5" />
            תרגל טעויות
            {!isPremium && <Lock className="w-4 h-4 ml-2" />}
          </Button>

          {/* Button 2: Weak Topics */}
          <Button
            onClick={() => {
              if (isPremium) {
                navigate(createPageUrl("WeakAreaSelection"));
              } else {
                navigate(createPageUrl("Premium"));
              }
            }}
            className={`w-full h-14 text-base font-bold rounded-[14px] flex items-center justify-center gap-2 ${
              isPremium ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 hover:bg-gray-500'
            } text-white`}
          >
            <Target className="w-5 h-5" />
            תרגל נושאים חלשים
            {!isPremium && <Lock className="w-4 h-4 ml-2" />}
          </Button>

          {/* Button 3: Full Exam */}
          <Button
            onClick={() => navigate(createPageUrl("Exams"))}
            className="w-full h-14 text-base font-bold rounded-[14px] flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white"
          >
            <FileCheck className="w-5 h-5" />
            בגרות מלאה — סימולציה
            {!isPremium && <span className="text-xs opacity-80">(צפייה בפרסומת)</span>}
          </Button>

          {/* Button 4: Daily Task */}
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full h-14 text-base font-bold rounded-[14px] flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-blue-700 text-white"
          >
            <Play className="w-5 h-5" />
            משימה יומית
          </Button>
        </motion.div>

        {/* 8️⃣ Premium Upsell */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-lg p-5 border-2 border-amber-200"
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
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> תיקון טעויות ללא הגבלה</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> תרגול נושאים חלשים</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> סימולציות מלאות ללא פרסומות</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> גישה מלאה לתוכנית</li>
            </ul>
            <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold h-12 rounded-[14px]"
            >
              <Crown className="w-5 h-5 ml-2" />
              שדרג עכשיו
            </Button>
          </motion.div>
        )}

        {/* Weak Topics Alert */}
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