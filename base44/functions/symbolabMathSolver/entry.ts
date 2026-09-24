import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🧮 Symbolab-Style Math Solver
 * פותר שאלות מתמטיות בדיוק מקסימלי עם שיטות פתרון מגוונות
 */

Deno.serve(async (req) => {
  console.log("🧮 SYMBOLAB-STYLE MATH SOLVER");
  
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { expression, subject, units, problemType } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    console.log("📐 Expression:", expression);
    console.log("🎯 Problem type:", problemType);

    // **מערכות פתרון לפי סוג בעיה - בדומה ל-Symbolab**
    const solverPrompts = {
      algebra: `אתה מחשבון אלגברה מומחה בסגנון Symbolab.

פתור את הביטוי: ${expression}

**שיטות פתרון זמינות:**
- פישוט ביטויים אלגבריים
- פתרון משוואות ליניאריות וריבועיות
- פירוק לגורמים
- מציאת שורשים
- מערכות משוואות

**דרישות:**
1. הצג כל שלב בפירוט מקסימלי
2. הסבר כל מעבר מתמטי
3. השתמש בסימונים מתמטיים תקינים
4. תן גרף אם רלוונטי
5. הצע שיטות פתרון חלופיות
6. בדוק את התשובה

החזר JSON:`,

      calculus: `אתה מחשבון חשבון אינפיניטסימלי מומחה בסגנון Symbolab.

פתור: ${expression}

**שיטות זמינות:**
- גזירה (כללי גזירה: מכפלה, מנה, שרשרת)
- אינטגרציה (שיטות: החלפת משתנה, אינטגרציה בחלקים, שברים חלקיים)
- גבולות
- סדרות וטורים
- נקודות קיצון ונקודות פיתול

**דרישות:**
1. הצג את השיטה המתאימה
2. פרט כל שלב
3. הוסף גרף של הפונקציה
4. הראה בדיקה של התוצאה

החזר JSON:`,

      trigonometry: `אתה מחשבון טריגונומטריה מומחה בסגנון Symbolab.

פתור: ${expression}

**שיטות זמינות:**
- זהויות טריגונומטריות
- פתרון משוואות טריגונומטריות
- מעגל היחידה
- גרפים של פונקציות טריגונומטריות
- חוקי סינוס וקוסינוס

**דרישות:**
1. השתמש במעגל היחידה
2. הצג זהויות רלוונטיות
3. תן גרף של הפונקציה
4. הראה פתרונות כלליים

החזר JSON:`,

      geometry: `אתה מחשבון גאומטריה מומחה בסגנון Symbolab.

פתור: ${expression}

**שיטות זמינות:**
- חישובי משולשים (פיתגורס, שטחים, היקפים)
- מעגלים (שטח, היקף, מיתרים, משיקים)
- גופים תלת-ממדיים
- קואורדינטות ווקטורים
- טרנספורמציות גאומטריות

**דרישות:**
1. צייר איור מדויק עם כל הנקודות
2. סמן נתונים ונעלמים
3. פרט כל שלב בחישוב
4. הוסף דיאגרמה ויזואלית

החזר JSON:`,

      matrices: `אתה מחשבון מטריצות מומחה בסגנון Symbolab.

פתור: ${expression}

**פעולות זמינות:**
- כפל מטריצות
- דטרמיננטה
- מטריצה הופכית
- דירוג
- ערכים עצמיים ווקטורים עצמיים
- פתרון מערכות משוואות

**דרישות:**
1. הצג כל מטריצה בפורמט ברור
2. פרט כל פעולה
3. הסבר מתי אפשר/אי אפשר לבצע פעולה
4. בדוק את התוצאה

החזר JSON:`,

      probability: `אתה מחשבון הסתברות וסטטיסטיקה מומחה בסגנון Symbolab.

פתור: ${expression}

**שיטות זמינות:**
- חישוב הסתברויות (פשוטות, מותנות)
- קומבינטוריקה
- התפלגויות (נורמלית, בינומית, פואסון)
- ממוצע, שונות, סטיית תקן
- בדיקות מובהקות

**דרישות:**
1. הצג נתונים בצורה ברורה
2. הסבר כל נוסחה
3. תן גרף התפלגות אם רלוונטי
4. הסבר את המשמעות של התוצאה

החזר JSON:`,

      default: `אתה מורה מומחה במתמטיקה בסגנון Symbolab.

פתור בדיוק מקסימלי: ${expression}

**דרישות:**
1. זהה את סוג הבעיה אוטומטית
2. בחר את שיטת הפתרון המתאימה
3. פתור צעד אחר צעד
4. הוסף ויזואליזציה (גרף/איור)
5. בדוק את התשובה
6. הצע שיטות חלופיות

החזר JSON:`
    };

    const selectedPrompt = solverPrompts[problemType] || solverPrompts.default;

    const jsonSchema = {
      type: "object",
      properties: {
        problem_type_detected: { type: "string" },
        solution_method: { type: "string" },
        solution_steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step_number: { type: "integer" },
              description: { type: "string" },
              calculation: { type: "string" },
              formula_used: { type: "string" },
              diagram_data: { type: "object" }
            }
          }
        },
        final_answer: { type: "string" },
        verification: { type: "string" },
        alternative_methods: {
          type: "array",
          items: { type: "string" }
        },
        diagrams: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              data: { type: "object" },
              step_number: { type: "integer" }
            }
          }
        },
        graph_data: {
          type: "object",
          properties: {
            title: { type: "string" },
            formula: { type: "string" },
            points: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" }
                }
              }
            },
            chartType: { type: "string" },
            xLabel: { type: "string" },
            yLabel: { type: "string" }
          }
        },
        full_solution_text: { type: "string" },
        difficulty: { type: "string" },
        similar_exercises: {
          type: "array",
          items: { type: "string" }
        },
        tags: {
          type: "array",
          items: { type: "string" }
        }
      }
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "אתה מערכת פתרון מתמטית מתקדמת בסגנון Symbolab. אתה מדייק, מפורט ומסביר כל שלב." 
          },
          { role: "user", content: selectedPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2 // טמפרטורה נמוכה לדיוק מקסימלי
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    console.log("✅ Symbolab-style solution complete");

    return Response.json({
      success: true,
      solution: result,
      metadata: {
        solver_type: 'symbolab_style',
        problem_type: result.problem_type_detected,
        method_used: result.solution_method,
        has_alternative_methods: result.alternative_methods?.length > 0
      }
    });

  } catch (error) {
    console.error("❌ Symbolab solver error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});