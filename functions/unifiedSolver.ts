import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { bagrutConfig } from './bagrutConfig.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        let { query, file_url } = body;

        // --- LAYER A: INPUT PROCESSING & OCR (Normalizer) ---
        // 1. Handle File Upload (OCR)
        if (file_url && (!query || query.trim().length === 0)) {
            try {
                console.log("Processing image with OCR/Vision:", file_url);
                const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `
                    ROLE: Expert Mathematical OCR Engine.
                    TASK: Transcribe the content of this image perfectly into text/LaTeX.
                    
                    INSTRUCTIONS:
                    1. EXTRACT:
                       - Hebrew text: Copy exactly.
                       - Math: Convert to standard LaTeX.
                       - Diagrams: Describe geometric properties explicitly (e.g., "Triangle ABC is isosceles, AB=AC, angle A=30").
                    
                    2. FORMAT:
                       - Output ONLY the problem text.
                       - No prefixes like "Here is the text".
                       - No markdown code blocks.
                    `,
                    file_urls: [file_url]
                });
                
                let extractedText = typeof ocrRes === 'string' ? ocrRes : ocrRes.content;
                
                // Cleanup common LLM artifacts
                if (extractedText) {
                    extractedText = extractedText.replace(/```(latex|text)?/g, '').replace(/```/g, '').trim();
                }

                query = extractedText;
                console.log("OCR Result (Cleaned):", query);
                
                if (!query || query.length < 2) {
                    throw new Error("OCR produced empty result.");
                }
            } catch (err) {
                console.error("OCR Error:", err);
                return Response.json({ error: 'שגיאה בפענוח התמונה. אנא נסה תמונה ברורה יותר או הקלד את השאלה.' }, { status: 400 });
            }
        }

        if (!query) {
            console.error("Error: Query is missing after processing. Body:", body);
            return Response.json({ error: 'לא התקבלה שאלה (טקסט או תמונה).' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        
        // --- LAYER B: ROUTER (Using Bagrut Config) ---
        // Provide the LLM with the config rules to select the best template
        const routerPrompt = `
        ROLE: Senior Bagrut Exam Router.
        SYSTEM: BagrutMathSolverIL v1.0
        
        TASK: Classify the problem and select the best matching Template ID from the configuration.
        
        PROBLEM: "${query}"
        
        ROUTER RULES:
        ${JSON.stringify(bagrutConfig.router_rules)}
        
        INSTRUCTIONS:
        1. Analyze keywords in the problem.
        2. Match against "match_any" keywords in rules.
        3. Select the best "template_priority" ID. If no specific match, use "GENERAL".
        4. Determine unit level (3/4/5) based on complexity.
        5. Generate a Wolfram Alpha query string if useful.

        OUTPUT JSON:
        {
            "subject": "Math" | "Physics",
            "unit_level": 3 | 4 | 5,
            "topic": "string",
            "template_id": "string (e.g., T-FUNC-INVEST-STD)",
            "wolfram_query": "string (or null)"
        }
        `;

        const classificationRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: routerPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    subject: { type: "string" },
                    unit_level: { type: "integer" },
                    topic: { type: "string" },
                    template_id: { type: "string" },
                    wolfram_query: { type: "string" }
                },
                required: ["subject", "template_id"]
            }
        });

        const router = classificationRes;
        
        // Find the full template object
        const selectedTemplate = bagrutConfig.templates.find(t => t.id === router.template_id) || null;
        
        let wolframData = null;

        // --- LAYER C: SOLVER ENGINE (Wolfram CAS) ---
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

        // --- LAYER D & E: EXPLAINER & VERIFIER (Template-Based) ---
        
        const explainerPrompt = `
        ROLE: Expert Bagrut Tutor & Examiner.
        TASK: Solve the problem using the STRICT TEMPLATE PLAN provided and generate pedagogical aids (hints, rubrics).
        
        CONTEXT:
        - Problem: "${query}"
        - Classification: ${JSON.stringify(router)}
        - Selected Template: ${selectedTemplate ? JSON.stringify(selectedTemplate) : "General Problem Solving"}
        - Wolfram Data: ${wolframData ? JSON.stringify(wolframData.queryresult.pods) : "Not available"}
        
        INSTRUCTIONS:
        1. ACTION PLAN: Adopt the 'plan' from the template.
        2. EXPLAINER: Use the 'explainer_script' tone/style.
        3. VERIFY: Perform the checks listed in 'verifier'.
        4. HINTS: Adapt the template hints to the specific numbers/context of this problem.
        5. MISTAKES: List specific common mistakes relevant to this problem.
        6. RUBRIC: Define a grading rubric (points allocation).
        
        OUTPUT JSON MUST MATCH THE SCHEMA EXACTLY.
        `;

        const finalSolutionRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: explainerPrompt,
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
                            status: { type: "string" },
                            details: { type: "string" }
                        }
                    },
                    hints: {
                        type: "object",
                        properties: {
                            hint1: { type: "array", items: { type: "string" } },
                            hint2: { type: "array", items: { type: "string" } },
                            skeleton: { type: "array", items: { type: "string" } },
                            full: { type: "array", items: { type: "string" } }
                        }
                    },
                    common_mistakes: { type: "array", items: { type: "string" } },
                    grading_rubric: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                points: { type: "integer" },
                                for: { type: "string" }
                            }
                        }
                    }
                },
                required: ["steps", "final_answer", "hints", "common_mistakes"]
            }
        });

        // Enrich the classification object for frontend display
        const enrichedClassification = {
            ...router,
            strategy: selectedTemplate?.title || router.template_id, 
            domain: router.subject 
        };

        return Response.json({
            success: true,
            classification: enrichedClassification,
            solution: finalSolutionRes,
            primary_result: { 
                title: "תוצאה סופית", 
                content: [{ plaintext: finalSolutionRes.final_answer, image: null }] 
            },
            steps: finalSolutionRes.steps,
            geogebra_commands: finalSolutionRes.geogebra_commands || [],
            verification: finalSolutionRes.verification?.status || "Verified",
            action_plan: finalSolutionRes.action_plan,
            hints: finalSolutionRes.hints,
            common_mistakes: finalSolutionRes.common_mistakes,
            grading_rubric: finalSolutionRes.grading_rubric
        });

    } catch (error) {
        console.error("Unified Solver Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});