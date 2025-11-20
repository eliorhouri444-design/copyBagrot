import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🎯 Perfect Exam Generator
 * Generates exams in the EXACT original language with NO translation
 */

Deno.serve(async (req) => {
  console.log('🎯 Starting Perfect Exam Generator');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, unitLevel, moduleId } = await req.json();

    console.log(`📋 Generating: ${subject} ${unitLevel}units Module ${moduleId}`);

    // Find existing structures
    const structures = await base44.asServiceRole.entities.ExamStructure.filter({
      subject: subject,
      unit_level: parseInt(unitLevel),
      module_id: moduleId,
      is_active: true
    });

    if (structures.length === 0) {
      return Response.json({ 
        error: `No exam structures found for ${subject} ${unitLevel}units Module ${moduleId}. Please scan exams first.`
      }, { status: 404 });
    }

    // Pick random structure
    const structure = structures[Math.floor(Math.random() * structures.length)];
    console.log(`📊 Using structure: ${structure.structure_name}`);

    // Build language-specific generation prompt
    const isEnglish = subject === 'אנגלית';
    
    let generationPrompt = '';
    
    if (isEnglish) {
      generationPrompt = `You are an expert at creating Israeli high school English matriculation exams.

**CRITICAL LANGUAGE RULE: THIS IS AN ENGLISH EXAM - EVERYTHING MUST BE IN ENGLISH**

**Exam Structure to Follow:**
- Subject: ${structure.subject}
- Level: ${structure.unit_level} units  
- Module: ${structure.module_id}
- Duration: ${structure.duration_minutes} minutes
- Total Points: ${structure.total_points}

**Question Structure (follow EXACTLY):**
${JSON.stringify(structure.question_structure, null, 2)}

**Requirements:**

1. **LANGUAGE - ABSOLUTELY CRITICAL:**
   - Write ALL questions in English
   - Write ALL answer options in English  
   - Write ALL reading passages in English
   - Write ALL instructions in English
   - NO Hebrew anywhere in questions/answers
   - This is an authentic English bagrut exam

2. **Content Quality:**
   - Create authentic English reading passages (200-400 words)
   - Use proper English grammar and vocabulary
   - Topics: technology, science, society, environment, culture
   - Appropriate for ${structure.unit_level} units level

3. **Question Types:**
   - Multiple choice: 4 options (A, B, C, D) in English
   - Short answer: clear instructions in English
   - Open questions: detailed prompts in English
   - Writing tasks: clear topic and instructions in English

4. **For each question provide:**
   - question_number
   - question_text (in English)
   - question_type
   - options (in English for multiple choice)
   - correct_answer (in English)
   - explanation (can be in Hebrew for teacher reference)
   - points

**Example Question Format:**
{
  "question_number": 1,
  "question_text": "What is the main idea of paragraph II?",
  "question_type": "multiple_choice",
  "options": ["Robots are becoming more advanced", "Space exploration is dangerous", "Technology helps humanity", "The future is uncertain"],
  "correct_answer": "Robots are becoming more advanced",
  "explanation": "הפסקה השנייה מדברת על התקדמות הרובוטיקה",
  "points": 6
}

Return complete exam in JSON format.`;
    } else {
      // For Hebrew subjects
      generationPrompt = `אתה מומחה ליצירת מבחני בגרות ב${subject}.

**מבנה המבחן:**
- מקצוע: ${structure.subject}
- יחידות: ${structure.unit_level}
- שאלון: ${structure.module_id}
- זמן: ${structure.duration_minutes} דקות
- נקודות: ${structure.total_points}

**מבנה שאלות (עקוב בדיוק):**
${JSON.stringify(structure.question_structure, null, 2)}

**דרישות:**

1. **תוכן איכותי:**
   - צור שאלות מקוריות ומאתגרות
   - שמור על רמת קושי מתאימה
   - מגוון נושאים
   - התאם לתכנית הלימודים

2. **לכל שאלה:**
   - מספר שאלה
   - טקסט השאלה המלא
   - סוג שאלה
   - תשובה נכונה
   - הסבר
   - נקודות

3. **למתמטיקה/מדעים:**
   - אם יש צורך באיור - תאר בפירוט קיצוני
   - כלול נתונים מספריים
   - שלבי פתרון ברורים

החזר JSON מלא.`;
    }

    console.log('🤖 Generating exam with AI...');
    
    const generatedExam = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: generationPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          reading_text: { type: "string" },
          instructions: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string" },
                question_type: { type: "string" },
                topic: { type: "string" },
                points: { type: "integer" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                solution_steps: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });

    console.log('✅ Exam generated');

    // Save to database
    console.log('💾 Saving exam...');

    const savedExam = await base44.asServiceRole.entities.GenericExam.create({
      title: generatedExam.title,
      subject: structure.subject,
      unit_level: structure.unit_level,
      module_id: structure.module_id,
      description: generatedExam.description,
      duration_minutes: structure.duration_minutes,
      total_points: structure.total_points,
      passing_grade: 56,
      reading_text: generatedExam.reading_text || '',
      instructions: generatedExam.instructions || '',
      questions: generatedExam.questions,
      is_generated: true,
      is_copyright_free: true
    });

    // Save solutions
    for (const question of generatedExam.questions) {
      try {
        await base44.asServiceRole.entities.SolutionBank.create({
          question_id: `generated_${savedExam.id}_q${question.question_number}`,
          solution_text: question.explanation || '',
          solution_steps: question.solution_steps?.map((step, idx) => ({
            step: idx + 1,
            description: step
          })) || [],
          final_answers: [{
            part_id: "main",
            value: question.correct_answer
          }],
          verified: false
        });
      } catch (error) {
        console.error(`Error saving solution for Q${question.question_number}:`, error);
      }
    }

    console.log('✅ Exam and solutions saved');

    // Update structure counter
    await base44.asServiceRole.entities.ExamStructure.update(structure.id, {
      generated_exams_count: (structure.generated_exams_count || 0) + 1
    });

    return Response.json({
      success: true,
      exam_id: savedExam.id,
      message: `✅ מבחן חדש נוצר בהצלחה`,
      exam: {
        id: savedExam.id,
        title: savedExam.title,
        questions: generatedExam.questions.length
      }
    });

  } catch (error) {
    console.error('❌ Generation Error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});