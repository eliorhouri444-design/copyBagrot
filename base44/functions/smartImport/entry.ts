import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { raw_input, subject, units, topic_id } = body;

    if (!raw_input || !subject || !units || !topic_id) {
      return Response.json({ 
        error: 'Missing required fields: raw_input, subject, units, topic_id' 
      }, { status: 400 });
    }

    console.log('🔍 Processing input:', { subject, units, topic_id });

    const questions = await parseSmartInput(raw_input, subject, units, topic_id);

    console.log('✅ Processed questions:', questions.length);

    return Response.json({
      success: true,
      questions: questions,
      count: questions.length
    });

  } catch (error) {
    console.error('❌ Smart import error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

async function parseSmartInput(rawInput, subject, units, topicId) {
  const questions = [];
  let currentStory = null;
  let questionCounter = 1;

  // Try JSON parsing first
  try {
    const parsed = JSON.parse(rawInput);
    
    if (Array.isArray(parsed)) {
      // JSON array format
      for (const item of parsed) {
        if (item.q && item.a) {
          // Simple {q, a} format
          questions.push(createQuestion(
            item.q,
            item.a,
            subject,
            units,
            topicId,
            questionCounter++,
            null,
            item.options || null
          ));
        } else if (item.question && item.answer) {
          // {question, answer} format
          questions.push(createQuestion(
            item.question,
            item.answer,
            subject,
            units,
            topicId,
            questionCounter++,
            null,
            item.options || null
          ));
        } else if (item.story && item.questions) {
          // Story format
          currentStory = item.story;
          for (const sq of item.questions) {
            questions.push(createQuestion(
              sq.question || sq.q,
              sq.answer || sq.a,
              subject,
              units,
              topicId,
              questionCounter++,
              questionCounter === 1 ? currentStory : null,
              sq.options || null
            ));
          }
        }
      }
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      // Wrapped format
      currentStory = parsed.story_text || parsed.story || null;
      for (const q of parsed.questions) {
        questions.push(createQuestion(
          q.question_text || q.question || q.q,
          q.answer || q.a,
          subject,
          units,
          topicId,
          questionCounter++,
          questionCounter === 1 && currentStory ? currentStory : null,
          q.options || null
        ));
      }
    }
    
    if (questions.length > 0) {
      return questions;
    }
  } catch (e) {
    // Not JSON, continue to text parsing
    console.log('Not JSON format, trying text parsing...');
  }

  // Text parsing
  const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect story
    if (line.toLowerCase().startsWith('story:') || line.toLowerCase().startsWith('text:')) {
      currentStory = line.substring(line.indexOf(':') + 1).trim();
      continue;
    }

    // Simple format: Question? = Answer
    if (line.includes('=')) {
      const [qPart, aPart] = line.split('=').map(s => s.trim());
      if (qPart && aPart) {
        questions.push(createQuestion(
          qPart,
          aPart,
          subject,
          units,
          topicId,
          questionCounter++,
          questions.length === 0 && currentStory ? currentStory : null
        ));
      }
      continue;
    }

    // Q: / A: format
    if (line.toLowerCase().startsWith('q:') || line.toLowerCase().startsWith('question:')) {
      const qText = line.substring(line.indexOf(':') + 1).trim();
      // Look for answer on next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.toLowerCase().startsWith('a:') || nextLine.toLowerCase().startsWith('answer:')) {
          const aText = nextLine.substring(nextLine.indexOf(':') + 1).trim();
          questions.push(createQuestion(
            qText,
            aText,
            subject,
            units,
            topicId,
            questionCounter++,
            questions.length === 0 && currentStory ? currentStory : null
          ));
          i++; // Skip next line
        }
      }
      continue;
    }
  }

  return questions;
}

function createQuestion(questionText, answer, subject, units, topicId, counter, story = null, options = null) {
  const questionId = `${subject}_${units}_${topicId}_q${counter}_${Date.now()}`;
  
  // Detect question type
  let questionType = "open";
  let finalOptions = options;

  if (options && Array.isArray(options) && options.length > 0) {
    questionType = "multi_choice";
  } else if (questionText.toLowerCase().includes('choose') || 
             questionText.toLowerCase().includes('select') ||
             questionText.toLowerCase().includes('בחר')) {
    questionType = "multi_choice";
  }

  const question = {
    question_id: questionId,
    subject_id: subject,
    unit_level: parseInt(units),
    topic_id: topicId,
    question_text: questionText,
    question_type: questionType,
    max_score: 10,
    difficulty_level: "medium",
    origin_type: "teacher_custom",
    is_active: true,
    answer: answer
  };

  if (story) {
    question.reading_text = story;
  }

  if (finalOptions && finalOptions.length > 0) {
    question.options = finalOptions;
  }

  return question;
}