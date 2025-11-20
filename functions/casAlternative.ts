import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🧮 CAS Alternative - חלופה ל-SymPy/Maxima
 * מערכת אלגברה ממוחשבת מבוססת OpenAI GPT-4o
 */

Deno.serve(async (req) => {
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
    const { expression, operation, variables } = body;

    console.log("🧮 CAS Operation:", operation, "Expression:", expression);

    const casPrompt = `אתה מערכת אלגברה ממוחשבת (CAS) מתקדמת.

**ביטוי:**
${expression}

**פעולה מבוקשת:** ${operation}

**הוראות:**

${operation === 'simplify' ? `
1. **פשט את הביטוי:**
   - הוצא גורם משותף
   - צמצם שברים
   - חבר איברים דומים
   - פשט שורשים
   - הצג בצורה הקנונית הפשוטה ביותר

2. **שלבי הפישוט:**
   - כל שלב בנפרד
   - הסבר מה עשית
   - הצג את הביטוי אחרי כל שלב
` : ''}

${operation === 'expand' ? `
1. **פתח את הביטוי:**
   - הכפל סוגריים
   - השתמש בנוסחאות כפל מקוצר
   - פשט את התוצאה
   - סדר לפי חזקות יורדות
` : ''}

${operation === 'factor' ? `
1. **פרק לגורמים:**
   - זהה גורם משותף
   - השתמש בנוסחאות כפל מקוצר
   - פרק ביטוי ריבועי (אם אפשר)
   - בדוק עם הכפלה חוזרת
` : ''}

${operation === 'solve' ? `
1. **פתור משוואה:**
   - העבר אגפים
   - בודד את המשתנה
   - בדוק את הפתרון
   - אם יש כמה פתרונות - הצג הכל
` : ''}

${operation === 'derivative' ? `
1. **גזור:**
   - זהה את סוג הפונקציה
   - השתמש בכללי גזירה
   - פשט את התוצאה
   - בדוק נקודות קריטיות
` : ''}

${operation === 'integral' ? `
1. **אנטגר:**
   - זהה את סוג הפונקציה
   - השתמש בכללי אינטגרציה
   - אל תשכח + C
   - בדוק עם גזירה חוזרת
` : ''}

**פורמט החזרה:**
- תוצאה סופית
- כל השלבים
- אימות (אם אפשר)
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: casPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          original_expression: { type: "string" },
          final_result: { type: "string" },
          final_result_latex: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_number: { type: "integer" },
                operation: { type: "string" },
                expression_before: { type: "string" },
                expression_after: { type: "string" },
                explanation: { type: "string" }
              }
            }
          },
          verification: {
            type: "object",
            properties: {
              method: { type: "string" },
              is_correct: { type: "boolean" },
              check_calculation: { type: "string" }
            }
          },
          alternative_forms: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    console.log("✅ CAS Result:", result.final_result);

    return Response.json({
      success: true,
      result: result,
      metadata: {
        operation: operation,
        steps_count: result.steps?.length || 0,
        verified: result.verification?.is_correct,
        has_alternatives: (result.alternative_forms?.length || 0) > 0,
        engine: 'OpenAI GPT-4o (CAS Alternative)',
        replaces: 'SymPy/Maxima'
      }
    });

  } catch (error) {
    console.error("❌ CAS Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});