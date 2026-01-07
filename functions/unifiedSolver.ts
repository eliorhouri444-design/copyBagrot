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
        // If we have a file but no text query, we MUST extract text from the image.
        if (file_url && (!query || query.trim().length === 0)) {
            try {
                console.log("Starting OCR for:", file_url);
                
                const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `
                    ROLE: Elite Mathematical Vision Engine.
                    TASK: Extract ALL problem content from the image for a Solver.
                    
                    CRITICAL INSTRUCTIONS FOR HEBREW & DIAGRAMS:
                    1. HEBREW: Transcribe all Hebrew text EXACTLY as it appears. Do not translate.
                    2. MATH: Convert all formulas to standard LaTeX (e.g. \\frac{a}{b}, x^2).
                    3. DIAGRAMS: If there is a geometry diagram (triangle, circle, graph):
                       - Describe it explicitly in text. 
                       - Example: "משולש ABC, זווית B היא 90 מעלות. נתון AB=5..."
                       - List all labeled points and values shown in the drawing.
                    4. IGNORE: Page headers, footers, question numbers (like "Question 5").
                    
                    OUTPUT FORMAT:
                    Return ONLY the extracted text description. 
                    Do not add "Here is the transcription". 
                    Do not solve the problem.
                    `,
                    file_urls: [file_url]
                });
                
                let extractedText = typeof ocrRes === 'string' ? ocrRes : ocrRes.content;
                
                // Cleanup artifacts
                if (extractedText) {
                    extractedText = extractedText
                        .replace(/```(latex|text|markdown)?/gi, '')
                        .replace(/```/g, '')
                        .trim();
                }

                query = extractedText;
                console.log("OCR Result:", query);
                
                if (!query || query.length < 2) {
                    throw new Error("OCR returned empty text");
                }
            } catch (err) {
                console.error("OCR Failed:", err);
                return Response.json({ 
                    error: 'לא הצלחנו לפענח את התמונה. אנא וודא שהתמונה ברורה, או נסה להקליד את השאלה ידנית.',
                    details: err.message
                }, { status: 400 });
            }
        }

        if (!query) {
            console.warn("Missing query after processing. Body was:", body);
            return Response.json({ error: 'לא התקבלה שאלה. אנא העלה תמונה או הקלד טקסט.' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        
        // --- LAYER B: ROUTER (Classification) ---
        const routerPrompt = `
        ROLE: Senior Bagrut Exam Router.
        SYSTEM: BagrutMathSolverIL v2.0
        
        TASK: Classify the problem and select the best matching Template ID.
        
        PROBLEM: "${query}"
        
        ROUTER RULES:
        ${JSON.stringify(bagrutConfig.router_rules)}
        
        INSTRUCTIONS:
        1. Analyze the text for keywords and math structures.
        2. Match strictly against regex patterns if possible.
        3. Determine Subject (Math/Physics) and Unit Level (3/4/5).
        4. Select Template ID. Default: "GENERAL_SOLVER".
        
        OUTPUT JSON:
        {
            "subject": "Math" | "Physics",
            "unit_level": 3 | 4 | 5,
            "topic": "string",
            "template_id": "string",
            "wolfram_query": "string (translation to english math syntax)"
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
        const selectedTemplate = bagrutConfig.templates.find(t => t.id === router.template_id);
        
        let wolframData = null;

        // --- LAYER C: SOLVER ENGINE (Wolfram CAS) ---
        if (router.wolfram_query && APP_ID) {
            try {
                // Wolfram doesn't handle heavy geometry text well, better for algebra/calculus
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

        // --- LAYER D & E: EXPLAINER & VERIFIER ---
        const explainerPrompt = `
        ROLE: Expert Bagrut Tutor & Examiner.
        TASK: Solve the problem completely and generate student aids.
        
        CONTEXT:
        - Problem Text: "${query}"
        - Classification: ${JSON.stringify(router)}
        - Selected Template: ${selectedTemplate ? JSON.stringify(selectedTemplate) : "General Approach"}
        - External CAS Data: ${wolframData ? JSON.stringify(wolframData.queryresult.pods) : "None"}
        
        INSTRUCTIONS:
        1. SOLUTION:
           - If GEOMETRY: Deduce properties from the text description (e.g. "square" -> equal sides, 90 deg angles).
           - Solve step-by-step in HEBREW.
           - Be explicit about theorems used (e.g. "משפט תלס", "פיתגורס").
        
        2. SCAFFOLDING (Hints):
           - Generate 2 progressive hints.
           - Generate a Skeleton (main milestones).
        
        3. RUBRIC:
           - Create a realistic grading rubric (total 100% or question points).
           
        4. VERIFICATION:
           - Double check your own logic.
           - If Geometry, check standard ratios.
        
        OUTPUT JSON: Match schema exactly.
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
                required: ["steps", "final_answer", "action_plan"]
            }
        });

        // Enrich classification
        const enrichedClassification = {
            ...router,
            strategy: selectedTemplate?.title || "פתרון כללי",
            domain: router.subject
        };

        return Response.json({
            success: true,
            translated_query: query, // Pass back the OCR result so user sees what was understood
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
        return Response.json({ error: "שגיאה פנימית במערכת: " + error.message }, { status: 500 });
    }
});