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

    console.log('🔍 Step 3: Loading exam examples (optimized)...');

    // טעינה מקבילה ויעילה יותר - רק מה שצריך
    const [genericExams, moduleExams] = await Promise.all([
      base44.asServiceRole.entities.GenericExam.filter({
        subject,
        unit_level: parseInt(unitLevel),
        module_id: moduleId
      }),
      (async () => {
        if (moduleId === 'A') {
          return base44.asServiceRole.entities.ModuleAExam.filter({ subject });
        } else if (moduleId === 'B') {
          return base44.asServiceRole.entities.ModuleBExam.filter({ subject });
        } else if (moduleId === 'C') {
          return base44.asServiceRole.entities.ModuleCExam.filter({ subject });
        }
        return [];
      })()
    ]);

    // סינון מבחנים נסרקים בלבד (לא generated)
    const scannedExams = genericExams.filter(exam => exam.is_generated !== true);
    const filteredModuleExams = moduleExams.filter(exam => 
      (exam.unit_level || exam.units) === parseInt(unitLevel)
    );

    const structures = [...scannedExams, ...filteredModuleExams];
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
    console.log(`🎯 Selected structure: ${examStructure.structure_name || examStructure.title}`);

    // יצירת מבחן חדש בהתבסס על המבנה
    const questionStructure = examStructure.question_structure || examStructure.questions || [];
    const durationMinutes = examStructure.duration_minutes || examStructure.duration || 90;
    const totalPoints = examStructure.total_points || 100;
    
    const generationPrompt = `צור מבחן ${examStructure.subject} ${examStructure.unit_level}יח' מודול ${examStructure.module_id}.

    מבנה: ${questionStructure.length} שאלות, ${totalPoints} נק', ${durationMinutes} דק'.

    לכל שאלה: טקסט, תשובה נכונה, הסבר קצר, נקודות.
    שמור על אותו מבנה ורמת קושי. תוכן חדש לגמרי.`;

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

    console.log('💾 Step 6: Saving exam...');
    const savedExam = await base44.asServiceRole.entities.GenericExam.create({
      title: generatedExam.title || `${examStructure.subject} - מבחן מחולל`,
      subject: examStructure.subject,
      unit_level: examStructure.unit_level,
      module_id: examStructure.module_id,
      description: generatedExam.description || '',
      duration_minutes: durationMinutes,
      total_points: totalPoints,
      instructions: generatedExam.instructions || 'ענה על כל השאלות',
      questions: generatedExam.questions || [],
      is_generated: true,
      is_copyright_free: true
    });
    console.log('✅ Saved:', savedExam.id);

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