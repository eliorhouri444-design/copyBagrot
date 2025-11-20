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

        const { question, imageUrl, units = 5, useCache = true } = await req.json();

        if (!question) {
            return Response.json({ error: 'Missing question' }, { status: 400 });
        }

        // Cache
        if (useCache) {
            const questionHash = `biology_${question.substring(0, 100)}`;
            const cached = await base44.asServiceRole.entities.CachedResponse.filter({ 
                question_hash: questionHash 
            });

            if (cached.length > 0 && cached[0].response_data) {
                const age = Date.now() - new Date(cached[0].created_date).getTime();
                if (age < 7 * 24 * 60 * 60 * 1000) {
                    console.log('✅ Biology cache hit!');
                    return Response.json({
                        success: true,
                        from_cache: true,
                        ...cached[0].response_data
                    });
                }
            }
        }

        console.log('🧬 Solving biology problem...');

        const isSimpleQuestion = question.length < 150 && !imageUrl;
        const modelToUse = isSimpleQuestion ? "gpt-4o-mini" : "gpt-4o";

        const messages = [
            {
                role: "system",
                content: `מומחה ביולוגיה (${units} יח').

**החזר JSON:**
{
  "topic": "genetics/cell_biology/photosynthesis/respiration/evolution",
  "biological_process": "תהליך מרכזי",
  "molecules_involved": ["DNA", "ATP"],
  "organs_systems": ["לב"],
  "steps": [
    {
      "number": 1,
      "title": "...",
      "biological_explanation": "הסבר ביולוגי",
      "molecules": "מולקולות",
      "diagram_description": "דיאגרמה",
      "result": "תוצאה"
    }
  ],
  "final_answer": "התשובה",
  "real_life_example": "דוגמה",
  "key_concepts": ["מושג 1"],
  "full_solution_text": "פתרון מלא"
}

דיוק מדעי מוחלט!`
            },
            {
                role: "user",
                content: imageUrl ? [
                    { type: "text", text: `פתור:\n\n${question}` },
                    { type: "image_url", image_url: { url: imageUrl } }
                ] : `פתור:\n\n${question}`
            }
        ];

        const response = await openai.chat.completions.create({
            model: modelToUse,
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.15,
            max_tokens: 3500
        });

        const solution = JSON.parse(response.choices[0].message.content);

        // Cache
        if (useCache) {
            try {
                const questionHash = `biology_${question.substring(0, 100)}`;
                await base44.asServiceRole.entities.CachedResponse.create({
                    question_hash: questionHash,
                    question_text: question,
                    subject: 'ביולוגיה',
                    response_data: { solution },
                    model_used: modelToUse
                });
            } catch (error) {
                console.warn('⚠️ Cache save failed');
            }
        }

        return Response.json({
            success: true,
            from_cache: false,
            solution: {
                full_text: solution.full_solution_text || solution.steps?.map(s => s.title).join('\n'),
                ...solution
            },
            metadata: { model_used: modelToUse }
        });

    } catch (error) {
        console.error('❌ Biology Solver Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});