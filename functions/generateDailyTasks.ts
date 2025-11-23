import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active users
    const users = await base44.asServiceRole.entities.User.list();
    const today = new Date().toISOString().split('T')[0];
    
    const results = [];
    
    for (const user of users) {
      if (!user.selected_subject || !user.selected_units) {
        continue; // Skip users without subject selection
      }
      
      const userEmail = user.email;
      const subject = user.selected_subject;
      const unitLevel = user.selected_units;
      
      // Check if tasks already exist for today
      const existingTasks = await base44.asServiceRole.entities.DailyPractice.filter({
        date: today,
        user_email: userEmail,
        subject_id: subject
      });
      
      if (existingTasks.length > 0) {
        continue; // Skip if already created
      }
      
      // Calculate streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayTasks = await base44.asServiceRole.entities.DailyPractice.filter({
        date: yesterdayStr,
        user_email: userEmail,
        is_completed: true
      });
      
      const streakDays = yesterdayTasks.length > 0 ? (yesterdayTasks[0].streak_days || 0) + 1 : 0;
      
      // Get user's weak topics (performance < 70%)
      const allAttempts = await base44.asServiceRole.entities.AttemptNew.filter({
        subject_id: subject
      });
      
      const userAttempts = allAttempts.filter(a => a.created_by === userEmail);
      
      const topicStats = {};
      userAttempts.forEach(attempt => {
        const topic = attempt.topic_id || 'unknown';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total++;
        if (attempt.status === 'correct') {
          topicStats[topic].correct++;
        }
      });
      
      const weakTopics = Object.entries(topicStats)
        .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) < 0.7)
        .map(([topic]) => topic);
      
      // Calculate daily goal
      const baseGoal = unitLevel === 5 ? 40 : unitLevel === 4 ? 30 : 20;
      const maxGoal = unitLevel === 5 ? 60 : unitLevel === 4 ? 50 : 40;
      const dailyGoal = Math.min(maxGoal, baseGoal + streakDays * 0.5);
      
      // Create tasks
      const tasks = [];
      const reviewCount = Math.floor(dailyGoal * 0.6);
      const newCount = Math.floor(dailyGoal * 0.4);
      
      // Review tasks from weak topics
      if (weakTopics.length > 0) {
        tasks.push({
          task_id: `review_${Date.now()}_1`,
          task_type: 'review',
          topic_id: weakTopics[0],
          question_count: Math.min(reviewCount, 15),
          status: 'pending'
        });
      }
      
      // New content task
      tasks.push({
        task_id: `new_${Date.now()}_1`,
        task_type: 'new_content',
        topic_id: null,
        question_count: Math.min(newCount, 10),
        status: 'pending'
      });
      
      // Bonus task if streak > 3
      if (streakDays >= 3) {
        tasks.push({
          task_id: `bonus_${Date.now()}_1`,
          task_type: 'bonus',
          topic_id: null,
          question_count: 5,
          status: 'pending'
        });
      }
      
      // Create DailyPractice record
      const dailyPractice = await base44.asServiceRole.entities.DailyPractice.create({
        date: today,
        user_email: userEmail,
        subject_id: subject,
        unit_level: unitLevel,
        tasks,
        total_questions: dailyGoal,
        completed_questions: 0,
        daily_goal: dailyGoal,
        streak_days: streakDays,
        is_completed: false
      });
      
      results.push({
        user: userEmail,
        subject,
        dailyGoal,
        streakDays,
        tasksCreated: tasks.length
      });
    }
    
    return Response.json({
      success: true,
      message: `Created daily tasks for ${results.length} users`,
      results
    });
    
  } catch (error) {
    console.error('Error generating daily tasks:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});