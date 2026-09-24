import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📱 Send Push Notifications
 * שולח התראות למשתמשים על בחנים, תרגולים ובגרויות
 */

Deno.serve(async (req) => {
  console.log("📱 Sending notifications...");
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role - can send to all users
    const body = await req.json();
    const { 
      type, // 'exam_reminder', 'daily_practice', 'bagrut_countdown', 'achievement'
      targetUsers, // optional - specific users, otherwise all
      subject,
      title,
      message,
      action_url
    } = body;

    console.log("Notification type:", type);

    let notifications = [];

    // Get target users
    let users = [];
    if (targetUsers && targetUsers.length > 0) {
      users = targetUsers;
    } else {
      // All users with notifications enabled
      const allUsers = await base44.asServiceRole.entities.User.list();
      users = allUsers
        .filter(u => u.notifications_enabled !== false)
        .map(u => u.email);
    }

    console.log("Target users:", users.length);

    // Create notifications for each user
    for (const userEmail of users) {
      try {
        const notification = await base44.asServiceRole.entities.Notification.create({
          title,
          message,
          type: type || 'info',
          read: false,
          action_url,
          created_by: userEmail // Set as created by the user
        });
        
        notifications.push(notification);
        
        // TODO: Send actual push notification to device
        // This would integrate with Firebase Cloud Messaging or similar
        
      } catch (error) {
        console.error(`Failed to create notification for ${userEmail}:`, error);
      }
    }

    console.log(`✅ Created ${notifications.length} notifications`);

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      message: `Sent ${notifications.length} notifications`
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});