import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { query, file_url } = body;
        if (!query) {
            return Response.json({ error: 'Missing query' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        
        // --- LAYER A: NORMALIZER (Implicit in LLM handling) ---
        // We assume 'query' is the raw text/OCR result.

        // --- LAYER B: ROUTER (Classification & Strategy Selection) ---
        // Classify the problem specifically for Israeli Bagrut standards (3/4/5 units)
        const classificationRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
            ROLE: Senior Bagrut Exam Classifier.
            TASK: Analyze the following problem and determine the optimal solving route.
            
            PROBLEM: "${query}"
            
            CLASSIFICATION RULES:
            1. SUBJECT: Math or Physics.
            2. LEVEL: 3, 4, or 5 Units (estimate based on complexity).
            3. TOPIC: 
               - Math: Algebra, Geometry (Euclidean/Analytical), Trigonometry, Calculus (Function Analysis), Sequences, Probability, Vectors, Complex Numbers.
               - Physics: Kinematics, Dynamics (Newton), Energy, Momentum, Circular Motion, Harmonic Motion, Electricity, Magnetism, Optics, Waves.
            4. TASK TYPE: "Find", "Prove", "Sketch", "Investigate" (Chakira).

            STRATEGY SELECTION (DECISION MAP):
            - If "Series" with recursion (a_n+1 = k*a_n + c) -> Strategy: "Shift to Geometric Series".
            - If "Geometry" with shapes in coordinate system -> Strategy: "Analytical Geometry".
            - If "Geometry" pure proof -> Strategy: "Euclidean Proofs".
            - If "Calculus" function analysis -> Strategy: "Full Investigation Protocol".
            - If "Physics" -> Strategy: "Diagram -> Equations -> Solve -> Units".

            OUTPUT JSON:
            {
                "subject": "Math" | "Physics",
                "unit_level": 3 | 4 | 5,
                "topic": "string",
                "task_type": "string",
                "strategy": "string (The chosen solving path)",
                "tool_needed": "Wolfram" | "GeoGebra" | "LogicOnly",
                "wolfram_query": "string (Translate to English for Wolfram, null if not needed)"
            }
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    subject: { type: "string" },
                    unit_level: { type: "integer" },
                    topic: { type: "string" },
                    task_type: { type: "string" },
                    strategy: { type: "string" },
                    tool_needed: { type: "string" },
                    wolfram_query: { type: "string" }
                },
                required: ["subject", "strategy"]
            }
        });

        const router = classificationRes;
        let wolframData = null;

        // --- LAYER C: SOLVERS (Engine Basket) ---
        
        // Engine 1: Wolfram Alpha (CAS) - for Algebra/Calculus/Results verification
        if (router.wolfram_query && APP_ID && router.tool_needed !== "LogicOnly") {
            try {
                const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(router.wolfram_query)}&output=json&podstate=Step-by-step%20solution&podstate=Show%20steps`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.queryresult && data.queryresult.success) {
                    wolframData = data;
                }
            } catch (err) {
                console.error("Wolfram query failed:", err);
            }
        }

        // --- LAYER D & E: VERIFIER & EXPLAINER (LLM Logic) ---
        
        const bagrutTemplates = `
        *** GOLDEN BAGRUT TEMPLATES ***
        
        [Template: Recursive Series]
        If a_{n+1} = k*a_n + c:
        1. Define b_n = a_n + c/(k-1).
        2. Prove b_n is geometric with q=k.
        3. Find b_1, then a_n formula.
        
        [Template: Function Investigation (Calculus)]
        1. Domain (Tehum Hagdara) - Check denominators != 0, logs > 0.
        2. Intersections (X/Y axes).
        3. Derivative f'(x) -> Find critical points (f'(x)=0).
        4. Classification (Table/2nd Derivative).
        5. Ascending/Descending intervals.
        6. Sketch.

        [Template: Geometry (Bagrut Standard)]
        - Format: "Claim | Reason".
        - ALWAYS state the theorem name (e.g., "Angles on the same arc are equal").
        - If coordinates: Use distance/slope formulas explicitly.

        [Template: Physics]
        1. Given/Required list.
        2. Free Body Diagram / Sketch description.
        3. Base Equation (e.g., Sigma F = ma).
        4. Isolating variable.
        5. Substitution & Units.
        `;

        const finalSolutionRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
            ROLE: Expert Bagrut Tutor & Verifier.
            TASK: Generate a perfect, verified step-by-step solution in HEBREW.
            
            CONTEXT:
            - Problem: "${query}"
            - Classification: ${JSON.stringify(router)}
            - Wolfram Data: ${wolframData ? JSON.stringify(wolframData.queryresult.pods) : "Not available"}
            
            ${bagrutTemplates}

            PROCESS (Execute internally before outputting):
            1. ACTION PLAN: Create a logical plan based on the Strategy "${router.strategy}".
            2. SOLVE: Execute steps. Use Wolfram data for calculation checks.
            3. VERIFY: 
               - Algebra: Substitute answer back into equation?
               - Geometry: Do lengths/angles make sense?
               - Physics: Are units correct?
            4. FORMAT: Write the final JSON response.

            OUTPUT JSON STRUCTURE:
            {
                "final_answer": "string (Concise result)",
                "action_plan": ["step 1...", "step 2..."],
                "steps": [
                    { "title": "step title", "description": "detailed explanation", "latex": "formula" }
                ],
                "geogebra_commands": ["string"] (if geometry),
                "verification": {
                    "method": "Substitution / Logical Check / Dimensional Analysis",
                    "status": "Verified / Partial",
                    "details": "string"
                }
            }
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    final_answer: { type: "string" },
                    action_plan: { type: "array", items: { type: "string" } },
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
                    },
                    geogebra_commands: { type: "array", items: { type: "string" } },
                    verification: {
                        type: "object",
                        properties: {
                            method: { type: "string" },
                            status: { type: "string" },
                            details: { type: "string" }
                        }
                    }
                },
                required: ["steps", "final_answer", "verification"]
            }
        });

        return Response.json({
            success: true,
            classification: router,
            solution: finalSolutionRes,
            // Legacy mapping for UI
            primary_result: { 
                title: "תוצאה סופית", 
                content: [{ plaintext: finalSolutionRes.final_answer, image: null }] 
            },
            steps: finalSolutionRes.steps,
            geogebra_commands: finalSolutionRes.geogebra_commands || [],
            verification: finalSolutionRes.verification?.status || "Verified",
            action_plan: finalSolutionRes.action_plan
        });

    } catch (error) {
        console.error("Unified Solver Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});