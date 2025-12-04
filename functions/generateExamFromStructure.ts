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
      
    // קביעת דרישות מיוחדות לפי מקצוע, רמה ושאלון
    let specificRequirements = '';
    
    // ========== אנגלית ==========
    if (isEnglishExam) {
      if (examStructure.module_id === 'A') {
        specificRequirements = `
    🎯 **שאלון A - אנגלית ${examStructure.unit_level} יחידות:**
    
    **Reading Comprehension:**
    - שאלות הבנת הנקרא קצרות
    - השלמת משפטים
    - TRUE/FALSE
    
    **Writing:**
    - כתיבה קצרה: **"Write 30-40 words"**
    
    חובה ליצור reading_text באנגלית (100-150 מילים).`;
      } else if (examStructure.module_id === 'B') {
        specificRequirements = `
    🎯 **שאלון B - אנגלית ${examStructure.unit_level} יחידות:**
    
    ⚠️ **סה"כ ניקוד: 60-70 נקודות בלבד!**
    
    **Reading Comprehension:**
    - טקסט קריאה אחד (150-200 מילים)
    - **חובה: לפחות שאלה אחת MULTIPLE CHOICE עם 4 אפשרויות (A, B, C, D)**
    - השלמת משפטים
    - TRUE/FALSE
    
    **Writing:**
    - **חובה לכתוב בהוראות: "Write 60-80 words"**
    
    📝 דוגמה ל-MC:
    "What is the main idea of the text?
    A) Animals in the zoo
    B) A trip to the beach
    C) School activities
    D) Family traditions"
    
    חובה ליצור reading_text באנגלית (150-200 מילים).
    סה"כ ניקוד: 60-70 נקודות!`;
      } else if (examStructure.module_id === 'C') {
        specificRequirements = `
    🎯 **שאלון C - אנגלית ${examStructure.unit_level} יחידות:**
    
    **Reading Comprehension:**
    - טקסטים ארוכים (250-400 מילים)
    - שאלות אמריקאיות (Multiple Choice)
    - שאלות פתוחות
    - שאלות עיון בטקסט
    
    **Writing:**
    - **חובה לכתוב בהוראות: "Write 100-120 words"**
    
    חובה ליצור reading_text באנגלית (250-400 מילים).`;
      } else if (examStructure.module_id === 'D') {
        specificRequirements = `
    🎯 **שאלון D - אנגלית ${examStructure.unit_level} יחידות:**
    
    **Reading Comprehension:**
    - 2 טקסטים (300-500 מילים כ"א)
    - שאלות הבנה עמוקה
    - שאלות עיון + פרשנות
    - Inference, Compare & Contrast
    
    **Writing:**
    - כתיבה מורחבת: **"Write 120-150 words"**
    
    חובה ליצור reading_text באנגלית (שני טקסטים או טקסט ארוך 500-700 מילים).`;
      } else if (examStructure.module_id === 'E') {
        specificRequirements = `
    🎯 **שאלון E - אנגלית ${examStructure.unit_level} יחידות:**
    
    **Vocabulary & Grammar:**
    - אוצר מילים מתקדם
    - מבני דקדוק מורכבים
    - שאלות תחביר
    - שימוש נכון במילים (Word Forms, Collocations)
    
    **Language Tasks:**
    - Sentence completion
    - Error correction
    - Word transformation
    - Rewriting sentences
    
    אין צורך ב-reading_text - מתמקד בשפה ודקדוק.`;
      } else if (examStructure.module_id === 'F') {
        specificRequirements = `
    🎯 **שאלון F - ספרות אנגלית ${examStructure.unit_level} יחידות:**
    
    **Literature Questions:**
    - ניתוח דמויות
    - מוטיבים ותמות
    - סמלים ודימויים
    - שאלות HOTS (Compare, Infer, Analyze)
    
    **Writing:**
    - שאלה פתוחה: **"Write 80-120 words"**
    
    אין להעתיק ציטוטים - לכתוב תקציר/ביאור במקום.`;
      } else if (examStructure.module_id === 'G') {
        specificRequirements = `
    🎯 **שאלון G - אנגלית 5 יחידות:**
    
    **Advanced Reading:**
    - טקסט מתקדם (450-700 מילים)
    - Inference מתקדם
    - Writer's purpose & tone
    - Connecting ideas
    
    **Restatement:**
    - שכתוב משפטים עם מילה נתונה
    
    **Integrated Tasks:**
    - Matching headings
    - Completing charts
    
    חובה ליצור reading_text באנגלית (450-700 מילים).`;
      }
    }
    
    // ========== מתמטיקה ==========
    else if (examStructure.subject === 'מתמטיקה') {
      if (examStructure.unit_level === 3) {
        specificRequirements = `
    🎯 **מתמטיקה 3 יחידות:**
    
    **נושאים:**
    - אלגברה בסיסית (משוואות, אי-שוויונות)
    - פונקציות (לינארית, ריבועית)
    - גיאומטריה בסיסית (משולשים, מרובעים, מעגל)
    - סטטיסטיקה (ממוצע, חציון, שכיח, גרפים)
    
    **חובה:**
    - פתרון מלא שלב-אחר-שלב
    - בדיקה כפולה (double verification) - פתור ואז בדוק
    - תשובות "נקיות" (מספרים שלמים או שברים פשוטים)`;
      } else if (examStructure.unit_level === 4) {
        specificRequirements = `
    🎯 **מתמטיקה 4 יחידות:**
    
    **נושאים:**
    - פונקציות ריבועיות ואקספוננציאליות
    - גיאומטריה אנליטית (ישר, מעגל, פרבולה)
    - טריגונומטריה (סינוס, קוסינוס, טנגנס)
    - הסתברות (עץ הסתברות, התפלגות)
    
    **חובה:**
    - פתרון מלא שלב-אחר-שלב
    - בדיקה כפולה (double verification)
    - תשובות "נקיות"`;
      } else if (examStructure.unit_level === 5) {
        specificRequirements = `
    🎯 **מתמטיקה 5 יחידות:**
    
    **נושאים:**
    - חדו"א: נגזרות, חקירת פונקציות, אינטגרלים
    - קומבינטוריקה והסתברות מתקדמת
    - גיאומטריה אנליטית מתקדמת
    - משוואות מורכבות (טריגונומטריות, לוגריתמיות)
    
    **חובה:**
    - פתרון מלא שלב-אחר-שלב
    - בדיקה כפולה (double verification)
    - הוכחות מלאות כשנדרש
    - תשובות מדויקות`;
      }
    }
    
    // ========== לשון ==========
    else if (examStructure.subject === 'לשון' || examStructure.subject === 'עברית') {
      specificRequirements = `
    🎯 **לשון:**
    
    **הבנת הנקרא:**
    - טקסט עיוני/פובליציסטי
    - שאלות הבנה ופרשנות
    
    **תחביר:**
    - זמנים (עבר, הווה, עתיד)
    - מבנה משפט (נושא, נשוא, מושא)
    - פסוקיות (זמן, סיבה, תנאי)
    - משפטים מורכבים
    
    **תחליפים:**
    - הבנת מילים מהקשר
    - מילים נרדפות
    
    **אוצר מילים:**
    - מילים ברמת הבגרות
    - שורשים ומשקלים
    
    חובה ליצור טקסט קריאה (reading_text) של 300-400 מילים.`;
    }
    
    // ========== היסטוריה ==========
    else if (examStructure.subject === 'היסטוריה') {
      specificRequirements = `
    🎯 **היסטוריה:**
    
    **סוגי שאלות:**
    - שאלות ידע עובדתיות (מי, מה, מתי, איפה)
    - שאלות עיון בטקסט היסטורי (מקור ראשוני/משני)
    - שאלות סיבתיות (מה גרם ל...)
    - שאלות תהליכים (תאר את ההתפתחות...)
    
    **חובה:**
    - להשתמש בעובדות היסטוריות אמיתיות ומדויקות
    - אין להעתיק ממקורות - לנסח מחדש
    - לציין תקופות ותאריכים נכונים
    
    ניתן ליצור טקסט מקור (reading_text) לשאלות עיון.`;
    }
    
    // ========== אזרחות ==========
    else if (examStructure.subject === 'אזרחות') {
      specificRequirements = `
    🎯 **אזרחות:**
    
    **מושגים אזרחיים:**
    - דמוקרטיה וסוגיה
    - חוקה וחוקי יסוד
    - שלוש רשויות השלטון
    - זכויות אדם ואזרח
    - הכרזת העצמאות
    
    **סוגי שאלות:**
    - הגדרת מושגים
    - ניתוח מצב/אירוע
    - שאלות על ערכים ועקרונות
    - השוואה בין גישות
    
    **חובה:**
    - להשתמש רק בעובדות אמיתיות מחומר הלימוד
    - אין להמציא חוקים או פסיקות
    - דיוק במושגים`;
    }
    
    // ========== תנ"ך ==========
    else if (examStructure.subject === 'תנ"ך') {
      specificRequirements = `
    🎯 **תנ"ך:**
    
    **סוגי שאלות:**
    - עיון בטקסט (ללא העתקה - לתאר/לסכם)
    - שאלות פרשנות
    - הבנת פרקים ועלילה
    - ניתוח דמויות
    - תמות ומסרים
    
    **חובה:**
    - אסור להעתיק פסוקים מהתנ"ך
    - לכתוב ביאור/תקציר במקום ציטוט
    - לציין פרק ופסוקים לעיון
    
    אין צורך ב-reading_text - להפנות לפרקים מהסילבוס.`;
    }
    
    // ========== ספרות ==========
    else if (examStructure.subject === 'ספרות') {
      specificRequirements = `
    🎯 **ספרות:**
    
    **סוגי שאלות:**
    - ניתוח טקסט ספרותי
    - עיון ביצירות מהסילבוס
    - שאלות הבנה + פרשנות
    - ניתוח דמויות ומוטיבים
    - אמצעים אמנותיים
    
    **חובה:**
    - אין להעתיק ציטוטים מיצירות
    - לכתוב תקציר/ביאור במקום ציטוט
    - להתייחס ליצירות מוכרות מהסילבוס
    
    אין צורך ב-reading_text - להתייחס ליצירות מהסילבוס.`;
    }
    
    // ========== פיזיקה ==========
    else if (examStructure.subject === 'פיזיקה') {
      specificRequirements = `
    🎯 **פיזיקה ${examStructure.unit_level} יחידות:**
    
    **נושאים עיקריים:**
    - מכניקה (קינמטיקה, דינמיקה, אנרגיה)
    - חשמל ומגנטיות
    - גלים ואופטיקה
    - תרמודינמיקה
    
    **חובה:**
    - פתרון מלא עם נוסחאות
    - הצבת נתונים ויחידות
    - בדיקה כפולה של התשובה
    - תיאור מילולי של הבעיה (אם אין איור)`;
    }
    
    // ========== כימיה ==========
    else if (examStructure.subject === 'כימיה') {
      specificRequirements = `
    🎯 **כימיה ${examStructure.unit_level} יחידות:**
    
    **נושאים עיקריים:**
    - מבנה האטום והקשר הכימי
    - סטויכיומטריה
    - תמיסות וריכוזים
    - חומצות ובסיסים
    - אלקטרוכימיה
    - כימיה אורגנית
    
    **חובה:**
    - איזון משוואות
    - חישובים מדויקים
    - יחידות נכונות`;
    }
    
    // ========== ביולוגיה ==========
    else if (examStructure.subject === 'ביולוגיה') {
      specificRequirements = `
    🎯 **ביולוגיה ${examStructure.unit_level} יחידות:**
    
    **נושאים עיקריים:**
    - התא ומרכיביו
    - גנטיקה ותורשה
    - מערכות בגוף האדם
    - אקולוגיה
    - אבולוציה
    
    **חובה:**
    - מושגים מדויקים
    - תהליכים שלב-אחר-שלב
    - דיאגרמות מתוארות במילים`;
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