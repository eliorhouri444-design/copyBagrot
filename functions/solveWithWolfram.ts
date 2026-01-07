import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fixed: Removed 'export default' which caused the deployment issue
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { query } = await req.json();

        if (!query) {
            return Response.json({ error: 'Missing query' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        if (!APP_ID) {
            console.error("Missing App_ID_wolframalpha secret");
            return Response.json({ error: 'Configuration error: Missing API Key' }, { status: 500 });
        }

        // 1. Translate Hebrew/Text query to Math/English
        let translatedQuery = query;
        const containsHebrew = /[\u0590-\u05FF]/.test(query);

        if (containsHebrew) {
            try {
                const translationRes = await base44.integrations.Core.InvokeLLM({
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
        // Added podstate to try and get steps, though often requires Pro
        const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(translatedQuery)}&output=json&podstate=Step-by-step%20solution&podstate=Show%20steps`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data.queryresult || !data.queryresult.success) {
             return Response.json({ 
                 success: false, 
                 error: "לא הצלחנו למצוא פתרון. נסה לנסח מחדש.",
                 details: data.queryresult?.tips?.text
             });
        }

        // 3. Process Pods
        const pods = data.queryresult.pods || [];
        const resultPod = pods.find(p => p.id === 'Result' || p.id === 'Solution') || pods[1]; // Fallback to second pod if no explicit result
        
        const formattedPods = pods.map(pod => ({
            title: translateTitle(pod.title),
            id: pod.id,
            content: pod.subpods?.map(sub => ({
                plaintext: sub.plaintext,
                image: sub.img?.src
            })) || []
        }));

        // 4. Generate Step-by-Step Solution (Photomath Style)
        // We use the LLM to analyze the problem + Wolfram's result to generate clear Hebrew steps
        let steps = [];
        if (resultPod) {
            try {
                const finalAnswer = resultPod.subpods?.[0]?.plaintext || "";
                
                const stepsRes = await base44.integrations.Core.InvokeLLM({
                    prompt: `You are a helpful math tutor. 
                    Problem: "${query}"
                    Correct Final Answer (from Wolfram): "${finalAnswer}"
                    
                    Please provide a clear, step-by-step solution in HEBREW.
                    Break it down into logical steps like a math app (Photomath).
                    
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