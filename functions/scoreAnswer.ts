import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { question_id, student_text, student_image_url } = body;

        if (!question_id || (!student_text && !student_image_url)) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch the Question and Official Solution ("Gold Standard")
        const questionData = await base44.asServiceRole.entities.QuestionBank.list({
            filter: { question_id: question_id },
            limit: 1
        });

        if (!questionData || questionData.length === 0) {
            return Response.json({ error: 'Question not found' }, { status: 404 });
        }

        const question = questionData[0];
        
        const solutionContext = question.ai_solution_steps 
            ? question.ai_solution_steps.join('\n') 
            : "No official step-by-step solution provided. Rely on general math knowledge.";
            
        const rubricContext = question.ai_rubric
            ? JSON.stringify(question.ai_rubric)
            : "No specific rubric. Use general logic: 40% for method, 40% for calculation accuracy, 20% for final answer.";

        // 2. Perform Grading via LLM with Enhanced Vision Instructions
        const gradingRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
            ROLE: You are an expert, fair, and encouraging Math/Physics Teacher.
            TASK: Grade a student's submission against an official solution.
            
            CONTEXT:
            - Question: "${question.question_text}"
            - Max Score: ${question.max_score || 100} points
            
            OFFICIAL SOLUTION (GOLD STANDARD):
            ${solutionContext}
            
            OFFICIAL RUBRIC:
            ${rubricContext}
            
            STUDENT SUBMISSION:
            ${student_text ? `Text Input: "${student_text}"` : ""}
            ${student_image_url ? `[Image Uploaded: Contains handwritten work, graphs, or diagrams]` : ""}
            
            VISUAL ANALYSIS INSTRUCTIONS (IF IMAGE PROVIDED):
            1. **Handwritten Equations**: Carefully OCR and evaluate the mathematical logic step-by-step.
            2. **Graphs**: Check for correct axis labels (x, y), appropriate scale, critical points (intercepts, extrema), and correct curve shape/behavior (increasing/decreasing, concavity).
            3. **Geometric Sketches**: Verify that the drawing correctly represents the problem statement (e.g., correct labelling of vertices, angles, parallel lines).
            4. **Diagrams**: Look for Free Body Diagrams (Physics) or other schematic representations and check vectors/forces directions and labels.
            
            GRADING RULES:
            1. **Alternative Methods**: If the student uses a DIFFERENT but MATHEMATICALLY VALID method (e.g., Vectors instead of Geometry, or Energy instead of Kinematics), give FULL CREDIT for the logic. Do NOT penalize for deviating from the official steps if the math is sound.
            2. **Partial Credit**:
               - Correct path but calculation error -> High partial credit (e.g., 70-80%).
               - Correct formula but wrong substitution -> Medium partial credit.
               - Correct final answer but no work shown -> Low credit (suspicious), unless it's a trivial question.
               - Wrong path -> 0 points for that part.
            3. **Follow Through**: If a student made a mistake in part A, but used that wrong value correctly in part B, give FULL CREDIT for the logic in part B ("Error Carried Forward").
            
            OUTPUT JSON FORMAT:
            {
                "score_percentage": number (0-100),
                "final_score": number (calculated from max_score),
                "feedback_summary": "Encouraging summary in Hebrew",
                "is_correct": boolean,
                "alternative_method_detected": boolean,
                "breakdown": [
                    {
                        "step_name": "string",
                        "status": "correct" | "partial" | "wrong" | "missing",
                        "points_earned": number,
                        "max_points": number,
                        "feedback": "Specific feedback in Hebrew"
                    }
                ]
            }
            `,
            file_urls: student_image_url ? [student_image_url] : [],
            response_json_schema: {
                type: "object",
                properties: {
                    score_percentage: { type: "integer" },
                    final_score: { type: "number" },
                    feedback_summary: { type: "string" },
                    is_correct: { type: "boolean" },
                    alternative_method_detected: { type: "boolean" },
                    breakdown: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                step_name: { type: "string" },
                                status: { type: "string", enum: ["correct", "partial", "wrong", "missing"] },
                                points_earned: { type: "number" },
                                max_points: { type: "number" },
                                feedback: { type: "string" }
                            }
                        }
                    }
                }
            }
        });
        
        return Response.json(gradingRes);

    } catch (error) {
        console.error("Grading Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});