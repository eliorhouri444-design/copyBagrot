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
      
      // Get or create learning profile
      let learningProfile = await base44.asServiceRole.entities.UserLearningProfile.filter({
        user_email: userEmail,
        subject_id: subject
      });
      
      if (learningProfile.length === 0) {
        // Create default profile
        learningProfile = [await base44.asServiceRole.entities.UserLearningProfile.create({
          user_email: userEmail,
          subject_id: subject,
          unit_level: parseInt(unitLevel),
          target_score: 85,
          exam_date: user.exam_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          current_mastery: 0,
          daily_availability_minutes: 45,
          learning_pace: 'normal',
          weak_topics: [],
          completed_topics: []
        })];
      }
      
      const profile = learningProfile[0];
      
      // Calculate days until exam
      const examDate = new Date(profile.exam_date);
      const daysLeft = Math.max(1, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24)));
      
      // Calculate difficulty factor
      const difficultyFactor = unitLevel === 5 ? 1.3 : unitLevel === 4 ? 1.15 : 1.0;
      
      // Calculate target score factor
      const targetScore = profile.target_score || 85;
      const targetScoreFactor = targetScore >= 95 ? 1.35 : targetScore >= 80 ? 1.15 : 1.0;
      
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
      
      // Calculate remaining material
      const remainingMaterial = (100 - (profile.current_mastery || 0)) / 100;
      
      // Calculate daily required learning using the formula
      const dailyRequiredPercent = (remainingMaterial / daysLeft) * difficultyFactor * targetScoreFactor;
      
      // Convert to questions (assume 100 questions = 100% mastery)
      let calculatedGoal = Math.round(dailyRequiredPercent * 100);
      
      // Apply min/max bounds with streak bonus
      const baseGoal = unitLevel === 5 ? 40 : unitLevel === 4 ? 30 : 20;
      const maxGoal = unitLevel === 5 ? 70 : unitLevel === 4 ? 60 : 50;
      const minGoal = 10;
      
      let dailyGoal = Math.max(minGoal, Math.min(maxGoal, calculatedGoal));
      
      // Streak bonus (but not too aggressive)
      dailyGoal = Math.min(maxGoal, dailyGoal + Math.floor(streakDays * 0.3));
      
      // If less than 3 weeks until exam - add simulation
      const needsSimulation = daysLeft <= 21;
      
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
      
      // Simulation task if close to exam
      if (needsSimulation) {
        tasks.push({
          task_id: `exam_${Date.now()}_1`,
          task_type: 'exam',
          topic_id: null,
          question_count: 0,
          status: 'pending'
        });
      }
      
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
      
      // Update learning profile
      await base44.asServiceRole.entities.UserLearningProfile.update(profile.id, {
        days_until_exam: daysLeft,
        remaining_material_percent: remainingMaterial * 100,
        difficulty_factor: difficultyFactor,
        target_score_factor: targetScoreFactor,
        daily_goal_questions: dailyGoal,
        last_recalculated: new Date().toISOString()
      });
      
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