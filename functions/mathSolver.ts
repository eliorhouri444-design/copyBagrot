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

        const { question, latexFormulas, diagram, topic, difficulty = 'medium', useCache = true } = await req.json();

        if (!question) {
            return Response.json({ error: 'Missing question' }, { status: 400 });
        }

        // בדיקת cache
        if (useCache) {
            const questionHash = `math_${question.substring(0, 100)}`;
            const cached = await base44.asServiceRole.entities.CachedResponse.filter({ 
                question_hash: questionHash 
            });

            if (cached.length > 0) {
                const cacheEntry = cached[0];
                const age = Date.now() - new Date(cacheEntry.created_date).getTime();
                
                // Cache תקף ל-7 ימים
                if (age < 7 * 24 * 60 * 60 * 1000) {
                    console.log('✅ Cache hit! Returning immediately');
                    return Response.json({
                        success: true,
                        from_cache: true,
                        ...cacheEntry.response_data
                    });
                }
            }
        }

        console.log('🧮 Solving math problem:', topic, difficulty);

        // זיהוי אוטומטי: שאלה פשוטה = מודל מהיר
        const isSimpleQuestion = difficulty === 'easy' || 
            (!diagram && question.length < 200 && !question.includes('הוכח'));
        
        const modelToUse = isSimpleQuestion ? "gpt-4o-mini" : "gpt-4o";
        console.log(`🎯 Using ${modelToUse} for ${isSimpleQuestion ? 'simple' : 'complex'} question`);

        // **קריאה אחת עם JSON מובנה**
        const solutionResponse = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
                {
                    role: "system",
                    content: `אתה מומחה מתמטיקה לבגרות ישראלית.

**החזר JSON מובנה ישירות:**
{
  "steps": [
    {
      "number": 1,
      "title": "ניתוח נתונים",
      "explanation": "הסבר מה עושים",
      "formula": "LaTeX נוסחה",
      "calculation": "החישוב המלא",
      "result": "תוצאה"
    }
  ],
  "final_answer": "התשובה הסופית",
  "answer_units": "יחידות",
  "verification": "בדיקת סבירות",
  "difficulty_rating": "easy/medium/hard/expert",
  "topics_used": ["נושא 1"],
  "formulas_used": ["משפט 1"],
  "full_solution_text": "פתרון מלא בטקסט"
}

**עקרונות:**
1. שלבים ברורים עם הסברים
2. כל חישוב מפורט
3. בדיקה בסוף
4. דיוק מוחלט!`
                },
                { 
                    role: "user", 
                    content: `פתור:

${question}

${latexFormulas && latexFormulas.length > 0 ? `נוסחאות:\n${latexFormulas.join('\n')}\n` : ''}
${diagram ? `איור:\n${JSON.stringify(diagram, null, 2)}\n` : ''}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 4000
        });

        const solution = JSON.parse(solutionResponse.choices[0].message.content);

        console.log('✅ Solution completed with', solution.steps?.length || 0, 'steps');

        // שמירה ב-cache
        if (useCache) {
            try {
                const questionHash = `math_${question.substring(0, 100)}`;
                await base44.asServiceRole.entities.CachedResponse.create({
                    question_hash: questionHash,
                    question_text: question,
                    subject: 'מתמטיקה',
                    response_data: { solution },
                    model_used: modelToUse
                });
            } catch (error) {
                console.warn('⚠️ Cache save failed:', error);
            }
        }

        return Response.json({
            success: true,
            from_cache: false,
            solution: {
                full_text: solution.full_solution_text || solution.steps?.map(s => s.title + ': ' + s.explanation).join('\n\n'),
                steps: solution.steps || [],
                final_answer: solution.final_answer,
                answer_units: solution.answer_units,
                verification: solution.verification,
                difficulty: solution.difficulty_rating,
                topics: solution.topics_used || [],
                formulas: solution.formulas_used || []
            },
            metadata: {
                model_used: modelToUse,
                processing_speed: isSimpleQuestion ? 'fast' : 'standard'
            }
        });

    } catch (error) {
        console.error('❌ Math Solver Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});