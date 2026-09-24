import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.0';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text, imageUrl } = await req.json();

        if (!text && !imageUrl) {
            return Response.json({ error: 'Missing text or imageUrl' }, { status: 400 });
        }

        console.log('🔍 Classifying question...');

        const messages = imageUrl ? [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `זהה את סוג השאלה ותחום הלימוד:

${text || ''}

**החזר JSON:**
{
  "subject": "מתמטיקה/פיזיקה/כימיה/ביולוגיה/אחר",
  "topic": "נושא ספציפי (אלגברה, גאומטריה, קינטיקה, גנטיקה...)",
  "subtopics": ["תת-נושא 1", "תת-נושא 2"],
  "question_type": "calculation/proof/explanation/diagram_analysis/experiment",
  "difficulty": "easy/medium/hard/expert",
  "requires_diagram": true/false,
  "requires_calculation": true/false,
  "estimated_time": "זמן משוער בדקות",
  "key_concepts": ["מושג 1", "מושג 2"],
  "recommended_solver": "math/physics/chemistry/biology"
}`
                    },
                    {
                        type: "image_url",
                        image_url: { url: imageUrl }
                    }
                ]
            }
        ] : [
            {
                role: "user",
                content: `זהה את סוג השאלה:

${text}

החזר JSON עם: subject, topic, subtopics, question_type, difficulty, requires_diagram, requires_calculation, estimated_time, key_concepts, recommended_solver`
            }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 1000
        });

        const classification = JSON.parse(response.choices[0].message.content);

        console.log('✅ Classified as:', classification.subject, '-', classification.topic);

        return Response.json({
            success: true,
            classification: classification
        });

    } catch (error) {
        console.error('❌ Classifier Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});