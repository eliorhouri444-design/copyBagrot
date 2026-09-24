import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject_id, unit_level, topic_id, difficulty, question_type } = await req.json();

        if (!subject_id || !unit_level || !topic_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`🤖 Generating new practice question for: ${topic_id}, ${unit_level} units, ${difficulty}`);

        const prompt = `
        ROLE: Expert Bagrut Exam Author (Ministry of Education level).
        TASK: Create a NEW, ORIGINAL Bagrut-style question based on the following criteria.
        
        CRITERIA:
        - Subject: ${subject_id}
        - Unit Level: ${unit_level}
        - Topic: ${topic_id}
        - Difficulty: ${difficulty || 'medium'}
        - Question Type: ${question_type || 'open'}
        
        REQUIREMENTS:
        1. **Professional Phrasing**: Use precise, formal Hebrew as used in official Bagrut exams.
        2. **Complete Data**: Ensure all necessary data is provided in the question text.
        3. **Solvable**: The question MUST have a clear, unique solution.
        4. **Step-by-Step Solution**: Provide a detailed solution for the AI grader.
        5. **Rubric**: Provide a specific scoring rubric.
        6. **Image Description**: If the question requires a diagram (Geometry, Functions, Mechanics), describe it precisely.
        
        OUTPUT JSON FORMAT:
        {
            "question_text": "The full text of the question in Hebrew",
            "image_description": "Description of the diagram if needed, or null",
            "solution_steps": ["Step 1...", "Step 2..."],
            "final_answer": "The final result",
            "rubric": [
                { "criteria": "...", "percentage": 20, "keywords": ["..."] },
                { "criteria": "...", "percentage": 30, "keywords": ["..."] }
            ],
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (only if multiple choice)
        }
        `;

        const aiRes = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    question_text: { type: "string" },
                    image_description: { type: "string" },
                    solution_steps: { type: "array", items: { type: "string" } },
                    final_answer: { type: "string" },
                    rubric: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                criteria: { type: "string" },
                                percentage: { type: "number" },
                                keywords: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    options: { type: "array", items: { type: "string" } }
                },
                required: ["question_text", "solution_steps", "final_answer", "rubric"]
            }
        });

        // If image description exists, generate an image (optional, for now we can just save the description or skip)
        // For math diagrams, GenerateImage might not be accurate enough, but let's try or just leave it.
        // The user said "image (if relevant)". Let's skip actual image generation for now to avoid bad diagrams,
        // or we could use a specific tool if we had one.
        // We will save the text and if there's an image description, we can maybe display it or use it later.
        
        let imageUrl = null;
        // Optional: Generate image if description is present and strong
        /*
        if (aiRes.image_description && aiRes.image_description.length > 10) {
             const imgRes = await base44.integrations.Core.GenerateImage({
                 prompt: "Clean, black and white line art educational diagram: " + aiRes.image_description
             });
             imageUrl = imgRes.url;
        }
        */

        const newQuestion = await base44.asServiceRole.entities.QuestionBank.create({
            question_id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            subject_id: subject_id,
            unit_level: parseInt(unit_level),
            origin_type: "ai_generated",
            topic_id: topic_id,
            question_text: aiRes.question_text,
            question_image_url: imageUrl,
            question_type: question_type === 'multiple_choice' ? 'multi_choice' : (question_type || 'open'),
            max_score: 100,
            difficulty_level: difficulty || 'medium',
            ai_solution_steps: aiRes.solution_steps,
            ai_rubric: aiRes.rubric,
            final_answer_format: aiRes.final_answer,
            options: aiRes.options || [],
            is_active: true
        });

        return Response.json({ success: true, question: newQuestion });

    } catch (error) {
        console.error("Generate Question Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});