import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.0';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { originalQuestion, subject, topic, difficulty, count = 3, includeAnswers = true } = await req.json();

        if (!originalQuestion) {
            return Response.json({ error: 'Missing originalQuestion' }, { status: 400 });
        }

        console.log(`🎲 Generating ${count} similar questions for:`, subject, topic);

        const prompt = `אתה מחולל שאלות למבחני בגרות ב${subject || 'מתמטיקה'}.

**שאלה מקורית:**
${originalQuestion}

**משימה:** צור ${count} שאלות **דומות** אבל עם מספרים/נתונים שונים.

**דרישות:**
1. שמור על **אותו מבנה** ואותו סוג חשיבה
2. שנה מספרים, שמות, ערכים
3. שמור על **אותה רמת קושי**: ${difficulty || 'medium'}
4. שמור על אותו נושא: ${topic || 'כללי'}
5. כל שאלה חייבת להיות **פתירה** עם תשובה ברורה

**פורמט החזרה:**
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "...",
      "given_data": "...",
      "required": "...",
      "difficulty": "${difficulty || 'medium'}",
      "topic": "${topic || 'כללי'}",
      ${includeAnswers ? '"solution_steps": ["שלב 1", "שלב 2"], "final_answer": "...",' : ''}
      "diagram_needed": true/false,
      "diagram_description": "..."
    }
  ]
}

**חשוב:**
- כל שאלה חייבת להיות שונה מהאחרות
- נתונים שונים אבל פתרון דומה
- איכות בגרות - ברורה ומדויקת`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8,
            max_tokens: 3000
        });

        const result = JSON.parse(response.choices[0].message.content);

        console.log(`✅ Generated ${result.questions?.length || 0} questions`);

        // יצירת איורים לשאלות שצריכות
        for (let i = 0; i < (result.questions?.length || 0); i++) {
            const q = result.questions[i];
            
            if (q.diagram_needed && q.diagram_description) {
                try {
                    console.log(`🎨 Creating diagram for question ${i + 1}...`);
                    
                    const imageResult = await base44.integrations.Core.GenerateImage({
                        prompt: `איור גיאומטרי מקצועי למבחן בגרות במתמטיקה:

${q.diagram_description}

סגנון:
- קווים שחורים ברורים
- רקע לבן
- תוויות ברורות
- פשוט ומקצועי כמו במבחן בגרות אמיתי`
                    });

                    if (imageResult?.url) {
                        q.diagram_url = imageResult.url;
                        console.log(`✅ Diagram created for Q${i + 1}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to create diagram for Q${i + 1}:`, error);
                }
            }
        }

        return Response.json({
            success: true,
            count: result.questions?.length || 0,
            questions: result.questions
        });

    } catch (error) {
        console.error('❌ Generation Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});