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
    const { subject, unitLevel, moduleId, includeDiagrams, generate_solutions, count = 1 } = await req.json();
    console.log('✅ Request parsed:', { subject, unitLevel, moduleId, count });

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

    const questionStructure = examStructure.question_structure || examStructure.questions || [];
    const durationMinutes = examStructure.duration_minutes || examStructure.duration || 90;
    const totalPoints = examStructure.total_points || 100;
    const isEnglishExam = examStructure.subject === 'אנגלית';

    const createdExams = [];

    // יצירת מבחנים בלולאה
    for (let i = 0; i < count; i++) {
      console.log(`\n🔄 Creating exam ${i + 1}/${count}...`);
      
    // קביעת דרישות מיוחדות לפי רמה ושאלון
    let specificRequirements = '';
    if (isEnglishExam) {
      if (examStructure.unit_level === 3) {
        // Check if this is Module B
        if (examStructure.module_id === 'B') {
          specificRequirements = `
    🎯 **דרישות מיוחדות לאנגלית 3 יחידות - שאלון B:**
    
    ⚠️ **סה"כ ניקוד: 60-70 נקודות בלבד! חלק את הנקודות בהתאם.**
    
    **SECTION A - Reading Comprehension (25-30 נקודות):**
    - טקסט קצר באנגלית (150-200 מילים)
    - 4-5 שאלות על הטקסט
    - **חובה: לפחות שאלה אחת Multiple Choice עם 4 אפשרויות (A, B, C, D)**
    - שאלות נוספות: True/False, Wh-questions, Complete the sentence
    
    **SECTION B - Vocabulary (15-20 נקודות):**
    - 5-6 שאלות אוצר מילים בסיסי
    - השלמת משפטים עם מילים מתוך רשימה
    - בחירת מילה נכונה
    
    **SECTION C - Grammar (10-15 נקודות):**
    - Present Simple, Present Progressive, Past Simple, Future
    - 4-5 שאלות מילוי / תיקון / בחירה
    
    **SECTION D - Writing (10-15 נקודות):**
    - משימת כתיבה אחת
    - **חובה לכתוב בהוראות: "Write 60-80 words"**
    - נושא פשוט: מכתב לחבר, תיאור יום, תחביב וכו'
    
    📝 **דוגמה לשאלת Multiple Choice:**
    "According to the text, what does John like to do on weekends?
    A) Watch TV
    B) Play soccer
    C) Read books
    D) Visit friends"
    
    📝 **דוגמה להוראת כתיבה:**
    "Write a short paragraph about your favorite hobby. Write 60-80 words."
    
    חובה ליצור reading_text באנגלית (150-200 מילים).
    חובה שסה"כ הניקוד יהיה בין 60-70 נקודות!`;
        } else {
          specificRequirements = `
    🎯 **דרישות מיוחדות לאנגלית 3 יחידות:**
    
    **Vocabulary (5-10 שאלות):**
    - מילים בסיסיות מרשימת 3 יח"ל
    - השלמת משפטים, בחירת מילה נכונה
    
    **Basic Grammar:**
    - Present Simple, Present Progressive, Past Simple, Future
    - שאלות מילוי / תיקון משפטים
    
    **Reading Comprehension (טקסט קצר 150-200 מילים באנגלית):**
    - 4-6 שאלות: True/False, Wh-questions, Multiple Choice
    
    **Sentence Completion:**
    - 5 משפטים להשלמה
    
    חובה ליצור טקסט קריאה קצר באנגלית (reading_text) של 150-200 מילים.`;
        }
      } else if (examStructure.unit_level === 4) {
        if (examStructure.module_id === 'C') {
          specificRequirements = `
    🎯 **דרישות מיוחדות לאנגלית 4 יחידות - שאלון C:**
    
    **Vocabulary (6-10 שאלות):**
    - מילים ברמה בינונית
    - השלמת משפט, Word Forms (שינוי מילה)
    
    **Grammar (חובה!):**
    - Passive Voice
    - Conditionals (Types 0-2)
    - Relative Clauses
    - Modals
    - Reported Speech
    - Quantifiers
    - Gerunds & Infinitives
    - Present Perfect + Continuous
    
    צורה: בחירה, השלמה, תיקון, שכתוב משפט
    
    **Reading Comprehension (טקסט 250-350 מילים באנגלית):**
    - Vocabulary in context
    - True/False + Justify
    - Wh-Questions
    - Inference
    - Main Idea
    - Layout/Structure
    
    חובה ליצור טקסט קריאה באנגלית (reading_text) של 250-350 מילים.`;
        } else if (examStructure.module_id === 'E') {
          specificRequirements = `
    🎯 **דרישות מיוחדות לאנגלית 4 יחידות - שאלון E:**
    
    **Writing Task (80-120 מילים):**
    - סוגים: Opinion Essay, Formal Letter, Informal Letter, Description, Advantages/Disadvantages
    - קריטריונים: תוכן, ארגון, שפה
    
    **Reading Comprehension (טקסט ארוך 350-450 מילים באנגלית):**
    - Inference
    - Comparing information
    - Cause & Effect
    - Summarizing
    - True/False + Justify
    - Vocabulary in context מורכב
    - Choosing a title
    
    חובה ליצור טקסט קריאה ארוך באנגלית (reading_text) של 350-450 מילים.`;
        }
      } else if (examStructure.unit_level === 5) {
        if (examStructure.module_id === 'G') {
          specificRequirements = `
    🎯 **דרישות מיוחדות לאנגלית 5 יחידות - שאלון G:**
    
    **Reading Comprehension (טקסט 450-700 מילים באנגלית):**
    - פרק או שני פרקים
    - שאלות ברמה גבוהה:
      * Inference מתקדם
      * Connecting ideas
      * Purpose of paragraph
      * Vocabulary in context advanced
      * Identifying tone
      * Writer's opinion
      * Cause/Effect steps
    
    **Restatement (4-6 משפטים):**
    - שכתוב משפטים תוך שימוש במילה נתונה
    - שמירה על משמעות זהה
    
    **Reading Task נוסף / Integrated Task:**
    - פרק נוסף + שאלות
    - סיכום, Matching headings, Completing chart/table
    
    חובה ליצור טקסט קריאה מתקדם באנגלית (reading_text) של 450-700 מילים.`;
        } else if (examStructure.module_id === 'F') {
          specificRequirements = `
    🎯 **דרישות מיוחדות לאנגלית 5 יחידות - שאלון F (ספרות):**
    
    בחר יצירה ספרותית (סיפור/שיר/מחזה) ויצור שאלות עליה.
    
    **5 שאלות הבנה בסיסית:**
    - פרטי עלילה
    - תיאור דמות
    - מוטיב מרכזי
    - סיבה ותוצאה
    - הקונפליקט
    
    **2-3 שאלות HOTS:**
    - Compare & contrast
    - Inferring motives
    - Explaining cause and effect
    - Problem-solution
    - Identifying patterns
    - Uncovering motives
    
    **שאלה פתוחה ארוכה (80-120 מילים):**
    - How does the story show responsibility?
    - What choice made the biggest impact on the plot?
    - How does one event change the character?
    
    אין צורך ב-reading_text נפרד - השאלות מתייחסות ליצירה הספרותית.`;
        }
      }
    }

    // חישוב מספר השאלות הנדרש מהמבנה
    const requiredQuestionCount = questionStructure.length || 9;
    
    // בניית תיאור מפורט של כל שאלה מהמקור
    const detailedQuestionStructure = questionStructure.map((q, idx) => ({
      question_number: idx + 1,
      topic: q.topic || q.question_type || 'כללי',
      question_type: q.question_type || 'open_question',
      points: q.points || Math.floor(totalPoints / requiredQuestionCount),
      difficulty_level: q.difficulty_level || 'medium',
      cognitive_level: q.cognitive_level || 'application',
      parts_count: q.parts?.length || 0,
      original_text_preview: q.question_text ? q.question_text.substring(0, 100) + '...' : null
    }));
    
    const generationPrompt = `
    אתה מומחה בכיר ליצירת מבחני בגרות ישראליים עם ניסיון של 20+ שנים במשרד החינוך.
    
    משימתך: ליצור מבחן **מקביל** (מועד ב') - זהה במבנה ובקושי, אך שונה לחלוטין בתוכן.

    ⚠️ **חובה ליצור בדיוק ${requiredQuestionCount} שאלות! לא פחות ולא יותר!**

    📋 **מידע כללי:**
    - מקצוע: ${examStructure.subject}
    - רמה: ${examStructure.unit_level} יחידות
    - שאלון: ${examStructure.module_id}
    - משך: ${durationMinutes} דקות
    - נקודות: ${totalPoints}

    📝 **מבנה מפורט של ${requiredQuestionCount} השאלות:**
    ${JSON.stringify(detailedQuestionStructure, null, 2)}
    
    ${specificRequirements}

    🎯 **עקרונות ליצירת מבחן מקביל איכותי:**

    ## 1. שמירה על רמת קושי זהה
    לכל שאלה במקור, השאלה המקבילה חייבת:
    - **אותו מספר צעדים בפתרון** (אם המקור דורש 4 צעדים, גם החדשה)
    - **אותה רמה קוגניטיבית** (ידע/הבנה/יישום/ניתוח/סינתזה)
    - **אותו סוג חישוב/חשיבה** (אם המקור דורש גזירה, גם החדשה)
    - **אותו מספר סעיפים** אם יש סעיפים (א, ב, ג...)

    ## 2. שיטת התאום (Twin Method)
    
    **למתמטיקה/פיזיקה/כימיה:**
    - שמור על אותו סוג בעיה ומבנה
    - שנה מספרים כך שהתשובה תהיה "נקייה" (מספר שלם או שבר פשוט)
    - דוגמה: אם המקור f(x)=x³-3x, החדשה g(x)=2x³-24x (שתיהן עם נקודות קיצון בשלמים)
    - **חובה:** פתור כל שאלה לפני שתכתוב אותה!

    **לגיאומטריה:**
    - תאר את הצורה במילים באופן מלא ומדויק
    - ציין כל מידה, זווית, ויחס
    - דוגמה: "במשולש ABC, AB=AC=10 ס"מ, BC=12 ס"מ. נקודה D על BC כך ש-AD⊥BC. מצא את אורך AD."

    **להיסטוריה/אזרחות:**
    - אותה תקופה/נושא, זווית שונה
    - אם המקור שואל על "סיבות", שאל על "תוצאות" או "השפעות"
    - שמור על אותה עומק ניתוח

    **לספרות/תנ"ך:**
    - אותו טקסט מהסילבוס, היבט שונה
    - אם המקור שואל על "מוטיב", שאל על "דמות" או "סמל"

    **לאנגלית:**
    - צור טקסט חדש לגמרי באותו ז'אנר ואורך
    - אותם סוגי שאלות (MC, Open, T/F)
    - אותה רמת אוצר מילים

    ## 3. פתרונות מדויקים שלב-אחר-שלב
    לכל שאלה חובה לספק:
    - **solution_steps**: מערך של צעדים מפורטים
    - **correct_answer**: התשובה הסופית המדויקת
    - **explanation**: הסבר מלא למה זו התשובה

    **חובה לוודא:**
    - כל חישוב נכון מתמטית
    - כל צעד הגיוני ומנומק
    - התשובה הסופית נכונה ומדויקת

    ## 4. מקוריות מלאה (ללא זכויות יוצרים)
    - אין להעתיק אף מילה מהמקור
    - כל התוכן חייב להיות מקורי שלך
    - שמור על אותו סגנון ורמה, לא את אותו תוכן

    🚨 **בדיקה עצמית לפני הגשה:**
    1. ספרתי ${requiredQuestionCount} שאלות? ✓
    2. כל שאלה באותה רמת קושי כמו המקור? ✓
    3. פתרתי כל שאלה ווידאתי תשובה נכונה? ✓
    4. הניקוד מסתכם ל-${totalPoints}? ✓
    5. אין העתקה מהמקור? ✓

    החזר JSON עם המבחן המלא${isEnglishExam ? ' כולל reading_text באנגלית (300-500 מילים)' : ''}.
    ${i > 0 ? `\n⚠️ זה מבחן ${i + 1} מתוך ${count} - ודא שהתוכן שונה לגמרי ממבחנים קודמים!` : ''}
    `;

    console.log(`🤖 Step 5 (${i + 1}/${count}): Generating exam with AI...`);
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
        
        // ולידציה - בדוק שיש מספיק שאלות
        if (!generatedExam || !generatedExam.questions || generatedExam.questions.length === 0) {
          throw new Error('AI החזיר מבחן ריק');
        }
        
        // בדיקה שמספר השאלות תואם
        if (generatedExam.questions.length < requiredQuestionCount * 0.7) {
          console.warn(`⚠️ AI created only ${generatedExam.questions.length} questions, expected ${requiredQuestionCount}. Retrying...`);
          throw new Error(`מספר שאלות לא מספיק: ${generatedExam.questions.length} במקום ${requiredQuestionCount}`);
        }
        
        console.log(`✅ AI generation complete (${generatedExam.questions.length}/${requiredQuestionCount} questions)`);
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

    console.log(`💾 Step 6 (${i + 1}/${count}): Saving exam to database...`);
    
    const examData = {
      title: generatedExam.title || `${examStructure.subject} - מבחן מחולל ${i + 1}`,
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
    console.log(`✅ Exam ${i + 1} saved with ID:`, savedExam.id);
    createdExams.push(savedExam);

    console.log(`📝 Step 7 (${i + 1}/${count}): Saving solutions...`);
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

    console.log(`✅ Exam ${i + 1}/${count} complete!`);
    }

    console.log(`🎉 All ${count} exams generated successfully!`);

    return Response.json({
      success: true,
      exams_created: createdExams.length,
      exam_ids: createdExams.map(e => e.id),
      message: `${createdExams.length} מבחנים נוצרו בהצלחה`
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