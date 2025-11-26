/**
 * English Study Engine - מנוע תוכנית לימודים לאנגלית
 * אלגוריתם חכם: להגיע לציון X = שליטה ב-90% מהנושאים + עמידה ב-90% מהזמן
 */

// Skill Types
export const SKILL_TYPES = {
  VOCABULARY: 'vocabulary',
  GRAMMAR: 'grammar',
  READING: 'reading',
  LISTENING: 'listening',
  WRITING: 'writing',
  SPOKEN: 'spoken'
};

// Module Levels
export const MODULE_LEVELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// הקצאת זמן קבועה לפי קטגוריה
export const TIME_ALLOCATION = {
  [SKILL_TYPES.VOCABULARY]: 0.30,  // 30% - חובה יומית
  [SKILL_TYPES.GRAMMAR]: 0.20,     // 20% - דגש על חולשות
  [SKILL_TYPES.READING]: 0.40,     // 40% - חובה עם טיימר
  [SKILL_TYPES.LISTENING]: 0.05,   // 5% - פעם ביומיים
  [SKILL_TYPES.WRITING]: 0.05      // 5% - פעם ב-3 ימים
};

// חלוקת עדיפות משימות יומיות
export const TASK_PRIORITY = {
  GAP_FIXING: 0.60,      // 60% - תיקון פערים (SkillScore < 80)
  REINFORCEMENT: 0.20,   // 20% - חזרה Spaced Repetition
  SIMULATION: 0.20       // 20% - סימולציה מלאה
};

/**
 * חישוב זמן מותר לקריאה - יורד ככל שמתקרבים לבגרות
 */
export const calculateAllowedTime = (standardTime, daysPassed, totalDays) => {
  const reductionFactor = 0.2;
  const reduction = (daysPassed / Math.max(totalDays, 1)) * reductionFactor;
  return Math.round(standardTime * (1 - Math.min(reduction, 0.2)));
};

/**
 * מנוע Leitner/Spaced Repetition לאוצר מילים
 * מרווחים: 1, 2, 4, 7, 14, 30 ימים
 */
export const calculateNextReview = (word, isCorrect, consecutiveCorrect, box = 1) => {
  if (!isCorrect) {
    return {
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      consecutiveCorrect: 0,
      box: 1, // חוזר לקופסה 1
      isMastered: false
    };
  }
  
  const newConsecutive = consecutiveCorrect + 1;
  const newBox = Math.min(box + 1, 6);
  
  if (newBox >= 6 && newConsecutive >= 5) {
    return {
      nextReviewDate: null,
      consecutiveCorrect: newConsecutive,
      box: 6,
      isMastered: true
    };
  }
  
  // Leitner intervals
  const intervals = [1, 2, 4, 7, 14, 30];
  const daysUntilNext = intervals[newBox - 1] || 30;
  
  return {
    nextReviewDate: new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000),
    consecutiveCorrect: newConsecutive,
    box: newBox,
    isMastered: false
  };
};

/**
 * חישוב ממוצע שבועי
 */
export const calculateWeeklyAverage = (scores, days = 7) => {
  if (!scores || scores.length === 0) return 0;
  const weekAgo = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentScores = scores.filter(s => new Date(s.date || s.created_date) >= weekAgo);
  if (recentScores.length === 0) return calculateMovingAverage(scores);
  return Math.round(recentScores.reduce((sum, s) => sum + (s.score || s.score_percent || 0), 0) / recentScores.length);
};

/**
 * חישוב ממוצע נע
 */
export const calculateMovingAverage = (scores) => {
  if (!scores || scores.length === 0) return 0;
  const lastFive = scores.slice(-5);
  const values = lastFive.map(s => typeof s === 'number' ? s : (s.score || s.score_percent || 0));
  return Math.round(values.reduce((sum, s) => sum + s, 0) / values.length);
};

/**
 * חישוב פער ביצועים
 * PerformanceGap = TargetScore - WeeklyAverage
 */
export const calculatePerformanceGap = (targetScore, weeklyAverage) => {
  return targetScore - weeklyAverage;
};

/**
 * זיהוי נושאים חלשים עם SkillScore
 * נושא חלש = SkillScore < 80
 */
export const identifyWeakAreas = (attempts, threshold = 80) => {
  const skillStats = {};
  
  attempts.forEach(attempt => {
    const skill = attempt.skill_type || attempt.topic_id || 'general';
    const topic = attempt.topic_name || attempt.topic_id || skill;
    
    if (!skillStats[skill]) {
      skillStats[skill] = { 
        correct: 0, 
        total: 0, 
        topics: {},
        recentScores: []
      };
    }
    skillStats[skill].total++;
    if (attempt.is_correct) skillStats[skill].correct++;
    
    // Track by specific topic
    if (!skillStats[skill].topics[topic]) {
      skillStats[skill].topics[topic] = { correct: 0, total: 0 };
    }
    skillStats[skill].topics[topic].total++;
    if (attempt.is_correct) skillStats[skill].topics[topic].correct++;
    
    // Track recent scores
    if (attempt.score_percent || attempt.score) {
      skillStats[skill].recentScores.push(attempt.score_percent || attempt.score);
    }
  });
  
  const weakAreas = [];
  Object.entries(skillStats).forEach(([skill, stats]) => {
    const skillScore = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    
    if (skillScore < threshold && stats.total >= 3) {
      // Find weakest topics within this skill
      const weakTopics = Object.entries(stats.topics)
        .map(([topic, tStats]) => ({
          topic,
          score: tStats.total > 0 ? (tStats.correct / tStats.total) * 100 : 0,
          attempts: tStats.total
        }))
        .filter(t => t.score < threshold)
        .sort((a, b) => a.score - b.score);
      
      weakAreas.push({
        skill,
        skillScore: Math.round(skillScore),
        totalAttempts: stats.total,
        priority: skillScore < 50 ? 'critical' : skillScore < 70 ? 'high' : 'medium',
        weakTopics: weakTopics.slice(0, 3),
        trend: calculateTrend(stats.recentScores)
      });
    }
  });
  
  return weakAreas.sort((a, b) => a.skillScore - b.skillScore);
};

/**
 * חישוב מגמה (עולה/יורדת/יציבה)
 */
const calculateTrend = (scores) => {
  if (!scores || scores.length < 3) return 'stable';
  const recent = scores.slice(-3);
  const older = scores.slice(-6, -3);
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  if (recentAvg > olderAvg + 5) return 'improving';
  if (recentAvg < olderAvg - 5) return 'declining';
  return 'stable';
};

/**
 * בדיקה אם להעלות רמת קושי
 * כלל: 90% דיוק = נושא "חזק" = הפחתת תדירות
 */
export const shouldIncreaseDifficulty = (skillScore, threshold = 90) => {
  return skillScore >= threshold;
};

/**
 * בניית תוכנית יומית
 * @param {Object} params - פרמטרים לבניית התוכנית
 */
export const buildDailyPlan = ({
  dayOfWeek,
  targetScore,
  currentAverage,
  daysUntilExam,
  moduleLevel,
  weakAreas = [],
  vocabularyWords = [],
  completedToday = []
}) => {
  const plan = {
    date: new Date(),
    targetScore,
    currentAverage,
    gap: targetScore - currentAverage,
    tasks: [],
    estimatedMinutes: 0
  };
  
  // תמיד מתחילים באוצר מילים - 15 דקות
  plan.tasks.push({
    id: 'vocab',
    type: SKILL_TYPES.VOCABULARY,
    title: 'שינון אוצר מילים',
    description: 'חזרה על מילים חדשות ומילים לחיזוק',
    duration: 15,
    priority: 'high',
    wordsCount: Math.min(20, vocabularyWords.filter(w => !w.isMastered).length)
  });
  plan.estimatedMinutes += 15;
  
  // לפי יום בשבוע
  const isInputDay = [0, 2, 4].includes(dayOfWeek); // א', ג', ה'
  const isOutputDay = [1, 3].includes(dayOfWeek); // ב', ד'
  const isSimulationDay = [5, 6].includes(dayOfWeek); // סופ"ש
  
  if (isInputDay) {
    // דגש על קריאה ושמיעה
    const readingTime = calculateAllowedTime(35, Math.max(0, 60 - daysUntilExam), 60);
    
    plan.tasks.push({
      id: 'reading',
      type: SKILL_TYPES.READING,
      title: `תרגול Unseen - ${moduleLevel}`,
      description: `קריאת טקסט ומענה על שאלות (${readingTime} דקות)`,
      duration: readingTime,
      priority: 'high',
      timeLimit: readingTime,
      moduleLevel
    });
    plan.estimatedMinutes += readingTime;
    
    if (moduleLevel === 'A' || moduleLevel === 'B') {
      plan.tasks.push({
        id: 'listening',
        type: SKILL_TYPES.LISTENING,
        title: 'תרגול האזנה',
        description: 'שמיעה והבנה',
        duration: 20,
        priority: 'medium'
      });
      plan.estimatedMinutes += 20;
    }
  }
  
  if (isOutputDay) {
    // דגש על כתיבה ודקדוק
    plan.tasks.push({
      id: 'grammar',
      type: SKILL_TYPES.GRAMMAR,
      title: 'תרגול דקדוק',
      description: 'זמנים, מבנה משפט, מילות קישור',
      duration: 20,
      priority: 'high'
    });
    plan.estimatedMinutes += 20;
    
    // כתיבה מדורגת לפי יום בשבוע
    const writingPhase = dayOfWeek === 1 ? 'connectors' : 'paragraph';
    plan.tasks.push({
      id: 'writing',
      type: SKILL_TYPES.WRITING,
      title: writingPhase === 'connectors' ? 'מילות קישור' : 'כתיבת פסקה',
      description: writingPhase === 'connectors' 
        ? 'תרגול שימוש נכון במילות קישור'
        : 'כתיבת פסקת פתיחה או סיום',
      duration: 25,
      priority: 'medium',
      writingPhase
    });
    plan.estimatedMinutes += 25;
  }
  
  if (isSimulationDay) {
    // סימולציה מלאה
    plan.tasks.push({
      id: 'simulation',
      type: 'simulation',
      title: `סימולציה מלאה - שאלון ${moduleLevel}`,
      description: 'מבחן מלא בתנאי בגרות עם סטופר',
      duration: 90,
      priority: 'critical',
      isFullSimulation: true,
      moduleLevel
    });
    plan.estimatedMinutes += 90;
  }
  
  // הוספת תרגול על נושאים חלשים
  if (weakAreas.length > 0 && !isSimulationDay) {
    const topWeak = weakAreas[0];
    plan.tasks.push({
      id: 'weak-review',
      type: topWeak.skill,
      title: `חיזוק: ${getSkillName(topWeak.skill)}`,
      description: `המערכת זיהתה שאתה בציון ${topWeak.accuracy}% - צריך לחזק`,
      duration: 15,
      priority: 'high',
      isReview: true,
      weakArea: topWeak
    });
    plan.estimatedMinutes += 15;
  }
  
  // הוספת התראה אם לא עומדים בקצב
  if (currentAverage < targetScore - 10) {
    plan.alert = {
      type: 'warning',
      message: `כדי להגיע ליעד ${targetScore}, עלינו לחזק את ${weakAreas[0]?.skill || 'הנושאים החלשים'} לפני שמתקדמים`,
      shouldPauseProgress: true
    };
  }
  
  return plan;
};

/**
 * תרגום סוג מיומנות לעברית
 */
export const getSkillName = (skill) => {
  const names = {
    [SKILL_TYPES.VOCABULARY]: 'אוצר מילים',
    [SKILL_TYPES.GRAMMAR]: 'דקדוק',
    [SKILL_TYPES.READING]: 'הבנת הנקרא',
    [SKILL_TYPES.LISTENING]: 'הבנת הנשמע',
    [SKILL_TYPES.WRITING]: 'כתיבה',
    [SKILL_TYPES.SPOKEN]: 'דיבור'
  };
  return names[skill] || skill;
};

/**
 * חישוב ציון נוכחי משוקלל
 */
export const calculateWeightedScore = (skillScores) => {
  const weights = {
    [SKILL_TYPES.VOCABULARY]: 0.15,
    [SKILL_TYPES.GRAMMAR]: 0.15,
    [SKILL_TYPES.READING]: 0.35,
    [SKILL_TYPES.LISTENING]: 0.15,
    [SKILL_TYPES.WRITING]: 0.20
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  Object.entries(skillScores).forEach(([skill, score]) => {
    const weight = weights[skill] || 0.1;
    weightedSum += score * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight * 100) / 100 : 0;
};

/**
 * יצירת מבחן אבחון ראשוני
 */
export const createDiagnosticTest = (moduleLevel) => {
  return {
    title: 'מבחן אבחון ראשוני',
    description: 'מבחן קצר לזיהוי רמה נוכחית',
    sections: [
      {
        type: SKILL_TYPES.VOCABULARY,
        title: 'אוצר מילים',
        questionsCount: 10,
        duration: 5
      },
      {
        type: SKILL_TYPES.READING,
        title: 'קטע קריאה קצר',
        questionsCount: 5,
        duration: 10
      },
      {
        type: SKILL_TYPES.GRAMMAR,
        title: 'דקדוק',
        questionsCount: 5,
        duration: 5
      }
    ],
    totalDuration: 20,
    moduleLevel
  };
};

export default {
  SKILL_TYPES,
  MODULE_LEVELS,
  calculateAllowedTime,
  calculateNextReview,
  calculateMovingAverage,
  shouldIncreaseDifficulty,
  identifyWeakAreas,
  buildDailyPlan,
  getSkillName,
  calculateWeightedScore,
  createDiagnosticTest
};