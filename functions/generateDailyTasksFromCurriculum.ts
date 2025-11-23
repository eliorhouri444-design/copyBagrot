import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const users = await base44.asServiceRole.entities.User.list();
    const today = new Date().toISOString().split('T')[0];
    
    const results = [];
    
    for (const user of users) {
      if (!user.selected_subject || !user.selected_units) {
        continue;
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
        continue;
      }
      
      // Get or create learning profile
      let learningProfile = await base44.asServiceRole.entities.UserLearningProfile.filter({
        user_email: userEmail,
        subject_id: subject
      });
      
      if (learningProfile.length === 0) {
        learningProfile = [await base44.asServiceRole.entities.UserLearningProfile.create({
          user_email: userEmail,
          subject_id: subject,
          unit_level: parseInt(unitLevel),
          target_score: 85,
          exam_date: user.exam_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          current_mastery: 0,
          daily_availability_minutes: 45,
          learning_pace: 'normal',
          completed_chapters: [],
          current_chapter: 1,
          weak_topics: [],
          completed_topics: []
        })];
      }
      
      const profile = learningProfile[0];
      
      // Get curriculum for this subject and level
      const curriculum = await base44.asServiceRole.entities.Curriculum.filter({
        subject_id: subject,
        unit_level: parseInt(unitLevel),
        is_mandatory: true
      });
      
      curriculum.sort((a, b) => a.order - b.order);
      
      // Calculate days until exam
      const examDate = new Date(profile.exam_date);
      const daysLeft = Math.max(1, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24)));
      
      // Calculate factors
      const difficultyFactor = unitLevel === 5 ? 1.3 : unitLevel === 4 ? 1.15 : 1.0;
      const targetScoreFactor = profile.target_score >= 95 ? 1.35 : profile.target_score >= 80 ? 1.2 : 1.0;
      
      // Calculate mastery based on curriculum
      const totalChapters = curriculum.length;
      const completedChapters = profile.completed_chapters?.length || 0;
      const currentMastery = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
      const remainingMaterial = (100 - currentMastery) / 100;
      
      // Apply formula
      const dailyRequiredPercent = (remainingMaterial / daysLeft) * difficultyFactor * targetScoreFactor;
      let calculatedGoal = Math.round(dailyRequiredPercent * 100);
      
      // Apply bounds
      const maxGoal = unitLevel === 5 ? 70 : unitLevel === 4 ? 60 : 50;
      const minGoal = 10;
      let dailyGoal = Math.max(minGoal, Math.min(maxGoal, calculatedGoal));
      
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
      
      // Streak bonus
      dailyGoal = Math.min(maxGoal, dailyGoal + Math.floor(streakDays * 0.3));
      
      // Determine current chapter to learn
      const currentChapterNum = profile.current_chapter || 1;
      const currentChapter = curriculum.find(c => c.chapter_number === currentChapterNum);
      
      // Create tasks based on curriculum
      const tasks = [];
      const reviewCount = Math.floor(dailyGoal * 0.4); // 40% review
      const newCount = Math.floor(dailyGoal * 0.6); // 60% new material
      
      // New material from current chapter
      if (currentChapter) {
        tasks.push({
          task_id: `new_chapter_${Date.now()}_1`,
          task_type: 'new_content',
          chapter_number: currentChapter.chapter_number,
          chapter_name: currentChapter.chapter_name,
          topic_id: currentChapter.topics?.[0]?.topic_id || null,
          question_count: newCount,
          status: 'pending'
        });
      }
      
      // Review from completed chapters
      if (profile.completed_chapters && profile.completed_chapters.length > 0) {
        const lastCompleted = profile.completed_chapters[profile.completed_chapters.length - 1];
        const reviewChapter = curriculum.find(c => c.chapter_number === lastCompleted.chapter_number);
        
        if (reviewChapter) {
          tasks.push({
            task_id: `review_${Date.now()}_1`,
            task_type: 'review',
            chapter_number: reviewChapter.chapter_number,
            chapter_name: reviewChapter.chapter_name,
            topic_id: null,
            question_count: reviewCount,
            status: 'pending'
          });
        }
      }
      
      // Simulation if close to exam
      if (daysLeft <= 21) {
        tasks.push({
          task_id: `exam_${Date.now()}_1`,
          task_type: 'exam',
          chapter_number: null,
          chapter_name: 'סימולציה מלאה',
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
          chapter_number: null,
          chapter_name: 'משימת בונוס',
          topic_id: null,
          question_count: 5,
          status: 'pending'
        });
      }
      
      // Create DailyPractice record
      await base44.asServiceRole.entities.DailyPractice.create({
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
      
      // Update profile
      await base44.asServiceRole.entities.UserLearningProfile.update(profile.id, {
        days_until_exam: daysLeft,
        chapters_remaining: totalChapters - completedChapters,
        remaining_material_percent: remainingMaterial * 100,
        current_mastery: currentMastery,
        difficulty_factor: difficultyFactor,
        target_score_factor: targetScoreFactor,
        daily_goal_questions: dailyGoal,
        last_recalculated: new Date().toISOString()
      });
      
      results.push({
        user: userEmail,
        subject,
        dailyGoal,
        streakDays,
        currentChapter: currentChapter?.chapter_name || 'N/A',
        chaptersRemaining: totalChapters - completedChapters,
        daysLeft,
        tasksCreated: tasks.length
      });
    }
    
    return Response.json({
      success: true,
      message: `Created curriculum-based daily tasks for ${results.length} users`,
      results
    });
    
  } catch (error) {
    console.error('Error generating daily tasks from curriculum:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});