import { useMemo } from "react";

const WEIGHTS = {
  mastery: 0.35,
  practice: 0.30,
  exams: 0.25,
  speed: 0.10
};

const TARGET_REQUIREMENTS = {
  60: { practice: 300, exams: 2, accuracy: 65, speed: 0.7, dailyQuestions: 15 },
  70: { practice: 400, exams: 3, accuracy: 70, speed: 0.75, dailyQuestions: 20 },
  80: { practice: 600, exams: 5, accuracy: 80, speed: 0.85, dailyQuestions: 25 },
  85: { practice: 700, exams: 6, accuracy: 85, speed: 0.9, dailyQuestions: 30 },
  90: { practice: 850, exams: 7, accuracy: 90, speed: 0.95, dailyQuestions: 35 },
  95: { practice: 1000, exams: 9, accuracy: 93, speed: 1.0, dailyQuestions: 45 },
  100: { practice: 1500, exams: 12, accuracy: 97, speed: 1.0, dailyQuestions: 60 }
};

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

  const masteredTopics = Object.values(topicStats).filter(
    stat => stat.total >= 5 && (stat.correct / stat.total) >= 0.75
  ).length;

  return Math.min(100, (masteredTopics / topics.length) * 100);
};

const calculatePracticeScore = (attempts, targetRequirements) => {
  if (!attempts || attempts.length === 0) return 0;

  const totalQuestions = attempts.length;
  const correctAnswers = attempts.filter(
    a => a.status === "correct" || a.percentage >= 70
  ).length;
  
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  
  const volumeScore = Math.min(100, (totalQuestions / targetRequirements.practice) * 100);
  const accuracyScore = Math.min(100, (accuracy / targetRequirements.accuracy) * 100);
  
  return (volumeScore * 0.6 + accuracyScore * 0.4);
};

const calculateExamsScore = (examAttempts, targetRequirements) => {
  if (!examAttempts || examAttempts.length === 0) return 0;

  const completedExams = examAttempts.filter(e => e.is_completed).length;
  const avgScore = examAttempts.length > 0
    ? examAttempts.reduce((sum, e) => sum + (e.score_percent || 0), 0) / examAttempts.length
    : 0;

  const volumeScore = Math.min(100, (completedExams / targetRequirements.exams) * 100);
  const qualityScore = Math.min(100, (avgScore / targetRequirements.accuracy) * 100);

  return (volumeScore * 0.5 + qualityScore * 0.5);
};

const calculateSpeedScore = (attempts, targetSpeed = 0.85) => {
  if (!attempts || attempts.length === 0) return 70;

  const attemptsWithTime = attempts.filter(a => a.time_seconds && a.time_seconds > 0);
  if (attemptsWithTime.length === 0) return 70;

  const avgTimePerQuestion = attemptsWithTime.reduce((sum, a) => sum + a.time_seconds, 0) / attemptsWithTime.length;
  const idealTime = 120;
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

const calculateDailyRecommendations = (targetRequirements, remaining, daysUntilExam) => {
  const safetyMargin = 0.8;
  const effectiveDays = Math.max(1, Math.floor(daysUntilExam * safetyMargin));

  const dailyPractice = Math.ceil(remaining.remainingPractice / effectiveDays);
  const weeklyExams = remaining.remainingExams > 0 ? Math.ceil(remaining.remainingExams / Math.ceil(effectiveDays / 7)) : 0;
  const topicsPerDay = Math.ceil(remaining.weakTopics / effectiveDays);

  return {
    dailyPractice: Math.min(dailyPractice, 50),
    weeklyExams: Math.min(weeklyExams, 3),
    topicsPerDay: Math.min(topicsPerDay, 3),
    reviewMistakes: 10
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

    const dailyRecommendations = calculateDailyRecommendations(
      requirements, 
      { ...remaining, remainingExams: Math.max(0, requirements.exams - examAttempts.filter(e => e.is_completed).length) }, 
      daysUntilExam
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
        reviewMistakes: dailyRecommendations.reviewMistakes
      },
      
      timeline: {
        daysNeeded: timeToReadiness.daysNeeded,
        weeksNeeded: timeToReadiness.weeksNeeded,
        daysUntilExam
      },
      
      targets: {
        targetScore,
        requirements
      }
    };
  }, [user, topics, practiceAttempts, examAttempts]);
};