import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await req.json();
        const appId = Deno.env.get("App_ID_wolframalpha");

        if (!appId) {
            return Response.json({ error: 'Wolfram Alpha App ID not configured' }, { status: 500 });
        }

        if (!query) {
            return Response.json({ error: 'Query is required' }, { status: 400 });
        }

        // Step 1: Translate Hebrew to English Math Syntax (if Hebrew is present)
        let translatedQuery = query;
        if (/[א-ת]/.test(query)) {
            try {
                const llmResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: `You are a math translator. 
Goal: Convert this Hebrew math question into a precise Wolfram Alpha query string (English).
Input: "${query}"

Instructions:
1. Identify the math problem (Equation, Derivative, Integral, Plot, etc.).
2. Convert to English terminology (e.g., 'נגזרת' -> 'derivative', 'אינטגרל' -> 'integrate').
3. Format specifically for Wolfram Alpha (e.g., "solve x^2=4", "derivative of x^2", "plot sin(x)").
4. ONLY output the query string. No extra words.

Query:`,
                });
                // InvokeLLM returns a string when no schema is provided.
                // Clean up any potential quotes or whitespace.
                translatedQuery = llmResponse.trim().replace(/^"|"$/g, '');
            } catch (e) {
                console.error("LLM Translation failed:", e);
                // Fallback to original query if translation fails
            }
        }

        console.log(`Wolfram Query: Original="${query}" -> Translated="${translatedQuery}"`);

        // Step 2: Query Wolfram Alpha
        const url = `https://api.wolframalpha.com/v2/query?appid=${appId}&input=${encodeURIComponent(translatedQuery)}&output=json&format=image,plaintext`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.queryresult.success === false) {
             return Response.json({ 
                success: false,
                error: "Wolfram Alpha could not understand the query",
                debug_query: translatedQuery
            });
        }

        // Step 3: Process and Filter Pods
        const pods = data.queryresult.pods || [];
        
        // Prioritize result/solution pods
        const resultPods = pods.filter(pod => 
            pod.primary || 
            pod.title === 'Result' || 
            pod.title === 'Decimal approximation' ||
            pod.title === 'Solution' || 
            pod.title === 'Exact result' ||
            pod.title === 'Complex solution' ||
            pod.title === 'Real solution' ||
            pod.title === 'Plot' ||
            pod.title === 'Graphs'
        );
        
        const targetPods = resultPods.length > 0 ? resultPods : pods.slice(0, 3);

        // Dictionary for title translation
        const titleTranslation = {
            "Result": "תוצאה",
            "Solution": "פתרון",
            "Decimal approximation": "קירוב עשרוני",
            "Exact result": "תוצאה מדויקת",
            "Complex solution": "פתרון מרוכב",
            "Real solution": "פתרון ממשי",
            "Plot": "גרף",
            "Graphs": "גרפים",
            "Derivative": "נגזרת",
            "Indefinite integral": "אינטגרל לא מסוים",
            "Definite integral": "אינטגרל מסוים",
            "Geometric figure": "צורה גאומטרית",
            "Input": "קלט",
            "Input interpretation": "פרשנות קלט"
        };

        const relevantPods = targetPods.map(pod => ({
            title: titleTranslation[pod.title] || pod.title,
            content: pod.subpods.map(sub => ({
                text: sub.plaintext,
                image: sub.img.src
            }))
        }));

        return Response.json({ 
            success: true,
            pods: relevantPods,
            translated_query: translatedQuery
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});