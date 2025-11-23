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
 * חישוב יעדים מומלצים על בסיס זמן עד הבגרות
 */
export const calculateRecommendedGoals = (daysUntilExam) => {
  if (!daysUntilExam || daysUntilExam <= 0) {
    return {
      daily_goal: { practice_minutes: 30, sessions: 1 },
      weekly_goal: { practice_sessions: 4, hours: 3 },
      monthly_goal: { practice_sessions: 16, exams: 4 },
      recommended_totals: { 
        total_practice_before_exam: 80, 
        total_exams_before_exam: 15 
      }
    };
  }

  // חישוב דינמי
  const weeksUntilExam = Math.ceil(daysUntilExam / 7);
  const monthsUntilExam = Math.ceil(daysUntilExam / 30);

  // יעדים מומלצים
  const totalPracticeNeeded = Math.max(50, Math.min(100, weeksUntilExam * 5));
  const totalExamsNeeded = Math.max(10, Math.min(20, weeksUntilExam * 2));

  const dailyMinutes = daysUntilExam > 60 ? 30 : daysUntilExam > 30 ? 45 : 60;
  const weeklySessions = daysUntilExam > 60 ? 4 : daysUntilExam > 30 ? 5 : 6;
  const monthlySessions = weeklySessions * 4;

  return {
    daily_goal: { 
      practice_minutes: dailyMinutes, 
      sessions: 1 
    },
    weekly_goal: { 
      practice_sessions: weeklySessions, 
      hours: Math.ceil((dailyMinutes * 7) / 60) 
    },
    monthly_goal: { 
      practice_sessions: monthlySessions, 
      exams: Math.ceil(totalExamsNeeded / monthsUntilExam) 
    },
    recommended_totals: { 
      total_practice_before_exam: totalPracticeNeeded, 
      total_exams_before_exam: totalExamsNeeded 
    }
  };
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