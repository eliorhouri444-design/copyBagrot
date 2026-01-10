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

        const { question, studentAnswer, uploadedFileUrl, structuredAnswers, correctAnswer, correctSolutionSteps, subject, checkingMode = 'strict', useCache = true } = await req.json();

        if (!question || (!studentAnswer && !uploadedFileUrl && !structuredAnswers)) {
            return Response.json({ error: 'Missing required fields (question or answer)' }, { status: 400 });
        }

        // Use vision model if file is uploaded
        const modelToUse = uploadedFileUrl ? "gpt-4o" : "gpt-4o-mini";
        const fileUrls = uploadedFileUrl ? [uploadedFileUrl] : undefined;

        // Advanced Hebrew OCR pre-pass (to improve handwriting understanding)
        let ocrText = '';
        let finalAnswer = '';
        if (uploadedFileUrl) {
            try {
                const ocrRes = await base44.functions.invoke('advancedOCR', { imageUrl: uploadedFileUrl });
                ocrText = ocrRes?.data?.formatted_text || ocrRes?.data?.ocr?.text_detected || '';
            } catch (_e) {}
            if (ocrText) {
                try {
                    const fa = await base44.integrations.Core.InvokeLLM({
                        prompt: `אתה מחלץ תשובה סופית מתוך OCR של פתרון בכתב יד בעברית.\nהחזר רק תשובה סופית אחת כפי שהסטודנט סימן/מסגר (מספר/שבר/ביטוי). אם לא ברור, החזר ריק.\n\nOCR:\n${ocrText}`,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                final_answer: { type: "string" }
                            }
                        }
                    });
                    finalAnswer = (fa?.final_answer || '').trim();
                } catch (_e) {}
            }
        }

        // ✅ Cache logic (skip if file uploaded for now, difficult to hash)
        if (useCache && !uploadedFileUrl) {
            const checkHash = `check_${question.substring(0, 50)}_${typeof studentAnswer === 'string' ? studentAnswer.substring(0, 50) : JSON.stringify(structuredAnswers)}`;
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
${structuredAnswers ? "תשובה מובנית לפי סעיפים:\n" + JSON.stringify(structuredAnswers, null, 2) : studentAnswer}
${uploadedFileUrl ? "(שים לב: התלמיד העלה תמונה של הפתרון - נתח אותה)" : ""}

**הנחיה ספציפית לתשובות מרובות סעיפים:**
אם התשובה היא אובייקט JSON עם סעיפים (כגון section_א, section_ב), בדוק כל סעיף בנפרד מול הסעיף המתאים בפתרון.
הציון הסופי צריך לשקלל את הנכונות של כל הסעיפים.
במשוב, התייחס לכל סעיף בנפרד (למשל: "בסעיף א' צדקת, אך בסעיף ב' הייתה טעות חישוב").

${correctAnswer ? `\n**תשובה סופית נכונה:**\n${correctAnswer}\n` : ''}
${correctSolutionSteps ? `\n**שלבי הפתרון הנכון (מתוך המחוון):**\n${Array.isArray(correctSolutionSteps) ? correctSolutionSteps.join('\n') : correctSolutionSteps}\n` : ''}

**מצב בדיקה:** ${checkingMode}`
                }
            ],
            file_urls: fileUrls, // Pass image if exists
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
        if (useCache && !uploadedFileUrl) {
            try {
                const checkHash = `check_${question.substring(0, 50)}_${typeof studentAnswer === 'string' ? studentAnswer.substring(0, 50) : JSON.stringify(structuredAnswers)}`;
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