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

        // ⚙️ זיהוי סעיפי שאלה וחלוקת תשובת התלמיד לכל סעיף
        let detectedParts = [];
        try {
            const partsRes = await base44.integrations.Core.InvokeLLM({
                prompt: `נתח את השאלה הבאה וחלץ את מבנה הסעיפים (א/ב/ג/ד/ה) והנקודות אם מצוינות. החזר JSON בלבד.\n\nשאלה:\n${question}\n\nאם אין סעיפים מפורשים, החזר חלק אחד עם part_id="א" ו-points משוערים (100).`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        parts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    part_id: { type: "string" },
                                    description: { type: "string" },
                                    points: { type: "number" }
                                }
                            }
                        }
                    }
                }
            });
            detectedParts = Array.isArray(partsRes?.parts) ? partsRes.parts : [];
            if (!detectedParts.length) detectedParts = [{ part_id: 'א', description: 'סעיף יחיד', points: 100 }];
        } catch (_e) {
            detectedParts = [{ part_id: 'א', description: 'סעיף יחיד', points: 100 }];
        }

        let answersByPart = structuredAnswers || null;
        if (!answersByPart) {
            try {
                const mapRes = await base44.integrations.Core.InvokeLLM({
                    prompt: `חלק את תשובת התלמיד לפי הסעיפים שסופקו, והפק תשובה סופית לכל סעיף אם קיימת. החזר JSON בלבד.\n\nשאלה:\n${question}\n\nסעיפים:\n${JSON.stringify(detectedParts)}\n\nתשובת תלמיד (טקסט חופשי/OCR):\n${(ocrText || studentAnswer || '').toString().slice(0, 8000)}`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            answers_by_part: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        part_id: { type: "string" },
                                        answer_text: { type: "string" },
                                        final_answer: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });
                answersByPart = mapRes?.answers_by_part || null;
            } catch (_e) {}
        }

        // ✅ Cache logic (skip if file uploaded for now, difficult to hash)
        if (useCache && !uploadedFileUrl) {
            const cacheKeyInput = answersByPart ? JSON.stringify(answersByPart).substring(0,200) : (typeof studentAnswer === 'string' ? studentAnswer.substring(0,200) : JSON.stringify(structuredAnswers).substring(0,200));
            const checkHash = `check_${question.substring(0, 50)}_${cacheKeyInput}`;
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

        // בדיקה פרטנית לכל סעיף + שקלול נקודות
        const checkResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `אתה בוחן בגרויות. בדוק תשובות לפי סעיפים נפרדים (א/ב/ג...). לכל סעיף החזר ניקוד, נימוק מפורט ומשוב לשיפור. בצע שקלול כולל לפי נקודות הסעיפים. תמוך ב-OCR חלקי והשלמת שלבים חסרים באופן קוהרנטי. החזר JSON בלבד במבנה הבא:
        {
        "part_results": [{
        "part_id": "א",
        "is_correct": true/false,
        "score": number,            // הניקוד בפועל
        "max_score": number,        // נקודות הסעיף (מהמבנה)
        "score_percentage": number, // 0-100
        "extracted_final_answer": "",
        "feedback": {
        "positive": ["..."],
        "errors": ["..."],
        "suggestions": ["..."]
        },
        "steps_feedback": {
        "correct_steps": ["..."],
        "incorrect_steps": ["..."],
        "missing_steps": ["..."]
        }
        }],
        "overall": {
        "score": number,
        "max_score": number,
        "percentage": number
        },
        "is_correct": true/false,              // תאימות לאחור
        "score_percentage": number,            // תאימות לאחור
        "feedback_overall": ""
        }`
                },
                {
                    role: "user",
                    content: `בדוק את התשובה הבאה לפי סעיפים.

        # שאלה
        ${question}

        # מבנה סעיפים (כולל נקודות אם קיימות)
        ${JSON.stringify(detectedParts, null, 2)}

        # תשובת תלמיד לפי סעיפים (אם חסר – נתח מהטקסט/‏OCR)
        ${JSON.stringify(answersByPart || structuredAnswers || [], null, 2)}

        # OCR (אם זמין)
        ${(ocrText || '').slice(0, 4000)}

        # פתרון נכון/מחוון (אם סופק)
        ${correctAnswer ? `תשובות סופיות:\n${correctAnswer}` : ''}
        ${correctSolutionSteps ? `שלבים:\n${Array.isArray(correctSolutionSteps) ? correctSolutionSteps.join('\n') : correctSolutionSteps}` : ''}

        # מצב בדיקה
        ${checkingMode}
        `
                }
            ],
            file_urls: fileUrls,
            response_format: { type: "json_object" },
            temperature: 0.15,
            max_tokens: 2200
        });

        const checkResult = JSON.parse(checkResponse.choices[0].message.content);

        console.log('✅ Check completed:', checkResult.is_correct ? 'Correct' : 'Incorrect');

        const result = {
            success: true,
            from_cache: false,
            detected_parts: detectedParts,
            answers_by_part: answersByPart,
            ...checkResult
        };

        // Cache save
        if (useCache && !uploadedFileUrl) {
            try {
                const cacheKeyInput2 = answersByPart ? JSON.stringify(answersByPart).substring(0,200) : (typeof studentAnswer === 'string' ? studentAnswer.substring(0,200) : JSON.stringify(structuredAnswers).substring(0,200));
                const checkHash = `check_${question.substring(0, 50)}_${cacheKeyInput2}`;
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