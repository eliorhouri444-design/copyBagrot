import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ⏰ Schedule Automatic Notifications
 * מתזמן התראות אוטומטיות - ריצה יומית
 * כולל התראות על אי-עמידה ביעדים
 */

Deno.serve(async (req) => {
  console.log("⏰ Running scheduled notifications...");
  
  try {
    const base44 = createClientFromRequest(req);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const users = await base44.asServiceRole.entities.User.list();
    
    let dailyPracticeCount = 0;
    let examReminderCount = 0;
    let bagrutCountdownCount = 0;
    let missedGoalCount = 0;
    
    for (const user of users) {
      if (user.notifications_enabled === false) continue;
      
      try {
        // Load user's study goals
        const studyGoals = await base44.asServiceRole.entities.StudyGoals.filter({
          created_by: user.email,
          subject: user.selected_subject
        });
        
        const goals = studyGoals[0];
        
        // 1️⃣ Daily practice reminder
        const lastPractice = await base44.asServiceRole.entities.PracticeAttempt.filter({
          created_by: user.email
        }, "-created_date", 1);
        
        const lastPracticeDate = lastPractice[0]?.created_date?.split('T')[0];
        
        if (lastPracticeDate !== todayStr) {
          await base44.asServiceRole.entities.Notification.create({
            title: "⏰ תזכורת תרגול יומי",
            message: `היי ${user.full_name?.split(' ')[0] || 'תלמיד'}! עדיין לא תרגלת היום. בוא נתרגל קצת ${user.selected_subject || 'מתמטיקה'}?`,
            type: "reminder",
            read: false,
            action_url: "/practice",
            created_by: user.email
          });
          dailyPracticeCount++;
        }
        
        // 2️⃣ Check if missed daily goal
        if (goals && lastPracticeDate === todayStr) {
          const todayPractice = await base44.asServiceRole.entities.PracticeAttempt.filter({
            created_by: user.email
          });
          
          const todayMinutes = todayPractice.filter(p => 
            p.created_date?.split('T')[0] === todayStr
          ).length * 5; // Assume 5 minutes per practice
          
          const dailyGoalMinutes = goals.daily_goal?.practice_minutes || 30;
          
          // Check at 8 PM if user missed daily goal
          if (today.getHours() === 20 && todayMinutes < dailyGoalMinutes) {
            await base44.asServiceRole.entities.Notification.create({
              title: "⚠️ לא הגעת ליעד היומי",
              message: `תרגלת רק ${todayMinutes} דקות מתוך ${dailyGoalMinutes} היום. עוד זמן להשלים!`,
              type: "warning",
              read: false,
              action_url: "/practice",
              created_by: user.email
            });
            missedGoalCount++;
            
            // Update missed goals
            const missedGoals = goals.missed_goals || [];
            missedGoals.push({
              date: todayStr,
              goal_type: "daily",
              notification_sent: true
            });
            
            await base44.asServiceRole.entities.StudyGoals.update(goals.id, {
              missed_goals: missedGoals
            });
          }
        }
        
        // 3️⃣ Weekly goal check (every Sunday evening)
        if (goals && today.getDay() === 0 && today.getHours() === 20) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const weekPractice = await base44.asServiceRole.entities.PracticeAttempt.filter({
            created_by: user.email
          });
          
          const weekSessions = weekPractice.filter(p => 
            new Date(p.created_date) >= weekAgo
          ).length;
          
          const weeklyGoal = goals.weekly_goal?.practice_sessions || 4;
          
          if (weekSessions < weeklyGoal) {
            await base44.asServiceRole.entities.Notification.create({
              title: "📊 סיכום שבועי - לא הגעת ליעד",
              message: `השבוע תרגלת ${weekSessions} פעמים מתוך ${weeklyGoal}. נתחיל שבוע חדש בחזקה!`,
              type: "warning",
              read: false,
              action_url: "/profile",
              created_by: user.email
            });
            missedGoalCount++;
          } else {
            await base44.asServiceRole.entities.Notification.create({
              title: "🎉 כל הכבוד! הגעת ליעד השבועי",
              message: `השבוע השלמת ${weekSessions} תרגולים. המשך כך!`,
              type: "success",
              read: false,
              action_url: "/profile",
              created_by: user.email
            });
          }
        }
        
        // 4️⃣ Monthly goal check (last day of month)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (goals && tomorrow.getMonth() !== today.getMonth() && today.getHours() === 20) {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          
          const monthPractice = await base44.asServiceRole.entities.PracticeAttempt.filter({
            created_by: user.email
          });
          
          const monthSessions = monthPractice.filter(p => 
            new Date(p.created_date) >= monthStart
          ).length;
          
          const monthlyGoal = goals.monthly_goal?.practice_sessions || 16;
          
          if (monthSessions < monthlyGoal) {
            await base44.asServiceRole.entities.Notification.create({
              title: "📅 סיכום חודשי - לא הגעת ליעד",
              message: `החודש תרגלת ${monthSessions} פעמים מתוך ${monthlyGoal}. חודש הבא נשתפר!`,
              type: "warning",
              read: false,
              action_url: "/profile",
              created_by: user.email
            });
            missedGoalCount++;
          } else {
            await base44.asServiceRole.entities.Notification.create({
              title: "🏆 חודש מדהים! הגעת ליעד החודשי",
              message: `החודש השלמת ${monthSessions} תרגולים. יפה מאוד!`,
              type: "success",
              read: false,
              action_url: "/profile",
              created_by: user.email
            });
          }
        }
        
        // 5️⃣ Exam date reminder (7, 3, 1 days before)
        if (user.exam_date) {
          const examDate = new Date(user.exam_date);
          const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
          
          if ([7, 3, 1].includes(daysUntilExam)) {
            await base44.asServiceRole.entities.Notification.create({
              title: `📅 הבגרות ב${user.selected_subject} מתקרבת!`,
              message: `נשארו רק ${daysUntilExam} ימים עד הבגרות. זמן לתרגל!`,
              type: "warning",
              read: false,
              action_url: "/exams",
              created_by: user.email
            });
            examReminderCount++;
          }
        }
        
        // 6️⃣ Bagrut countdown (every Monday)
        if (user.exam_date && today.getDay() === 1) {
          const examDate = new Date(user.exam_date);
          const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExam > 0 && daysUntilExam <= 30) {
            const weeksUntil = Math.ceil(daysUntilExam / 7);
            
            await base44.asServiceRole.entities.Notification.create({
              title: `⏳ ${weeksUntil} שבועות לבגרות`,
              message: `נשארו ${daysUntilExam} ימים עד הבגרות ב${user.selected_subject}. איך ההכנות?`,
              type: "info",
              read: false,
              action_url: "/profile",
              created_by: user.email
            });
            bagrutCountdownCount++;
          }
        }
        
        // 7️⃣ Achievement unlocked
        const achievements = await base44.asServiceRole.entities.Achievement.filter({
          created_by: user.email
        });
        
        const todayAchievements = achievements.filter(a => 
          a.earned_at && a.earned_at.split('T')[0] === todayStr
        );
        
        for (const achievement of todayAchievements) {
          await base44.asServiceRole.entities.Notification.create({
            title: `🏆 הישג חדש! ${achievement.title}`,
            message: achievement.description || "כל הכבוד! פתחת הישג חדש",
            type: "success",
            read: false,
            action_url: "/profile",
            created_by: user.email
          });
        }
        
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
      }
    }
    
    console.log(`✅ Scheduled notifications sent:`);
    console.log(`- Daily practice: ${dailyPracticeCount}`);
    console.log(`- Exam reminders: ${examReminderCount}`);
    console.log(`- Bagrut countdown: ${bagrutCountdownCount}`);
    console.log(`- Missed goals: ${missedGoalCount}`);

    return Response.json({
      success: true,
      daily_practice: dailyPracticeCount,
      exam_reminders: examReminderCount,
      bagrut_countdown: bagrutCountdownCount,
      missed_goals: missedGoalCount
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});