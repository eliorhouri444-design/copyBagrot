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

        const { question, studentAnswer, correctAnswer, subject, checkingMode = 'strict', useCache = true } = await req.json();

        if (!question || !studentAnswer) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // ✅ Cache למהירות (רק אם זה בדיקה זהה)
        if (useCache) {
            const checkHash = `check_${question.substring(0, 50)}_${studentAnswer.substring(0, 50)}`;
            const cached = await base44.asServiceRole.entities.CachedResponse.filter({ 
                question_hash: checkHash 
            });

            if (cached.length > 0) {
                const cacheEntry = cached[0];
                const age = Date.now() - new Date(cacheEntry.created_date).getTime();
                
                // Cache לשעה (בדיקות משתנות)
                if (age < 60 * 60 * 1000) {
                    console.log('✅ Check cache hit!');
                    return Response.json({
                        success: true,
                        from_cache: true,
                        ...cacheEntry.response_data
                    });
                }
            }
        }

        console.log('📝 Checking answer with mode:', checkingMode);

        // שימוש ב-gpt-4o-mini לבדיקה - מהיר ומדויק מספיק
        const checkResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `אתה בודק תשובות למתמטיקה בבגרות.

**החזר JSON:**
{
  "is_correct": true/false,
  "score_percentage": 0-100,
  "partial_credit": {
    "correct_steps": ["שלב 1", "שלב 2"],
    "incorrect_steps": ["שלב שגוי"],
    "missing_steps": ["שלב חסר"]
  },
  "feedback": {
    "positive": "מה טוב",
    "errors": ["טעות 1", "טעות 2"],
    "suggestions": ["המלצה 1"]
  },
  "detailed_explanation": "הסבר מפורט"
}

**מצבי בדיקה:**
- strict: רק תשובה סופית נכונה = 100%
- partial: ניקוד חלקי לשלבים נכונים
- lenient: קבל גם קירובים סבירים`
                },
                {
                    role: "user",
                    content: `בדוק:

**שאלה:**
${question}

**תשובת התלמיד:**
${studentAnswer}

${correctAnswer ? `\n**תשובה נכונה:**\n${correctAnswer}\n` : ''}

**מצב בדיקה:** ${checkingMode}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 1500
        });

        const checkResult = JSON.parse(checkResponse.choices[0].message.content);

        console.log('✅ Check completed:', checkResult.is_correct ? 'Correct' : 'Incorrect');

        const result = {
            success: true,
            from_cache: false,
            ...checkResult
        };

        // Cache save
        if (useCache) {
            try {
                const checkHash = `check_${question.substring(0, 50)}_${studentAnswer.substring(0, 50)}`;
                await base44.asServiceRole.entities.CachedResponse.create({
                    question_hash: checkHash,
                    question_text: question,
                    subject: subject || 'מתמטיקה',
                    response_data: result,
                    model_used: 'gpt-4o-mini',
                    hit_count: 0
                });
            } catch (error) {
                console.warn('⚠️ Cache save failed');
            }
        }

        return Response.json(result);

    } catch (error) {
        console.error('❌ Check Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});