import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🔐 Step 1: Authenticating user...');
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      console.error('❌ Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ User authenticated:', user.email);

    console.log('📥 Step 2: Parsing request...');
    const { subject, unitLevel, moduleId, includeDiagrams, generate_solutions } = await req.json();
    console.log('✅ Request parsed:', { subject, unitLevel, moduleId });

    console.log('🔍 Step 3: Loading exam structures...');
    const allStructures = await base44.asServiceRole.entities.ExamStructure.list();
    console.log(`✅ Loaded ${allStructures.length} total structures`);

    console.log('🔍 Step 4: Filtering structures...');
    console.log('Looking for:', { subject, unitLevel: parseInt(unitLevel), moduleId });
    
    // Debug: Show sample structures
    if (allStructures.length > 0) {
      console.log('Sample structure:', {
        subject: allStructures[0].subject,
        unit_level: allStructures[0].unit_level,
        module_id: allStructures[0].module_id
      });
    }
    
    const structures = allStructures.filter(s => {
      const matches = s.subject === subject && 
        s.unit_level === parseInt(unitLevel) && 
        s.module_id === moduleId;
      
      if (!matches) {
        console.log('Structure mismatch:', {
          expected: { subject, unitLevel: parseInt(unitLevel), moduleId },
          actual: { subject: s.subject, unit_level: s.unit_level, module_id: s.module_id },
          subject_match: s.subject === subject,
          unit_match: s.unit_level === parseInt(unitLevel),
          module_match: s.module_id === moduleId
        });
      }
      
      return matches;
    });
    console.log(`✅ Found ${structures.length} matching structures`);

    if (structures.length === 0) {
      console.error('❌ No matching structures found');
      return Response.json({ 
        error: `לא נמצאו מבנים עבור ${subject} ${unitLevel}יח' מודול ${moduleId}`,
        help: 'נא לסרוק לפחות 3 מבחנים באמצעות "סריקת מבחנים"'
      }, { status: 404 });
    }

    const randomIndex = Math.floor(Math.random() * structures.length);
    const examStructure = structures[randomIndex];
    console.log(`🎯 Selected structure: ${examStructure.structure_name}`);

    // יצירת מבחן חדש בהתבסס על המבנה
    const isEnglishExam = examStructure.subject === 'אנגלית';
    
    // 📚 Extract example questions from scanned exams (if available)
    let exampleQuestions = '';
    if (examStructure.metadata?.full_questions && examStructure.metadata.full_questions.length > 0) {
      exampleQuestions = `\n**EXAMPLE QUESTIONS FROM ORIGINAL EXAMS (for reference - create SIMILAR but NEW questions):**\n${JSON.stringify(examStructure.metadata.full_questions.slice(0, 3), null, 2)}`;
    }
    
    const generationPrompt = isEnglishExam ? `
You are an expert at creating Israeli high school English bagrut (matriculation) exams.

**🚨 CRITICAL LANGUAGE RULE - NO EXCEPTIONS:**
THIS IS AN ENGLISH EXAM - EVERY SINGLE WORD IN QUESTIONS AND ANSWERS MUST BE IN ENGLISH.
DO NOT WRITE ANYTHING IN HEBREW EXCEPT IN THE explanation FIELD.

📋 **Exam Specifications:**
- Subject: English (${examStructure.subject})
- Level: ${examStructure.unit_level} units
- Module: ${examStructure.module_id}
- Duration: ${examStructure.duration_minutes} minutes
- Total Points: ${examStructure.total_points}

📝 **Question Structure to Follow:**
${JSON.stringify(examStructure.question_structure, null, 2)}
${exampleQuestions}

🎯 **MANDATORY REQUIREMENTS:**

1. **LANGUAGE (ABSOLUTELY CRITICAL):**
   ✅ question_text: ENGLISH ONLY
   ✅ options: ENGLISH ONLY (["Option A", "Option B", "Option C", "Option D"])
   ✅ correct_answer: ENGLISH ONLY
   ✅ reading_text: ENGLISH ONLY (if reading comprehension)
   ✅ instructions: ENGLISH ONLY
   ❌ NO HEBREW in any of the above fields
   
   The ONLY Hebrew allowed is in "explanation" field for teacher reference.

2. **Content:**
   - Create a NEW authentic English reading passage (250-400 words)
   - Topics: technology, environment, science, society, culture, education
   - Advanced vocabulary for ${examStructure.unit_level} units level
   - Natural, fluent English writing

3. **Question Types:**
   - Reading Comprehension: questions about the passage
   - Multiple Choice: 4 clear options in English
   - Short Answer: clear prompts in English
   - Writing Task: clear topic/instructions in English

4. **Example Question (CORRECT FORMAT):**
{
  "question_number": 1,
  "question_text": "What is the main idea of paragraph II?",
  "question_type": "multiple_choice",
  "options": ["Technology is advancing rapidly", "Space exploration is becoming safer", "Robots are replacing humans", "The future of AI is uncertain"],
  "correct_answer": "Technology is advancing rapidly",
  "explanation": "הפסקה השנייה דנה בהתקדמות הטכנולוגית",
  "points": 6,
  "topic": "Reading Comprehension"
}

5. **WRONG Example (DO NOT DO THIS):**
{
  "question_text": "מה הרעיון המרכזי של הפסקה?",  ❌ WRONG - THIS IS HEBREW
  "options": ["טכנולוגיה", "חלל"],  ❌ WRONG - THIS IS HEBREW
}

**FINAL CHECK BEFORE RETURNING:**
- Are ALL question_text fields in English? ✓
- Are ALL options in English? ✓
- Is reading_text in English? ✓
- Are instructions in English? ✓

Return complete JSON with exam in ENGLISH.
` : `
אתה מומחה ליצירת מבחני בגרות ב${examStructure.subject}.

📋 **פרטי המבחן:**
- מקצוע: ${examStructure.subject}
- רמה: ${examStructure.unit_level} יחידות
- שאלון: ${examStructure.module_id}
- משך: ${examStructure.duration_minutes} דקות
- נקודות: ${examStructure.total_points}

📝 **מבנה השאלות:**
${JSON.stringify(examStructure.question_structure, null, 2)}

🎯 **דרישות:**

1. **תוכן מקורי:**
   - צור מבחן חדש לגמרי (לא להעתיק)
   - שמור על מבנה זהה
   - רמת קושי דומה

2. **לכל שאלה:**
   - טקסט מלא
   - תשובה נכונה
   - הסבר מפורט
   - נקודות

3. **איכות:**
   - שאלות מאתגרות
   - התאמה לתכנית לימודים
   - מגוון נושאים

החזר JSON מלא.
`;

    console.log('🤖 Step 5: Generating exam with AI...');
    console.log(`🌍 Language mode: ${isEnglishExam ? 'ENGLISH ONLY' : 'Hebrew'}`);
    const generatedExam = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: generationPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          subject: { type: "string" },
          unit_level: { type: "integer" },
          module_id: { type: "string" },
          description: { type: "string" },
          duration_minutes: { type: "integer" },
          total_points: { type: "integer" },
          reading_text: { type: "string", description: "Full reading passage in original language" },
          instructions: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string", description: "Question in ORIGINAL language - English for English exams" },
                question_type: { type: "string" },
                question_image_url: { type: "string" },
                topic: { type: "string" },
                points: { type: "integer" },
                options: { type: "array", items: { type: "string" }, description: "All options in ORIGINAL language" },
                parts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      part_id: { type: "string" },
                      text: { type: "string" },
                      points: { type: "integer" }
                    }
                  }
                },
                correct_answer: { type: "string", description: "Correct answer in ORIGINAL language" },
                explanation: { type: "string" },
                solution_steps: { type: "array", items: { type: "string" } },
                rubric: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      criteria: { type: "string" },
                      points: { type: "integer" },
                      description: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    console.log('✅ AI generation complete');

    console.log('💾 Step 6: Saving exam to database...');
    const savedExam = await base44.asServiceRole.entities.GenericExam.create({
      title: generatedExam.title,
      subject: examStructure.subject,
      unit_level: examStructure.unit_level,
      module_id: examStructure.module_id,
      description: generatedExam.description,
      duration_minutes: examStructure.duration_minutes,
      total_points: examStructure.total_points,
      reading_text: generatedExam.reading_text || '',
      instructions: generatedExam.instructions || '',
      questions: generatedExam.questions,
      is_generated: true,
      is_copyright_free: true
    });
    console.log('✅ Exam saved with ID:', savedExam.id);

    console.log('📝 Step 7: Saving solutions...');
    // שמירת פתרונות אם נדרש
    if (generate_solutions) {
      for (const question of generatedExam.questions) {
        await base44.asServiceRole.entities.SolutionBank.create({
          question_id: `generated_${savedExam.id}_q${question.question_number}`,
          solution_text: question.explanation,
          solution_steps: question.solution_steps?.map((step, idx) => ({
            step: idx + 1,
            description: step
          })) || [],
          final_answers: [{
            part_id: "main",
            value: question.correct_answer
          }],
          rubric: question.rubric || [],
          verified: false
        });
      }
    }

    console.log('✅ Solutions saved');
    console.log('🎉 Generation complete!');

    return Response.json({
      success: true,
      exam_id: savedExam.id,
      exam: generatedExam,
      message: 'מבחן חדש נוצר בהצלחה'
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      details: 'בדוק את הלוגים של הפונקציה לפרטים נוספים'
    }, { status: 500 });
  }
});