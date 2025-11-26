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
 * בניית תוכנית יומית חכמה
 * לוגיקה: 60% תיקון פערים, 20% חזרה, 20% סימולציה
 */
export const buildDailyPlan = ({
  dayOfWeek,
  targetScore,
  currentAverage,
  weeklyAverage,
  daysUntilExam,
  moduleLevel,
  unitLevel = 5,
  weakAreas = [],
  vocabularyWords = [],
  completedToday = [],
  weeklyScores = [],
  isSimulationMode = false
}) => {
  const performanceGap = calculatePerformanceGap(targetScore, weeklyAverage || currentAverage);
  const needsIntensiveMode = performanceGap > 10;
  
  // חישוב זמן יומי - מוסיפים 10 דקות אם יש פער גדול
  let baseDailyMinutes = 60;
  if (needsIntensiveMode) baseDailyMinutes += 10;
  if (daysUntilExam < 14) baseDailyMinutes += 15; // שבועיים אחרונים
  
  const plan = {
    date: new Date(),
    targetScore,
    currentAverage,
    weeklyAverage: weeklyAverage || currentAverage,
    performanceGap,
    gap: targetScore - currentAverage,
    tasks: [],
    estimatedMinutes: 0,
    mode: isSimulationMode ? 'simulation' : needsIntensiveMode ? 'intensive' : 'normal',
    unitLevel
  };

  // === PRIORITY 1: אוצר מילים - חובה יומית (30% מהזמן) ===
  const vocabMinutes = Math.round(baseDailyMinutes * TIME_ALLOCATION[SKILL_TYPES.VOCABULARY]);
  const wordsToReview = vocabularyWords.filter(w => !w.isMastered && 
    (!w.nextReviewDate || new Date(w.nextReviewDate) <= new Date()));
  
  plan.tasks.push({
    id: 'vocab-daily',
    type: SKILL_TYPES.VOCABULARY,
    title: 'אוצר מילים יומי',
    description: unitLevel === 5 
      ? 'Academic Word List + Collocations'
      : unitLevel === 4 
        ? 'מילים מתקדמות + ביטויים'
        : 'מילים בסיסיות + ביטויי זמן',
    duration: vocabMinutes,
    priority: 'critical',
    wordsCount: Math.min(10, wordsToReview.length),
    usesSpacedRepetition: true
  });
  plan.estimatedMinutes += vocabMinutes;

  // === מצב סימולציה - אם הממוצע >= יעד ===
  if (isSimulationMode || (weeklyAverage >= targetScore && daysUntilExam < 21)) {
    plan.tasks.push({
      id: 'full-simulation',
      type: 'simulation',
      title: `סימולציה מלאה - שאלון ${moduleLevel}`,
      description: 'מבחן בגרות מלא בתנאים אמיתיים עם סטופר',
      duration: 90,
      priority: 'critical',
      isFullSimulation: true,
      moduleLevel,
      timeLimit: 90
    });
    plan.estimatedMinutes += 90;
    plan.mode = 'simulation';
    return plan;
  }

  // === מצב אינטנסיבי - אם הפער > 10 נקודות ===
  if (needsIntensiveMode) {
    // 100% מהזמן על Priority 1 - תיקון נושאים חלשים
    const gapFixingMinutes = baseDailyMinutes - vocabMinutes;
    
    if (weakAreas.length > 0) {
      // מחלקים את הזמן בין 2-3 הנושאים החלשים ביותר
      const topWeakAreas = weakAreas.slice(0, 3);
      const minutesPerArea = Math.floor(gapFixingMinutes / topWeakAreas.length);
      
      topWeakAreas.forEach((weak, idx) => {
        plan.tasks.push({
          id: `intensive-${weak.skill}-${idx}`,
          type: weak.skill,
          title: `תיקון פער: ${getSkillName(weak.skill)}`,
          description: `ציון נוכחי: ${weak.skillScore}% - נדרש חיזוק אינטנסיבי`,
          duration: minutesPerArea,
          priority: 'critical',
          isGapFixing: true,
          skillScore: weak.skillScore,
          weakTopics: weak.weakTopics,
          questionsCount: Math.ceil(minutesPerArea / 2) // ~2 דקות לשאלה
        });
        plan.estimatedMinutes += minutesPerArea;
      });
    }
    
    plan.alert = {
      type: 'intensive',
      message: `פער של ${performanceGap} נקודות מהיעד! מצב אינטנסיבי מופעל - מתמקדים בחולשות בלבד`,
      shouldPauseProgress: true,
      addedMinutes: 10
    };
    
    return plan;
  }

  // === מצב רגיל - חלוקה לפי עדיפויות ===
  const remainingMinutes = baseDailyMinutes - vocabMinutes;
  
  // Priority 1: תיקון פערים (60%)
  const gapFixingMinutes = Math.round(remainingMinutes * TASK_PRIORITY.GAP_FIXING);
  
  // Priority 2: חזרה - Reinforcement (20%)
  const reinforcementMinutes = Math.round(remainingMinutes * TASK_PRIORITY.REINFORCEMENT);
  
  // Priority 3: סימולציה (20%)
  const simulationMinutes = Math.round(remainingMinutes * TASK_PRIORITY.SIMULATION);

  // לפי יום בשבוע
  const isInputDay = [0, 2, 4].includes(dayOfWeek); // א', ג', ה' - Input
  const isOutputDay = [1, 3].includes(dayOfWeek); // ב', ד' - Output
  const isSimulationDay = [5, 6].includes(dayOfWeek); // סופ"ש

  if (isInputDay) {
    // === Reading עם טיימר נוקשה (40% מהזמן) ===
    const readingTime = calculateAllowedTime(35, Math.max(0, 60 - daysUntilExam), 60);
    
    plan.tasks.push({
      id: 'reading-timed',
      type: SKILL_TYPES.READING,
      title: `Unseen - מודול ${moduleLevel}`,
      description: `קריאה תחת לחץ זמן: ${readingTime} דקות`,
      duration: readingTime,
      priority: 'high',
      timeLimit: readingTime,
      moduleLevel,
      hasStrictTimer: true
    });
    plan.estimatedMinutes += readingTime;
    
    // Listening פעם ביומיים
    if (dayOfWeek === 0 || dayOfWeek === 4) {
      plan.tasks.push({
        id: 'listening',
        type: SKILL_TYPES.LISTENING,
        title: 'תרגול האזנה',
        description: 'שמיעה והבנה - מודול A/B',
        duration: 15,
        priority: 'medium'
      });
      plan.estimatedMinutes += 15;
    }
  }
  
  if (isOutputDay) {
    // === Grammar (20%) - דגש על נושאים חלשים ===
    const grammarWeak = weakAreas.find(w => w.skill === SKILL_TYPES.GRAMMAR);
    plan.tasks.push({
      id: 'grammar',
      type: SKILL_TYPES.GRAMMAR,
      title: grammarWeak 
        ? `דקדוק: ${grammarWeak.weakTopics?.[0]?.topic || 'נושאים לחיזוק'}`
        : 'תרגול דקדוק',
      description: grammarWeak 
        ? `ציון נוכחי: ${grammarWeak.skillScore}% - צריך חיזוק`
        : 'זמנים, מבנה משפט, Conditionals',
      duration: gapFixingMinutes,
      priority: grammarWeak ? 'critical' : 'high',
      isGapFixing: !!grammarWeak
    });
    plan.estimatedMinutes += gapFixingMinutes;
    
    // Writing פעם ב-3 ימים
    if (dayOfWeek === 3) {
      const writingPhase = getWritingPhase(daysUntilExam);
      plan.tasks.push({
        id: 'writing',
        type: SKILL_TYPES.WRITING,
        title: writingPhase.title,
        description: writingPhase.description,
        duration: 25,
        priority: 'medium',
        writingPhase: writingPhase.phase
      });
      plan.estimatedMinutes += 25;
    }
  }
  
  if (isSimulationDay) {
    // === סימולציה מלאה בסופ"ש ===
    plan.tasks.push({
      id: 'weekly-simulation',
      type: 'simulation',
      title: `סימולציה שבועית - שאלון ${moduleLevel}`,
      description: 'מבחן מלא בתנאי בגרות עם סטופר',
      duration: 90,
      priority: 'critical',
      isFullSimulation: true,
      moduleLevel,
      timeLimit: 90
    });
    plan.estimatedMinutes += 90;
  }

  // === הוספת משימות Priority 2 - חזרה על נושאים חזקים ===
  if (!isSimulationDay && reinforcementMinutes > 0) {
    const strongAreas = weakAreas.length > 0 
      ? [] // אם יש חולשות - לא מתרגלים חזקים
      : [{ skill: SKILL_TYPES.READING, topic: 'חזרה כללית' }];
    
    if (strongAreas.length > 0) {
      plan.tasks.push({
        id: 'reinforcement',
        type: strongAreas[0].skill,
        title: 'חיזוק והעמקה',
        description: 'חזרה על נושאים שנלמדו לפני שבוע',
        duration: reinforcementMinutes,
        priority: 'low',
        isReinforcement: true
      });
      plan.estimatedMinutes += reinforcementMinutes;
    }
  }

  // === הוספת נושאים חלשים (אם יש) ===
  if (weakAreas.length > 0 && !isSimulationDay && !needsIntensiveMode) {
    const topWeak = weakAreas[0];
    if (!plan.tasks.find(t => t.type === topWeak.skill)) {
      plan.tasks.push({
        id: 'weak-priority',
        type: topWeak.skill,
        title: `תיקון: ${getSkillName(topWeak.skill)}`,
        description: `ציון ${topWeak.skillScore}% - ${topWeak.weakTopics?.[0]?.topic || 'נושאים לחיזוק'}`,
        duration: 15,
        priority: 'high',
        isGapFixing: true,
        skillScore: topWeak.skillScore
      });
      plan.estimatedMinutes += 15;
    }
  }

  // === התראה על מצב ===
  if (performanceGap > 5) {
    plan.alert = {
      type: 'warning',
      message: `עדיין ${performanceGap} נקודות מהיעד. המשך לתרגל את ${weakAreas[0]?.skill ? getSkillName(weakAreas[0].skill) : 'הנושאים החלשים'}`,
      shouldPauseProgress: performanceGap > 10
    };
  }
  
  return plan;
};

/**
 * קביעת שלב כתיבה לפי זמן עד בגרות
 */
const getWritingPhase = (daysUntilExam) => {
  if (daysUntilExam > 30) {
    return {
      phase: 'connectors',
      title: 'מילות קישור',
      description: 'תרגול שימוש נכון ב-However, Therefore, Moreover...'
    };
  } else if (daysUntilExam > 14) {
    return {
      phase: 'paragraph',
      title: 'כתיבת פסקאות',
      description: 'כתיבת פסקת פתיחה/סיום איכותית'
    };
  } else {
    return {
      phase: 'full',
      title: 'חיבור מלא',
      description: 'כתיבת חיבור שלם בתנאי בגרות'
    };
  }
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
 * יצירת מבחן אבחון ראשוני (Diagnostic Test)
 * בודק 3-5 נושאים מכל קטגוריה
 */
export const createDiagnosticTest = (moduleLevel, unitLevel = 5) => {
  const sections = [
    {
      type: SKILL_TYPES.VOCABULARY,
      title: 'אוצר מילים',
      questionsCount: 10,
      duration: 5,
      topics: unitLevel === 5 
        ? ['Academic Words', 'Collocations', 'Phrasal Verbs']
        : ['Basic Verbs', 'Time Expressions', 'Common Phrases']
    },
    {
      type: SKILL_TYPES.READING,
      title: 'קטע קריאה קצר',
      questionsCount: 5,
      duration: 10,
      topics: ['Main Idea', 'Details', 'Inference']
    },
    {
      type: SKILL_TYPES.GRAMMAR,
      title: 'דקדוק',
      questionsCount: 5,
      duration: 5,
      topics: unitLevel === 5 
        ? ['Conditionals 0-3', 'Passive Voice', 'Reported Speech', 'Relative Clauses']
        : ['Tenses', 'Modals', 'Comparatives']
    }
  ];

  return {
    title: 'מבחן מיפוי ראשוני',
    description: 'מבחן קצר ליצירת "מפת חולשות" אישית',
    sections,
    totalDuration: 20,
    moduleLevel,
    unitLevel,
    purpose: 'baseline'
  };
};

/**
 * תיקון מסלול שבועי (Weekly Course Correction)
 * The Guarantee Loop
 */
export const weeklyCoursCorrection = ({
  targetScore,
  weeklyScores = [],
  weakAreas = [],
  currentPlan
}) => {
  const weeklyAverage = calculateWeeklyAverage(weeklyScores);
  const performanceGap = calculatePerformanceGap(targetScore, weeklyAverage);
  
  const correction = {
    weeklyAverage,
    performanceGap,
    adjustments: [],
    newMode: 'normal'
  };

  if (performanceGap > 10) {
    // פער גדול - מצב אינטנסיבי
    correction.adjustments.push({
      type: 'add_time',
      value: 10,
      description: 'הוספת 10 דקות למידה יומית'
    });
    correction.adjustments.push({
      type: 'focus_priority_1',
      description: 'ביטול Priority 2, התמקדות 100% בתיקון פערים'
    });
    correction.newMode = 'intensive';
    correction.alert = {
      type: 'critical',
      message: `פער של ${performanceGap} נקודות! השבוע הבא מוקדש לתיקון ${weakAreas[0]?.skill ? getSkillName(weakAreas[0].skill) : 'נושאים חלשים'}`
    };
  } else if (weeklyAverage >= targetScore) {
    // הגענו ליעד - מצב סימולציה
    correction.adjustments.push({
      type: 'simulation_mode',
      description: '3 ימי סימולציה רצופים'
    });
    correction.newMode = 'simulation';
    correction.alert = {
      type: 'success',
      message: `מעולה! הממוצע ${weeklyAverage} עבר את היעד ${targetScore}! עוברים למצב סימולציות`
    };
  } else if (performanceGap > 0 && performanceGap <= 10) {
    // פער קטן - המשך רגיל עם דגש
    correction.adjustments.push({
      type: 'focus_weak',
      description: `דגש על ${weakAreas[0]?.skill ? getSkillName(weakAreas[0].skill) : 'נושאים לשיפור'}`
    });
    correction.newMode = 'normal';
  }

  return correction;
};

/**
 * בדיקה אם להעלות רמת קושי בקריאה
 * כלל: אם סיים ב-10% פחות מהזמן = טקסט קשה יותר
 */
export const shouldUpgradeReadingLevel = (completionTime, allowedTime, accuracy) => {
  const timeEfficiency = (allowedTime - completionTime) / allowedTime;
  return timeEfficiency >= 0.10 && accuracy >= 80;
};

/**
 * בחירת מילים יומיות לפי Leitner
 */
export const selectDailyVocabulary = (allWords, count = 10, unitLevel = 5) => {
  const today = new Date();
  
  // מילים שצריך לחזור עליהן היום
  const dueWords = allWords.filter(w => {
    if (w.isMastered) return false;
    if (!w.nextReviewDate) return true;
    return new Date(w.nextReviewDate) <= today;
  });

  // תיעדוף לפי קופסת Leitner (קופסה נמוכה = עדיפות גבוהה)
  dueWords.sort((a, b) => (a.box || 1) - (b.box || 1));

  // סינון לפי רמה
  const levelTags = {
    3: ['basic', 'time_expressions', 'common'],
    4: ['intermediate', 'phrasal_verbs', 'expressions'],
    5: ['academic', 'collocations', 'advanced']
  };

  const preferredTags = levelTags[unitLevel] || levelTags[5];
  
  // העדפה למילים מהרמה הנכונה
  const prioritized = dueWords.sort((a, b) => {
    const aMatch = preferredTags.some(tag => a.category?.toLowerCase().includes(tag)) ? 0 : 1;
    const bMatch = preferredTags.some(tag => b.category?.toLowerCase().includes(tag)) ? 0 : 1;
    return aMatch - bMatch;
  });

  return prioritized.slice(0, count);
};

export default {
  SKILL_TYPES,
  MODULE_LEVELS,
  TIME_ALLOCATION,
  TASK_PRIORITY,
  calculateAllowedTime,
  calculateNextReview,
  calculateMovingAverage,
  calculateWeeklyAverage,
  calculatePerformanceGap,
  shouldIncreaseDifficulty,
  identifyWeakAreas,
  buildDailyPlan,
  getSkillName,
  calculateWeightedScore,
  createDiagnosticTest,
  weeklyCoursCorrection,
  shouldUpgradeReadingLevel,
  selectDailyVocabulary
};