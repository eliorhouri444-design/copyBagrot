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
    
    // Get all user's attempts to calculate current mastery
    const allAttempts = await base44.entities.AttemptNew.filter({
      subject_id
    });
    
    const userAttempts = allAttempts.filter(a => a.created_by === user.email);
    
    // Calculate topic-level mastery
    const topicStats = {};
    userAttempts.forEach(attempt => {
      const topic = attempt.topic_id || 'unknown';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0, totalScore: 0 };
      }
      topicStats[topic].total++;
      topicStats[topic].totalScore += (attempt.percentage || 0);
      if (attempt.status === 'correct') {
        topicStats[topic].correct++;
      }
    });
    
    // Identify weak and completed topics
    const weakTopics = [];
    const completedTopics = [];
    
    Object.entries(topicStats).forEach(([topic, stats]) => {
      const mastery = stats.total > 0 ? stats.totalScore / stats.total : 0;
      
      if (mastery >= 80 && stats.total >= 5) {
        completedTopics.push(topic);
      } else if (mastery < 70 && stats.total >= 3) {
        weakTopics.push({
          topic_id: topic,
          mastery,
          priority: Math.floor((70 - mastery) / 10)
        });
      }
    });
    
    // Calculate overall mastery
    const allTopics = await base44.entities.TopicNew.filter({
      subject_id,
      unit_level: parseInt(unit_level),
      is_active: true
    });
    
    const totalTopics = allTopics.length;
    const masteredTopics = completedTopics.length;
    const currentMastery = totalTopics > 0 ? (masteredTopics / totalTopics) * 100 : 0;
    
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
    
    // Generate insights
    const insights = {
      daysLeft,
      currentMastery: Math.round(currentMastery),
      dailyGoal: dailyGoalQuestions,
      weeklyGoal: dailyGoalQuestions * 7,
      weakTopicsCount: weakTopics.length,
      completedTopicsCount: completedTopics.length,
      onTrack: dailyGoalQuestions <= 50,
      urgency: daysLeft <= 21 ? 'high' : daysLeft <= 60 ? 'medium' : 'low',
      recommendation: daysLeft <= 21 
        ? 'התמקד בסימולציות מלאות ובנושאים החלשים בלבד'
        : daysLeft <= 60 
          ? `תרגל ${dailyGoalQuestions} שאלות ביום ותגיע מוכן`
          : `קצב נוח - ${dailyGoalQuestions} שאלות ביום מספיק`
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