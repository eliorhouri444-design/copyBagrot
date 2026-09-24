import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl, subject } = await req.json();

        if (!imageUrl) {
            return Response.json({ error: 'Missing imageUrl' }, { status: 400 });
        }

        console.log('🔬 Advanced OCR starting:', subject);

        // OCR מתקדם בסגנון Mathpix עם GPT-4o
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `אתה מנוע OCR מתקדם ברמת Mathpix לניתוח מתמטי מדויק.

**🎯 משימה: ניתוח מלא ומקצועי של השאלה**

**דרישות קריטיות לדיוק 99%:**

1. **זיהוי טקסט מלא** - כל מילה, כל תו, כל סימן
2. **זיהוי נוסחאות** - המר לפורמט LaTeX מדויק
3. **זיהוי איורים** - תאר בדיוק מוחלט כל נקודה, קו, צורה
4. **זיהוי גרפים** - ציר X, ציר Y, נקודות, פונקציות
5. **זיהוי טבלאות** - כל השורות והעמודות
6. **זיהוי יחידות** - מטרים, שניות, ניוטון וכו'

**החזר JSON מלא ומפורט:**

{
  "raw_text": "הטקסט המלא כולל סימנים מיוחדים",
  "question_text": "השאלה בעברית ברורה",
  "subject": "${subject || 'מתמטיקה'}",
  "main_topic": "הנושא הראשי",
  "sub_topics": ["תת-נושא 1", "תת-נושא 2"],
  "question_type": "calculation/proof/geometry/analysis/physics/chemistry",
  "difficulty_level": "easy/medium/hard/expert",
  
  "given_data": {
    "text": ["נתון 1 בטקסט", "נתון 2"],
    "numerical": [
      {"variable": "a", "value": 5, "unit": "מטר"},
      {"variable": "v", "value": 10, "unit": "מ/ש"}
    ]
  },
  
  "required_to_find": ["מהירות סופית", "זמן", "מרחק"],
  
  "formulas_in_question": [
    {
      "latex": "F = ma",
      "description": "חוק ניוטון השני",
      "location": "שורה 2"
    }
  ],
  
  "diagram": {
    "exists": true,
    "type": "geometry/graph/physics_setup/chemistry_structure",
    "description": "תיאור מילולי מפורט של האיור",
    
    "coordinate_system": {
      "has_axes": true,
      "x_axis": {"min": 0, "max": 10, "label": "זמן (שניות)"},
      "y_axis": {"min": 0, "max": 100, "label": "מהירות (מ/ש)"}
    },
    
    "geometric_elements": {
      "points": {
        "A": {"x": 0, "y": 0, "label": "A", "description": "נקודת התחלה"},
        "B": {"x": 5, "y": 5, "label": "B", "description": "נקודת סיום"}
      },
      "lines": [
        {
          "from": "A",
          "to": "B",
          "type": "straight/curved/dashed",
          "label": "AB",
          "length": 7.07,
          "unit": "ס\"מ"
        }
      ],
      "shapes": [
        {
          "type": "triangle/square/circle/polygon",
          "vertices": ["A", "B", "C"],
          "properties": {
            "angles": [{"vertex": "B", "value": 90, "unit": "מעלות"}],
            "sides": [{"name": "AB", "length": 5, "unit": "ס\"מ"}]
          }
        }
      ],
      "special_marks": [
        "גובה מנקודה C לצלע AB",
        "זווית ישרה בנקודה B",
        "קטע AB מקביל לקטע CD"
      ]
    },
    
    "graph_data": {
      "function_type": "linear/quadratic/exponential/trigonometric",
      "equation": "y = 2x + 3",
      "key_points": [
        {"x": 0, "y": 3, "description": "נקודת חיתוך עם ציר Y"},
        {"x": 2, "y": 7, "description": "נקודה על הגרף"}
      ],
      "slope": 2,
      "intercept": 3,
      "domain": "כל המספרים הממשיים",
      "range": "כל המספרים הממשיים"
    }
  },
  
  "physics_setup": {
    "objects": [
      {
        "name": "גוף A",
        "mass": 5,
        "mass_unit": "ק\"ג",
        "initial_velocity": 0,
        "velocity_unit": "מ/ש",
        "position": "על הקרקע"
      }
    ],
    "forces": [
      {
        "type": "gravity/friction/normal/applied",
        "magnitude": 50,
        "unit": "ניוטון",
        "direction": "כלפי מטה",
        "applied_to": "גוף A"
      }
    ]
  },
  
  "chemistry_info": {
    "reaction": "2H₂ + O₂ → 2H₂O",
    "reactants": ["H₂", "O₂"],
    "products": ["H₂O"],
    "coefficients": [2, 1, 2]
  },
  
  "tables": [
    {
      "headers": ["x", "f(x)"],
      "rows": [
        [0, 1],
        [1, 2],
        [2, 4]
      ]
    }
  ],
  
  "complexity_indicators": {
    "multi_step": true,
    "requires_multiple_theorems": 3,
    "requires_graph": true,
    "requires_calculation": true,
    "estimated_time_minutes": 15
  },
  
  "key_concepts": [
    "משפט פיתגורס",
    "פונקציה ריבועית",
    "חישוב שטח משולש"
  ],
  
  "solution_hints": [
    "התחל עם זיהוי הנתונים",
    "השתמש במשפט פיתגורס",
    "חשב את השטח"
  ]
}

**⚠️ קריטי:**
- זיהוי מדויק של **כל** נוסחה בפורמט LaTeX
- תיאור מלא של **כל** איור עד לפרט האחרון
- זיהוי **כל** היחידות (מטר, שנייה, ניוטון)
- אם משהו לא ברור - ציין זאת במפורש

**דוגמה לנוסחת LaTeX:**
"v² = u² + 2as" → "v^2 = u^2 + 2as"
"∫₀¹ x² dx" → "\\int_0^1 x^2 \\, dx"`,
            file_urls: [imageUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    raw_text: { type: "string" },
                    question_text: { type: "string" },
                    subject: { type: "string" },
                    main_topic: { type: "string" },
                    sub_topics: { type: "array" },
                    question_type: { type: "string" },
                    difficulty_level: { type: "string" },
                    given_data: { type: "object" },
                    required_to_find: { type: "array" },
                    formulas_in_question: { type: "array" },
                    diagram: { type: "object" },
                    physics_setup: { type: "object" },
                    chemistry_info: { type: "object" },
                    tables: { type: "array" },
                    complexity_indicators: { type: "object" },
                    key_concepts: { type: "array" },
                    solution_hints: { type: "array" }
                }
            }
        });

        console.log('✅ Advanced OCR completed for:', result.main_topic);

        return Response.json({
            success: true,
            analysis: result,
            ocr_quality: "mathpix-level",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Advanced OCR Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});