/**
 * Generate Smart English Exam - יצירת בגרות אנגלית חכמה מ-3 שאלונים סרוקים
 * 
 * 4 כללים מחייבים:
 * 1. כלל רצף ההבנה (Dependency Rule) - מהקל לקשה, literal לפני inference
 * 2. כלל המשקל והמבנה (Weight & Structure Rule) - שמירה על פרופורציות
 * 3. כלל הגיוון (Diversity Rule) - מגוון סוגי טקסטים ושאלות
 * 4. כלל הניסוח הדינמי (Dynamic Rewrite Rule) - טקסט חדש, מבנה זהה
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ===== הגדרות שאלונים לפי יחידות =====
const MODULE_DEFINITIONS = {
  'A': { name: 'Listening & Basic Reading', units: [3, 4, 5], hasListening: true },
  'B': { name: 'Reading', units: [3, 4, 5], hasListening: false },
  'C': { name: 'Reading Extended', units: [3, 4, 5], hasListening: false },
  'D': { name: 'Reading + Vocabulary', units: [4, 5], hasListening: false },
  'E': { name: 'Advanced Comprehension', units: [4, 5], hasListening: false },
  'F': { name: 'High-level Reading', units: [5], hasListening: false },
  'G': { name: 'Academic Reading', units: [5], hasListening: false }
};

// ===== סוגי שאלות ותלויות =====
const QUESTION_TYPES = {
  'detail': { order: 1, difficulty: 'easy', requires: [] },
  'vocabulary_in_context': { order: 2, difficulty: 'easy', requires: ['detail'] },
  'synonym': { order: 3, difficulty: 'medium', requires: ['vocabulary_in_context'] },
  'opposite': { order: 4, difficulty: 'medium', requires: ['vocabulary_in_context'] },
  'main_idea': { order: 5, difficulty: 'medium', requires: ['detail'] },
  'inference': { order: 6, difficulty: 'hard', requires: ['detail', 'main_idea'] },
  'tone': { order: 7, difficulty: 'hard', requires: ['main_idea', 'inference'] },
  'purpose': { order: 8, difficulty: 'hard', requires: ['main_idea'] },
  'attitude': { order: 9, difficulty: 'hard', requires: ['inference', 'tone'] },
  'structure': { order: 10, difficulty: 'hard', requires: ['main_idea'] }
};

// ===== סוגי טקסטים =====
const TEXT_TYPES = ['narrative', 'informative', 'opinion', 'formal_article', 'report', 'email_letter', 'instructions'];

// ===== דרישות לפי יחידות =====
const UNIT_REQUIREMENTS = {
  3: {
    language: 'simple',
    sentenceLength: 'short',
    academicWords: 'minimal',
    questionLevel: 'literal',
    textLength: { min: 200, max: 400 },
    allowedQuestionTypes: ['detail', 'vocabulary_in_context', 'synonym', 'main_idea']
  },
  4: {
    language: 'intermediate',
    sentenceLength: 'medium',
    academicWords: 'some',
    questionLevel: 'mixed',
    textLength: { min: 350, max: 550 },
    allowedQuestionTypes: ['detail', 'vocabulary_in_context', 'synonym', 'opposite', 'main_idea', 'inference']
  },
  5: {
    language: 'academic',
    sentenceLength: 'complex',
    academicWords: 'many',
    questionLevel: 'advanced',
    textLength: { min: 500, max: 800 },
    allowedQuestionTypes: ['detail', 'vocabulary_in_context', 'synonym', 'opposite', 'main_idea', 'inference', 'tone', 'purpose', 'attitude', 'structure']
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examIds, moduleId, unitLevel, targetScore } = await req.json();

    if (!examIds || !Array.isArray(examIds) || examIds.length < 1) {
      return Response.json({ error: 'נדרש לפחות שאלון אחד' }, { status: 400 });
    }

    // שליפת השאלונים
    const sourceExams = [];
    for (const examId of examIds) {
      // נסה לשלוף מכל סוגי המבחנים
      let exam = null;
      
      const moduleCExams = await base44.entities.ModuleCExam.filter({ id: examId });
      if (moduleCExams.length > 0) {
        exam = { ...moduleCExams[0], exam_type: 'module_c' };
      }
      
      if (!exam) {
        const moduleAExams = await base44.entities.ModuleAExam.filter({ id: examId });
        if (moduleAExams.length > 0) {
          exam = { ...moduleAExams[0], exam_type: 'module_a' };
        }
      }
      
      if (!exam) {
        const moduleBExams = await base44.entities.ModuleBExam.filter({ id: examId });
        if (moduleBExams.length > 0) {
          exam = { ...moduleBExams[0], exam_type: 'module_b' };
        }
      }
      
      if (!exam) {
        const genericExams = await base44.entities.GenericExam.filter({ id: examId });
        if (genericExams.length > 0) {
          exam = { ...genericExams[0], exam_type: 'generic' };
        }
      }
      
      if (exam) sourceExams.push(exam);
    }

    if (sourceExams.length === 0) {
      return Response.json({ error: 'לא נמצאו שאלונים' }, { status: 404 });
    }

    const units = unitLevel || 5;
    const requirements = UNIT_REQUIREMENTS[units];

    // ===== שלב 1: ניתוח מעמיק של 3 השאלונים =====
    const analysis = analyzeEnglishExams(sourceExams, units);
    
    // ===== שלב 2: בניית מאגר שאלות =====
    const questionPool = buildEnglishQuestionPool(sourceExams);
    
    // ===== שלב 3: בחירת שאלות לפי הכללים =====
    const selectedQuestions = selectEnglishQuestions(questionPool, analysis, requirements);
    
    // ===== שלב 4: סידור לפי Dependency Rule =====
    const orderedQuestions = orderByComprehensionFlow(selectedQuestions);
    
    // ===== שלב 5: יצירת טקסט וניסוחים חדשים =====
    const { newText, rewordedQuestions } = await generateNewContent(
      sourceExams, 
      orderedQuestions, 
      analysis, 
      requirements, 
      base44
    );
    
    // ===== שלב 6: בניית המבחן הסופי =====
    const newExam = buildFinalExam({
      moduleId: moduleId || 'C',
      unitLevel: units,
      text: newText,
      questions: rewordedQuestions,
      analysis,
      sourceExams,
      targetScore: targetScore || 85,
      user
    });

    // שמירת המבחן
    let savedExam;
    if (moduleId === 'A') {
      savedExam = await base44.entities.ModuleAExam.create(newExam);
    } else if (moduleId === 'B') {
      savedExam = await base44.entities.ModuleBExam.create(newExam);
    } else if (moduleId === 'C') {
      savedExam = await base44.entities.ModuleCExam.create(newExam);
    } else {
      savedExam = await base44.entities.GenericExam.create(newExam);
    }

    return Response.json({
      success: true,
      exam: savedExam,
      analysis: analysis,
      message: `נוצר מבחן אנגלית חדש עם ${rewordedQuestions.length} שאלות`
    });

  } catch (error) {
    console.error('Error generating smart English exam:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * ניתוח מעמיק של שאלוני האנגלית
 */
function analyzeEnglishExams(exams, unitLevel) {
  const analysis = {
    totalQuestions: 0,
    questionTypeDistribution: {},
    difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
    textTypes: [],
    textLengths: [],
    averageTextLength: 0,
    questionTypesFound: new Set(),
    hasMultipleTexts: false,
    moduleTypes: new Set(),
    scoringStructure: {
      pointsPerQuestion: {},
      totalPoints: 0
    }
  };

  exams.forEach(exam => {
    // זיהוי סוג המודול
    if (exam.module_id) analysis.moduleTypes.add(exam.module_id);
    
    // ניתוח טקסטים
    if (exam.reading_text) {
      const textLength = exam.reading_text.split(/\s+/).length;
      analysis.textLengths.push(textLength);
      
      // ניסיון לזהות סוג טקסט
      const textType = detectTextType(exam.reading_text);
      analysis.textTypes.push(textType);
    }
    
    // בדיקה לריבוי טקסטים
    if (exam.texts && exam.texts.length > 1) {
      analysis.hasMultipleTexts = true;
    }

    // ניתוח שאלות
    const questions = exam.questions || exam.reading_questions || [];
    questions.forEach(q => {
      analysis.totalQuestions++;
      
      // סוג שאלה
      const qType = classifyQuestionType(q);
      analysis.questionTypeDistribution[qType] = (analysis.questionTypeDistribution[qType] || 0) + 1;
      analysis.questionTypesFound.add(qType);
      
      // רמת קושי
      const difficulty = q.difficulty_level || detectDifficulty(q, unitLevel);
      analysis.difficultyDistribution[difficulty]++;
      
      // ניקוד
      const points = q.points || 5;
      analysis.scoringStructure.pointsPerQuestion[qType] = points;
      analysis.scoringStructure.totalPoints += points;
    });
  });

  // חישוב ממוצעים
  if (analysis.textLengths.length > 0) {
    analysis.averageTextLength = Math.round(
      analysis.textLengths.reduce((a, b) => a + b, 0) / analysis.textLengths.length
    );
  }

  // חישוב אחוזים
  analysis.questionTypePercentages = {};
  Object.entries(analysis.questionTypeDistribution).forEach(([type, count]) => {
    analysis.questionTypePercentages[type] = Math.round((count / analysis.totalQuestions) * 100);
  });

  analysis.difficultyPercentages = {};
  Object.entries(analysis.difficultyDistribution).forEach(([diff, count]) => {
    analysis.difficultyPercentages[diff] = Math.round((count / analysis.totalQuestions) * 100);
  });

  analysis.questionTypesFound = Array.from(analysis.questionTypesFound);
  analysis.moduleTypes = Array.from(analysis.moduleTypes);

  return analysis;
}

/**
 * זיהוי סוג טקסט
 */
function detectTextType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('dear') || lowerText.includes('sincerely') || lowerText.includes('regards')) {
    return 'email_letter';
  }
  if (lowerText.includes('according to research') || lowerText.includes('study shows') || lowerText.includes('scientists')) {
    return 'informative';
  }
  if (lowerText.includes('i believe') || lowerText.includes('in my opinion') || lowerText.includes('should')) {
    return 'opinion';
  }
  if (lowerText.includes('once upon') || lowerText.includes('he said') || lowerText.includes('she felt')) {
    return 'narrative';
  }
  if (lowerText.includes('step 1') || lowerText.includes('instructions') || lowerText.includes('follow these')) {
    return 'instructions';
  }
  if (lowerText.includes('report') || lowerText.includes('findings') || lowerText.includes('data shows')) {
    return 'report';
  }
  
  return 'formal_article';
}

/**
 * סיווג סוג שאלה
 */
function classifyQuestionType(question) {
  const text = (question.question_text || '').toLowerCase();
  
  if (text.includes('main idea') || text.includes('mainly about') || text.includes('best title')) {
    return 'main_idea';
  }
  if (text.includes('infer') || text.includes('conclude') || text.includes('suggest') || text.includes('imply')) {
    return 'inference';
  }
  if (text.includes('synonym') || text.includes('similar meaning') || text.includes('same as')) {
    return 'synonym';
  }
  if (text.includes('opposite') || text.includes('antonym')) {
    return 'opposite';
  }
  if (text.includes('tone') || text.includes('attitude') || text.includes('feel about')) {
    return 'tone';
  }
  if (text.includes('purpose') || text.includes('why did the author')) {
    return 'purpose';
  }
  if (text.includes('vocabulary') || text.includes('word') || text.includes('means')) {
    return 'vocabulary_in_context';
  }
  if (text.includes('according to') || text.includes('what') || text.includes('where') || text.includes('when') || text.includes('who')) {
    return 'detail';
  }
  if (text.includes('structure') || text.includes('organized') || text.includes('paragraph')) {
    return 'structure';
  }
  
  return 'detail';
}

/**
 * זיהוי רמת קושי
 */
function detectDifficulty(question, unitLevel) {
  const qType = classifyQuestionType(question);
  const typeInfo = QUESTION_TYPES[qType];
  
  if (typeInfo) return typeInfo.difficulty;
  
  // ברירת מחדל לפי יחידות
  if (unitLevel === 3) return 'easy';
  if (unitLevel === 4) return 'medium';
  return 'hard';
}

/**
 * בניית מאגר שאלות
 */
function buildEnglishQuestionPool(exams) {
  const pool = [];
  
  exams.forEach((exam, examIndex) => {
    const questions = exam.questions || exam.reading_questions || [];
    const readingText = exam.reading_text || '';
    
    questions.forEach((q, qIndex) => {
      pool.push({
        ...q,
        sourceExamId: exam.id,
        sourceExamTitle: exam.title,
        sourceIndex: qIndex,
        questionType: classifyQuestionType(q),
        difficulty: q.difficulty_level || detectDifficulty(q, exam.unit_level || 5),
        points: q.points || 5,
        relatedText: readingText,
        textType: detectTextType(readingText)
      });
    });
  });

  return pool;
}

/**
 * בחירת שאלות לפי הכללים - Weight & Diversity
 */
function selectEnglishQuestions(pool, analysis, requirements) {
  const selected = [];
  const targetCount = Math.min(20, Math.max(12, Math.ceil(analysis.totalQuestions / 3)));
  const usedTypes = new Set();
  
  // שלב 1: Diversity Rule - וודא שכל סוג שאלה שהופיע יופיע
  analysis.questionTypesFound.forEach(qType => {
    if (!requirements.allowedQuestionTypes.includes(qType)) return;
    
    const matching = pool.filter(q => 
      q.questionType === qType && 
      !selected.find(s => s.sourceExamId === q.sourceExamId && s.sourceIndex === q.sourceIndex)
    );
    
    if (matching.length > 0) {
      const chosen = matching[Math.floor(Math.random() * matching.length)];
      selected.push(chosen);
      usedTypes.add(qType);
    }
  });

  // שלב 2: Weight Rule - השלם לפי פרופורציות
  while (selected.length < targetCount) {
    // מצא סוג שאלה שחסר
    const currentTypeCount = {};
    selected.forEach(q => {
      currentTypeCount[q.questionType] = (currentTypeCount[q.questionType] || 0) + 1;
    });

    let mostNeededType = null;
    let maxGap = -Infinity;

    Object.entries(analysis.questionTypePercentages).forEach(([type, targetPct]) => {
      if (!requirements.allowedQuestionTypes.includes(type)) return;
      
      const currentPct = ((currentTypeCount[type] || 0) / selected.length) * 100 || 0;
      const gap = targetPct - currentPct;
      if (gap > maxGap) {
        maxGap = gap;
        mostNeededType = type;
      }
    });

    if (!mostNeededType) mostNeededType = 'detail';

    // מצא שאלה מהסוג
    const candidates = pool.filter(q => 
      q.questionType === mostNeededType &&
      requirements.allowedQuestionTypes.includes(q.questionType) &&
      !selected.find(s => s.sourceExamId === q.sourceExamId && s.sourceIndex === q.sourceIndex)
    );

    if (candidates.length > 0) {
      // העדף רמת קושי שחסרה
      const currentDiffCount = { easy: 0, medium: 0, hard: 0 };
      selected.forEach(q => currentDiffCount[q.difficulty]++);
      
      let targetDiff = 'medium';
      Object.entries(analysis.difficultyPercentages).forEach(([diff, targetPct]) => {
        const currentPct = (currentDiffCount[diff] / selected.length) * 100 || 0;
        if (targetPct - currentPct > 5) targetDiff = diff;
      });

      const diffMatched = candidates.filter(c => c.difficulty === targetDiff);
      const toAdd = diffMatched.length > 0 
        ? diffMatched[Math.floor(Math.random() * diffMatched.length)]
        : candidates[Math.floor(Math.random() * candidates.length)];
      
      selected.push(toAdd);
    } else {
      // הוסף כל שאלה זמינה
      const remaining = pool.filter(q => 
        requirements.allowedQuestionTypes.includes(q.questionType) &&
        !selected.find(s => s.sourceExamId === q.sourceExamId && s.sourceIndex === q.sourceIndex)
      );
      if (remaining.length > 0) {
        selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
      } else {
        break;
      }
    }
  }

  return selected;
}

/**
 * סידור שאלות לפי Dependency Rule - רצף הבנה
 */
function orderByComprehensionFlow(questions) {
  // מיון לפי סדר הקוגניטיבי
  const sorted = [...questions].sort((a, b) => {
    const orderA = QUESTION_TYPES[a.questionType]?.order || 5;
    const orderB = QUESTION_TYPES[b.questionType]?.order || 5;
    
    // קודם לפי סדר סוג השאלה
    if (orderA !== orderB) return orderA - orderB;
    
    // אחר כך לפי קושי
    const diffOrder = { easy: 1, medium: 2, hard: 3 };
    return (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2);
  });

  // וידוא שאין הפרות תלויות
  const finalOrder = [];
  const covered = new Set(['detail']); // detail תמיד מכוסה
  const remaining = [...sorted];

  let iterations = 0;
  while (remaining.length > 0 && iterations < remaining.length * 2) {
    iterations++;
    
    for (let i = 0; i < remaining.length; i++) {
      const q = remaining[i];
      const deps = QUESTION_TYPES[q.questionType]?.requires || [];
      
      const allDepsCovered = deps.every(dep => covered.has(dep));
      
      if (allDepsCovered || deps.length === 0) {
        finalOrder.push(q);
        covered.add(q.questionType);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  // הוסף נותרים
  finalOrder.push(...remaining);

  return finalOrder.map((q, idx) => ({
    ...q,
    question_number: idx + 1
  }));
}

/**
 * יצירת תוכן חדש - Dynamic Rewrite Rule
 */
async function generateNewContent(sourceExams, orderedQuestions, analysis, requirements, base44) {
  // בחר טקסט מקור כבסיס
  const sourceText = sourceExams[0]?.reading_text || '';
  const sourceTextType = detectTextType(sourceText);
  
  // בחר סוג טקסט שונה אם אפשר (Diversity)
  const otherTextTypes = analysis.textTypes.filter(t => t !== sourceTextType);
  const targetTextType = otherTextTypes.length > 0 
    ? otherTextTypes[Math.floor(Math.random() * otherTextTypes.length)]
    : sourceTextType;

  try {
    // יצירת טקסט חדש
    const textResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert English exam writer for Israeli Bagrut exams.

Create a NEW reading text based on this structure:
- Original text type: ${sourceTextType}
- Target text type: ${targetTextType}
- Unit level: ${requirements.language} English (${requirements.sentenceLength} sentences)
- Academic vocabulary: ${requirements.academicWords}
- Target length: ${requirements.textLength.min}-${requirements.textLength.max} words

Original text structure for reference (DO NOT COPY - CREATE NEW CONTENT):
"${sourceText.substring(0, 1000)}..."

Requirements:
1. Keep the same structural organization (intro → body → conclusion)
2. Change ALL specific details: names, places, numbers, dates
3. Change the topic/context completely (e.g., bees → dolphins, school → hospital)
4. Maintain the same difficulty level and academic style
5. Make it suitable for ${requirements.questionLevel} level questions

Write ONLY the new text, nothing else.`,
      response_json_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The new reading text" },
          title: { type: "string", description: "Title for the text" },
          topic: { type: "string", description: "Main topic of the new text" }
        }
      }
    });

    const newText = textResult.text || sourceText;

    // ניסוח שאלות מחדש
    const rewordedQuestions = [];
    
    for (const q of orderedQuestions) {
      try {
        const qResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert English exam question writer for Israeli Bagrut.

Rewrite this question for the NEW text below:

NEW TEXT:
"${newText}"

ORIGINAL QUESTION:
"${q.question_text}"
Type: ${q.questionType}
Difficulty: ${q.difficulty}
${q.options ? `Options: ${JSON.stringify(q.options)}` : ''}
${q.correct_answer ? `Correct answer: ${q.correct_answer}` : ''}

Requirements:
1. Keep the SAME question type (${q.questionType})
2. Keep the SAME difficulty level (${q.difficulty})
3. Adapt the question to the NEW text content
4. If multiple choice - provide 4 options with one correct answer
5. Use ${requirements.language} English level

Provide the reworded question that tests the same skill on the new text.`,
          response_json_schema: {
            type: "object",
            properties: {
              question_text: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              correct_answer: { type: "string" },
              explanation: { type: "string" }
            }
          }
        });

        rewordedQuestions.push({
          question_number: q.question_number,
          question_text: qResult.question_text || q.question_text,
          question_type: q.options ? 'multiple_choice' : 'short_answer',
          options: qResult.options || q.options,
          correct_answer: qResult.correct_answer || q.correct_answer,
          correct_answers: qResult.correct_answer ? [qResult.correct_answer] : q.correct_answers,
          explanation: qResult.explanation,
          points: q.points || 5,
          difficulty_level: q.difficulty,
          skill_type: q.questionType,
          original_source: {
            exam_id: q.sourceExamId,
            original_question: q.question_text
          },
          is_reworded: true
        });

      } catch (error) {
        console.error('Error rewording question:', error);
        // שמור את השאלה המקורית
        rewordedQuestions.push({
          question_number: q.question_number,
          question_text: q.question_text,
          question_type: q.options ? 'multiple_choice' : 'short_answer',
          options: q.options,
          correct_answer: q.correct_answer,
          correct_answers: q.correct_answers,
          points: q.points || 5,
          difficulty_level: q.difficulty,
          skill_type: q.questionType,
          is_reworded: false
        });
      }
    }

    return { newText, rewordedQuestions };

  } catch (error) {
    console.error('Error generating content:', error);
    return { 
      newText: sourceText, 
      rewordedQuestions: orderedQuestions.map((q, idx) => ({
        ...q,
        question_number: idx + 1,
        is_reworded: false
      }))
    };
  }
}

/**
 * בניית המבחן הסופי
 */
function buildFinalExam({ moduleId, unitLevel, text, questions, analysis, sourceExams, targetScore, user }) {
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 5), 0);
  
  return {
    title: `מבחן אנגלית חכם - מודול ${moduleId} - ${unitLevel} יח"ל`,
    subject: 'אנגלית',
    unit_level: unitLevel,
    module_id: moduleId,
    reading_text: text,
    questions: questions,
    duration_minutes: moduleId === 'A' ? 45 : moduleId === 'C' ? 90 : 60,
    total_points: totalPoints,
    passing_grade: 56,
    is_generated: true,
    is_copyright_free: true,
    instructions: `מבחן זה נוצר אוטומטית על בסיס ${sourceExams.length} שאלוני בגרות.
קרא/י את הטקסט בעיון וענה/י על השאלות.
הזמן המוקצב: ${moduleId === 'A' ? 45 : moduleId === 'C' ? 90 : 60} דקות.`,
    metadata: {
      source_exams: sourceExams.map(e => e.id),
      analysis: analysis,
      target_score: targetScore,
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      rules_applied: [
        'dependency_rule',
        'weight_structure_rule', 
        'diversity_rule',
        'dynamic_rewrite_rule'
      ]
    },
    answer_key: questions.map(q => ({
      question_number: q.question_number,
      correct_answer: q.correct_answer,
      points: q.points
    }))
  };
}