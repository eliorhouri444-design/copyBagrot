/**
 * English Study Engine - מנוע תוכנית לימודים לאנגלית
 * מבוסס על 3 רכיבים: אוצר מילים, קריאה עם לחץ, כתיבה מדורגת
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

/**
 * חישוב זמן מותר לקריאה - יורד ככל שמתקרבים לבגרות
 * @param {number} standardTime - זמן סטנדרטי בדקות
 * @param {number} daysPassed - ימים שעברו מתחילת התוכנית
 * @param {number} totalDays - סה"כ ימים עד הבגרות
 * @returns {number} זמן מותר בדקות
 */
export const calculateAllowedTime = (standardTime, daysPassed, totalDays) => {
  const reductionFactor = 0.2; // הפחתה מקסימלית של 20%
  const reduction = (daysPassed / totalDays) * reductionFactor;
  return Math.round(standardTime * (1 - reduction));
};

/**
 * מנוע Spaced Repetition לאוצר מילים
 */
export const calculateNextReview = (word, isCorrect, consecutiveCorrect) => {
  if (!isCorrect) {
    return {
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // מחר
      consecutiveCorrect: 0,
      isMastered: false
    };
  }
  
  const newConsecutive = consecutiveCorrect + 1;
  
  if (newConsecutive >= 5) {
    return {
      nextReviewDate: null, // יצא מהסייקל
      consecutiveCorrect: newConsecutive,
      isMastered: true
    };
  }
  
  // מרווחים הולכים וגדלים: 1, 3, 7, 14 ימים
  const intervals = [1, 3, 7, 14];
  const daysUntilNext = intervals[Math.min(newConsecutive - 1, intervals.length - 1)];
  
  return {
    nextReviewDate: new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000),
    consecutiveCorrect: newConsecutive,
    isMastered: false
  };
};

/**
 * חישוב ממוצע נע של 5 תרגולים אחרונים
 */
export const calculateMovingAverage = (scores) => {
  if (!scores || scores.length === 0) return 0;
  const lastFive = scores.slice(-5);
  return Math.round(lastFive.reduce((sum, s) => sum + s, 0) / lastFive.length);
};

/**
 * בדיקה אם להעלות רמת קושי
 */
export const shouldIncreaseDifficulty = (movingAverage, targetScore) => {
  return movingAverage >= targetScore;
};

/**
 * זיהוי נושאים חלשים מתוך היסטוריית תשובות
 */
export const identifyWeakAreas = (attempts) => {
  const skillStats = {};
  
  attempts.forEach(attempt => {
    const skill = attempt.skill_type || 'general';
    if (!skillStats[skill]) {
      skillStats[skill] = { correct: 0, total: 0 };
    }
    skillStats[skill].total++;
    if (attempt.is_correct) skillStats[skill].correct++;
  });
  
  const weakAreas = [];
  Object.entries(skillStats).forEach(([skill, stats]) => {
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    if (accuracy < 70 && stats.total >= 3) {
      weakAreas.push({
        skill,
        accuracy: Math.round(accuracy),
        totalAttempts: stats.total,
        priority: accuracy < 50 ? 'high' : 'medium'
      });
    }
  });
  
  return weakAreas.sort((a, b) => a.accuracy - b.accuracy);
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