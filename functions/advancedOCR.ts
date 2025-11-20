import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔍 Advanced Math OCR - חלופה ל-Mathpix
 * משתמש ב-OpenAI Vision GPT-4o לזיהוי נוסחאות מתמטיות
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
    const { imageUrl, enhanceQuality = true } = body;

    if (!imageUrl) {
      return Response.json({
        success: false,
        error: 'Image URL is required'
      }, { status: 400 });
    }

    console.log("🔍 Advanced OCR - Processing:", imageUrl);

    // ✅ שלב 1: זיהוי נוסחאות עם GPT-4o Vision
    const ocrPrompt = `אתה מומחה OCR מתמטי מתקדם.

נתון: תמונה של שאלה/בעיה מתמטית (או פיזיקה/כימיה).

המשימה שלך:
1. **זהה את כל הטקסט** בתמונה (כולל עברית ואנגלית)
2. **זהה נוסחאות מתמטיות** והמר אותן לפורמט LaTeX תקני
3. **זהה איורים גיאומטריים** - תן מיקום מדויק של כל נקודה, קו וצורה
4. **זהה גרפים** - תאר את הצירים, הנקודות, הפונקציות
5. **זהה סימונים מיוחדים** - וקטורים, מטריצות, אינטגרלים

${enhanceQuality ? `
🎯 **איכות מקסימלית:**
- אל תשמיט פרט קטן
- שים לב למספרים קטנים, אינדקסים עליונים ותחתונים
- בדוק פעמיים כל נוסחה
- אם יש איור - תן קואורדינטות מדויקות
` : ''}

**דוגמאות LaTeX:**
- ריבוע: x^2
- שורש: \\sqrt{x}
- שבר: \\frac{a}{b}
- אינטגרל: \\int_{a}^{b} f(x) dx
- סכום: \\sum_{i=1}^{n} x_i
- וקטור: \\vec{v}
- מטריצה: \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}

**החזר JSON עם:**
- text_detected: הטקסט המלא (עברית/אנגלית)
- latex_formulas: רשימת נוסחאות בפורמט LaTeX
- geometry_detected: איורים גיאומטריים עם נקודות וקווים
- graph_detected: נתוני גרף אם יש
- confidence: רמת ודאות (0-100)
- detected_language: השפה שזוהתה
- problem_type: סוג הבעיה (אלגברה, גיאומטריה, וכו')`;

    const ocrResult = await base44.integrations.Core.InvokeLLM({
      prompt: ocrPrompt,
      file_urls: [imageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          text_detected: { type: "string" },
          latex_formulas: {
            type: "array",
            items: { type: "string" }
          },
          geometry_detected: {
            type: "object",
            properties: {
              has_geometry: { type: "boolean" },
              points: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    label: { type: "string" }
                  }
                }
              },
              lines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    from: { type: "string" },
                    to: { type: "string" },
                    label: { type: "string" }
                  }
                }
              },
              shapes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    points: { type: "array", items: { type: "string" } },
                    radius: { type: "number" }
                  }
                }
              }
            }
          },
          graph_detected: {
            type: "object",
            properties: {
              has_graph: { type: "boolean" },
              x_axis_label: { type: "string" },
              y_axis_label: { type: "string" },
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
              function_equation: { type: "string" }
            }
          },
          confidence: { type: "number" },
          detected_language: { type: "string" },
          problem_type: { type: "string" }
        }
      }
    });

    console.log("✅ OCR Result:", {
      confidence: ocrResult.confidence,
      language: ocrResult.detected_language,
      type: ocrResult.problem_type,
      formulas: ocrResult.latex_formulas?.length || 0
    });

    return Response.json({
      success: true,
      ocr: ocrResult,
      formatted_text: ocrResult.text_detected,
      latex: ocrResult.latex_formulas,
      has_geometry: ocrResult.geometry_detected?.has_geometry || false,
      has_graph: ocrResult.graph_detected?.has_graph || false,
      metadata: {
        confidence: ocrResult.confidence,
        language: ocrResult.detected_language,
        problem_type: ocrResult.problem_type,
        processing_engine: 'OpenAI GPT-4o Vision',
        alternative_to: 'Mathpix OCR'
      }
    });

  } catch (error) {
    console.error("❌ Advanced OCR Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});