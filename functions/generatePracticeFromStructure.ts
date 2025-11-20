import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { structureId, topicKey, questionCount } = await req.json();

        if (!structureId || !topicKey) {
            return Response.json({ 
                error: 'Missing structureId or topicKey' 
            }, { status: 400 });
        }

        console.log(`🎯 Generating practice questions from structure: ${structureId} for topic: ${topicKey}`);

        // טעינת המבנה
        const structures = await base44.asServiceRole.entities.ExamStructure.filter({ id: structureId });
        
        if (structures.length === 0) {
            return Response.json({ error: 'Structure not found' }, { status: 404 });
        }

        const structure = structures[0];

        // מציאת השאלות המתאימות לנושא בתוך המבנה
        const relevantQuestions = structure.question_structure.filter(q => 
            q.topic === topicKey || q.sub_topics?.includes(topicKey)
        );

        if (relevantQuestions.length === 0) {
            return Response.json({ 
                error: `No questions found for topic ${topicKey} in this structure` 
            }, { status: 404 });
        }

        // יצירת שאלות תרגול על פי המבנה
        const generationPrompt = `אתה מומחה ליצירת שאלות תרגול לבגרות.

**צור ${questionCount || 5} שאלות תרגול חדשות** ב${structure.subject} (${structure.unit_level} יחידות) בנושא: **${topicKey}**

**עליך לשמור על המבנה הבא מהמבחנים המקוריים:**

${relevantQuestions.map((q, idx) => `
דוגמה ${idx + 1}:
- רמת קושי: ${q.difficulty_level}
- סוג שאלה: ${q.question_type}
- נקודות: ${q.points}
- רמה קוגניטיבית: ${q.cognitive_level}
- ${q.requires_diagram ? `דרוש איור מסוג: ${q.diagram_type}` : 'ללא איור'}
`).join('\n')}

**דרישות:**
1. השאלות חייבות להיות **חדשות לגמרי** - לא להעתיק ממבחנים קיימים
2. שמור על **רמת קושי דומה** לדוגמאות
3. השתמש ב**אותם סוגי שאלות**
4. כל שאלה חייבת **תשובה נכונה והסבר מפורט**
5. השאלות ברמת **בגרות מקצועית**

החזר JSON במבנה:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "category": "reading",
      "options": ["א", "ב", "ג", "ד"],
      "correct_answers": ["ב"],
      "explanation": "...",
      "points": 10,
      "topic": "${topicKey}",
      "module": "${structure.module_id}",
      "difficulty": "medium",
      "subject": "${structure.subject}",
      "units": ${structure.unit_level}
    }
  ]
}`;

        const generatedQuestions = await base44.integrations.Core.InvokeLLM({
            prompt: generationPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    questions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question_text: { type: "string" },
                                question_type: { type: "string" },
                                category: { type: "string" },
                                options: { type: "array", items: { type: "string" } },
                                correct_answers: { type: "array", items: { type: "string" } },
                                explanation: { type: "string" },
                                points: { type: "integer" },
                                topic: { type: "string" },
                                module: { type: "string" },
                                difficulty: { type: "string" },
                                subject: { type: "string" },
                                units: { type: "integer" }
                            }
                        }
                    }
                }
            }
        });

        // שמירת השאלות במאגר
        const savedQuestions = [];
        for (const question of generatedQuestions.questions) {
            const saved = await base44.asServiceRole.entities.PracticeQuestion.create(question);
            savedQuestions.push(saved);
        }

        return Response.json({
            success: true,
            message: `✅ נוצרו ${savedQuestions.length} שאלות תרגול חדשות!`,
            questions: savedQuestions,
            structure_used: structure.structure_name
        });

    } catch (error) {
        console.error('❌ Error generating practice questions:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});