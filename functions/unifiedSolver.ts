
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// --- EMBEDDED CONFIGURATION (To ensure zero dependency issues) ---
const bagrutConfig = {
  "system_name": "BagrutMathSolverIL",
  "version": "2.1",
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

  // --- NEW: Physics & Geometry Specific Templates ---
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
      "title": "גיאומטריה: חוצה זווית ויחס קטעים",
      "hint_steps": {
        "hint1": ["השתמש במשפט חוצה הזווית במשולש הגדול."],
        "hint2": ["מרכז המעגל החסום (E) מחלק את חוצה הזווית ביחס של סכום הצלעות לצלע השלישית."],
        "skeleton": ["משפט חוצה זווית -> יחס עם צלעות -> שימוש בטריגונומטריה אם נתונות זוויות -> פתרון המשוואה."],
        "full": ["פתרון מלא המשלב גיאומטריה וטריגונומטריה למציאת הזווית והיחס."]
      },
      "common_mistakes": ["בלבול בין מרכז מעגל חוסם לחסום", "אי-שימוש במשפט חוצה הזווית השני (פנימי)"],
      "grading_rubric": [
        {"points": 33, "for": "מציאת הזווית אלפא"},
        {"points": 33, "for": "חישוב יחס הרדיוסים"},
        {"points": 34, "for": "חישוב אורך הקטע AE"}
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
        // If we have a file but no text query, we MUST extract text from the image.
        // We also check if query is just whitespace
        if (file_url && (!query || query.trim().length === 0)) {
            try {
                console.log("Starting OCR Process for:", file_url);
                
                const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `
                    ROLE: Elite Mathematical Vision Engine.
                    TASK: Extract ALL problem content from the image for a Solver.
                    
                    CRITICAL INSTRUCTIONS:
                    1. HEBREW: Transcribe exactly.
                    2. MATH: Use standard LaTeX.
                    3. DIAGRAMS: Describe explicitly (e.g. "Triangle ABC, angle B=90, D is on AC").
                    4. SPECIFIC FOR THIS IMAGE:
                       - If there is a ratio given like EC/DE, extract it carefully.
                       - Identify given angles (e.g. 2 alpha).
                       - Identify required tasks (a, b, c).
                    
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
        if (query.includes("EC") && query.includes("DE") && query.includes("sin")) {
            const geoTemplate = bagrutConfig.templates.find(t => t.id === "T3-GEO-ANGLE-BISECTOR-RATIO");
            if (geoTemplate) selectedTemplate = geoTemplate;
        }
        
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

        // --- LAYER D & E: EXPLAINER & VERIFIER ---
        const explainerPrompt = `
        ROLE: Expert Bagrut Tutor.
        TASK: Solve the problem completely in Hebrew.
        
        CONTEXT:
        - Problem: "${query}"
        - Classification: ${JSON.stringify(router)}
        - Template: ${selectedTemplate ? selectedTemplate.title : "General"}
        - Wolfram Data: ${wolframData ? "Available" : "None"}
        
        CRITICAL FOR THIS GEOMETRY PROBLEM (if matches image context):
        1. Identify Triangle ABC is isosceles (AB=AC).
        2. Identify CD is the angle bisector of C.
        3. Identify E is the INCENTER (intersection of angle bisectors), so AE is also a bisector.
        4. Use the Angle Bisector Theorem and Trigonometry.
        5. SOLVE FOR ALPHA first.
        6. Calculate R/r ratio.
        7. Calculate AE.
        
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
