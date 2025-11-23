import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { subject_id, unit_level, target_score, exam_date } = await req.json();
    
    if (!subject_id || !unit_level || !exam_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Calculate days until exam
    const examDateTime = new Date(exam_date);
    const daysLeft = Math.max(1, Math.ceil((examDateTime - new Date()) / (1000 * 60 * 60 * 24)));
    
    // Get curriculum for this subject
    const curriculum = await base44.entities.Curriculum.filter({
      subject_id,
      unit_level: parseInt(unit_level),
      is_mandatory: true
    });
    
    curriculum.sort((a, b) => a.order - b.order);
    
    // Get user's learning profile to see completed chapters
    const existingProfiles = await base44.entities.UserLearningProfile.filter({
      user_email: user.email,
      subject_id
    });
    
    const currentProfile = existingProfiles[0] || {
      completed_chapters: [],
      current_chapter: 1
    };
    
    // Calculate mastery based on curriculum completion
    const totalChapters = curriculum.length;
    const completedChaptersCount = currentProfile.completed_chapters?.length || 0;
    const currentMastery = totalChapters > 0 ? (completedChaptersCount / totalChapters) * 100 : 0;
    
    // Calculate remaining chapters
    const chaptersRemaining = totalChapters - completedChaptersCount;
    
    // Determine next chapter to learn
    const completedChapterNumbers = currentProfile.completed_chapters?.map(c => c.chapter_number) || [];
    const nextChapter = curriculum.find(c => !completedChapterNumbers.includes(c.chapter_number));
    
    const weakTopics = currentProfile.weak_topics || [];
    const completedTopics = currentProfile.completed_topics || [];
    
    // Calculate factors
    const difficultyFactor = unit_level === 5 ? 1.3 : unit_level === 4 ? 1.15 : 1.0;
    const targetScoreFactor = target_score >= 95 ? 1.35 : target_score >= 80 ? 1.15 : 1.0;
    
    // Calculate remaining material
    const remainingMaterial = (100 - currentMastery) / 100;
    
    // Apply the formula: DailyRequiredLearning = (RemainingMaterial / DaysLeft) * DifficultyFactor * TargetScoreFactor
    const dailyRequiredPercent = (remainingMaterial / daysLeft) * difficultyFactor * targetScoreFactor;
    
    // Convert to questions (assume 100 questions = 100% mastery)
    let calculatedGoal = Math.round(dailyRequiredPercent * 100);
    
    // Apply bounds
    const maxGoal = unit_level === 5 ? 70 : unit_level === 4 ? 60 : 50;
    const minGoal = 10;
    const dailyGoalQuestions = Math.max(minGoal, Math.min(maxGoal, calculatedGoal));
    
    // Update or create learning profile
    const existingProfiles = await base44.entities.UserLearningProfile.filter({
      user_email: user.email,
      subject_id
    });
    
    const profileData = {
      user_email: user.email,
      subject_id,
      unit_level: parseInt(unit_level),
      target_score: parseInt(target_score),
      exam_date,
      current_mastery: currentMastery,
      current_chapter: nextChapter?.chapter_number || currentProfile.current_chapter || 1,
      chapters_remaining: chaptersRemaining,
      completed_chapters: currentProfile.completed_chapters || [],
      weak_topics: weakTopics.sort((a, b) => b.priority - a.priority),
      completed_topics: completedTopics,
      daily_goal_questions: dailyGoalQuestions,
      days_until_exam: daysLeft,
      remaining_material_percent: remainingMaterial * 100,
      difficulty_factor: difficultyFactor,
      target_score_factor: targetScoreFactor,
      last_recalculated: new Date().toISOString()
    };
    
    let updatedProfile;
    if (existingProfiles.length > 0) {
      updatedProfile = await base44.entities.UserLearningProfile.update(existingProfiles[0].id, profileData);
    } else {
      updatedProfile = await base44.entities.UserLearningProfile.create(profileData);
    }
    
    // Generate insights based on curriculum
    const insights = {
      daysLeft,
      currentMastery: Math.round(currentMastery),
      dailyGoal: dailyGoalQuestions,
      weeklyGoal: dailyGoalQuestions * 7,
      currentChapter: nextChapter?.chapter_name || 'הושלמו כל הפרקים',
      chaptersRemaining,
      totalChapters,
      completedChapters: completedChaptersCount,
      weakTopicsCount: weakTopics.length,
      completedTopicsCount: completedTopics.length,
      onTrack: dailyGoalQuestions <= 50,
      urgency: daysLeft <= 21 ? 'high' : daysLeft <= 60 ? 'medium' : 'low',
      recommendation: daysLeft <= 21 
        ? 'התמקד בסימולציות מלאות ובחזרה על כל הפרקים'
        : daysLeft <= 60 
          ? `למד ${Math.ceil(chaptersRemaining / (daysLeft / 7))} פרקים בשבוע + תרגל ${dailyGoalQuestions} שאלות ביום`
          : `קצב נוח - פרק אחד בשבוע + ${dailyGoalQuestions} שאלות ביום`
    };
    
    return Response.json({
      success: true,
      profile: updatedProfile,
      insights
    });
    
  } catch (error) {
    console.error('Error calculating learning plan:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});