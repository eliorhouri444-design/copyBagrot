import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 ADVANCED MATH SOLVER STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        console.log('🔐 Step 1: Authenticating...');
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.error('❌ Authentication failed - no user');
            return Response.json({ 
                success: false,
                error: 'Unauthorized - no user found' 
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', user.email);

        console.log('📥 Step 2: Parsing request...');
        const body = await req.json();
        const { imageUrl, questionText } = body;

        console.log('📦 Request body:', { 
            imageUrl: imageUrl?.substring(0, 50) + '...', 
            questionText: questionText?.substring(0, 50) 
        });

        if (!imageUrl) {
            console.error('❌ Missing image URL');
            return Response.json({ 
                success: false,
                error: 'Missing image URL' 
            }, { status: 400 });
        }

        console.log('✅ Image URL valid');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖 Step 3: Calling GPT-4o...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const masterPrompt = `אתה המורה הטוב ביותר למתמטיקה בעולם - ברמת פרופסור מאוניברסיטה עם 30 שנות ניסיון.
אתה מומחה לכל תחומי המתמטיקה: אלגברה, גיאומטריה, טריגונומטריה, חשבון דיפרנציאלי ואינטגרלי, סדרות, וקטורים.

**📸 יש לך תמונה של שאלת מתמטיקה - תפתור אותה ברמה מקצועית מושלמת!**

---

# 🎯 שלב 1: הבנת השאלה

קרא את השאלה מהתמונה ורשום:

**א. מה השאלה מבקשת?**
כתוב במשפט ברור מה צריך למצוא/להוכיח.

**ב. נתונים:**
רשום רשימה של כל הנתונים במספרים, משתנים, תכונות.

**ג. תחום מתמטי:**
זהה: אלגברה / גיאומטריה / טריגונומטריה / חדו"א / סדרות / אחר

---

# 🧮 שלב 2: פתרון שלב אחר שלב

**פתור את השאלה בצורה הבאה:**

לכל שלב:

---
## שלב [מספר]: [שם השלב]

**🎯 מטרה:**
למה אנחנו עושים את השלב הזה

**📐 נוסחה/כלל:**
איזו נוסחה או משפט משתמשים

**🔢 הצבה:**
הצבת הנתונים בנוסחה עם המספרים האמיתיים

**⚡ חישוב:**
ביצוע החישוב שלב אחר שלב:
- שלב 1: ...
- שלב 2: ...
- תוצאה: ...

**✅ מסקנה:**
מה קיבלנו

---

# 🏁 שלב 3: תשובה סופית

\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 התשובה הסופית:
━━━━━━━━━━━━━━━━━━━━━━━━━━

[כתוב את התשובה בצורה ברורה]

━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

---

# ✔️ שלב 4: בדיקה

בדוק שהתוצאה הגיונית:
- ערכים בטווח סביר?
- הצבה חוזרת עובדת?

---

**חוקים קריטיים:**

✅ **הראה כל חישוב** - גם אם פשוט
✅ **השתמש במספרים אמיתיים** - לא רק משתנים
✅ **הסבר כל צעד** - למה עושים אותו
✅ **תשובה סופית בולטת** - עם קו מפריד

---

**פתור עכשיו את השאלה מהתמונה!**`;

        console.log('📤 Sending request to LLM...');
        console.log('📏 Prompt length:', masterPrompt.length, 'characters');

        const startLLM = Date.now();
        
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: masterPrompt,
            file_urls: [imageUrl]
        });

        const llmTime = ((Date.now() - startLLM) / 1000).toFixed(1);
        console.log(`✅ LLM responded in ${llmTime}s`);
        console.log('📊 Solution length:', result?.length || 0, 'characters');
        console.log('📄 Solution preview:', result?.substring(0, 200) + '...');

        if (!result || result.length < 50) {
            console.error('❌ LLM returned empty or too short response');
            return Response.json({
                success: false,
                error: 'המערכת לא הצליחה לפתור - נסה שוב'
            });
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ SUCCESS - Returning response');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // מחזירים תשובה מיידית בלי metadata extraction
        const response = {
            success: true,
            solution: result,
            analysis: null,
            metadata: {
                timestamp: new Date().toISOString(),
                model: 'gpt-4o',
                llm_time_seconds: llmTime
            }
        };

        console.log('📦 Response object created');
        console.log('📊 Response size:', JSON.stringify(response).length, 'characters');

        return Response.json(response);

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ CRITICAL ERROR');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return Response.json({
            success: false,
            error: error.message || 'שגיאה לא צפויה',
            error_type: error.constructor.name,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});