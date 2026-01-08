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

        const { question, studentAnswer, correctAnswer, correctSolutionSteps, subject, checkingMode = 'strict', useCache = true } = await req.json();

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
                    content: `אתה בודק תשובות בחינות בגרות (מתמטיקה/פיזיקה/מדעים).
מטרתך היא לתת ניקוד הוגן גם אם התשובה הסופית שגויה, בהתבסס על הדרך.

**הנחיות קריטיות לניקוד חלקי (Partial Credit):**
1. אם התשובה הסופית נכונה והדרך נכונה -> 100%.
2. אם התשובה הסופית שגויה, בדוק את הדרך:
   - האם הגישה/הנוסחה נכונה? (תן ~40-60% מהניקוד)
   - האם הייתה טעות חישוב קטנה ("נגררת")? (הורד 10-20% בלבד)
   - האם ההבנה הפיזיקלית/מתמטית נכונה?
3. השווה את שלבי התלמיד לשלבי הפתרון הנכון (אם סופקו).

**החזר JSON:**
{
  "is_correct": true/false (האם קיבל ניקוד מלא או כמעט מלא),
  "score_percentage": 0-100 (מספר שלם),
  "partial_credit": {
    "correct_steps": ["זיהוי נכון של הנוסחה", "הצבה נכונה"],
    "incorrect_steps": ["טעות חישוב בשורה 3"],
    "missing_steps": ["לא ציין יחידות מידה"]
  },
  "feedback": {
    "positive": "חיזוק חיובי על הדרך",
    "errors": ["פירוט הטעות"],
    "suggestions": ["איך להימנע מהטעות להבא"]
  },
  "detailed_explanation": "הסבר מלא בעברית, כולל פתרון נכון אם צריך"
}

**מצבי בדיקה:**
- strict: מחמיר (בעיקר לתשובות סופיות)
- partial: **ברירת מחדל** - תן ניקוד על הדרך!
- lenient: מקל מאוד`
                },
                {
                    role: "user",
                    content: `בדוק את התשובה הבאה:

**שאלה:**
${question}

**תשובת התלמיד:**
${studentAnswer}

${correctAnswer ? `\n**תשובה סופית נכונה:**\n${correctAnswer}\n` : ''}
${correctSolutionSteps ? `\n**שלבי הפתרון הנכון (מתוך המחוון):**\n${Array.isArray(correctSolutionSteps) ? correctSolutionSteps.join('\n') : correctSolutionSteps}\n` : ''}

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