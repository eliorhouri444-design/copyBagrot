import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const users = await base44.asServiceRole.entities.User.list();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const results = {
      noActivityToday: [],
      noActivity3Days: [],
      taskCompleted: [],
      sent: 0,
      errors: 0
    };
    
    for (const user of users) {
      if (!user.email || !user.selected_subject) continue;
      
      const userEmail = user.email;
      
      // Check today's activity
      const todayTasks = await base44.asServiceRole.entities.DailyPractice.filter({
        date: today,
        user_email: userEmail
      });
      
      // Get learning profile for smart notifications
      const profiles = await base44.asServiceRole.entities.UserLearningProfile.filter({
        user_email: userEmail,
        subject_id: user.selected_subject
      });
      
      const profile = profiles[0];
      const daysLeft = profile?.days_until_exam || 90;
      
      // Case 1: No activity today at 20:00
      if (todayTasks.length === 0 || todayTasks[0].completed_questions === 0) {
        if (now.getHours() >= 20) {
          try {
            const templates = await base44.asServiceRole.entities.MessageTemplate.filter({
              template_id: 'not_active_1d'
            });
            
            if (templates.length > 0 && templates[0].is_active) {
              const template = templates[0];
              
              // Customize message based on days left
              let customMessage = template.message_text;
              if (daysLeft <= 14) {
                customMessage = `⚠️ נותרו ${daysLeft} ימים לבגרות! לא למדת היום - זה קריטי להמשיך.`;
              } else if (daysLeft <= 30) {
                customMessage = `נותרו ${daysLeft} ימים לבגרות. לא סיימת את היעד היומי - כדאי להשלים.`;
              }
              
              if (template.send_push) {
                await base44.asServiceRole.entities.NotificationLog.create({
                  user_email: userEmail,
                  template_id: template.template_id,
                  message_type: 'push',
                  message_text: customMessage,
                  status: 'sent',
                  sent_date: new Date().toISOString()
                });
                results.noActivityToday.push(userEmail);
                results.sent++;
              }
            }
          } catch (error) {
            console.error(`Error sending notification to ${userEmail}:`, error);
            results.errors++;
          }
        }
      }
      
      // Case 1.5: Exceeded daily goal - encouragement
      if (todayTasks.length > 0 && todayTasks[0].completed_questions > todayTasks[0].daily_goal) {
        const existingEncouragement = await base44.asServiceRole.entities.NotificationLog.filter({
          user_email: userEmail,
          template_id: 'exceeded_goal'
        });
        
        const alreadySentToday = existingEncouragement.some(notif => {
          const notifDate = notif.sent_date?.split('T')[0];
          return notifDate === today;
        });
        
        if (!alreadySentToday) {
          try {
            const overPerformance = todayTasks[0].completed_questions - todayTasks[0].daily_goal;
            const message = `🔥 אתה מעל התכנון! עשית ${overPerformance} שאלות נוספות היום. המשך ככה ותסיים את כל החומר לפני המבחן!`;
            
            await base44.asServiceRole.entities.NotificationLog.create({
              user_email: userEmail,
              template_id: 'exceeded_goal',
              message_type: 'push',
              message_text: message,
              status: 'sent',
              sent_date: new Date().toISOString()
            });
            results.sent++;
          } catch (error) {
            console.error(`Error sending encouragement to ${userEmail}:`, error);
            results.errors++;
          }
        }
      }
      
      // Case 2: No activity for 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentActivity = await base44.asServiceRole.entities.DailyPractice.filter({
        user_email: userEmail
      });
      
      const hasRecentActivity = recentActivity.some(task => {
        const taskDate = new Date(task.date);
        return taskDate >= threeDaysAgo && task.completed_questions > 0;
      });
      
      if (!hasRecentActivity) {
        try {
          const templates = await base44.asServiceRole.entities.MessageTemplate.filter({
            template_id: 'not_active_3d'
          });
          
          if (templates.length > 0 && templates[0].is_active) {
            const template = templates[0];
            
            // Send both push and WhatsApp
            if (template.send_push) {
              await base44.asServiceRole.entities.NotificationLog.create({
                user_email: userEmail,
                template_id: template.template_id,
                message_type: 'push',
                message_text: template.message_text,
                status: 'sent',
                sent_date: new Date().toISOString()
              });
            }
            
            if (template.send_whatsapp && template.whatsapp_text) {
              await base44.asServiceRole.entities.NotificationLog.create({
                user_email: userEmail,
                template_id: template.template_id,
                message_type: 'whatsapp',
                message_text: template.whatsapp_text,
                status: 'sent',
                sent_date: new Date().toISOString()
              });
            }
            
            results.noActivity3Days.push(userEmail);
            results.sent++;
          }
        } catch (error) {
          console.error(`Error sending 3-day notification to ${userEmail}:`, error);
          results.errors++;
        }
      }
      
      // Case 3: Task completed - immediate notification
      if (todayTasks.length > 0 && todayTasks[0].is_completed) {
        const task = todayTasks[0];
        
        // Check if we already sent notification
        const existingNotifs = await base44.asServiceRole.entities.NotificationLog.filter({
          user_email: userEmail,
          template_id: 'completed_daily'
        });
        
        const alreadySentToday = existingNotifs.some(notif => {
          const notifDate = notif.sent_date?.split('T')[0];
          return notifDate === today;
        });
        
        if (!alreadySentToday) {
          try {
            const templates = await base44.asServiceRole.entities.MessageTemplate.filter({
              template_id: 'completed_daily'
            });
            
            if (templates.length > 0 && templates[0].is_active) {
              const template = templates[0];
              
              await base44.asServiceRole.entities.NotificationLog.create({
                user_email: userEmail,
                template_id: template.template_id,
                message_type: 'push',
                message_text: template.message_text,
                status: 'sent',
                sent_date: new Date().toISOString()
              });
              
              results.taskCompleted.push(userEmail);
              results.sent++;
            }
          } catch (error) {
            console.error(`Error sending completion notification to ${userEmail}:`, error);
            results.errors++;
          }
        }
      }
    }
    
    return Response.json({
      success: true,
      message: `Sent ${results.sent} notifications`,
      results
    });
    
  } catch (error) {
    console.error('Error sending daily notifications:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});