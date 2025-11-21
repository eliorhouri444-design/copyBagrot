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

    console.log('🔍 Step 3: Loading exam examples...');
    // טעינה ממקורות שונים - ExamStructure, GenericExam, ModuleA/B/C
    const allStructures = await base44.asServiceRole.entities.ExamStructure.list();
    const allGenericExams = await base44.asServiceRole.entities.GenericExam.list();
    const allModuleAExams = await base44.asServiceRole.entities.ModuleAExam.list();
    const allModuleBExams = await base44.asServiceRole.entities.ModuleBExam.list();
    const allModuleCExams = await base44.asServiceRole.entities.ModuleCExam.list();

    console.log(`✅ Loaded ${allStructures.length} ExamStructure + ${allGenericExams.length} GenericExam + ${allModuleAExams.length} ModuleA + ${allModuleBExams.length} ModuleB + ${allModuleCExams.length} ModuleC`);

    console.log('🔍 Step 4: Filtering examples...');
    console.log('Looking for:', { subject, unitLevel: parseInt(unitLevel), moduleId });

    // סינון ExamStructure
    const structuresFromExamStructure = allStructures.filter(s => {
      return s.subject === subject && 
        s.unit_level === parseInt(unitLevel) && 
        s.module_id === moduleId;
    });

    // סינון GenericExam (כולל מבחנים שנסרקו)
    const structuresFromGenericExam = allGenericExams.filter(exam => {
      return exam.subject === subject && 
        exam.unit_level === parseInt(unitLevel) && 
        exam.module_id === moduleId &&
        exam.is_generated !== true; // רק מבחנים נסרקים, לא כאלה שכבר נוצרו
    });

    // סינון ModuleA/B/C (מבחנים מסוג A/B/C)
    let structuresFromModules = [];
    if (moduleId === 'A') {
      structuresFromModules = allModuleAExams.filter(exam => 
        exam.subject === subject && 
        (exam.unit_level || exam.units) === parseInt(unitLevel)
      );
    } else if (moduleId === 'B') {
      structuresFromModules = allModuleBExams.filter(exam => 
        exam.subject === subject && 
        (exam.unit_level || exam.units) === parseInt(unitLevel)
      );
    } else if (moduleId === 'C') {
      structuresFromModules = allModuleCExams.filter(exam => 
        exam.subject === subject && 
        (exam.unit_level || exam.units) === parseInt(unitLevel)
      );
    }

    console.log(`✅ Found ${structuresFromExamStructure.length} from ExamStructure`);
    console.log(`✅ Found ${structuresFromGenericExam.length} from GenericExam`);
    console.log(`✅ Found ${structuresFromModules.length} from Module${moduleId}`);

    // שילוב המקורות
    const structures = [...structuresFromExamStructure, ...structuresFromGenericExam, ...structuresFromModules];
    console.log(`✅ Total: ${structures.length} matching structures`);

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
    
    const isEnglishExam = examStructure.subject === 'אנגלית';

    const generationPrompt = `
    אתה מומחה ליצירת מבחני בגרות. צור מבחן חדש לחלוטין בהתבסס על המבנה הבא:

    📋 **מידע כללי:**
    - מקצוע: ${examStructure.subject}
    - רמה: ${examStructure.unit_level} יחידות
    - שאלון: ${examStructure.module_id}
    - משך: ${durationMinutes} דקות
    - נקודות: ${totalPoints}

    📝 **מבנה המבחן:**
    ${JSON.stringify(questionStructure, null, 2)}

    ${isEnglishExam ? `
    🔴 **חובה! - טקסט קריאה באנגלית:**
    עבור מבחן אנגלית, חייב ליצור טקסט קריאה (reading_text) באנגלית:
    - אורך: 200-300 מילים באנגלית
    - רמה: מתאימה ל-${examStructure.unit_level} יחידות
    - נושא מעניין: תרבות, טכנולוגיה, מדע, חברה
    - סגנון: ברור ומובן
    - הטקסט חייב להיות באנגלית!

    השאלות יתבססו על הטקסט הזה - reading comprehension questions.
    ` : ''}

    🎯 **דרישות:**

    1. **תוכן חדש לגמרי:**
    - אל תעתיק שום שאלה מהמבחן המקורי
    - צור תוכן מקורי ומגוון
    - שמור על רמת קושי זהה
    - שמור על אותו מבנה בדיוק

    2. **לכל שאלה:**
    - טקסט השאלה המלא ${isEnglishExam ? '(באנגלית!)' : ''}
    - אם צריך דיאגרמה - תאר אותה בפירוט
    - אם יש סעיפים - צור את כולם
    - תשובות נכונות
    - הסבר מפורט
    - רובריקת ניקוד

    3. **שמירה על סטנדרטים:**
    - שפה ברורה ומדויקת
    ${isEnglishExam ? '- אנגלית תקנית ברמה גבוהה' : '- עברית תקנית'}
    - מושגים מקצועיים נכונים
    - התאמה לתכנית הלימודים

    4. **איכות:**
    - שאלות מאתגרות אך הוגנות
    - מגוון נושאים
    - קשר למציאות (אם רלוונטי)

    החזר JSON עם המבחן המלא${isEnglishExam ? ' כולל reading_text באנגלית' : ''}.
    `;

    console.log('🤖 Step 5: Generating exam with AI...');
    let generatedExam;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const examSchema = {
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
        };
        
        // הוסף reading_text למבחני אנגלית
        if (isEnglishExam) {
          examSchema.properties.reading_text = { 
            type: "string",
            description: "Reading comprehension text in English (200-300 words)"
          };
        }
        
        generatedExam = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: generationPrompt,
          response_json_schema: examSchema
        });
        
        // ולידציה - בדוק שיש לפחות שאלה אחת
        if (!generatedExam || !generatedExam.questions || generatedExam.questions.length === 0) {
          throw new Error('AI החזיר מבחן ריק');
        }
        
        console.log(`✅ AI generation complete (${generatedExam.questions.length} questions)`);
        break;
        
      } catch (aiError) {
        retryCount++;
        console.error(`❌ AI attempt ${retryCount} failed:`, aiError.message);
        
        if (retryCount >= maxRetries) {
          console.log('⚠️ All AI attempts failed, creating fallback exam...');
          // יצירת מבחן fallback
          generatedExam = {
            title: `${examStructure.subject} - מודול ${examStructure.module_id} - ${examStructure.unit_level} יחידות`,
            subject: examStructure.subject,
            unit_level: examStructure.unit_level,
            module_id: examStructure.module_id,
            description: `מבחן ${examStructure.module_id}`,
            duration_minutes: durationMinutes,
            total_points: totalPoints,
            instructions: 'ענה על כל השאלות. מותר להשתמש במחשבון.',
            questions: questionStructure.slice(0, 10).map((q, idx) => ({
              question_number: idx + 1,
              question_text: `שאלה ${idx + 1} ב${examStructure.subject}`,
              question_type: q.question_type || 'multiple_choice',
              topic: q.topic || examStructure.subject,
              points: q.points || 10,
              correct_answer: 'תשובה 1',
              explanation: 'פתרון לשאלה זו'
            }))
          };
          console.log('✅ Fallback exam created');
        } else {
          console.log(`⏳ Retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // המתן 2 שניות
        }
      }
    }

    console.log('💾 Step 6: Saving exam to database...');
    
    const examData = {
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
    };
    
    // הוסף reading_text אם קיים (חובה לאנגלית)
    if (generatedExam.reading_text) {
      examData.reading_text = generatedExam.reading_text;
      console.log(`✅ Reading text added (${generatedExam.reading_text.length} characters)`);
    } else if (isEnglishExam) {
      console.log('⚠️ Missing reading_text for English exam, generating default...');
      examData.reading_text = `Festivals are a vibrant part of Chinese culture, celebrated in different parts of the country throughout the year. These festivals are not only a spectacle of colorful parades and traditional performances but also carry deep cultural and historical significance. The Spring Festival, also known as Chinese New Year, is the most important celebration. Families gather for reunion dinners, exchange red envelopes with money, and watch spectacular fireworks displays.

Another major festival is the Mid-Autumn Festival, celebrated during the full moon in autumn. People eat mooncakes, appreciate the moon, and spend time with loved ones. The Dragon Boat Festival commemorates the ancient poet Qu Yuan with exciting boat races and traditional zongzi rice dumplings.

These celebrations preserve ancient traditions while bringing communities together in modern times.`;
    }
    
    const savedExam = await base44.asServiceRole.entities.GenericExam.create(examData);
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