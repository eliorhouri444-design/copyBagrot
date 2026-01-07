import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Allow any authenticated user to use the solver, or maybe restrict to premium?
        // For now, let's allow everyone but log usage.
        
        const { query } = await req.json();

        if (!query) {
            return Response.json({ error: 'Missing query' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        if (!APP_ID) {
            console.error("Missing App_ID_wolframalpha secret");
            return Response.json({ error: 'Configuration error: Missing API Key' }, { status: 500 });
        }

        // 1. Translate Hebrew/Text query to Math/English using LLM
        // This helps Wolfram understand context like "נגזרת של..." or "שטח של..."
        let translatedQuery = query;
        const containsHebrew = /[\u0590-\u05FF]/.test(query);

        if (containsHebrew) {
            try {
                const llmRes = await base44.integrations.Core.InvokeLLM({
                    prompt: `Translate this math problem from Hebrew to English/WolframAlpha syntax. 
                    Keep numbers and formulas intact. 
                    Output ONLY the translated query.
                    Example: "נגזרת של x^2" -> "derivative of x^2"
                    Example: "אינטגרל מ 0 עד 1 של x" -> "integrate x from 0 to 1"
                    Query: "${query}"`
                });
                translatedQuery = typeof llmRes === 'string' ? llmRes.trim() : llmRes.content.trim();
                console.log(`Translated "${query}" to "${translatedQuery}"`);
            } catch (err) {
                console.error("Translation failed, using original query", err);
            }
        }

        // 2. Query Wolfram Alpha
        // output=json is key here
        const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(translatedQuery)}&output=json`;
        
        console.log("Calling Wolfram Alpha...");
        const response = await fetch(url);
        const data = await response.json();

        if (!data.queryresult || !data.queryresult.success) {
             console.log("Wolfram failed or didn't understand:", data);
             // Fallback: Ask LLM to solve it if Wolfram fails? 
             // For now, just return error.
             return Response.json({ 
                 success: false, 
                 error: "לא הצלחנו להבין את השאלה או למצוא פתרון. נסה לנסח מחדש.",
                 details: data.queryresult?.tips?.text
             });
        }

        // 3. Process Pods
        const pods = data.queryresult.pods || [];
        
        // Filter and format pods
        const formattedPods = pods.map(pod => {
            return {
                title: translateTitle(pod.title),
                id: pod.id,
                content: pod.subpods?.map(sub => ({
                    plaintext: sub.plaintext,
                    image: sub.img?.src
                })) || []
            };
        });

        // Prioritize "Result" or "Solution" pods
        const resultPod = formattedPods.find(p => p.id === 'Result' || p.id === 'Solution');
        const plotPods = formattedPods.filter(p => p.id.includes('Plot'));

        return Response.json({
            success: true,
            translated_query: translatedQuery,
            pods: formattedPods,
            primary_result: resultPod,
            plots: plotPods
        });

    } catch (error) {
        console.error("Wolfram Solver Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

// Simple dictionary for common pod titles
function translateTitle(title) {
    const map = {
        "Input": "הקלט שזוהה",
        "Input interpretation": "פרשנות הקלט",
        "Result": "תוצאה",
        "Solution": "פתרון",
        "Decimal approximation": "קירוב עשרוני",
        "Number line": "ציר המספרים",
        "Plots": "גרפים",
        "Plot": "גרף",
        "3D plot": "גרף תלת-ממדי",
        "Geometric figure": "צורה גיאומטרית",
        "Derivative": "נגזרת",
        "Indefinite integral": "אינטגרל לא מסוים",
        "Definite integral": "אינטגרל מסוים",
        "Limit": "גבול",
        "Alternative forms": "צורות אלטרנטיביות",
        "Roots": "שורשים (פתרונות)",
        "Expanded form": "צורה מורחבת",
        "Differential equation solution": "פתרון משוואה דיפרנציאלית"
    };
    return map[title] || title;
}