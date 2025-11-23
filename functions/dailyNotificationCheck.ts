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
    
    for (const user of users) {
      try {
        // Get user's recent activity
        const practiceAttempts = await base44.asServiceRole.entities.PracticeSession.filter({
          created_by: user.email
        }, '-created_date', 10);
        
        const examAttempts = await base44.asServiceRole.entities.ExamAttempt.filter({
          created_by: user.email
        }, '-created_date', 10);
        
        const allActivity = [...practiceAttempts, ...examAttempts]
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        
        const lastActivity = allActivity[0]?.created_date 
          ? new Date(allActivity[0].created_date) 
          : null;
        
        // Check if completed simulation recently
        const completedSimulation = examAttempts.some(attempt => 
          attempt.passed && 
          new Date(attempt.created_date) > oneDayAgo
        );
        
        // Send appropriate notification
        if (completedSimulation) {
          const template = templatesMap['completed_simulation'];
          if (template) {
            await sendNotification(base44, user.email, template, 'completed_simulation');
            results.push({ user: user.email, action: 'completed_simulation', status: 'sent' });
          }
        } else if (!lastActivity || lastActivity < threeDaysAgo) {
          const template = templatesMap['not_active_3d'];
          if (template && template.send_whatsapp) {
            await sendNotification(base44, user.email, template, 'not_active_3d', true);
            results.push({ user: user.email, action: 'not_active_3d', status: 'sent' });
          }
        } else if (lastActivity < oneDayAgo) {
          const template = templatesMap['not_active_1d'];
          if (template && template.send_push) {
            await sendNotification(base44, user.email, template, 'not_active_1d', false);
            results.push({ user: user.email, action: 'not_active_1d', status: 'sent' });
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

async function sendNotification(base44, userEmail, template, templateId, isWhatsApp = false) {
  try {
    const messageText = isWhatsApp && template.whatsapp_text 
      ? template.whatsapp_text 
      : template.message_text;
    
    // Create notification in system
    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      title: template.title,
      message: messageText,
      type: 'reminder',
      read: false
    });
    
    // Log the notification
    await base44.asServiceRole.entities.NotificationLog.create({
      user_email: userEmail,
      template_id: templateId,
      message_type: isWhatsApp ? 'whatsapp' : 'push',
      message_text: messageText,
      status: 'sent',
      sent_date: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    // Log failed notification
    await base44.asServiceRole.entities.NotificationLog.create({
      user_email: userEmail,
      template_id: templateId,
      message_type: isWhatsApp ? 'whatsapp' : 'push',
      message_text: template.message_text,
      status: 'failed',
      error_message: error.message,
      sent_date: new Date().toISOString()
    });
    
    throw error;
  }
}