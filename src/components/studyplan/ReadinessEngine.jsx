/**
 * Readiness Engine - מנוע מוכנות לבגרות
 * 
 * חישוב מד מוכנות מלא:
 * Readiness = 0.35*ContentScore + 0.30*PracticeScore + 0.25*ExamScore + 0.10*SpeedScore
 * 
 * תרגום פער למשימות יומיות ושבועיות
 */

// ===== נושאים קריטיים לפי מקצוע =====
export const CRITICAL_TOPICS = {
  'אנגלית': {
    core: ['reading_comprehension', 'vocabulary', 'inference', 'main_idea', 'grammar'],
    byUnit: {
      3: ['basic_reading', 'vocabulary_basic', 'time_expressions', 'simple_inference'],
      4: ['intermediate_reading', 'vocabulary_advanced', 'inference', 'connectors', 'grammar_intermediate'],
      5: ['academic_reading', 'academic_vocabulary', 'complex_inference', 'tone', 'purpose', 'attitude', 'advanced_grammar']
    }
  },
  'מתמטיקה': {
    core: ['derivatives', 'investigation', 'functions', 'trigonometry', 'geometry', 'probability', 'equations', 'algebra'],
    byUnit: {
      3: ['linear_equations', 'quadratic', 'basic_geometry', 'statistics', 'percentages'],
      4: ['trigonometry', 'derivatives_basic', 'rate_problems', 'geometry_advanced', 'functions'],
      5: ['investigation', 'integrals', 'volumes', 'sequences', 'probability_advanced', 'complex_trigonometry']
    }
  }
};

// ===== משקולות לחישוב מוכנות כולל =====
// FullExamReadiness = 0.50 * ExamsMastery + 0.40 * TopicsMastery + 0.10 * ErrorMastery
export const FULL_READINESS_WEIGHTS = {
  EXAMS_MASTERY: 0.50,
  TOPICS_MASTERY: 0.40,
  ERROR_MASTERY: 0.10
};

// משקולות לחישוב מוכנות שאלון (ExamReadiness per module)
// ExamReadiness = 0.50 * TopicMastery + 0.30 * PracticePerformance + 0.20 * ExamPerformance
export const EXAM_READINESS_WEIGHTS = {
  TOPIC_MASTERY: 0.50,
  PRACTICE_PERFORMANCE: 0.30,
  EXAM_PERFORMANCE: 0.20
};

// משקולות לחישוב מוכנות נושא (TopicReadiness per topic)
// TopicReadiness = 0.60 * Accuracy + 0.20 * DifficultyScore + 0.10 * ErrorReduction + 0.10 * SpeedScore
export const TOPIC_READINESS_WEIGHTS = {
  ACCURACY: 0.60,
  DIFFICULTY: 0.20,
  ERROR_REDUCTION: 0.10,
  SPEED: 0.10
};

// Legacy weights (kept for backward compatibility)
export const READINESS_WEIGHTS = {
  CONTENT_MASTERY: 0.35,
  PRACTICE_SCORE: 0.30,
  EXAM_SCORE: 0.25,
  SPEED_SCORE: 0.10
};

// ===== דרישות מינימום לציונים =====
export const TARGET_REQUIREMENTS = {
  55: { minTopicsMastered: 0.50, minExams: 2, minQuestions: 100 },
  70: { minTopicsMastered: 0.65, minExams: 4, minQuestions: 300 },
  85: { minTopicsMastered: 0.80, minExams: 6, minQuestions: 500 },
  90: { minTopicsMastered: 0.85, minExams: 8, minQuestions: 600 },
  100: { minTopicsMastered: 0.95, minExams: 12, minQuestions: 800 }
};

/**
 * קריאת נתוני ביצוע מהמסד
 * @param {Object} base44 - SDK
 * @param {string} userEmail - אימייל המשתמש
 * @param {string} subject - מקצוע
 * @param {number} unitLevel - רמת יחידות
 */
export const fetchUserPerformanceData = async (base44, userEmail, subject, unitLevel) => {
  try {
    const [
      attempts,
      examAttempts,
      practiceSessions,
      weakTopics
    ] = await Promise.all([
      base44.entities.AttemptNew.filter({ created_by: userEmail }, '-created_date', 1000),
      base44.entities.ExamAttempt.filter({ 
        created_by: userEmail, 
        subject: subject 
      }, '-created_date', 100),
      base44.entities.PracticeSessionNew.filter({ 
        created_by: userEmail, 
        subject_id: subject,
        is_completed: true 
      }, '-created_date', 200),
      base44.entities.WeakTopic.filter({ created_by: userEmail }, null, 50)
    ]);

    // חישוב סטטיסטיקות לפי נושא
    const topicStats = {};
    attempts.forEach(attempt => {
      const topic = attempt.topic_id || 'general';
      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0, times: [], scores: [] };
      }
      topicStats[topic].total++;
      if (attempt.status === 'correct') topicStats[topic].correct++;
      if (attempt.time_spent_seconds) topicStats[topic].times.push(attempt.time_spent_seconds);
      if (attempt.percentage) topicStats[topic].scores.push(attempt.percentage);
    });

    // חישוב אחוז הצלחה לכל נושא
    const topicMastery = {};
    Object.entries(topicStats).forEach(([topic, stats]) => {
      topicMastery[topic] = {
        score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        attempts: stats.total,
        avgTime: stats.times.length > 0 
          ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length) 
          : 0,
        avgScore: stats.scores.length > 0
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
          : 0
      };
    });

    // סטטיסטיקות כלליות
    const totalCorrect = attempts.filter(a => a.status === 'correct').length;
    const totalWrong = attempts.filter(a => a.status === 'incorrect' || a.status === 'partial').length;
    const totalQuestions = attempts.length;

    // זמן פתרון ממוצע
    const timesWithData = attempts.filter(a => a.time_spent_seconds > 0);
    const avgTimePerQuestion = timesWithData.length > 0
      ? Math.round(timesWithData.reduce((sum, a) => sum + a.time_spent_seconds, 0) / timesWithData.length)
      : 0;

    // ממוצע בגרויות
    const examScores = examAttempts.map(e => e.score_percent || 0);
    const avgExamScore = examScores.length > 0
      ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length)
      : 0;

    // טעויות פעילות (שאלות שנענו לא נכון יותר מפעם אחת)
    const mistakeCount = {};
    attempts.filter(a => a.status === 'incorrect').forEach(a => {
      const key = a.question_id || `${a.topic_id}_${a.created_date}`;
      mistakeCount[key] = (mistakeCount[key] || 0) + 1;
    });
    const activeMistakes = Object.values(mistakeCount).filter(c => c >= 1).length;

    // נושאים חלשים (ציון < 70%)
    const weakTopicsFromData = Object.entries(topicMastery)
      .filter(([_, stats]) => stats.score < 70 && stats.attempts >= 3)
      .map(([topic, stats]) => ({ topic, ...stats }))
      .sort((a, b) => a.score - b.score);

    // זמן למידה יומי ממוצע (מהסשנים)
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSessions = practiceSessions.filter(s => new Date(s.created_date) >= last30Days);
    const totalStudyMinutes = recentSessions.reduce((sum, s) => sum + (s.duration_seconds || 0) / 60, 0);
    const daysWithStudy = new Set(recentSessions.map(s => new Date(s.created_date).toDateString())).size;
    const avgDailyStudyMinutes = daysWithStudy > 0 ? Math.round(totalStudyMinutes / daysWithStudy) : 0;

    return {
      // ביצועים כלליים
      totalQuestions,
      totalCorrect,
      totalWrong,
      overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      
      // זמנים
      avgTimePerQuestion,
      avgDailyStudyMinutes,
      
      // בגרויות
      totalExams: examAttempts.length,
      avgExamScore,
      examScores,
      passedExams: examAttempts.filter(e => e.passed || e.score_percent >= 56).length,
      
      // נושאים
      topicMastery,
      weakTopics: weakTopicsFromData,
      activeMistakes,
      
      // מעקב
      practiceSessions: practiceSessions.length,
      
      // Raw data for further processing
      raw: {
        attempts,
        examAttempts,
        practiceSessions
      }
    };
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return null;
  }
};

/**
 * חישוב Content Mastery Score
 * ContentScore = Σ(שליטה בנושאים) / מספר נושאים
 */
export const calculateContentMasteryScore = (topicMastery, subject, unitLevel) => {
  const criticalTopics = CRITICAL_TOPICS[subject]?.byUnit?.[unitLevel] || [];
  
  if (criticalTopics.length === 0) {
    // אם אין נושאים מוגדרים - חשב ממוצע כללי
    const scores = Object.values(topicMastery).map(t => t.score || 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  let totalScore = 0;
  let coveredTopics = 0;

  criticalTopics.forEach(topic => {
    const mastery = topicMastery[topic];
    if (mastery && mastery.attempts >= 3) {
      totalScore += mastery.score;
      coveredTopics++;
    } else {
      // נושא לא מכוסה = 0
      coveredTopics++;
    }
  });

  return coveredTopics > 0 ? Math.round(totalScore / coveredTopics) : 0;
};

/**
 * חישוב Practice Score
 * PracticeScore = 1 - (טעויות פעילות / סך כל השאלות)
 */
export const calculatePracticeScore = (totalQuestions, activeMistakes, overallAccuracy) => {
  if (totalQuestions === 0) return 0;
  
  // שילוב של דיוק + יחס טעויות
  const mistakeRatio = 1 - (activeMistakes / Math.max(totalQuestions, 1));
  const accuracyScore = overallAccuracy / 100;
  
  // משקל: 60% דיוק, 40% יחס טעויות
  return Math.round((accuracyScore * 0.6 + mistakeRatio * 0.4) * 100);
};

/**
 * חישוב Exam Score
 * ExamScore = ממוצע ביצועים בבגרויות / 100
 */
export const calculateExamScore = (examScores) => {
  if (!examScores || examScores.length === 0) return 0;
  return Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length);
};

/**
 * חישוב Speed Score
 * מבוסס על זמן פתרון ממוצע לעומת סטנדרט
 */
export const calculateSpeedScore = (avgTimePerQuestion, subject, unitLevel) => {
  // זמן סטנדרטי לשאלה (בשניות)
  const standardTimes = {
    'אנגלית': { 3: 90, 4: 120, 5: 150 },
    'מתמטיקה': { 3: 180, 4: 240, 5: 300 }
  };
  
  const standard = standardTimes[subject]?.[unitLevel] || 120;
  
  if (avgTimePerQuestion === 0) return 50; // ברירת מחדל
  
  // יחס: מהיר יותר = ציון גבוה יותר (עד 100)
  const ratio = standard / avgTimePerQuestion;
  return Math.min(100, Math.max(0, Math.round(ratio * 50)));
};

/**
 * חישוב מד מוכנות מלא
 * Readiness = 0.35*Content + 0.30*Practice + 0.25*Exam + 0.10*Speed
 */
export const calculateReadinessScore = ({
  contentScore,
  practiceScore,
  examScore,
  speedScore
}) => {
  return Math.round(
    contentScore * READINESS_WEIGHTS.CONTENT_MASTERY +
    practiceScore * READINESS_WEIGHTS.PRACTICE_SCORE +
    examScore * READINESS_WEIGHTS.EXAM_SCORE +
    speedScore * READINESS_WEIGHTS.SPEED_SCORE
  );
};

/**
 * חישוב מלא של מוכנות מנתוני ביצוע
 */
export const calculateFullReadiness = (performanceData, subject, unitLevel) => {
  if (!performanceData) {
    return {
      readinessScore: 0,
      contentScore: 0,
      practiceScore: 0,
      examScore: 0,
      speedScore: 0,
      breakdown: null
    };
  }

  const contentScore = calculateContentMasteryScore(
    performanceData.topicMastery, 
    subject, 
    unitLevel
  );
  
  const practiceScore = calculatePracticeScore(
    performanceData.totalQuestions,
    performanceData.activeMistakes,
    performanceData.overallAccuracy
  );
  
  const examScore = calculateExamScore(performanceData.examScores);
  
  const speedScore = calculateSpeedScore(
    performanceData.avgTimePerQuestion,
    subject,
    unitLevel
  );

  const readinessScore = calculateReadinessScore({
    contentScore,
    practiceScore,
    examScore,
    speedScore
  });

  return {
    readinessScore,
    contentScore,
    practiceScore,
    examScore,
    speedScore,
    breakdown: {
      content: { score: contentScore, weight: READINESS_WEIGHTS.CONTENT_MASTERY, contribution: Math.round(contentScore * READINESS_WEIGHTS.CONTENT_MASTERY) },
      practice: { score: practiceScore, weight: READINESS_WEIGHTS.PRACTICE_SCORE, contribution: Math.round(practiceScore * READINESS_WEIGHTS.PRACTICE_SCORE) },
      exam: { score: examScore, weight: READINESS_WEIGHTS.EXAM_SCORE, contribution: Math.round(examScore * READINESS_WEIGHTS.EXAM_SCORE) },
      speed: { score: speedScore, weight: READINESS_WEIGHTS.SPEED_SCORE, contribution: Math.round(speedScore * READINESS_WEIGHTS.SPEED_SCORE) }
    }
  };
};

/**
 * חישוב פער ותרגום לדרישות
 */
export const calculateGapAndRequirements = ({
  targetScore,
  readinessScore,
  performanceData,
  subject,
  unitLevel,
  daysUntilExam
}) => {
  const gap = Math.max(0, targetScore - readinessScore);
  
  // דרישות בסיסיות לפי ציון יעד
  const baseReqs = TARGET_REQUIREMENTS[targetScore] || TARGET_REQUIREMENTS[85];
  
  // כמה נושאים צריך לכסות
  const criticalTopics = CRITICAL_TOPICS[subject]?.byUnit?.[unitLevel] || [];
  const totalTopics = criticalTopics.length;
  const masteredTopics = Object.entries(performanceData.topicMastery || {})
    .filter(([topic, data]) => data.score >= 80 && data.attempts >= 5)
    .length;
  const topicsToMaster = Math.max(0, Math.ceil(totalTopics * baseReqs.minTopicsMastered) - masteredTopics);

  // כמה שאלות צריך לפתור
  const questionsDone = performanceData.totalQuestions || 0;
  const questionsNeeded = Math.max(0, baseReqs.minQuestions - questionsDone);

  // כמה בגרויות צריך לעשות
  const examsDone = performanceData.totalExams || 0;
  const examsNeeded = Math.max(0, baseReqs.minExams - examsDone);

  // טעויות לתקן
  const mistakesToFix = performanceData.activeMistakes || 0;

  // חישוב דרישות יומיות לפי הזמן שנותר
  const effectiveDays = Math.max(1, daysUntilExam - 3); // שומרים 3 ימים לחזרה

  return {
    gap,
    targetScore,
    currentReadiness: readinessScore,
    
    requirements: {
      questionsNeeded,
      questionsPerDay: Math.ceil(questionsNeeded / effectiveDays),
      
      examsNeeded,
      examsPerWeek: Math.ceil(examsNeeded / Math.max(1, Math.ceil(effectiveDays / 7))),
      
      topicsToMaster,
      topicsPerWeek: Math.ceil(topicsToMaster / Math.max(1, Math.ceil(effectiveDays / 7))),
      
      mistakesToFix,
      mistakesPerDay: Math.ceil(mistakesToFix / effectiveDays),
      
      // שיפור מהירות נדרש
      speedImprovementNeeded: performanceData.avgTimePerQuestion > 0 
        ? Math.max(0, 15 - Math.round(100 / performanceData.avgTimePerQuestion * 10))
        : 10
    },
    
    priorities: getPriorities(gap, performanceData),
    
    estimatedDaysToTarget: Math.ceil(gap * 0.5) // ~2% שיפור ליום
  };
};

/**
 * קביעת עדיפויות לפי הפער והביצועים
 */
const getPriorities = (gap, performanceData) => {
  const priorities = [];

  // עדיפות 1: תיקון טעויות (אם יש הרבה)
  if (performanceData.activeMistakes > 20) {
    priorities.push({
      type: 'mistakes',
      priority: 'critical',
      description: 'תיקון טעויות חוזרות',
      weight: 0.4
    });
  }

  // עדיפות 2: נושאים חלשים
  if (performanceData.weakTopics?.length > 0) {
    priorities.push({
      type: 'weak_topics',
      priority: gap > 15 ? 'critical' : 'high',
      description: 'חיזוק נושאים חלשים',
      topics: performanceData.weakTopics.slice(0, 3),
      weight: 0.3
    });
  }

  // עדיפות 3: בגרויות (אם עשה מעט)
  if (performanceData.totalExams < 3) {
    priorities.push({
      type: 'exams',
      priority: 'high',
      description: 'ביצוע בגרויות מלאות',
      weight: 0.2
    });
  }

  // עדיפות 4: תרגול כללי
  priorities.push({
    type: 'practice',
    priority: 'medium',
    description: 'תרגול מגוון',
    weight: 0.1
  });

  return priorities;
};

/**
 * בניית תוכנית יומית מלאה
 */
export const buildCompleteDailyPlan = ({
  performanceData,
  requirements,
  targetScore,
  daysUntilExam,
  subject,
  unitLevel,
  dayOfWeek
}) => {
  const plan = {
    date: new Date(),
    targetScore,
    currentReadiness: requirements.currentReadiness,
    gap: requirements.gap,
    tasks: [],
    estimatedMinutes: 0,
    expectedImprovement: 0
  };

  // קביעת מצב
  const isIntensiveMode = requirements.gap > 15;
  const isSimulationMode = requirements.gap <= 0 && daysUntilExam < 14;
  const isLastWeek = daysUntilExam <= 7;

  plan.mode = isSimulationMode ? 'simulation' : isIntensiveMode ? 'intensive' : 'normal';

  // === משימה 1: תיקון טעויות (תמיד) ===
  if (requirements.requirements.mistakesToFix > 0) {
    const mistakeCount = Math.min(
      requirements.requirements.mistakesPerDay,
      isIntensiveMode ? 15 : 8
    );
    plan.tasks.push({
      id: 'fix-mistakes',
      type: 'mistakes',
      title: 'תיקון טעויות',
      description: `חזרה על ${mistakeCount} שאלות שטעית בהן`,
      count: mistakeCount,
      duration: mistakeCount * 3,
      priority: 'critical',
      icon: 'Repeat'
    });
    plan.estimatedMinutes += mistakeCount * 3;
  }

  // === משימה 2: נושאים חלשים ===
  const weakTopics = performanceData.weakTopics || [];
  if (weakTopics.length > 0) {
    const topicToFocus = weakTopics[dayOfWeek % weakTopics.length];
    plan.tasks.push({
      id: 'weak-topic',
      type: 'topic',
      title: `חיזוק: ${topicToFocus?.topic || 'נושא לחיזוק'}`,
      description: `ציון נוכחי: ${topicToFocus?.score || 0}% - נדרש שיפור`,
      topic: topicToFocus?.topic,
      count: isIntensiveMode ? 15 : 10,
      duration: isIntensiveMode ? 30 : 20,
      priority: isIntensiveMode ? 'critical' : 'high',
      icon: 'Target'
    });
    plan.estimatedMinutes += isIntensiveMode ? 30 : 20;
  }

  // === משימה 3: תרגול שאלות ===
  const questionsToSolve = Math.min(
    requirements.requirements.questionsPerDay,
    isIntensiveMode ? 50 : 30
  );
  plan.tasks.push({
    id: 'practice',
    type: 'questions',
    title: 'פתרון שאלות',
    description: `${questionsToSolve} שאלות מגוונות`,
    count: questionsToSolve,
    duration: Math.round(questionsToSolve * 2),
    priority: 'high',
    icon: 'BookOpen'
  });
  plan.estimatedMinutes += Math.round(questionsToSolve * 2);

  // === משימה 4: סימולציה (סופ"ש או שבוע אחרון) ===
  const isSimulationDay = dayOfWeek === 5 || dayOfWeek === 6 || isLastWeek || isSimulationMode;
  if (isSimulationDay && requirements.requirements.examsNeeded > 0) {
    plan.tasks.push({
      id: 'simulation',
      type: 'exam',
      title: 'בגרות מלאה',
      description: 'סימולציה בתנאי בגרות עם טיימר',
      duration: 90,
      priority: 'critical',
      isFullExam: true,
      icon: 'FileCheck'
    });
    plan.estimatedMinutes += 90;
  }

  // === משימה 5: אוצר מילים (אנגלית) ===
  if (subject === 'אנגלית') {
    plan.tasks.push({
      id: 'vocabulary',
      type: 'vocabulary',
      title: 'אוצר מילים',
      description: 'תרגול מילים יומי',
      count: 10,
      duration: 10,
      priority: 'medium',
      icon: 'BookMarked'
    });
    plan.estimatedMinutes += 10;
  }

  // חישוב שיפור צפוי
  plan.expectedImprovement = Math.round(
    (plan.tasks.reduce((sum, t) => sum + (t.count || 1) * 0.05, 0))
  );

  // הוספת התראות
  if (isIntensiveMode) {
    plan.alert = {
      type: 'warning',
      message: `פער של ${requirements.gap} נקודות! מצב אינטנסיבי מופעל`,
      icon: 'AlertTriangle'
    };
  } else if (isSimulationMode) {
    plan.alert = {
      type: 'success',
      message: '🎉 הגעת ליעד! עוברים למצב סימולציות',
      icon: 'Trophy'
    };
  }

  return plan;
};

/**
 * בניית תוכנית שבועית
 */
export const buildWeeklyPlan = ({
  performanceData,
  requirements,
  targetScore,
  daysUntilExam,
  subject,
  unitLevel
}) => {
  const weeklyPlan = {
    startDate: new Date(),
    targetScore,
    currentReadiness: requirements.currentReadiness,
    days: [],
    weeklyGoals: {
      questions: requirements.requirements.questionsPerDay * 7,
      exams: requirements.requirements.examsPerWeek,
      topics: requirements.requirements.topicsPerWeek,
      mistakes: requirements.requirements.mistakesPerDay * 7
    }
  };

  // יצירת תוכנית לכל יום בשבוע
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = (new Date().getDay() + i) % 7;
    const dayPlan = buildCompleteDailyPlan({
      performanceData,
      requirements,
      targetScore,
      daysUntilExam: daysUntilExam - i,
      subject,
      unitLevel,
      dayOfWeek
    });
    
    weeklyPlan.days.push({
      dayNumber: i + 1,
      dayName: getDayName(dayOfWeek),
      ...dayPlan
    });
  }

  // חישוב סיכום שבועי
  weeklyPlan.totalMinutes = weeklyPlan.days.reduce((sum, d) => sum + d.estimatedMinutes, 0);
  weeklyPlan.expectedWeeklyImprovement = weeklyPlan.days.reduce((sum, d) => sum + d.expectedImprovement, 0);

  return weeklyPlan;
};

const getDayName = (dayOfWeek) => {
  const names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return names[dayOfWeek];
};

/**
 * עדכון התוכנית בזמן אמת
 * נקרא אחרי כל פעולה של התלמיד
 */
export const updatePlanAfterAction = async ({
  base44,
  userEmail,
  subject,
  unitLevel,
  targetScore,
  daysUntilExam,
  action // { type: 'question' | 'exam' | 'topic', result: boolean, details: {...} }
}) => {
  // קריאה מחדש של הנתונים
  const performanceData = await fetchUserPerformanceData(base44, userEmail, subject, unitLevel);
  
  // חישוב מוכנות חדשה
  const readiness = calculateFullReadiness(performanceData, subject, unitLevel);
  
  // חישוב דרישות מעודכנות
  const requirements = calculateGapAndRequirements({
    targetScore,
    readinessScore: readiness.readinessScore,
    performanceData,
    subject,
    unitLevel,
    daysUntilExam
  });

  // בניית תוכנית יומית חדשה
  const dailyPlan = buildCompleteDailyPlan({
    performanceData,
    requirements,
    targetScore,
    daysUntilExam,
    subject,
    unitLevel,
    dayOfWeek: new Date().getDay()
  });

  return {
    readiness,
    requirements,
    dailyPlan,
    performanceData
  };
};

/**
 * בדיקה אם המשתמש עומד בקצב
 */
export const checkPaceStatus = ({
  targetScore,
  currentReadiness,
  daysUntilExam,
  startReadiness,
  startDaysUntilExam
}) => {
  if (daysUntilExam <= 0) {
    return { status: 'exam_day', message: 'יום הבגרות!' };
  }

  // קצב נדרש
  const totalGapToClose = targetScore - startReadiness;
  const daysPassed = startDaysUntilExam - daysUntilExam;
  const expectedProgress = daysPassed > 0 ? (totalGapToClose / startDaysUntilExam) * daysPassed : 0;
  const actualProgress = currentReadiness - startReadiness;

  const paceRatio = expectedProgress > 0 ? actualProgress / expectedProgress : 1;

  if (paceRatio >= 1.1) {
    return { 
      status: 'ahead', 
      message: 'מעולה! אתה מקדים את התוכנית',
      paceRatio,
      icon: '🚀'
    };
  } else if (paceRatio >= 0.9) {
    return { 
      status: 'on_track', 
      message: 'אתה בדיוק על המסלול',
      paceRatio,
      icon: '✅'
    };
  } else if (paceRatio >= 0.7) {
    return { 
      status: 'behind', 
      message: 'קצת מאחור - צריך להגביר קצב',
      paceRatio,
      icon: '⚠️'
    };
  } else {
    return { 
      status: 'critical', 
      message: 'פיגור משמעותי! צריך מאמץ אינטנסיבי',
      paceRatio,
      icon: '🔴'
    };
  }
};

export default {
  CRITICAL_TOPICS,
  READINESS_WEIGHTS,
  TARGET_REQUIREMENTS,
  fetchUserPerformanceData,
  calculateContentMasteryScore,
  calculatePracticeScore,
  calculateExamScore,
  calculateSpeedScore,
  calculateReadinessScore,
  calculateFullReadiness,
  calculateGapAndRequirements,
  buildCompleteDailyPlan,
  buildWeeklyPlan,
  updatePlanAfterAction,
  checkPaceStatus
};