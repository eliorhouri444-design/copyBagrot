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

  // First pass: collect all stories (including Story: without number)
  let currentStory = null;
  const storyBlocks = [];
  
  for (const line of lines) {
    // Match "Story: text" (without number)
    const simpleStoryMatch = line.match(/^(story|text|reading):\s*(.+)/i);
    if (simpleStoryMatch) {
      currentStory = simpleStoryMatch[2].trim();
      storyBlocks.push({ story: currentStory, questions: [] });
      console.log(`📖 New Story Block: ${currentStory.substring(0, 50)}...`);
      continue;
    }
    
    // Match "Story 1: text" (with number)
    const numberedStoryMatch = line.match(/^(story|text|reading)\s+(\d+):\s*(.+)/i);
    if (numberedStoryMatch) {
      const storyNumber = parseInt(numberedStoryMatch[2]);
      const storyText = numberedStoryMatch[3].trim();
      stories[storyNumber] = storyText;
      console.log(`📖 Story ${storyNumber}: ${storyText.substring(0, 50)}...`);
      continue;
    }
  }

  // If readingStory provided globally, use it for all
  if (readingStory) {
    stories[1] = readingStory;
    currentStory = readingStory;
  }

  // Second pass: parse questions and assign to story blocks
  currentStory = readingStory || null;
  let currentBlockIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect new story block
    const simpleStoryMatch = line.match(/^(story|text|reading):\s*(.+)/i);
    if (simpleStoryMatch) {
      currentStory = simpleStoryMatch[2].trim();
      currentBlockIndex = storyBlocks.findIndex(b => b.story === currentStory);
      continue;
    }

    // Skip numbered story lines
    if (line.match(/^(story|text|reading)\s+\d+:/i)) {
      continue;
    }

    // Format: Question | Answer [| OPTIONS: opt1; opt2; opt3] [| EXPLANATION: text]
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      
      if (parts.length >= 2) {
        let questionText = parts[0].replace(/^Q:\s*/i, '').replace(/^Question:\s*/i, '');
        const answerPart = parts[1];
        
        // Extract explanation if provided (parts[2] or after answer)
        let explanation = "";
        if (parts.length >= 3 && !parts[2].match(/^\d+$/)) {
          explanation = parts[2];
        }
        
        // Check if this is a writing question
        const isWriting = questionText.match(/^\[WRITING\]\s*/i) || 
                         answerPart.toLowerCase() === 'writing' ||
                         questionText.toLowerCase().includes('write about') ||
                         questionText.toLowerCase().includes('describe in');
        
        if (isWriting) {
          questionText = questionText.replace(/^\[WRITING\]\s*/i, '').trim();
        }
        
        // Parse multiple acceptable answers and options (separated by semicolons)
        const acceptableAnswers = isWriting ? [] : answerPart.split(';').map(a => a.trim()).filter(a => a);
        const mainAnswer = acceptableAnswers[0] || answerPart;
        
        // If we have multiple answers, treat them as options for multiple choice
        const options = acceptableAnswers.length > 1 ? acceptableAnswers : [];
        
        // Check if override subject/units/topic provided
        const overrideSubject = parts[2] && parts[2].match(/^\d+$/) ? parts[2] : (parts[3] || subject);
        const overrideUnits = parts[3] && parts[3].match(/^\d+$/) ? parseInt(parts[3]) : (parts[4] ? parseInt(parts[4]) : units);
        const overrideTopic = parts[4] && !parts[4].match(/^\d+$/) ? parts[4] : (parts[5] || topicId);

        const newQuestion = createQuestion(
          questionText,
          isWriting ? 'writing' : mainAnswer,
          overrideSubject,
          overrideUnits,
          overrideTopic,
          counter++,
          currentStory,
          isWriting,
          acceptableAnswers,
          options,
          explanation
        );

        questions.push(newQuestion);
        
        // Also add to current story block if exists
        if (currentBlockIndex >= 0 && storyBlocks[currentBlockIndex]) {
          storyBlocks[currentBlockIndex].questions.push(newQuestion);
        }
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

  // Assign numbered stories to questions (every 10 questions gets a story)
  console.log(`📚 Total numbered stories: ${Object.keys(stories).length}, Story blocks: ${storyBlocks.length}, Total questions: ${questions.length}`);
  
  if (Object.keys(stories).length > 0) {
    for (let i = 0; i < questions.length; i++) {
      // Only assign numbered stories if the question doesn't already have reading_text from Story: block
      if (!questions[i].reading_text) {
        const storyNumber = Math.floor(i / 10) + 1;
        if (stories[storyNumber]) {
          questions[i].reading_text = stories[storyNumber];
          console.log(`✅ Q${i + 1} (${i % 10 + 1}/10) → Story ${storyNumber}`);
        }
      }
    }
  }
  
  console.log(`🎯 Final: ${questions.filter(q => q.reading_text).length} questions have reading text`);
  return questions;
}

function createQuestion(questionText, answer, subject, units, topicId, counter, story = null, forceWriting = false, acceptableAnswers = [], options = [], explanation = "") {
  const timestamp = Date.now();
  const questionId = `${subject}_${units}_${topicId}_${counter}_${timestamp}`;
  
  // Detect question type
  let questionType = "open";
  
  if (forceWriting || answer === 'writing') {
    questionType = "writing";
  } else if (options.length > 0 || 
      questionText.toLowerCase().includes('choose') || 
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
    acceptable_answers: acceptableAnswers.length > 0 ? acceptableAnswers : [answer],
    origin_type: "teacher_custom",
    is_active: true
  };

  if (options.length > 0) {
    question.options = options;
  }
  
  if (explanation) {
    question.explanation = explanation;
  }

  if (story) {
    question.reading_text = story;
  }
  
  console.log(`✅ Created Q${counter}: topic_id="${topicId}", type=${questionType}, ${acceptableAnswers.length} answers, ${options.length} options`);

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