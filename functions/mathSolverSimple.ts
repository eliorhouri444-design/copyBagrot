import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { question, subject, imageUrl, analysisData } = await req.json();

        if (!question) {
            return Response.json({ error: 'Missing question' }, { status: 400 });
        }

        console.log('🧮 Solving:', subject, question.substring(0, 80));

        // פתרון מפורט באמצעות InvokeLLM
        const prompt = `אתה מורה מומחה ל${subject || 'מתמטיקה'} בבגרות ישראלית.

פתור את השאלה הבאה בצורה מפורטה:

**השאלה:**
${question}

${analysisData ? `
**מידע נוסף:**
- נושא: ${analysisData.main_topic || ''}
- נתונים: ${analysisData.given_data?.join(', ') || ''}
- מבוקש: ${analysisData.required_to_find?.join(', ') || ''}
` : ''}

**מבנה הפתרון שלך:**

## שלב 1: הבנת השאלה
- מה ניתן?
- מה מבוקש?

## שלב 2: אסטרטגיה
- איזה משפטים/נוסחאות נשתמש?
- מה דרך הפתרון?

## שלבי פתרון (3, 4, 5...):
כל שלב:
- **מה עושים**
- **למה** (על פי איזה משפט)
- **חישוב מלא**
- **תוצאה**

## תשובה סופית
📌 **התשובה: [כאן]**

## בדיקה
- האם זה הגיוני?

כתוב בעברית פשוטה וברורה. הסבר כל שלב בפירוט.`;

        const solution = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: imageUrl ? [imageUrl] : undefined,
            add_context_from_internet: false
        });

        console.log('✅ Solution ready');

        // חילוץ תשובה סופית
        const finalAnswerMatch = solution.match(/📌\s*\*?\*?התשובה:?\*?\*?\s*(.+)/);
        const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : "ראה פתרון מלא";

        return Response.json({
            success: true,
            solution: solution,
            final_answer: finalAnswer,
            steps: solution.split('\n## ').filter(s => s.trim())
        });

    } catch (error) {
        console.error('❌ Solver Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});