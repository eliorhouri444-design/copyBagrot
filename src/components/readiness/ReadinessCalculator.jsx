import { useMemo } from "react";

// משקלות לפי ה-ENGINE
const WEIGHTS = {
  mastery: 0.35,  // TopicMasteryWeight
  practice: 0.25, // PracticeWeight
  exams: 0.25,    // ExamsWeight
  speed: 0.15     // SpeedWeight
};

const TARGET_REQUIREMENTS = {
  60: { practice: 300, exams: 2, accuracy: 65, speed: 0.7, dailyQuestions: 10, topicsPerDay: 1, errorRate: 35 },
  70: { practice: 400, exams: 3, accuracy: 70, speed: 0.75, dailyQuestions: 20, topicsPerDay: 1, errorRate: 30 },
  80: { practice: 600, exams: 5, accuracy: 80, speed: 0.85, dailyQuestions: 25, topicsPerDay: 2, errorRate: 25 },
  85: { practice: 700, exams: 6, accuracy: 85, speed: 0.9, dailyQuestions: 30, topicsPerDay: 2, errorRate: 20 },
  90: { practice: 1000, exams: 7, accuracy: 90, speed: 0.95, dailyQuestions: 40, topicsPerDay: 3, errorRate: 15 },
  95: { practice: 1200, exams: 10, accuracy: 93, speed: 1.0, dailyQuestions: 50, topicsPerDay: 3, errorRate: 10 },
  100: { practice: 1500, exams: 12, accuracy: 97, speed: 1.0, dailyQuestions: 70, topicsPerDay: 3, errorRate: 10 }
};

// TopicMastery = ממוצע אחוז השליטה בכל הנושאים
// נושא חלש ← מתחת 40%, נושא בינוני ← 40–70%, נושא חזק ← מעל 70%
const calculateMasteryScore = (topics, attempts) => {
  if (!topics || topics.length === 0) return 0;

  const topicStats = {};
  
  attempts.forEach(attempt => {
    const topicId = attempt.topic_id;
    if (!topicId) return;
    
    if (!topicStats[topicId]) {
      topicStats[topicId] = { total: 0, correct: 0 };
    }
    topicStats[topicId].total++;
    if (attempt.status === "correct" || attempt.percentage >= 80) {
      topicStats[topicId].correct++;
    }
  });

  // חישוב ממוצע השליטה בכל הנושאים
  let totalMastery = 0;
  topics.forEach(topic => {
    const stats = topicStats[topic.topic_id];
    if (stats && stats.total > 0) {
      totalMastery += (stats.correct / stats.total) * 100;
    }
  });

  return Math.min(100, totalMastery / topics.length);
};

// PracticeScore = SolvedQuestions / TotalNeededQuestions
const calculatePracticeScore = (attempts, targetRequirements) => {
  if (!attempts || attempts.length === 0) return 0;

  const totalQuestions = attempts.length;
  
  // PracticeScore פשוט: כמה שאלות פתרת מתוך הנדרש
  const practiceScore = Math.min(100, (totalQuestions / targetRequirements.practice) * 100);
  
  return practiceScore;
};

// ExamsPerformance = ממוצע ציונים ב־3 הבגרויות האחרונות
const calculateExamsScore = (examAttempts, targetRequirements) => {
  if (!examAttempts || examAttempts.length === 0) return 0;

  const completedExams = examAttempts.filter(e => e.is_completed);
  
  // ממוצע 3 בגרויות אחרונות
  const last3Exams = completedExams.slice(0, 3);
  const avgScore = last3Exams.length > 0
    ? last3Exams.reduce((sum, e) => sum + (e.score_percent || 0), 0) / last3Exams.length
    : 0;

  return Math.min(100, avgScore);
};

// SpeedScore = מהירות פתרון ביחס למהירות המטרה
const calculateSpeedScore = (attempts, targetSpeed = 0.85) => {
  if (!attempts || attempts.length === 0) return 70;

  const attemptsWithTime = attempts.filter(a => a.time_seconds && a.time_seconds > 0);
  if (attemptsWithTime.length === 0) return 70;

  const avgTimePerQuestion = attemptsWithTime.reduce((sum, a) => sum + a.time_seconds, 0) / attemptsWithTime.length;
  const idealTime = 90; // 90 שניות לשאלה = מהירות מטרה
  const speedRatio = Math.min(1, idealTime / avgTimePerQuestion);
  
  return Math.min(100, (speedRatio / targetSpeed) * 100);
};

const calculateRemainingMaterial = (topics, attempts, targetRequirements) => {
  const topicStats = {};
  
  attempts.forEach(attempt => {
    const topicId = attempt.topic_id;
    if (!topicId) return;
    
    if (!topicStats[topicId]) {
      topicStats[topicId] = { total: 0, correct: 0 };
    }
    topicStats[topicId].total++;
    if (attempt.status === "correct" || attempt.percentage >= 80) {
      topicStats[topicId].correct++;
    }
  });

  const weakTopics = topics.filter(topic => {
    const stats = topicStats[topic.topic_id];
    if (!stats) return true;
    return stats.total < 5 || (stats.correct / stats.total) < 0.75;
  });

  const remainingPractice = Math.max(0, targetRequirements.practice - attempts.length);

  return {
    weakTopics: weakTopics.length,
    remainingPractice,
    untouchedTopics: topics.filter(t => !topicStats[t.topic_id]).length
  };
};

// TASK GENERATOR – יצירת משימות יומיות לפי ENGINE
// SolveQuestions = RemainingQuestions / DaysUntilExam
// LearnTopics = WeakTopicsCount / DaysUntilExam * 2
// FixErrors = ErrorsList.size / 3
const calculateDailyRecommendations = (targetRequirements, remaining, daysUntilExam, currentAccuracy, errorCount = 0) => {
  const effectiveDays = Math.max(1, daysUntilExam);

  // SolveQuestions = RemainingQuestions / DaysUntilExam
  const dailyPractice = Math.max(
    targetRequirements.dailyQuestions,
    Math.ceil(remaining.remainingPractice / effectiveDays)
  );

  // WeeklyExam = אחת ל־3 ימים סימולציה
  // אם נשארו ≤ 7 ימים → סימולציות קצרות
  const weeklyExams = daysUntilExam <= 7 
    ? Math.ceil(remaining.remainingExams / 2) // סימולציות קצרות
    : Math.ceil(remaining.remainingExams / Math.ceil(effectiveDays / 3));

  // LearnTopics = WeakTopicsCount / DaysUntilExam * 2
  const topicsPerDay = remaining.weakTopics > 0 
    ? Math.max(1, Math.ceil((remaining.weakTopics / effectiveDays) * 2))
    : targetRequirements.topicsPerDay;

  // FixErrors = ErrorsList.size / 3
  const reviewMistakes = Math.max(5, Math.ceil(errorCount / 3));

  // זמן לימוד יומי = כמות שאלות * זמן לשאלה + נושאים * זמן נושא + טעויות * זמן חזרה
  const avgTimePerQuestion = 1.5; // דקות
  const topicStudyTime = 15; // דקות לנושא
  const errorReviewTime = 2; // דקות לטעות
  
  const studyMinutes = Math.ceil(
    dailyPractice * avgTimePerQuestion +
    topicsPerDay * topicStudyTime +
    reviewMistakes * errorReviewTime
  );

  return {
    dailyPractice: Math.min(dailyPractice, 100), // מקסימום 100 שאלות ליום
    weeklyExams: Math.min(weeklyExams, 3),
    topicsPerDay: Math.min(topicsPerDay, 5),
    reviewMistakes: Math.min(reviewMistakes, 20),
    studyMinutes,
    examMinutes: weeklyExams > 0 ? 90 : 0
  };
};

const calculateTimeToReadiness = (currentReadiness, targetScore, dailyRecommendations) => {
  const gap = 100 - currentReadiness;
  const dailyProgress = dailyRecommendations.dailyPractice * 0.15;
  
  const daysNeeded = Math.ceil(gap / dailyProgress);
  const weeksNeeded = Math.ceil(daysNeeded / 7);

  return { daysNeeded, weeksNeeded };
};

export const useReadinessCalculator = (user, topics, practiceAttempts, examAttempts) => {
  return useMemo(() => {
    if (!user || !topics || !practiceAttempts || !examAttempts) {
      return null;
    }

    const targetScore = user.target_score || 85;
    
    const availableTargets = Object.keys(TARGET_REQUIREMENTS).map(Number).sort((a, b) => a - b);
    const closestTarget = availableTargets.find(t => t >= targetScore) || 100;
    const requirements = TARGET_REQUIREMENTS[closestTarget];

    const masteryScore = calculateMasteryScore(topics, practiceAttempts);
    const practiceScore = calculatePracticeScore(practiceAttempts, requirements);
    const examsScore = calculateExamsScore(examAttempts, requirements);
    const speedScore = calculateSpeedScore(practiceAttempts, requirements.speed);

    const readinessScore = Math.round(
      masteryScore * WEIGHTS.mastery +
      practiceScore * WEIGHTS.practice +
      examsScore * WEIGHTS.exams +
      speedScore * WEIGHTS.speed
    );

    const remaining = calculateRemainingMaterial(topics, practiceAttempts, requirements);

    const daysUntilExam = user.exam_date 
      ? Math.max(1, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24)))
      : 90;

    // חישוב כמות טעויות
    const errorCount = practiceAttempts.filter(a => a.status === "incorrect").length;

    const dailyRecommendations = calculateDailyRecommendations(
      requirements, 
      { ...remaining, remainingExams: Math.max(0, requirements.exams - examAttempts.filter(e => e.is_completed).length) }, 
      daysUntilExam,
      practiceScore,
      errorCount
    );

    const timeToReadiness = calculateTimeToReadiness(readinessScore, targetScore, dailyRecommendations);

    return {
      scores: {
        mastery: Math.round(masteryScore),
        practice: Math.round(practiceScore),
        exams: Math.round(examsScore),
        speed: Math.round(speedScore),
        overall: readinessScore
      },
      
      remaining: {
        practice: remaining.remainingPractice,
        exams: Math.max(0, requirements.exams - examAttempts.filter(e => e.is_completed).length),
        weakTopics: remaining.weakTopics,
        untouchedTopics: remaining.untouchedTopics
      },
      
      daily: {
        questions: dailyRecommendations.dailyPractice,
        topics: dailyRecommendations.topicsPerDay,
        examsPerWeek: dailyRecommendations.weeklyExams,
        reviewMistakes: dailyRecommendations.reviewMistakes,
        studyMinutes: dailyRecommendations.studyMinutes,
        examMinutes: dailyRecommendations.examMinutes
      },
      
      timeline: {
        daysNeeded: timeToReadiness.daysNeeded,
        weeksNeeded: timeToReadiness.weeksNeeded,
        daysUntilExam
      },
      
      targets: {
        targetScore,
        requirements
      },

      current: {
        totalPractice: practiceAttempts.length,
        totalExams: examAttempts.filter(e => e.is_completed).length,
        currentAccuracy: practiceAttempts.length > 0 
          ? (practiceAttempts.filter(a => a.status === "correct").length / practiceAttempts.length * 100)
          : 0,
        currentErrorRate: practiceAttempts.length > 0
          ? (practiceAttempts.filter(a => a.status === "incorrect").length / practiceAttempts.length * 100)
          : 0,
        errorCount,
        topicsMastered: topics.filter(t => {
          const stats = practiceAttempts.filter(a => a.topic_id === t.topic_id);
          const correct = stats.filter(a => a.status === "correct").length;
          return stats.length >= 5 && (correct / stats.length) >= 0.70; // נושא חזק = מעל 70%
        }).length,
        avgSpeed: (() => {
          const withTime = practiceAttempts.filter(a => a.time_seconds > 0);
          return withTime.length > 0 
            ? Math.round(withTime.reduce((sum, a) => sum + a.time_seconds, 0) / withTime.length)
            : 0;
        })()
      }
    };
  }, [user, topics, practiceAttempts, examAttempts]);
};