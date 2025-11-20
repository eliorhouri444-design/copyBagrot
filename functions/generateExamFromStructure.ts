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
    const generationPrompt = `
אתה מומחה ליצירת מבחני בגרות. צור מבחן חדש לחלוטין בהתבסס על המבנה הבא:

📋 **מידע כללי:**
- מקצוע: ${examStructure.subject}
- רמה: ${examStructure.unit_level} יחידות
- שאלון: ${examStructure.module_id}
- משך: ${examStructure.duration_minutes} דקות
- נקודות: ${examStructure.total_points}

📝 **מבנה המבחן:**
${JSON.stringify(examStructure.question_structure, null, 2)}

🎯 **דרישות:**

1. **תוכן חדש לגמרי:**
   - אל תעתיק שום שאלה מהמבחן המקורי
   - צור תוכן מקורי ומגוון
   - שמור על רמת קושי זהה
   - שמור על אותו מבנה בדיוק

2. **לכל שאלה:**
   - טקסט השאלה המלא
   - אם צריך דיאגרמה - תאר אותה בפירוט
   - אם יש סעיפים - צור את כולם
   - תשובות נכונות
   - הסבר מפורט
   - רובריקת ניקוד

3. **שמירה על סטנדרטים:**
   - שפה ברורה ומדויקת
   - עברית תקנית
   - מושגים מקצועיים נכונים
   - התאמה לתכנית הלימודים

4. **איכות:**
   - שאלות מאתגרות אך הוגנות
   - מגוון נושאים
   - קשר למציאות (אם רלוונטי)

החזר JSON עם המבחן המלא הכולל את כל השאלות, תשובות ופתרונות.
`;

    console.log('🤖 Step 5: Generating exam with AI...');
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
          instructions: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string" },
                question_type: { type: "string" },
                question_image_url: { type: "string" },
                topic: { type: "string" },
                points: { type: "integer" },
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
                correct_answer: { type: "string" },
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
      instructions: generatedExam.instructions,
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