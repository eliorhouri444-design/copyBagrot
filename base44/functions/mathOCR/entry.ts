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

        console.log('🔍 OCR for:', subject);

        // OCR פשוט ויציב
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `אתה מומחה OCR למתמטיקה ומדעים.

נתח את השאלה בתמונה והחזר JSON:

{
  "question_text": "הטקסט המלא של השאלה בעברית",
  "subject": "${subject || 'מתמטיקה'}",
  "main_topic": "הנושא הראשי",
  "sub_topics": ["תת-נושא 1", "תת-נושא 2"],
  "question_type": "calculation/proof/geometry/open_question",
  "difficulty_level": "easy/medium/hard/expert",
  "given_data": ["נתון 1", "נתון 2"],
  "required_to_find": ["מבוקש 1", "מבוקש 2"],
  "has_diagram": true/false,
  "diagram": {
    "description": "תיאור האיור",
    "points": {"A": {"x": 0, "y": 0, "label": "A"}},
    "lines": [{"from": "A", "to": "B", "style": "solid"}],
    "shapes": [{"type": "triangle", "vertices": ["A","B","C"]}],
    "labels": ["AB=5", "זווית 60°"]
  }
}

אם אין איור - השאר diagram ריק.`,
            file_urls: [imageUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    question_text: { type: "string" },
                    subject: { type: "string" },
                    main_topic: { type: "string" },
                    sub_topics: { type: "array" },
                    question_type: { type: "string" },
                    difficulty_level: { type: "string" },
                    given_data: { type: "array" },
                    required_to_find: { type: "array" },
                    has_diagram: { type: "boolean" },
                    diagram: { type: "object" }
                }
            }
        });

        console.log('✅ OCR success');

        return Response.json({
            success: true,
            analysis: result
        });

    } catch (error) {
        console.error('❌ OCR Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});