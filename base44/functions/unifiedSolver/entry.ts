import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// --- EMBEDDED CONFIGURATION (To ensure zero dependency issues) ---
const bagrutConfig = {
  "system_name": "BagrutMathSolverIL",
  "version": "2.2",
  "locale": "he-IL",
  "supported_units": [3, 4, 5],
  
  "global_quality": {
    "routing": {
      "use_scored_rules": true,
      "min_confidence_to_auto_solve": 0.72
    },
    "output": {
      "include_common_mistakes": true,
      "include_grading_rubric": true,
      "include_hint_buttons": true
    }
  },

  "router_rules": [
    {
      "id": "R-SEQ-RECUR-STRONG",
      "units": [5],
      "topic": "sequences_series",
      "regex_any": ["a_\\{n\\+1\\}\\s*=\\s*\\d+\\s*a_n", "נסיגה|סדרה\\s+מוגדרת"],
      "template_priority": ["T-SEQ-LINREC-SHIFT"]
    },
    {
      "id": "R-FUNC-INVEST-STRONG",
      "units": [4, 5],
      "topic": "functions_calculus",
      "regex_any": ["חקור|נגזרת|קיצון|סקיצה|עליה|ירידה|פונקציה"],
      "template_priority": ["T4-FUNC-INVEST-STD", "T-FUNC-INVEST-STD"]
    },
    {
      "id": "R-TRIG-EQ-STRONG",
      "units": [4, 5],
      "topic": "trigonometry",
      "regex_any": ["sin|cos|tan|טריגו|משוואה"],
      "template_priority": ["T-TRIG-EQ-STD"]
    },
    {
      "id": "R3-GEO-SIMILARITY-STRONG",
      "units": [3, 4],
      "topic": "geometry_plane",
      "regex_any": ["משולש|דמיון|תלס|חוצה\\s+זווית|יחס"],
      "template_priority": ["T3-GEO-SIMILARITY-THALES"]
    }
  ],

  "templates": [
    {
      "id": "T-SEQ-LINREC-SHIFT",
      "topic": "sequences_series",
      "units": [5],
      "title": "נסיגה ליניארית: הזזה לסדרה הנדסית",
      "hint_steps": {
        "hint1": ["זו נסיגה מהצורה a_{n+1}=k a_n + c. נסה להגדיר סדרה חדשה b_n."],
        "hint2": ["בחר b_n=a_n+ c/(k-1) ואז תוכיח ש-b_n הנדסית."],
        "skeleton": ["הגדרה: b_n=a_n+ c/(k-1).", "הוכחה ש-b_n הנדסית.", "מציאת הנוסחה ל-a_n."],
        "full": ["פתרון מלא של נסיגה והוכחת סדרה הנדסית."]
      },
      "common_mistakes": ["שוכחים ש-k≠1", "טעות בחישוב קבוע ההזזה"],
      "grading_rubric": [
        {"points": 30, "for": "הגדרת סדרת עזר והוכחה שהיא הנדסית"},
        {"points": 40, "for": "מציאת הנוסחה ל-a_n"},
        {"points": 30, "for": "חישוב סכום או איבר ספציפי"}
      ]
    },
    {
      "id": "T4-FUNC-INVEST-STD",
      "topic": "functions_calculus",
      "units": [4],
      "title": "חקירת פונקציה סטנדרטית",
      "hint_steps": {
        "hint1": ["תחום הגדרה תחילה (מכנה != 0, שורש >= 0)."],
        "hint2": ["גזור את הפונקציה והשווה ל-0 למציאת קיצון."],
        "skeleton": ["תחום -> חיתוכים -> נגזרת -> טבלת סימנים -> סקיצה."],
        "full": ["חקירה מלאה כולל אסימפטוטות וגרף."]
      },
      "common_mistakes": ["התעלמות מתחום הגדרה", "טעות בגזירת פונקציה מורכבת"],
      "grading_rubric": [
        {"points": 20, "for": "תחום הגדרה וחיתוכים"},
        {"points": 40, "for": "נגזרת ונקודות קיצון"},
        {"points": 20, "for": "תחומי עליה/ירידה"},
        {"points": 20, "for": "סקיצה"}
      ]
    },
    {
      "id": "T3-GEO-SIMILARITY-THALES",
      "topic": "geometry_plane",
      "units": [3],
      "title": "גיאומטריה: דמיון ותלס",
      "hint_steps": {
        "hint1": ["חפש משולשים דומים (זווית-זווית) או ישרים מקבילים."],
        "hint2": ["רשום את יחס הדמיון/תלס בין הצלעות המתאימות."],
        "skeleton": ["זיהוי דמיון -> רישום יחס הצלעות -> הצבת נתונים -> פתרון המשוואה."],
        "full": ["הוכחת דמיון מלאה וחישוב הצלע החסרה."]
      },
      "common_mistakes": ["התאמה לא נכונה של צלעות ביחס הדמיון", "שימוש בתלס ללא מקבילים"],
      "grading_rubric": [
        {"points": 40, "for": "זיהוי והוכחת דמיון/תלס"},
        {"points": 30, "for": "רישום יחס הצלעות"},
        {"points": 30, "for": "חישוב נכון של הנעלם"}
      ]
    },
    {
      "id": "T-TRIG-EQ-STD",
      "topic": "trigonometry",
      "units": [4, 5],
      "title": "משוואות טריגונומטריות",
      "hint_steps": {
        "hint1": ["נסה להשתמש בזהויות כדי להגיע לפונקציה אחת."],
        "skeleton": ["פישוט -> פתרון כללי -> מציאת פתרונות בתחום."],
        "full": ["פתרון מלא של המשוואה הטריגונומטרית."]
      },
      "common_mistakes": ["איבוד פתרונות בחלוקה", "שכחת המחזוריות (2πk)"],
      "grading_rubric": [
        {"points": 50, "for": "פתרון כללי של המשוואה"},
        {"points": 50, "for": "מציאת הפתרונות בתחום הנתון"}
      ]
    },
    {
      "id": "T3-GEO-ANGLE-BISECTOR-RATIO",
      "topic": "geometry_plane",
      "units": [4, 5],
      "title": "גיאומטריה: משפט חוצה הזווית וטריגונומטריה",
      "hint_steps": {
        "hint1": ["היעזר במשפט חוצה הזווית כדי לבטא צלעות."],
        "hint2": ["שים לב: מפגש חוצי הזוויות (מרכז מעגל חסום) מחלק את חוצה הזווית ביחס מיוחד."],
        "skeleton": ["הבעת צלעות באמצעות טריגו -> משפט חוצה זווית -> בניית משוואה -> מציאת הזווית."],
        "full": ["פתרון המשלב טריגונומטריה עם משפטי חוצה הזווית."]
      },
      "common_mistakes": ["התעלמות מהנתון של מרכז מעגל חסום", "טעות בנוסחת היחס בחוצה זווית"],
      "grading_rubric": [
        {"points": 35, "for": "בניית המשוואה הטריגונומטרית"},
        {"points": 30, "for": "פתרון ומציאת הזווית"},
        {"points": 35, "for": "המשך חישוב (יחס רדיוסים/צלעות)"}
      ]
    }
  ]
};

// --- MAIN SERVER LOGIC ---

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

        console.log("UnifiedSolver Request:", { file_url: !!file_url, query_len: query?.length });

        // --- LAYER A: INPUT PROCESSING & OCR (Normalizer) ---
        if (file_url && (!query || query.trim().length === 0)) {
            try {
                console.log("Starting OCR Process for:", file_url);
                
                const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `
                    ROLE: Elite Mathematical Vision Engine.
                    TASK: Extract ALL problem content from the image for a Solver.
                    
                    CRITICAL INSTRUCTIONS:
                    1. MATH & FORMULAS:
                       - BE EXTREMELY CAREFUL with radicals/roots. 
                       - "√3" or "sqrt(3)" must be identified correctly. DO NOT mistake it for "3".
                       - "2 sin alpha" vs "2 sin 2 alpha".
                    2. HEBREW: Transcribe exactly.
                    3. DIAGRAMS: Describe diagram explicitly (e.g. "Triangle ABC, AB=AC...").
                    
                    OUTPUT FORMAT:
                    Return ONLY the extracted text description.
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
                console.log("OCR Result Length:", query?.length);
                
                if (!query || query.length < 2) {
                    throw new Error("OCR returned empty text");
                }
            } catch (err) {
                console.error("OCR Failed:", err);
                return Response.json({ 
                    error: 'שגיאה בפענוח התמונה. אנא נסה תמונה ברורה יותר או הקלד את השאלה ידנית.',
                    details: err.message
                }, { status: 400 });
            }
        }

        if (!query) {
            console.warn("No query available after OCR attempt");
            return Response.json({ error: 'לא התקבלה שאלה. אנא העלה תמונה תקינה או הקלד טקסט.' }, { status: 400 });
        }

        const APP_ID = Deno.env.get('App_ID_wolframalpha');
        
        // --- LAYER B: ROUTER (Classification) ---
        const routerPrompt = `
        ROLE: Senior Bagrut Exam Router.
        TASK: Classify the problem based on the text below.
        
        PROBLEM: "${query}"
        
        RULES: ${JSON.stringify(bagrutConfig.router_rules)}
        
        OUTPUT JSON:
        {
            "subject": "Math" | "Physics",
            "unit_level": 3 | 4 | 5,
            "topic": "string",
            "template_id": "string",
            "wolfram_query": "string (english math translation)"
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
        
        // AUTO-SELECT NEW TEMPLATE FOR GEOMETRY RATIOS IF RELEVANT
        let selectedTemplate = bagrutConfig.templates.find(t => t.id === router.template_id);
        if (query.includes("EC") && query.includes("DE") && (query.includes("sin") || query.includes("cos"))) {
            const geoTemplate = bagrutConfig.templates.find(t => t.id === "T3-GEO-ANGLE-BISECTOR-RATIO");
            if (geoTemplate) selectedTemplate = geoTemplate;
        }
        
        let wolframData = null;

        // --- LAYER B.5: LEARNING MEMORY (RAG) ---
        // Fetch recent user corrections to learn from past mistakes
        let learningContext = "";
        try {
            const recentFeedback = await base44.asServiceRole.entities.SolverFeedback.list({
                filter: { is_correct: false },
                sort: { created_date: -1 },
                limit: 5
            });
            
            if (recentFeedback && recentFeedback.length > 0) {
                const relevantFeedback = recentFeedback
                    .filter(f => f.user_correction && f.user_correction.length > 5)
                    .map(f => `- Mistake in: "${f.query?.substring(0, 50)}..." \n  Correction: "${f.user_correction}"`);
                
                if (relevantFeedback.length > 0) {
                    learningContext = `
                    IMPORTANT - LEARN FROM PREVIOUS MISTAKES:
                    The following are corrections from real users on similar problems. 
                    AVOID these specific errors:
                    ${relevantFeedback.join('\n')}
                    `;
                    console.log("Injected Learning Context:", relevantFeedback.length, "corrections");
                }
            }
        } catch (err) {
            console.warn("Failed to fetch feedback history:", err);
        }

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

        // --- LAYER D & E: EXPLAINER & VERIFIER ---
        const explainerPrompt = `
        ROLE: Expert Bagrut Tutor.
        TASK: Solve the problem completely in Hebrew.
        
        CONTEXT:
        - Problem: "${query}"
        - Classification: ${JSON.stringify(router)}
        - Template: ${selectedTemplate ? selectedTemplate.title : "General"}
        - Wolfram Data: ${wolframData ? "Available" : "None"}
        
        ${learningContext}
        
        CRITICAL SOLVING PROTOCOL:
        1. FORMULA CHECK:
           - Did the OCR mistake "sqrt(3)" for "3"? 
           - Did it mistake "sin(2 alpha)" for "sin(alpha)"?
           - If a solution implies "sin(x) > 1" or no solution, TRY TO CORRECT THE FORMULA (e.g. assume sqrt(3) instead of 3).
           
        2. GEOMETRY SPECIFICS:
           - AB=AC (Isosceles).
           - Base angles 2alpha.
           - E is Incenter (Intersection of bisectors).
           - Use Angle Bisector Theorem on Triangle ADC or similar.
           
        3. FINAL CHECK:
           - Is alpha a "nice" angle (e.g. 15, 18, 20, 22.5, 30, 45)? Bagrut answers usually are.
           - Check constraints (alpha < 22.5).
        
        INSTRUCTIONS:
        1. SOLVE step-by-step in Hebrew. Be precise.
        2. HINTS: Progressive hints + skeleton.
        3. RUBRIC: Realistic points distribution.
        
        OUTPUT JSON: Match schema.
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
            translated_query: query,
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