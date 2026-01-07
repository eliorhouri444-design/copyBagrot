import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Ensure we parse the body safely
        let query;
        try {
            const body = await req.json();
            query = body.query;
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        if (!query) {
            return Response.json({ error: 'Missing query' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        if (!APP_ID) {
            console.error("Missing App_ID_wolframalpha secret");
            return Response.json({ error: 'Configuration error: Missing API Key' }, { status: 500 });
        }

        // 0. Fetch Learning Context (RAG from Corrections)
        let learningContext = "";
        try {
            // Fetch recent corrections to learn from mistakes
            const feedback = await base44.asServiceRole.entities.SolverFeedback.filter({ 
                is_correct: false,
                category: "math" 
            }, "-created_date", 3); // Get last 3 math corrections

            if (feedback.length > 0) {
                learningContext = `
                IMPORTANT - PREVIOUS USER CORRECTIONS (LEARN FROM THESE MISTAKES):
                ${feedback.map(f => `
                - Mistake in similar problem: "${f.query}"
                - CORRECT LOGIC/ANSWER: "${f.user_correction}"
                `).join('\n')}
                
                APPLY THIS LOGIC IF RELEVANT.
                `;
            }
        } catch (err) {
            console.error("Failed to fetch learning context", err);
        }

        // 1. Translate Hebrew/Text query to Math/English
        let translatedQuery = query;
        const containsHebrew = /[\u0590-\u05FF]/.test(query);

        if (containsHebrew) {
            try {
                // Use service role to ensure reliability
                const translationRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Translate this math problem from Hebrew to English/WolframAlpha syntax. 
                    Keep numbers and formulas intact. 
                    Output ONLY the translated query.
                    Query: "${query}"`
                });
                translatedQuery = typeof translationRes === 'string' ? translationRes.trim() : translationRes.content.trim();
            } catch (err) {
                console.error("Translation failed", err);
            }
        }

        // 2. Query Wolfram Alpha
        const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(translatedQuery)}&output=json&podstate=Step-by-step%20solution&podstate=Show%20steps`;
        
        const response = await fetch(url);
        const data = await response.json();

        // 2.5 Fallback to LLM if Wolfram fails or for non-math queries
        if (!data.queryresult || !data.queryresult.success) {
             console.log("Wolfram failed, attempting LLM fallback...");
             
             try {
                // Determine the domain (Math/Physics/Engineering/Code)
                const fallbackRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `You are an expert scientific and engineering solver. The user asked: "${query}".
                    Wolfram Alpha could not solve it directly.

                    ${learningContext}
                    
                    Please solve this problem step-by-step.
                    - If it's code, debug it or write the solution.
                    - If it's engineering, apply the correct formulas and show work.
                    - If it's math/physics, show the solution.
                    
                    Return a JSON object with:
                    {
                        "primary_result_title": "Final Answer / Summary",
                        "primary_result_content": "The concise final answer",
                        "steps": [
                            { "title": "Step 1", "description": "...", "latex": "..." }
                        ]
                    }
                    Output MUST be in HEBREW (except code/formulas).`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            primary_result_title: { type: "string" },
                            primary_result_content: { type: "string" },
                            steps: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        latex: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                if (fallbackRes) {
                    return Response.json({
                        success: true,
                        translated_query: translatedQuery,
                        pods: [],
                        primary_result: {
                            title: fallbackRes.primary_result_title || "תוצאה",
                            content: [{ plaintext: fallbackRes.primary_result_content, image: null }]
                        },
                        steps: fallbackRes.steps || []
                    });
                }
             } catch (llmErr) {
                 console.error("LLM Fallback failed:", llmErr);
             }

             return Response.json({ 
                 success: false, 
                 error: "לא הצלחנו למצוא פתרון. נסה לנסח מחדש או להעלות קובץ ברור יותר.",
                 details: data.queryresult?.tips?.text
             });
        }

        // 3. Process Pods
        const pods = data.queryresult.pods || [];
        const resultPod = pods.find(p => p.id === 'Result' || p.id === 'Solution') || pods[1]; 
        
        const formattedPods = pods.map(pod => ({
            title: translateTitle(pod.title),
            id: pod.id,
            content: pod.subpods?.map(sub => ({
                plaintext: sub.plaintext,
                image: sub.img?.src
            })) || []
        }));

        // 4. Generate Step-by-Step Solution
        let steps = [];
        if (resultPod) {
            try {
                const finalAnswer = resultPod.subpods?.[0]?.plaintext || "";
                
                // Use service role here too
                const stepsRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `You are a helpful math tutor. 
                    Problem: "${query}"
                    Correct Final Answer (from Wolfram): "${finalAnswer}"

                    ${learningContext}
                    
                    Please provide a clear, step-by-step solution in HEBREW.
                    Break it down into logical steps like a math app (Photomath).
                    BE EXTREMELY PRECISE with geometry and algebraic derivations.
                    
                    Return ONLY a JSON object with this structure:
                    {
                        "steps": [
                            { "title": "שלב 1", "description": "explanation...", "latex": "math formula if needed" },
                            { "title": "שלב 2", "description": "...", "latex": "..." }
                        ]
                    }`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            steps: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        latex: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });
                
                if (stepsRes && stepsRes.steps) {
                    steps = stepsRes.steps;
                }
            } catch (err) {
                console.error("Step generation failed", err);
            }
        }

        return Response.json({
            success: true,
            translated_query: translatedQuery,
            pods: formattedPods,
            primary_result: formattedPods.find(p => p.id === resultPod?.id),
            steps: steps
        });

    } catch (error) {
        console.error("Wolfram Solver Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function translateTitle(title) {
    const map = {
        "Input": "הקלט שזוהה",
        "Input interpretation": "פרשנות הקלט",
        "Result": "תוצאה",
        "Solution": "פתרון",
        "Plots": "גרפים",
        "Plot": "גרף",
        "Derivative": "נגזרת",
        "Indefinite integral": "אינטגרל",
        "Definite integral": "אינטגרל מסוים",
        "Roots": "שורשים",
        "Alternative forms": "צורות אלטרנטיביות"
    };
    return map[title] || title;
}