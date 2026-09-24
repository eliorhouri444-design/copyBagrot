import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ✅ Step Validation System
 * מערכת אימות צעדים מתקדמת
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
    const { step, checkMethod = 'standard', previousSteps = [] } = body;

    console.log("✅ Validating step:", step.step_number);

    const validationPrompt = `אתה מערכת אימות מתמטית מתקדמת.

**השלב לבדיקה:**
${JSON.stringify(step, null, 2)}

${previousSteps.length > 0 ? `
**שלבים קודמים:**
${previousSteps.map((s, i) => `שלב ${i + 1}: ${s.description}\n${s.calculation || ''}`).join('\n\n')}
` : ''}

**סוג בדיקה:** ${checkMethod === 'thorough' ? 'יסודית מאוד' : 'סטנדרטית'}

**מה לבדוק:**

1. **נכונות מתמטית:**
   - האם החישוב נכון?
   - האם הנוסחה שימושית?
   - האם השתמשו בכלל הנכון?

2. **לוגיקה:**
   - האם השלב הגיוני בהקשר?
   - האם הוא עוקב מהשלב הקודם?
   - האם הוא מוביל לפתרון?

3. **דיוק:**
   - האם היחידות נכונות?
   - האם העיגול מתאים?
   - האם יש טעויות חישוב?

4. **שלמות:**
   - האם השלב מפורט מספיק?
   - האם חסר מידע חשוב?
   - האם ההסבר ברור?

${checkMethod === 'thorough' ? `
5. **בדיקות מתקדמות:**
   - האם יש דרך יעילה יותר?
   - האם השלב אופטימלי?
   - האם יש מקרי קצה שלא טופלו?
   - האם ההנחות תקפות?
` : ''}

**החזר JSON עם:**
- is_correct: האם השלב נכון (true/false)
- confidence: רמת ודאות (0-100)
- explanation: הסבר קצר
- warnings: רשימת אזהרות (אם יש)
- suggestions: הצעות לשיפור
- alternative_approach: דרך חלופית (אם יש)
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: validationPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          is_correct: { type: "boolean" },
          confidence: { type: "number" },
          explanation: { type: "string" },
          warnings: {
            type: "array",
            items: { type: "string" }
          },
          suggestions: {
            type: "array",
            items: { type: "string" }
          },
          errors_found: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                severity: { type: "string" }
              }
            }
          },
          alternative_approach: {
            type: "object",
            properties: {
              description: { type: "string" },
              why_better: { type: "string" }
            }
          }
        }
      }
    });

    console.log("✅ Validation complete:", result.is_correct, result.confidence);

    return Response.json({
      success: true,
      validation: result,
      metadata: {
        check_method: checkMethod,
        has_warnings: (result.warnings?.length || 0) > 0,
        has_errors: (result.errors_found?.length || 0) > 0,
        has_alternative: !!result.alternative_approach
      }
    });

  } catch (error) {
    console.error("❌ Validation Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});