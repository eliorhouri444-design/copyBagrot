/**
 * Generate Smart Exam - יצירת מבחן חכם מ-3 בגרויות סרוקות
 * 
 * 4 כללים מחייבים:
 * 1. כלל הרצף הלוגי (Dependency Rule) - סדר הגיוני של נושאים
 * 2. כלל המשקל והיחס (Weight & Proportion Rule) - שמירה על פרופורציות
 * 3. כלל הגיוון (Diversity Rule) - כיסוי כל תת-נושא
 * 4. כלל הניסוח הדינמי (Dynamic Wording Rule) - שינוי נתונים, שמירה על מבנה
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// הגדרת תלויות בין נושאים (Dependency Map)
const TOPIC_DEPENDENCIES = {
  // אנליזה
  'חקירת_פונקציה': ['נגזרות', 'קיצון'],
  'קיצון': ['נגזרות'],
  'נקודות_פיתול': ['נגזרת_שנייה', 'נגזרות'],
  'נגזרת_שנייה': ['נגזרות'],
  'אינטגרלים': ['נגזרות'],
  'שטחים': ['אינטגרלים'],
  'נפחים': ['אינטגרלים', 'שטחים'],
  
  // גיאומטריה
  'גיאומטריה_אנליטית': ['משוואות_ישר'],
  'מעגל': ['משוואות_ישר', 'מרחק'],
  'משולשים_מתקדם': ['משולשים_בסיס'],
  
  // טריגונומטריה
  'משוואות_טריגונומטריות': ['זהויות_טריגונומטריות', 'פונקציות_טריגונומטריות'],
  'זהויות_טריגונומטריות': ['פונקציות_טריגונומטריות'],
  
  // הסתברות
  'בייס': ['הסתברות_מותנית', 'הסתברות_בסיס'],
  'הסתברות_מותנית': ['הסתברות_בסיס'],
  'התפלגות_בינומית': ['הסתברות_בסיס'],
  
  // אלגברה
  'אי_שוויונות_מתקדם': ['אי_שוויונות_בסיס'],
  'סדרות_מתקדם': ['סדרות_בסיס']
};

// קטגוריות ראשיות
const MAIN_CATEGORIES = ['אנליזה', 'גיאומטריה', 'הסתברות', 'טריגונומטריה', 'אלגברה'];

// רמות קושי
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examIds, subject, unitLevel } = await req.json();

    if (!examIds || !Array.isArray(examIds) || examIds.length < 1) {
      return Response.json({ error: 'נדרשים לפחות מבחן אחד ליצירת מבחן חדש' }, { status: 400 });
    }

    // שליפת המבחנים מהמסד
    const sourceExams = [];
    for (const examId of examIds) {
      const exams = await base44.entities.GenericExam.filter({ id: examId });
      if (exams.length > 0) {
        sourceExams.push(exams[0]);
      }
    }

    if (sourceExams.length === 0) {
      return Response.json({ error: 'לא נמצאו מבחנים' }, { status: 404 });
    }

    // ===== שלב 1: ניתוח המבחנים המקוריים =====
    const analysis = analyzeSourceExams(sourceExams);
    
    // ===== שלב 2: יצירת מאגר שאלות =====
    const questionPool = buildQuestionPool(sourceExams);
    
    // ===== שלב 3: בחירת שאלות לפי הכללים =====
    const selectedQuestions = selectQuestions(questionPool, analysis);
    
    // ===== שלב 4: סידור לפי תלויות (Dependency Rule) =====
    const orderedQuestions = orderByDependencies(selectedQuestions);
    
    // ===== שלב 5: יצירת ניסוחים חדשים (Dynamic Wording) =====
    const rewordedQuestions = await rewordQuestions(orderedQuestions, base44);
    
    // ===== שלב 6: בניית המבחן הסופי =====
    const newExam = {
      title: `מבחן מותאם - ${subject || 'מתמטיקה'} ${unitLevel || 5} יח"ל`,
      subject: subject || 'מתמטיקה',
      unit_level: unitLevel || 5,
      description: `מבחן שנוצר מ-${sourceExams.length} בגרויות לפי אלגוריתם חכם`,
      duration_minutes: 180,
      total_points: 100,
      passing_grade: 56,
      questions: rewordedQuestions,
      is_generated: true,
      metadata: {
        source_exams: examIds,
        analysis: analysis,
        generated_at: new Date().toISOString(),
        generated_by: user.email
      }
    };

    // שמירת המבחן
    const savedExam = await base44.entities.GenericExam.create(newExam);

    return Response.json({
      success: true,
      exam: savedExam,
      analysis: analysis,
      message: `נוצר מבחן חדש עם ${rewordedQuestions.length} שאלות`
    });

  } catch (error) {
    console.error('Error generating smart exam:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * ניתוח המבחנים המקוריים - כלל המשקל והיחס
 */
function analyzeSourceExams(exams) {
  const analysis = {
    totalQuestions: 0,
    categoryDistribution: {},
    difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
    subtopics: new Set(),
    pointsDistribution: {}
  };

  // ספירת כל הנושאים והקטגוריות
  exams.forEach(exam => {
    if (!exam.questions) return;
    
    exam.questions.forEach(q => {
      analysis.totalQuestions++;
      
      // קטגוריה ראשית
      const category = q.category || q.topic || 'אחר';
      analysis.categoryDistribution[category] = (analysis.categoryDistribution[category] || 0) + 1;
      
      // רמת קושי
      const difficulty = q.difficulty_level || 'medium';
      analysis.difficultyDistribution[difficulty]++;
      
      // תת-נושאים
      if (q.subtopic) analysis.subtopics.add(q.subtopic);
      if (q.topic) analysis.subtopics.add(q.topic);
      
      // נקודות
      const points = q.points || 10;
      analysis.pointsDistribution[points] = (analysis.pointsDistribution[points] || 0) + 1;
    });
  });

  // חישוב אחוזים
  analysis.categoryPercentages = {};
  Object.entries(analysis.categoryDistribution).forEach(([cat, count]) => {
    analysis.categoryPercentages[cat] = Math.round((count / analysis.totalQuestions) * 100);
  });

  analysis.difficultyPercentages = {};
  Object.entries(analysis.difficultyDistribution).forEach(([diff, count]) => {
    analysis.difficultyPercentages[diff] = Math.round((count / analysis.totalQuestions) * 100);
  });

  analysis.subtopics = Array.from(analysis.subtopics);

  return analysis;
}

/**
 * בניית מאגר שאלות ממוין
 */
function buildQuestionPool(exams) {
  const pool = [];
  
  exams.forEach((exam, examIndex) => {
    if (!exam.questions) return;
    
    exam.questions.forEach((q, qIndex) => {
      pool.push({
        ...q,
        sourceExamId: exam.id,
        sourceExamTitle: exam.title,
        sourceIndex: qIndex,
        category: q.category || q.topic || 'אחר',
        subtopic: q.subtopic || q.topic,
        difficulty: q.difficulty_level || 'medium',
        points: q.points || 10
      });
    });
  });

  return pool;
}

/**
 * בחירת שאלות לפי כלל המשקל והגיוון
 */
function selectQuestions(pool, analysis) {
  const selected = [];
  const targetQuestionCount = Math.min(20, Math.ceil(analysis.totalQuestions / 3)); // כ-20 שאלות
  const usedSubtopics = new Set();
  const usedFromExam = {}; // למנוע כפילויות מאותו מבחן
  
  // שלב 1: וודא כיסוי של כל תת-נושא (Diversity Rule)
  analysis.subtopics.forEach(subtopic => {
    const matching = pool.filter(q => 
      (q.subtopic === subtopic || q.topic === subtopic) && 
      !usedSubtopics.has(q.subtopic)
    );
    
    if (matching.length > 0) {
      // בחר שאלה אקראית מהנושא
      const chosen = matching[Math.floor(Math.random() * matching.length)];
      selected.push(chosen);
      usedSubtopics.add(chosen.subtopic);
      usedFromExam[chosen.sourceExamId] = (usedFromExam[chosen.sourceExamId] || 0) + 1;
    }
  });

  // שלב 2: השלם לפי פרופורציות (Weight Rule)
  while (selected.length < targetQuestionCount) {
    // מצא את הקטגוריה הכי חסרה
    const currentCategoryCount = {};
    selected.forEach(q => {
      currentCategoryCount[q.category] = (currentCategoryCount[q.category] || 0) + 1;
    });

    let mostNeededCategory = null;
    let maxGap = -Infinity;

    Object.entries(analysis.categoryPercentages).forEach(([cat, targetPct]) => {
      const currentPct = ((currentCategoryCount[cat] || 0) / selected.length) * 100 || 0;
      const gap = targetPct - currentPct;
      if (gap > maxGap) {
        maxGap = gap;
        mostNeededCategory = cat;
      }
    });

    // מצא שאלה מהקטגוריה הנדרשת
    const candidates = pool.filter(q => 
      q.category === mostNeededCategory &&
      !selected.find(s => s.sourceExamId === q.sourceExamId && s.sourceIndex === q.sourceIndex)
    );

    if (candidates.length > 0) {
      // העדף רמת קושי שחסרה
      const currentDiffCount = { easy: 0, medium: 0, hard: 0 };
      selected.forEach(q => currentDiffCount[q.difficulty]++);
      
      let targetDifficulty = 'medium';
      Object.entries(analysis.difficultyPercentages).forEach(([diff, targetPct]) => {
        const currentPct = (currentDiffCount[diff] / selected.length) * 100 || 0;
        if (targetPct - currentPct > 5) {
          targetDifficulty = diff;
        }
      });

      const diffMatched = candidates.filter(c => c.difficulty === targetDifficulty);
      const toAdd = diffMatched.length > 0 
        ? diffMatched[Math.floor(Math.random() * diffMatched.length)]
        : candidates[Math.floor(Math.random() * candidates.length)];
      
      selected.push(toAdd);
    } else {
      // אם אין מהקטגוריה, הוסף כל שאלה חסרה
      const remaining = pool.filter(q => 
        !selected.find(s => s.sourceExamId === q.sourceExamId && s.sourceIndex === q.sourceIndex)
      );
      if (remaining.length > 0) {
        selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
      } else {
        break; // אין עוד שאלות
      }
    }
  }

  return selected;
}

/**
 * סידור שאלות לפי תלויות - כלל הרצף הלוגי
 */
function orderByDependencies(questions) {
  const ordered = [];
  const remaining = [...questions];
  const coveredTopics = new Set(['בסיס']); // נושאי בסיס תמיד מכוסים

  // מיון טופולוגי פשוט
  let iterations = 0;
  const maxIterations = remaining.length * 2;

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;
    
    for (let i = 0; i < remaining.length; i++) {
      const q = remaining[i];
      const topic = q.subtopic || q.topic || 'general';
      const dependencies = TOPIC_DEPENDENCIES[topic] || [];
      
      // בדוק אם כל התלויות מכוסות
      const allDepsCovered = dependencies.every(dep => 
        coveredTopics.has(dep) || 
        dep.includes('בסיס') ||
        !TOPIC_DEPENDENCIES[dep] // נושא בסיסי בלי תלויות
      );

      if (allDepsCovered || dependencies.length === 0) {
        ordered.push(q);
        coveredTopics.add(topic);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  // הוסף את הנותרים בסוף (אם יש)
  ordered.push(...remaining);

  // מספור מחדש
  return ordered.map((q, idx) => ({
    ...q,
    question_number: idx + 1
  }));
}

/**
 * יצירת ניסוחים חדשים - כלל הניסוח הדינמי
 */
async function rewordQuestions(questions, base44) {
  const reworded = [];

  for (const q of questions) {
    try {
      // שימוש ב-LLM לניסוח מחדש
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה ליצירת שאלות מתמטיקה לבגרות.
        
קיבלת שאלה מקורית:
"${q.question_text}"

${q.correct_answer ? `תשובה נכונה: ${q.correct_answer}` : ''}
${q.solution_steps ? `שלבי פתרון: ${JSON.stringify(q.solution_steps)}` : ''}

משימתך: צור שאלה חדשה עם אותו מבנה מתמטי בדיוק, אבל עם:
- מספרים שונים
- שמות/משתנים שונים
- הקשר מילולי שונה (אם רלוונטי)

חשוב מאוד:
- המבנה המתמטי חייב להישאר זהה
- רמת הקושי זהה
- סוג הפתרון זהה
- אם יש גרף/ציור - תאר אותו

החזר JSON בפורמט הבא:`,
        response_json_schema: {
          type: "object",
          properties: {
            question_text: { type: "string", description: "הניסוח החדש של השאלה" },
            correct_answer: { type: "string", description: "התשובה הנכונה החדשה" },
            solution_steps: { 
              type: "array", 
              items: { type: "string" },
              description: "שלבי הפתרון החדשים"
            },
            changed_values: {
              type: "object",
              description: "הערכים שהשתנו",
              properties: {
                original: { type: "string" },
                new: { type: "string" }
              }
            }
          }
        }
      });

      reworded.push({
        question_number: q.question_number,
        question_text: result.question_text || q.question_text,
        question_type: q.question_type || 'open_question',
        correct_answer: result.correct_answer || q.correct_answer,
        solution_steps: result.solution_steps || q.solution_steps,
        explanation: q.explanation,
        points: q.points || 10,
        topic: q.topic,
        category: q.category,
        subtopic: q.subtopic,
        difficulty_level: q.difficulty,
        original_source: {
          exam_id: q.sourceExamId,
          exam_title: q.sourceExamTitle,
          original_question: q.question_text
        },
        is_reworded: true
      });

    } catch (error) {
      console.error('Error rewording question:', error);
      // במקרה של שגיאה, השתמש בשאלה המקורית
      reworded.push({
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type || 'open_question',
        correct_answer: q.correct_answer,
        solution_steps: q.solution_steps,
        explanation: q.explanation,
        points: q.points || 10,
        topic: q.topic,
        category: q.category,
        subtopic: q.subtopic,
        difficulty_level: q.difficulty,
        original_source: {
          exam_id: q.sourceExamId,
          exam_title: q.sourceExamTitle
        },
        is_reworded: false
      });
    }
  }

  return reworded;
}