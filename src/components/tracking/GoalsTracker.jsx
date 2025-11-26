/**
 * Goals Tracker Component & Utility
 * מעקב אחר יעדי לימוד בזמן אמת
 */

import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

/**
 * חישוב התקדמות יומית/שבועית/חודשית בזמן אמת
 */
export const calculateCurrentProgress = (practiceSessions = [], examAttempts = [], subject, units) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // ראשון
  const monthStart = startOfMonth(now);

  // סינון לפי מקצוע ויחידות
  const relevantPractice = practiceSessions.filter(s => 
    s.subject_id === subject && 
    parseInt(s.unit_level) === parseInt(units) &&
    s.is_completed
  );

  const relevantExams = examAttempts.filter(e => 
    e.subject === subject && 
    parseInt(e.unit_level) === parseInt(units)
  );

  // יומי
  const todayPractice = relevantPractice.filter(s => new Date(s.created_date) >= todayStart);
  const todayExams = relevantExams.filter(e => new Date(e.created_date) >= todayStart);
  
  const todayMinutes = todayPractice.reduce((sum, s) => {
    const duration = s.duration_seconds || 0;
    return sum + Math.floor(duration / 60);
  }, 0) + todayExams.reduce((sum, e) => {
    const duration = e.duration_seconds || 0;
    return sum + Math.floor(duration / 60);
  }, 0);

  const todaySessions = todayPractice.length + todayExams.length;

  // שבועי
  const weekPractice = relevantPractice.filter(s => new Date(s.created_date) >= weekStart);
  const weekExams = relevantExams.filter(e => new Date(e.created_date) >= weekStart);
  
  const weekMinutes = weekPractice.reduce((sum, s) => {
    const duration = s.duration_seconds || 0;
    return sum + Math.floor(duration / 60);
  }, 0) + weekExams.reduce((sum, e) => {
    const duration = e.duration_seconds || 0;
    return sum + Math.floor(duration / 60);
  }, 0);

  const weekSessions = weekPractice.length + weekExams.length;

  // חודשי
  const monthPractice = relevantPractice.filter(s => new Date(s.created_date) >= monthStart);
  const monthExams = relevantExams.filter(e => new Date(e.created_date) >= monthStart);
  
  const monthSessions = monthPractice.length + monthExams.length;

  // כללי
  const totalPractice = relevantPractice.length;
  const totalExams = relevantExams.length;

  return {
    today_minutes: todayMinutes,
    today_sessions: todaySessions,
    this_week_minutes: weekMinutes,
    this_week_sessions: weekSessions,
    this_month_sessions: monthSessions,
    total_practice: totalPractice,
    total_exams: totalExams
  };
};

/**
 * חישוב יעדים מומלצים על בסיס זמן עד הבגרות ויעד הציון
 * @param {number} daysUntilExam - ימים עד הבגרות
 * @param {number} targetScore - יעד הציון (55-100)
 * @param {number} currentAverage - ממוצע נוכחי (אם יש)
 */
export const calculateRecommendedGoals = (daysUntilExam, targetScore = 85, currentAverage = 0) => {
  // חישוב מכפיל רמה לפי יעד הציון
  // 55-65: רמה נמוכה (1.0x), 66-75: רמה בינונית (1.2x), 76-85: רמה גבוהה (1.4x), 86-100: מצוינות (1.6x)
  let intensityMultiplier = 1.0;
  if (targetScore >= 86) {
    intensityMultiplier = 1.6; // מצוינות - צריך הכנה אינטנסיבית
  } else if (targetScore >= 76) {
    intensityMultiplier = 1.4; // ציון גבוה
  } else if (targetScore >= 66) {
    intensityMultiplier = 1.2; // ציון בינוני-טוב
  } else {
    intensityMultiplier = 1.0; // עובר
  }

  // אם יש פער בין הציון הנוכחי ליעד - צריך יותר עבודה
  const gap = currentAverage > 0 ? Math.max(0, targetScore - currentAverage) : 0;
  const gapMultiplier = gap > 20 ? 1.3 : gap > 10 ? 1.15 : 1.0;

  const finalMultiplier = intensityMultiplier * gapMultiplier;

  if (!daysUntilExam || daysUntilExam <= 0) {
    return {
      daily_goal: { 
        practice_minutes: Math.round(30 * finalMultiplier), 
        sessions: Math.ceil(1 * finalMultiplier) 
      },
      weekly_goal: { 
        practice_sessions: Math.round(4 * finalMultiplier), 
        hours: Math.round(3 * finalMultiplier) 
      },
      monthly_goal: { 
        practice_sessions: Math.round(16 * finalMultiplier), 
        exams: Math.round(4 * finalMultiplier) 
      },
      recommended_totals: { 
        total_practice_before_exam: Math.round(80 * finalMultiplier), 
        total_exams_before_exam: Math.round(15 * finalMultiplier) 
      },
      intensity_level: getIntensityLevel(targetScore),
      target_score: targetScore
    };
  }

  // חישוב דינמי
  const weeksUntilExam = Math.ceil(daysUntilExam / 7);
  const monthsUntilExam = Math.ceil(daysUntilExam / 30);

  // יעדים מומלצים - מותאמים לפי יעד הציון
  const basePracticeNeeded = Math.max(50, Math.min(100, weeksUntilExam * 5));
  const baseExamsNeeded = Math.max(10, Math.min(20, weeksUntilExam * 2));
  
  const totalPracticeNeeded = Math.round(basePracticeNeeded * finalMultiplier);
  const totalExamsNeeded = Math.round(baseExamsNeeded * finalMultiplier);

  // דקות יומיות - לפי זמן עד בגרות ויעד ציון
  let baseDailyMinutes = daysUntilExam > 60 ? 30 : daysUntilExam > 30 ? 45 : 60;
  const dailyMinutes = Math.round(baseDailyMinutes * finalMultiplier);
  
  // סשנים שבועיים - לפי זמן עד בגרות ויעד ציון
  let baseWeeklySessions = daysUntilExam > 60 ? 4 : daysUntilExam > 30 ? 5 : 6;
  const weeklySessions = Math.round(baseWeeklySessions * finalMultiplier);
  
  const monthlySessions = weeklySessions * 4;

  return {
    daily_goal: { 
      practice_minutes: dailyMinutes, 
      sessions: Math.ceil(finalMultiplier) 
    },
    weekly_goal: { 
      practice_sessions: weeklySessions, 
      hours: Math.ceil((dailyMinutes * 7) / 60) 
    },
    monthly_goal: { 
      practice_sessions: monthlySessions, 
      exams: Math.ceil(totalExamsNeeded / Math.max(1, monthsUntilExam)) 
    },
    recommended_totals: { 
      total_practice_before_exam: totalPracticeNeeded, 
      total_exams_before_exam: totalExamsNeeded 
    },
    intensity_level: getIntensityLevel(targetScore),
    target_score: targetScore,
    gap_to_target: gap
  };
};

/**
 * קבלת רמת אינטנסיביות לפי יעד הציון
 */
const getIntensityLevel = (targetScore) => {
  if (targetScore >= 86) return { level: 'מצוינות', color: 'text-purple-600', bg: 'bg-purple-100', emoji: '🏆' };
  if (targetScore >= 76) return { level: 'גבוהה', color: 'text-blue-600', bg: 'bg-blue-100', emoji: '⭐' };
  if (targetScore >= 66) return { level: 'בינונית', color: 'text-green-600', bg: 'bg-green-100', emoji: '📈' };
  return { level: 'בסיסית', color: 'text-gray-600', bg: 'bg-gray-100', emoji: '✅' };
};

/**
 * חישוב אחוזי התקדמות
 */
export const calculateProgressPercentages = (currentProgress, goals) => {
  return {
    daily: Math.min(100, ((currentProgress.today_minutes || 0) / (goals.daily_goal?.practice_minutes || 30)) * 100),
    weekly: Math.min(100, ((currentProgress.this_week_sessions || 0) / (goals.weekly_goal?.practice_sessions || 4)) * 100),
    monthly: Math.min(100, ((currentProgress.this_month_sessions || 0) / (goals.monthly_goal?.practice_sessions || 16)) * 100),
    totalPractice: Math.min(100, ((currentProgress.total_practice || 0) / (goals.recommended_totals?.total_practice_before_exam || 80)) * 100),
    totalExams: Math.min(100, ((currentProgress.total_exams || 0) / (goals.recommended_totals?.total_exams_before_exam || 15)) * 100)
  };
};