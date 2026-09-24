import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Load all users
    const users = await base44.asServiceRole.entities.User.list();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    // Load templates
    const templates = await base44.asServiceRole.entities.MessageTemplate.filter({ is_active: true });
    const templatesMap = {};
    templates.forEach(t => {
      templatesMap[t.template_id] = t;
    });
    
    const results = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const user of users) {
      try {
        let notificationSent = false;
        
        // 1. Fetch User Profile (Subject, Units, Exam Date)
        const profiles = await base44.asServiceRole.entities.UserLearningProfile.filter({
          user_email: user.email
        });
        const profile = profiles[0]; // Assuming one profile per user for now

        // 2. Check Exam Date (Priority 1)
        if (profile && profile.exam_date) {
          const examDate = new Date(profile.exam_date);
          const timeDiff = examDate.getTime() - now.getTime();
          const daysUntilExam = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          const reminderDays = [60, 30, 14, 7, 3, 1];
          
          if (reminderDays.includes(daysUntilExam)) {
            const title = `🗓️ הבגרות ב${profile.subject_id} מתקרבת!`;
            const message = `נשארו רק ${daysUntilExam} ימים לבגרות ב${profile.subject_id} (${profile.unit_level} יח'). זה הזמן לתת גז ולהשקיע!`;
            
            await sendCustomNotification(base44, user.email, title, message, 'reminder');
            results.push({ user: user.email, action: 'exam_reminder', days: daysUntilExam, status: 'sent' });
            notificationSent = true;
          }
        }

        // 3. Check Daily Practice (Priority 2) - if no exam reminder sent
        if (!notificationSent && profile) {
          const dailyPractices = await base44.asServiceRole.entities.DailyPractice.filter({
            user_email: user.email,
            date: todayStr
          });
          const daily = dailyPractices[0];

          if (daily && !daily.is_completed) {
            const completedCount = daily.completed_questions || 0;
            const totalCount = daily.daily_goal || 10; // Fallback
            
            if (completedCount < totalCount) {
              const title = `⚠️ לא סיימת את היעד היומי`;
              const message = `היי, השלמת רק ${completedCount} מתוך ${totalCount} שאלות להיום ב${profile.subject_id}. כמה דקות תרגול ואת/ה שם!`;
              
              await sendCustomNotification(base44, user.email, title, message, 'reminder');
              results.push({ user: user.email, action: 'daily_incomplete', status: 'sent' });
              notificationSent = true;
            }
          } else if (!daily) {
             // User didn't even start today
             const title = `🚀 זמן לתרגול היומי`;
             const message = `עוד לא התחלת את התרגול היומי ב${profile.subject_id}. בוא/י לשמור על הרצף!`;
             
             await sendCustomNotification(base44, user.email, title, message, 'reminder');
             results.push({ user: user.email, action: 'daily_missing', status: 'sent' });
             notificationSent = true;
          }
        }

        // 4. Check Weak Topics / Untaken Exams (Priority 3) - if nothing else sent
        if (!notificationSent && profile) {
          // Check for weak topics
          if (profile.weak_topics && profile.weak_topics.length > 0) {
             const weakTopic = profile.weak_topics[0]; // Get the first/highest priority one
             // We need topic name, but topic_id might be technical. Let's try to use it nicely.
             // Ideally we'd fetch the Topic entity, but for efficiency let's just use a generic message or try to format the ID.
             
             const title = `💪 חיזוק נושא חלש`;
             const message = `האלגוריתם זיהה קושי בנושאים מסוימים ב${profile.subject_id}. בוא/י לתרגל ולחזק את ההבנה!`;
             
             await sendCustomNotification(base44, user.email, title, message, 'recommendation');
             results.push({ user: user.email, action: 'weak_topic', status: 'sent' });
             notificationSent = true;
          }
        }
        
        // 5. Fallback: General Inactivity (Priority 4) - logic from original code
        if (!notificationSent) {
            // Get user's recent activity
            const practiceAttempts = await base44.asServiceRole.entities.PracticeSession.filter({
              created_by: user.email
            }, '-created_date', 1);
            
            const lastActivity = practiceAttempts[0]?.created_date 
              ? new Date(practiceAttempts[0].created_date) 
              : null;

            if (!lastActivity || lastActivity < threeDaysAgo) {
               const title = `מתגעגעים אליך! 👋`;
               const message = `עברו כבר 3 ימים מאז התרגול האחרון. החומר לא ילמד את עצמו 😉`;
               
               await sendCustomNotification(base44, user.email, title, message, 'reminder');
               results.push({ user: user.email, action: 'inactivity_3d', status: 'sent' });
            }
        }

      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
        results.push({ user: user.email, error: userError.message });
      }
    }
    
    return Response.json({ 
      success: true, 
      processed: users.length,
      results 
    });
    
  } catch (error) {
    console.error('Daily notification check error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

async function sendCustomNotification(base44, userEmail, title, message, type = 'reminder') {
  try {
    // Create notification in system (In-App)
    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      title: title,
      message: message,
      type: type,
      read: false
    });
    
    // Log the notification
    await base44.asServiceRole.entities.NotificationLog.create({
      user_email: userEmail,
      template_id: 'dynamic_system_notification',
      message_type: 'push',
      message_text: message,
      status: 'sent',
      sent_date: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error(`Failed to send notification to ${userEmail}:`, error);
    // Log failed notification
    try {
        await base44.asServiceRole.entities.NotificationLog.create({
          user_email: userEmail,
          template_id: 'dynamic_system_notification',
          message_type: 'push',
          message_text: message,
          status: 'failed',
          error_message: error.message,
          sent_date: new Date().toISOString()
        });
    } catch (logError) {
        console.error("Failed to log failure:", logError);
    }
    return false;
  }
}