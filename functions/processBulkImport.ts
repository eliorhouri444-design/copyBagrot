import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { raw_input, subject, units, topic_id, reading_story } = body;

    console.log('📥 Received request:', { 
      subject, 
      units, 
      topic_id, 
      has_topic: !!topic_id,
      topic_length: topic_id?.length 
    });

    if (!raw_input || !subject || !topic_id) {
      return Response.json({ 
        success: false,
        error: '❌ חסרים שדות חובה: ' + 
               (!raw_input ? 'נתוני שאלות, ' : '') +
               (!subject ? 'מקצוע, ' : '') +
               (!topic_id ? 'נושא (topic_id)' : '')
      }, { status: 400 });
    }

    console.log('🔍 Processing bulk input for:', { subject, units, topic_id });

    const questions = parseInput(raw_input, subject, units, topic_id, reading_story);

    console.log('✅ Parsed questions:', questions.length);

    return Response.json({
      success: true,
      questions: questions,
      count: questions.length
    });

  } catch (error) {
    console.error('❌ Bulk import error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

function parseInput(rawInput, subject, units, topicId, readingStory = null) {
  const questions = [];
  const stories = [];
  let counter = 1;

  // Check if this is Extended Reading format
  if (rawInput.includes('[EXTENDED_READING]') || rawInput.includes('[QUESTIONS]')) {
    return parseExtendedReading(rawInput, subject, units, topicId);
  }

  const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l);

  // First pass: collect all stories
  for (const line of lines) {
    const storyMatch = line.match(/^(story|text|reading)\s+(\d+):\s*(.+)/i);
    if (storyMatch) {
      const storyNumber = parseInt(storyMatch[2]);
      const storyText = storyMatch[3].trim();
      stories[storyNumber] = storyText;
      console.log(`📖 Story ${storyNumber}: ${storyText.substring(0, 50)}...`);
    }
  }

  // If readingStory provided, use it for all
  if (readingStory) {
    stories[1] = readingStory;
  }

  // Second pass: parse questions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip story lines
    if (line.match(/^(story|text|reading)\s+\d+:/i)) {
      continue;
    }

    // Format: Question | Answer
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      
      if (parts.length >= 2) {
        let questionText = parts[0].replace(/^Q:\s*/i, '').replace(/^Question:\s*/i, '');
        const answer = parts[1];
        
        // Check if this is a writing question
        const isWriting = questionText.match(/^\[WRITING\]\s*/i) || 
                         answer.toLowerCase() === 'writing' ||
                         questionText.toLowerCase().includes('write about') ||
                         questionText.toLowerCase().includes('describe in');
        
        if (isWriting) {
          questionText = questionText.replace(/^\[WRITING\]\s*/i, '').trim();
        }
        
        // Check if override subject/units/topic provided
        const overrideSubject = parts[2] || subject;
        const overrideUnits = parts[3] ? parseInt(parts[3]) : units;
        const overrideTopic = parts[4] || topicId;

        questions.push(createQuestion(
          questionText,
          isWriting ? 'writing' : answer,
          overrideSubject,
          overrideUnits,
          overrideTopic,
          counter++,
          null,
          isWriting
        ));
      }
      continue;
    }

    // Format: Q: ... (followed by A: ...)
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
            counter++,
            null
          ));
          
          i++; // Skip next line
        }
      }
      continue;
    }

    // Format: Question? = Answer
    if (line.includes('=')) {
      const [qPart, aPart] = line.split('=').map(s => s.trim());
      if (qPart && aPart) {
        questions.push(createQuestion(
          qPart,
          aPart,
          subject,
          units,
          topicId,
          counter++,
          null
        ));
      }
    }
  }

  // Assign stories to questions (every 10 questions gets a story)
  console.log(`📚 Total stories: ${Object.keys(stories).length}, Total questions: ${questions.length}`);
  
  if (Object.keys(stories).length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const storyNumber = Math.floor(i / 10) + 1;
      if (stories[storyNumber]) {
        questions[i].reading_text = stories[storyNumber];
        console.log(`✅ Q${i + 1} (${i % 10 + 1}/10) → Story ${storyNumber}`);
      }
    }
  }
  
  return questions;
}

function createQuestion(questionText, answer, subject, units, topicId, counter, story = null, forceWriting = false) {
  const timestamp = Date.now();
  const questionId = `${subject}_${units}_${topicId}_${counter}_${timestamp}`;
  
  // Detect question type
  let questionType = "open";
  
  if (forceWriting || answer === 'writing') {
    questionType = "writing";
  } else if (questionText.toLowerCase().includes('choose') || 
      questionText.toLowerCase().includes('select') ||
      questionText.toLowerCase().includes('בחר') ||
      questionText.toLowerCase().includes('סמן')) {
    questionType = "multi_choice";
  } else if (questionText.toLowerCase().includes('write about') ||
             questionText.toLowerCase().includes('write a') ||
             questionText.toLowerCase().includes('describe') ||
             questionText.toLowerCase().includes('explain') ||
             questionText.toLowerCase().includes('כתוב על') ||
             questionText.toLowerCase().includes('תאר')) {
    questionType = "writing";
  }

  // Detect difficulty
  let difficulty = "medium";
  if (questionText.length < 50) {
    difficulty = "easy";
  } else if (questionText.length > 150) {
    difficulty = "hard";
  }

  const question = {
    question_id: questionId,
    subject_id: subject,
    unit_level: parseInt(units),
    topic_id: topicId,
    question_text: questionText,
    question_type: questionType,
    max_score: questionType === "writing" ? 100 : 10,
    difficulty_level: difficulty,
    answer: questionType === "writing" ? "" : answer,
    origin_type: "teacher_custom",
    is_active: true
  };

  if (story) {
    question.reading_text = story;
  }
  
  console.log(`✅ Created Q${counter}: topic_id="${topicId}", subject="${subject}", units=${units}`);

  return question;
}

function parseExtendedReading(rawInput, subject, units, topicId) {
  console.log('📖 Parsing Extended Reading format...');
  
  const questions = [];
  
  // Extract reading text (between [EXTENDED_READING] and [QUESTIONS])
  const readingMatch = rawInput.match(/\[EXTENDED_READING\]([\s\S]*?)\[QUESTIONS\]/i);
  if (!readingMatch) {
    throw new Error('פורמט Extended Reading לא תקין - חסר [EXTENDED_READING] או [QUESTIONS]');
  }
  
  const readingText = readingMatch[1].trim();
  console.log(`📖 Extracted reading text: ${readingText.length} chars`);
  
  // Extract questions section (between [QUESTIONS] and [END] or end of text)
  const questionsMatch = rawInput.match(/\[QUESTIONS\]([\s\S]*?)(?:\[END\]|$)/i);
  if (!questionsMatch) {
    throw new Error('פורמט Extended Reading לא תקין - חסר סעיף [QUESTIONS]');
  }
  
  const questionsText = questionsMatch[1].trim();
  const questionLines = questionsText.split('\n').filter(l => l.trim() && l.includes('|'));
  
  console.log(`📝 Found ${questionLines.length} questions`);
  
  let counter = 1;
  const timestamp = Date.now();
  
  for (const line of questionLines) {
    const [questionText, answer] = line.split('|').map(s => s.trim());
    
    if (!questionText || !answer) continue;
    
    const questionId = `${subject}_${units}_${topicId}_${counter}_${timestamp}`;
    
    questions.push({
      question_id: questionId,
      subject_id: subject,
      unit_level: parseInt(units),
      topic_id: topicId,
      question_text: questionText,
      question_type: "open",
      max_score: 10,
      difficulty_level: "medium",
      answer: answer,
      reading_text: readingText,
      origin_type: "teacher_custom",
      is_active: true
    });
    
    counter++;
  }
  
  console.log(`✅ Created ${questions.length} Extended Reading questions with shared text`);
  return questions;
}