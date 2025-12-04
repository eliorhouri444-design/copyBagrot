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
    const allStructures = await base44.asServiceRole.entities.ExamStructure.list();
    const allGenericExams = await base44.asServiceRole.entities.GenericExam.list();
    const allModuleAExams = await base44.asServiceRole.entities.ModuleAExam.list();
    const allModuleBExams = await base44.asServiceRole.entities.ModuleBExam.list();
    const allModuleCExams = await base44.asServiceRole.entities.ModuleCExam.list();

    console.log(`✅ Loaded ${allStructures.length} ExamStructure + ${allGenericExams.length} GenericExam + ${allModuleAExams.length} ModuleA + ${allModuleBExams.length} ModuleB + ${allModuleCExams.length} ModuleC`);

    console.log('🔍 Step 4: Filtering examples...');

    // סינון ExamStructure
    const structuresFromExamStructure = allStructures.filter(s => {
      return s.subject === subject && 
        s.unit_level === parseInt(unitLevel) && 
        s.module_id === moduleId;
    });

    // סינון GenericExam (רק מבחנים נסרקים, לא כאלה שכבר נוצרו)
    const structuresFromGenericExam = allGenericExams.filter(exam => {
      return exam.subject === subject && 
        exam.unit_level === parseInt(unitLevel) && 
        exam.module_id === moduleId &&
        exam.is_generated !== true;
    });

    // סינון ModuleA/B/C
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

    console.log(`✅ Found ${structuresFromExamStructure.length} from ExamStructure, ${structuresFromGenericExam.length} from GenericExam, ${structuresFromModules.length} from Module${moduleId}`);

    const structures = [...structuresFromExamStructure, ...structuresFromGenericExam, ...structuresFromModules];
    console.log(`✅ Total: ${structures.length} matching structures`);

    if (structures.length === 0) {
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

    for (let i = 0; i < count; i++) {
      console.log(`\n🔄 Creating exam ${i + 1}/${count}...`);
      
      // קביעת דרישות מיוחדות לפי מקצוע
      let specificRequirements = getSubjectRequirements(examStructure.subject, examStructure.unit_level, examStructure.module_id);
      
      const requiredQuestionCount = questionStructure.length || 9;
      
      // בניית דוגמאות שאלות מהמקור
      const exampleQuestions = questionStructure.slice(0, 3).map((q, idx) => {
        return `שאלה ${idx + 1}: "${q.question_text || 'לא זמין'}" (${q.points || 10} נקודות, נושא: ${q.topic || 'כללי'})`;
      }).join('\n');
      
      const generationPrompt = `
צור מבחן בגרות ישראלי מלא ומדויק.

**פרטי המבחן:**
- מקצוע: ${examStructure.subject}
- רמה: ${examStructure.unit_level} יחידות  
- שאלון: ${examStructure.module_id}
- משך: ${durationMinutes} דקות
- סה"כ נקודות: ${totalPoints}
- מספר שאלות נדרש: בדיוק ${requiredQuestionCount} שאלות

${specificRequirements}

**דוגמאות לסגנון השאלות מהמקור:**
${exampleQuestions}

⚠️ **כללים קריטיים - חובה לקיים:**

1. **כל שאלה חייבת לכלול question_text מלא!**
   - זה השדה הכי חשוב - טקסט השאלה המלא
   - אסור להשאיר ריק או null
   - השאלה חייבת להיות ברורה ומפורטת

2. **דוגמאות לפורמט נכון:**
   
   מתמטיקה:
   "question_text": "נתונה הפונקציה f(x) = x³ - 12x + 5. א. מצא את נקודות הקיצון של הפונקציה. ב. קבע את תחומי העלייה והירידה. ג. שרטט סקיצה של הגרף."
   
   אנגלית:
   "question_text": "According to the text, what is the main reason why many young people prefer to shop online? Give TWO details from the text to support your answer."
   
   היסטוריה:
   "question_text": "הסבר שלושה גורמים מרכזיים שהובילו לפרוץ מלחמת העולם הראשונה ב-1914. התייחס לגורמים פוליטיים, כלכליים וחברתיים."

3. **correct_answer חייב להכיל את התשובה המלאה**

4. **points חייב להיות מספר שלם**

5. **solution_steps - מערך של שלבי פתרון מפורטים**

${isEnglishExam ? `
6. **reading_text - טקסט קריאה באנגלית (300-500 מילים)**
   צור טקסט מעניין ומקורי על נושא רלוונטי לגיל התיכון.
` : ''}

צור את המבחן עכשיו עם בדיוק ${requiredQuestionCount} שאלות מלאות.`;

      console.log(`🤖 Step 5 (${i + 1}/${count}): Generating exam with AI...`);
      
      let generatedExam;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const examSchema = {
            type: "object",
            properties: {
              title: { type: "string", description: "כותרת המבחן" },
              description: { type: "string", description: "תיאור קצר" },
              instructions: { type: "string", description: "הוראות למבחן" },
              reading_text: { type: "string", description: "טקסט קריאה (לאנגלית)" },
              questions: {
                type: "array",
                description: "רשימת השאלות",
                items: {
                  type: "object",
                  properties: {
                    question_number: { type: "integer", description: "מספר השאלה" },
                    question_text: { type: "string", description: "טקסט השאלה המלא - חובה!" },
                    question_type: { type: "string", description: "סוג השאלה" },
                    topic: { type: "string", description: "נושא השאלה" },
                    points: { type: "integer", description: "ניקוד" },
                    options: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "אפשרויות (לרב-ברירה)" 
                    },
                    correct_answer: { type: "string", description: "התשובה הנכונה המלאה" },
                    explanation: { type: "string", description: "הסבר לתשובה" },
                    solution_steps: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "שלבי הפתרון" 
                    },
                    parts: {
                      type: "array",
                      description: "סעיפים (אם יש)",
                      items: {
                        type: "object",
                        properties: {
                          part_id: { type: "string" },
                          text: { type: "string" },
                          points: { type: "integer" },
                          correct_answer: { type: "string" }
                        }
                      }
                    }
                  },
                  required: ["question_number", "question_text", "points", "correct_answer"]
                }
              }
            },
            required: ["title", "questions"]
          };
          
          generatedExam = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: generationPrompt,
            response_json_schema: examSchema
          });
          
          // ולידציות
          if (!generatedExam || !generatedExam.questions || generatedExam.questions.length === 0) {
            throw new Error('AI החזיר מבחן ריק');
          }
          
          if (generatedExam.questions.length < requiredQuestionCount * 0.7) {
            throw new Error(`מספר שאלות לא מספיק: ${generatedExam.questions.length} במקום ${requiredQuestionCount}`);
          }
          
          // בדיקה קריטית: כל שאלה חייבת question_text
          const invalidQuestions = generatedExam.questions.filter(q => 
            !q.question_text || 
            q.question_text.trim() === '' || 
            q.question_text.length < 10
          );
          
          if (invalidQuestions.length > 0) {
            console.warn(`⚠️ ${invalidQuestions.length} questions with invalid question_text!`);
            throw new Error(`${invalidQuestions.length} שאלות ללא טקסט שאלה תקין`);
          }
          
          // בדיקה: כל שאלה חייבת correct_answer
          const noAnswerQuestions = generatedExam.questions.filter(q => 
            !q.correct_answer || q.correct_answer.trim() === ''
          );
          
          if (noAnswerQuestions.length > 0) {
            console.warn(`⚠️ ${noAnswerQuestions.length} questions without correct_answer!`);
            throw new Error(`${noAnswerQuestions.length} שאלות ללא תשובה נכונה`);
          }
          
          console.log(`✅ AI generation complete (${generatedExam.questions.length} questions, all validated)`);
          break;
          
        } catch (aiError) {
          retryCount++;
          console.error(`❌ AI attempt ${retryCount} failed:`, aiError.message);
          
          if (retryCount >= maxRetries) {
            // Fallback: יצירת מבחן בסיסי מהמקור
            console.log('⚠️ Creating fallback exam from source structure...');
            generatedExam = createFallbackExam(examStructure, questionStructure, durationMinutes, totalPoints);
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      console.log(`💾 Step 6: Saving exam to database...`);
      
      // נרמול module_id
      let normalizedModuleId = examStructure.module_id;
      if (examStructure.subject === 'אנגלית') {
        normalizedModuleId = examStructure.module_id.replace(/[^A-Ga-g]/g, '').toUpperCase().charAt(0) || examStructure.module_id;
      }
      
      // ניקוי ותיקוף השאלות לפני שמירה
      const cleanedQuestions = generatedExam.questions.map((q, idx) => ({
        question_number: idx + 1,
        question_text: q.question_text || `שאלה ${idx + 1}`,
        question_type: q.question_type || 'open_question',
        topic: q.topic || examStructure.subject,
        points: parseInt(q.points) || Math.floor(totalPoints / generatedExam.questions.length),
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        solution_steps: q.solution_steps || [],
        parts: q.parts || []
      }));
      
      const examData = {
        title: generatedExam.title || `${examStructure.subject} - מודול ${normalizedModuleId} - ${examStructure.unit_level} יח"ל`,
        subject: examStructure.subject,
        unit_level: examStructure.unit_level,
        module_id: normalizedModuleId,
        description: generatedExam.description || `מבחן תרגול ${examStructure.module_id}`,
        duration_minutes: durationMinutes,
        total_points: totalPoints,
        instructions: generatedExam.instructions || 'ענה על כל השאלות. ציין את דרך הפתרון המלאה.',
        questions: cleanedQuestions,
        is_generated: true,
        is_copyright_free: true
      };
      
      // הוספת reading_text לאנגלית
      if (isEnglishExam) {
        if (generatedExam.reading_text && generatedExam.reading_text.length > 100) {
          examData.reading_text = generatedExam.reading_text;
        } else {
          examData.reading_text = getDefaultReadingText(examStructure.module_id);
        }
        console.log(`✅ Reading text: ${examData.reading_text.length} characters`);
      }
      
      const savedExam = await base44.asServiceRole.entities.GenericExam.create(examData);
      console.log(`✅ Exam saved with ID: ${savedExam.id}`);
      createdExams.push(savedExam);

      // שמירת פתרונות
      if (generate_solutions) {
        console.log(`📝 Step 7: Saving solutions...`);
        for (const question of cleanedQuestions) {
          if (question.correct_answer || question.solution_steps?.length > 0) {
            await base44.asServiceRole.entities.SolutionBank.create({
              question_id: `generated_${savedExam.id}_q${question.question_number}`,
              solution_text: question.explanation || question.correct_answer,
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
          }
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
    return Response.json({ 
      error: error.message,
      details: 'בדוק את הלוגים של הפונקציה לפרטים נוספים'
    }, { status: 500 });
  }
});

// פונקציה להחזרת דרישות לפי מקצוע
function getSubjectRequirements(subject, unitLevel, moduleId) {
  if (subject === 'אנגלית') {
    const moduleReqs = {
      'A': `**מודול A - אנגלית ${unitLevel} יחידות:**
- Reading Comprehension קצר
- שאלות TRUE/FALSE
- השלמת משפטים
- כתיבה קצרה (30-40 מילים)`,
      'B': `**מודול B - אנגלית ${unitLevel} יחידות:**
- Reading Comprehension (150-200 מילים)
- Multiple Choice עם 4 אפשרויות
- שאלות פתוחות
- כתיבה (60-80 מילים)`,
      'C': `**מודול C - אנגלית ${unitLevel} יחידות:**
- טקסט ארוך (250-400 מילים)
- שאלות הבנה מעמיקה
- כתיבה (100-120 מילים)`,
      'D': `**מודול D - אנגלית ${unitLevel} יחידות:**
- 2 טקסטים (300-500 מילים כ"א)
- Inference ו-Compare/Contrast
- כתיבה מורחבת (120-150 מילים)`,
      'E': `**מודול E - אנגלית ${unitLevel} יחידות:**
- Vocabulary & Grammar מתקדם
- Word forms, Collocations
- Sentence completion, Error correction`,
      'F': `**מודול F - ספרות אנגלית:**
- ניתוח דמויות ומוטיבים
- שאלות HOTS
- כתיבה (80-120 מילים)`,
      'G': `**מודול G - אנגלית 5 יחידות:**
- טקסט מתקדם (450-700 מילים)
- Writer's purpose & tone
- Restatement`
    };
    return moduleReqs[moduleId] || moduleReqs['C'];
  }
  
  if (subject === 'מתמטיקה') {
    const levelReqs = {
      3: `**מתמטיקה 3 יחידות:**
- אלגברה בסיסית, משוואות
- פונקציות לינארית וריבועית
- גיאומטריה בסיסית
- סטטיסטיקה`,
      4: `**מתמטיקה 4 יחידות:**
- פונקציות מתקדמות
- גיאומטריה אנליטית
- טריגונומטריה
- הסתברות`,
      5: `**מתמטיקה 5 יחידות:**
- חדו"א: נגזרות, אינטגרלים
- חקירת פונקציות
- קומבינטוריקה מתקדמת
- הוכחות`
    };
    return levelReqs[unitLevel] || levelReqs[3];
  }
  
  if (subject === 'היסטוריה') {
    return `**היסטוריה:**
- שאלות ידע עובדתיות
- ניתוח מקורות
- שאלות סיבה ותוצאה
- תהליכים היסטוריים`;
  }
  
  if (subject === 'אזרחות') {
    return `**אזרחות:**
- מושגים דמוקרטיים
- חוקי יסוד
- זכויות אדם
- מוסדות שלטון`;
  }
  
  if (subject === 'תנ"ך') {
    return `**תנ"ך:**
- עיון בפרקים (ללא ציטוט ישיר)
- ניתוח דמויות
- תמות ומסרים
- פרשנות`;
  }
  
  if (subject === 'ספרות') {
    return `**ספרות:**
- ניתוח טקסטים
- דמויות ומוטיבים
- אמצעים אמנותיים
- פרשנות יצירות`;
  }
  
  if (subject === 'פיזיקה') {
    return `**פיזיקה ${unitLevel} יחידות:**
- מכניקה
- חשמל ומגנטיות
- גלים ואופטיקה
- פתרון עם נוסחאות ויחידות`;
  }
  
  return `**${subject} ${unitLevel} יחידות:**
- שאלות ברמת בגרות
- פתרונות מפורטים
- ניקוד מדויק`;
}

// יצירת מבחן fallback מהמקור
function createFallbackExam(examStructure, questionStructure, durationMinutes, totalPoints) {
  const questions = questionStructure.slice(0, 10).map((q, idx) => ({
    question_number: idx + 1,
    question_text: q.question_text || `שאלה ${idx + 1} ב${examStructure.subject}: ${q.topic || 'נושא כללי'}. פתור את השאלה והסבר את דרך הפתרון.`,
    question_type: q.question_type || 'open_question',
    topic: q.topic || examStructure.subject,
    points: q.points || Math.floor(totalPoints / Math.min(questionStructure.length, 10)),
    correct_answer: q.correct_answer || 'ראה פתרון מפורט',
    explanation: q.explanation || 'פתרון לשאלה זו',
    solution_steps: q.solution_steps || []
  }));
  
  return {
    title: `${examStructure.subject} - מודול ${examStructure.module_id} - ${examStructure.unit_level} יח"ל`,
    description: `מבחן תרגול ${examStructure.module_id}`,
    instructions: 'ענה על כל השאלות. הקפד להראות דרך פתרון מלאה.',
    questions
  };
}

// טקסט קריאה ברירת מחדל לאנגלית
function getDefaultReadingText(moduleId) {
  const texts = {
    'A': `Technology has changed the way we communicate with each other. In the past, people wrote letters and waited days or weeks for a reply. Today, we can send messages instantly through our phones and computers.

Young people especially use technology for communication. They send text messages, use social media, and make video calls. This makes it easy to stay in touch with friends and family, even if they live far away.

However, some people worry that too much technology is bad for us. They say we should spend more time talking face to face. What do you think?`,
    
    'B': `Online shopping has become very popular in recent years. Many people prefer to buy things from their computers or phones instead of going to stores. There are several reasons for this change in shopping habits.

First, online shopping is convenient. You can shop at any time, day or night, from anywhere. You don't need to travel to a store or wait in line. Second, it's often easier to compare prices online. You can check many different websites to find the best deal.

However, there are also disadvantages to online shopping. You cannot touch or try on products before buying them. Sometimes the item looks different in real life than it did in the picture. Also, you have to wait for delivery, which can take several days.

Despite these drawbacks, online shopping continues to grow. More and more people are choosing to buy products online, especially younger generations who grew up with technology.`,
    
    'C': `Climate change is one of the biggest challenges facing our world today. Scientists agree that human activities, especially the burning of fossil fuels, are causing global temperatures to rise. This warming is leading to many serious problems.

One major effect of climate change is the melting of polar ice caps. As the ice melts, sea levels rise. This threatens coastal cities and low-lying islands around the world. Some places may become uninhabitable within the next few decades.

Weather patterns are also changing because of global warming. Many regions are experiencing more extreme weather events, including stronger hurricanes, longer droughts, and more intense heat waves. These changes affect agriculture and can lead to food shortages.

Young people around the world are demanding action on climate change. They organize protests and speak to world leaders, asking them to take immediate steps to reduce carbon emissions. Many believe that we must act now if we want to protect the planet for future generations.

Governments and businesses are starting to respond. Some countries have promised to become carbon neutral by 2050. Companies are investing in renewable energy sources like solar and wind power. However, critics say these efforts are not enough and more must be done.`,
    
    'D': `The rise of artificial intelligence (AI) is transforming many aspects of our daily lives. From voice assistants like Siri and Alexa to recommendation algorithms on streaming services, AI technology is becoming increasingly integrated into our routines. While these developments bring many benefits, they also raise important questions about privacy, employment, and the future of human creativity.

One area where AI has made significant progress is healthcare. Machine learning algorithms can now analyze medical images and detect diseases with remarkable accuracy. In some cases, AI systems can identify cancers and other conditions even better than experienced doctors. This technology has the potential to save lives by enabling earlier diagnosis and treatment.

However, the rapid advancement of AI also creates challenges. Many workers worry that automation will eliminate their jobs. Studies suggest that millions of positions in manufacturing, transportation, and even professional services could be replaced by AI systems in the coming decades. This raises difficult questions about how society should support people who lose their livelihoods to technology.

Another concern is the impact of AI on privacy and democracy. Social media platforms use algorithms to decide what content users see, which can create "filter bubbles" that reinforce existing beliefs. There are also worries about the use of AI for surveillance and the potential for bias in automated decision-making systems.

Despite these concerns, many experts believe that AI will ultimately benefit humanity. They argue that new technologies have always created more jobs than they have destroyed, and that AI will free humans to focus on more creative and meaningful work. The key, they say, is to ensure that the benefits of AI are shared widely and that appropriate safeguards are put in place.`,
    
    'G': `The concept of sustainability has evolved significantly over the past few decades, moving from a niche concern of environmental activists to a mainstream priority for governments, businesses, and individuals worldwide. This transformation reflects a growing recognition that our current patterns of consumption and production are fundamentally incompatible with the long-term health of our planet and its inhabitants.

At its core, sustainability is about meeting the needs of the present without compromising the ability of future generations to meet their own needs. This definition, first articulated in the 1987 Brundtland Report, encompasses three interconnected dimensions: environmental protection, economic development, and social equity. True sustainability requires balancing all three of these elements.

The environmental dimension of sustainability focuses on preserving natural resources and ecosystems. This includes reducing pollution, protecting biodiversity, and transitioning to renewable energy sources. Scientists warn that we are currently exceeding several planetary boundaries, including those related to climate change, biodiversity loss, and nitrogen pollution. Without dramatic changes to our behavior, we risk triggering irreversible environmental damage.

The economic dimension recognizes that sustainability must be financially viable. Green technologies and sustainable practices often require significant upfront investment, but they can also create new economic opportunities and reduce long-term costs. The growing market for electric vehicles, organic food, and eco-friendly products demonstrates that consumers are increasingly willing to pay for sustainable options.

The social dimension addresses issues of equity and justice. Sustainable development must benefit all members of society, not just the wealthy. This means ensuring access to clean water, education, healthcare, and economic opportunities for people around the world. It also means addressing the disproportionate impact of environmental degradation on marginalized communities.

Achieving sustainability will require unprecedented cooperation between nations, businesses, and individuals. While the challenges are immense, there are reasons for hope. Renewable energy costs have plummeted, making clean power increasingly competitive with fossil fuels. Young people are mobilizing in record numbers to demand climate action. And innovative solutions are emerging from every corner of the globe.`
  };
  
  return texts[moduleId] || texts['C'];
}