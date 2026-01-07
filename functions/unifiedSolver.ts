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
        
        // --- STEP 1: ROUTER & CLASSIFIER ---
        // Classify the problem and decide on a strategy
        const classificationRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
            ROLE: Senior Bagrut (Israeli Matriculation) Examiner.
            TASK: Classify the following problem and select the optimal solving strategy.
            
            PROBLEM: "${query}"
            
            DECISION MAP:
            1. GEOMETRY:
               - "Intersection/Square/Rectangle" -> Strategy: "Analytical Geometry (Coordinates)"
               - "Parallel lines/Ratios" -> Strategy: "Thales / Similarity"
               - "Circle/Tangent" -> Strategy: "Circle Theorems"
            2. ANALYSIS (Calculus):
               - "Function analysis/Area/Extremum" -> Strategy: "Calculus Protocol"
            3. ALGEBRA:
               - "Equations/Series/Complex Numbers" -> Strategy: "Algebraic Manipulation"
            4. PHYSICS:
               - "Forces/Motion" -> Strategy: "Newton's Laws"
               - "Energy/Work" -> Strategy: "Energy Conservation"
               - "Circuits" -> Strategy: "Kirchhoff's Laws"

            OUTPUT JSON:
            {
                "domain": "Math" | "Physics",
                "topic": "string (e.g. Euclidean Geometry, Kinematics)",
                "difficulty": "3_units" | "4_units" | "5_units",
                "strategy": "string (The chosen strategy from map)",
                "tool_needed": "Wolfram" | "GeoGebra" | "LogicalDerivation",
                "wolfram_query": "string (Translate problem to English for Wolfram Alpha, or null if not applicable)"
            }
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    domain: { type: "string" },
                    topic: { type: "string" },
                    difficulty: { type: "string" },
                    strategy: { type: "string" },
                    tool_needed: { type: "string" },
                    wolfram_query: { type: "string" }
                },
                required: ["domain", "strategy"]
            }
        });

        const router = classificationRes; // { domain, topic, strategy, ... }
        let wolframData = null;
        let solutionSkeleton = "";

        // --- STEP 2: SOLVER ENGINE ---
        
        // Engine A: Wolfram Alpha (for Calculations / Algebra / Calculus)
        if (router.wolfram_query && APP_ID) {
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

        // Engine B: LLM Solver (The "Explainer" & Logic Engine)
        // We feed it the Router's decision + Wolfram's raw data (if any)
        
        const protocols = `
        *** SOLVING PROTOCOLS ***
        
        [Geometry - Analytical Strategy]
        1. Define Origin: Let A=(0,0) or Center=(0,0).
        2. Coordinates: Express all points (x,y) based on parameters (t, alpha).
        3. Equations: Line equations, Distance formula.
        4. Solve: Find parameters.
        5. Verify: Check if result makes geometric sense.

        [Physics Protocol]
        1. Diagram & Axis: Define positive direction.
        2. Knowns: List vars (v, a, t, F, m).
        3. Law: State Newton's 2nd / Energy Conservation equation.
        4. Solve: Isolate variable.
        5. Units: Final answer MUST have units.

        [Calculus Protocol]
        1. Domain: Check denominators/logs.
        2. Derivative: f'(x)=0 for extremum.
        3. Table: Check signs.
        4. Sketch: Key points.
        `;

        const finalSolutionRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
            ROLE: Expert Tutor.
            TASK: Solve the problem step-by-step in HEBREW, following the defined strategy.
            
            CONTEXT:
            - Problem: "${query}"
            - Classification: ${JSON.stringify(router)}
            - Wolfram Alpha Result (Raw): ${wolframData ? JSON.stringify(wolframData.queryresult.pods) : "Not available"}
            
            ${protocols}

            INSTRUCTIONS:
            1. Follow the Strategy: "${router.strategy}".
            2. If Geometry: Generate GeoGebra commands to visualize.
            3. If Physics: Enforce Units.
            4. VERIFICATION: Add a final step checking the logic (substitution/sanity check).

            OUTPUT JSON:
            {
                "final_answer": "string",
                "steps": [
                    { "title": "שלב 1: זיהוי והגדרה", "description": "...", "latex": "..." },
                    { "title": "שלב 2: משוואה", "description": "...", "latex": "..." }
                ],
                "geogebra_commands": ["string"] (optional),
                "verification_status": "Verified by substitution/logic"
            }
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    final_answer: { type: "string" },
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
                    verification_status: { type: "string" }
                },
                required: ["steps", "final_answer"]
            }
        });

        return Response.json({
            success: true,
            classification: router,
            solution: finalSolutionRes,
            // Keep legacy format structure for frontend compatibility where possible
            primary_result: { 
                title: "תוצאה סופית", 
                content: [{ plaintext: finalSolutionRes.final_answer, image: null }] 
            },
            steps: finalSolutionRes.steps,
            geogebra_commands: finalSolutionRes.geogebra_commands || [],
            verification: finalSolutionRes.verification_status
        });

    } catch (error) {
        console.error("Unified Solver Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});