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

        // Use Wolfram Alpha Full Results API (v2) to get steps and images
        const url = `http://api.wolframalpha.com/v2/query?appid=${appId}&input=${encodeURIComponent(query)}&output=json&format=image,plaintext`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.queryresult.success === false) {
             return Response.json({ 
                success: false,
                error: "Wolfram Alpha could not understand the query"
            });
        }

        // Process pods to extract relevant info (Input, Result, Steps/Solution)
        const pods = data.queryresult.pods || [];
        
        // Filter for result/solution pods
        // Look for primary=true or specific titles
        const resultPods = pods.filter(pod => 
            pod.primary || 
            pod.title === 'Result' || 
            pod.title === 'Decimal approximation' ||
            pod.title === 'Solution' || 
            pod.title === 'Exact result'
        );
        
        // If we found result pods, use them. Otherwise, fallback to the first few pods (input + result usually)
        // but since user asked for "final answer only", we prefer strictly resultPods if available.
        const targetPods = resultPods.length > 0 ? resultPods : pods.slice(0, 2);

        const relevantPods = targetPods.map(pod => ({
            title: pod.title,
            content: pod.subpods.map(sub => ({
                text: sub.plaintext,
                image: sub.img.src
            }))
        }));

        return Response.json({ 
            success: true,
            pods: relevantPods
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});