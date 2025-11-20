import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl, questionContext } = await req.json();

        if (!imageUrl) {
            return Response.json({ error: 'Missing imageUrl' }, { status: 400 });
        }

        console.log(`🔍 Scanning handwritten answer from image...`);

        // שימוש ב-OCR מתקדם + זיהוי ציורים
        const scanPrompt = `אתה מומחה לזיהוי כתב יד ואיורים מתמטיים/פיזיקליים.

${questionContext ? `**הקשר השאלה:**\n${questionContext}\n\n` : ''}

**משימתך:**
1. זהה את כל הטקסט הכתוב בכתב יד (מספרים, משתנים, משוואות, מילים)
2. זהה איורים גיאומטריים - נקודות, קווים, צורות, תוויות
3. זהה חישובים ושלבי פתרון
4. תרגם את הכל לפורמט דיגיטלי קריא

**חשוב:**
- היה מדויק בזיהוי מספרים ומשתנים
- זהה כיווני חיצים וסימונים באיורים
- שמור על סדר השלבים כפי שהתלמיד כתב
- אם משהו לא ברור - ציין זאת

**החזר JSON:**
{
  "text_content": "הטקסט המלא שזוהה",
  "detected_steps": [
    {
      "step_number": 1,
      "content": "נניח x = 5",
      "type": "calculation"
    }
  ],
  "detected_diagram": {
    "has_diagram": true/false,
    "diagram_description": "תיאור האיור",
    "points": {"A": {"x": 0, "y": 0}, "B": {"x": 3, "y": 4}},
    "lines": [{"from": "A", "to": "B"}],
    "labels": ["משולש ABC", "זווית ישרה"]
  },
  "confidence_score": 0.95,
  "unclear_parts": ["לא הצלחתי לזהות את..."]
}`;

        const scanResult = await base44.integrations.Core.InvokeLLM({
            prompt: scanPrompt,
            file_urls: [imageUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    text_content: { type: "string" },
                    detected_steps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                step_number: { type: "integer" },
                                content: { type: "string" },
                                type: { type: "string" }
                            }
                        }
                    },
                    detected_diagram: {
                        type: "object",
                        properties: {
                            has_diagram: { type: "boolean" },
                            diagram_description: { type: "string" },
                            points: { type: "object" },
                            lines: { type: "array" },
                            labels: { type: "array", items: { type: "string" } }
                        }
                    },
                    confidence_score: { type: "number" },
                    unclear_parts: { type: "array", items: { type: "string" } }
                }
            }
        });

        console.log('✅ Scan completed:', scanResult.confidence_score);

        return Response.json({
            success: true,
            scanned_content: scanResult.text_content,
            steps: scanResult.detected_steps || [],
            diagram: scanResult.detected_diagram || null,
            confidence: scanResult.confidence_score || 0,
            warnings: scanResult.unclear_parts || []
        });

    } catch (error) {
        console.error('❌ Error scanning handwritten answer:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});