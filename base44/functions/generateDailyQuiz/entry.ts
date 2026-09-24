import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { user_email, subject_id, unit_level } = await req.json();
    
    if (!user_email || !subject_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if quiz already exists today
    const existingQuiz = await base44.asServiceRole.entities.DailyQuiz.filter({
      date: today,
      user_email,
      subject_id
    });
    
    if (existingQuiz.length > 0) {
      return Response.json({ 
        success: true, 
        quiz: existingQuiz[0],
        message: 'Quiz already exists for today'
      });
    }
    
    // Get user's weak topics
    const allAttempts = await base44.asServiceRole.entities.AttemptNew.filter({
      subject_id
    });
    
    const userAttempts = allAttempts.filter(a => a.created_by === user_email);
    
    const topicStats = {};
    userAttempts.forEach(attempt => {
      const topic = attempt.topic_id || 'unknown';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0, questions: [] };
      }
      topicStats[topic].total++;
      if (attempt.status === 'correct') {
        topicStats[topic].correct++;
      }
      if (attempt.question_id) {
        topicStats[topic].questions.push(attempt.question_id);
      }
    });
    
    const weakTopics = Object.entries(topicStats)
      .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) < 0.7)
      .map(([topic, stats]) => ({ topic, ...stats }))
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total));
    
    // Get all questions
    const allQuestions = await base44.asServiceRole.entities.QuestionBank.filter({
      subject_id,
      unit_level: parseInt(unit_level),
      is_active: true
    });
    
    const quizQuestions = [];
    const totalQuestions = 10;
    const weakTopicCount = Math.floor(totalQuestions * 0.6); // 60%
    const newTopicCount = totalQuestions - weakTopicCount; // 40%
    
    // Add questions from weak topics
    let addedFromWeak = 0;
    for (const weakTopic of weakTopics) {
      if (addedFromWeak >= weakTopicCount) break;
      
      const topicQuestions = allQuestions.filter(q => 
        q.topic_id === weakTopic.topic && 
        !quizQuestions.find(qq => qq.question_id === q.id)
      );
      
      const questionsToAdd = topicQuestions.slice(0, Math.min(3, weakTopicCount - addedFromWeak));
      questionsToAdd.forEach(q => {
        quizQuestions.push({
          question_id: q.id,
          topic_id: q.topic_id,
          is_weak_topic: true
        });
        addedFromWeak++;
      });
    }
    
    // Add new/random questions
    const remainingQuestions = allQuestions
      .filter(q => !quizQuestions.find(qq => qq.question_id === q.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, newTopicCount);
    
    remainingQuestions.forEach(q => {
      quizQuestions.push({
        question_id: q.id,
        topic_id: q.topic_id,
        is_weak_topic: false
      });
    });
    
    // Create quiz
    const quiz = await base44.asServiceRole.entities.DailyQuiz.create({
      date: today,
      user_email,
      subject_id,
      unit_level: parseInt(unit_level),
      questions: quizQuestions,
      total_questions: quizQuestions.length,
      is_completed: false
    });
    
    return Response.json({
      success: true,
      quiz,
      message: `Created daily quiz with ${quizQuestions.length} questions`
    });
    
  } catch (error) {
    console.error('Error generating daily quiz:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});