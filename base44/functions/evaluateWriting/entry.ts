import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { writing_text, prompt, attempt_id } = await req.json();

    if (!writing_text || !prompt) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call AI to evaluate writing
    const evaluationPrompt = `
You are an English writing evaluator for high school students preparing for matriculation exams.

Task Prompt: "${prompt}"

Student's Writing:
"""
${writing_text}
"""

Evaluate this writing according to the following criteria (0-25 points each):
1. Grammar & Mechanics - accuracy of grammar, spelling, punctuation
2. Vocabulary - range and appropriateness of vocabulary
3. Organization - structure, coherence, and logical flow
4. Task Achievement - how well the writing addresses the prompt

Provide:
- Score for each criterion (0-25)
- Total score (0-100)
- Detailed feedback in Hebrew focusing on strengths and areas for improvement
- 2-3 specific suggestions for improvement

Respond ONLY with valid JSON in this exact format:
{
  "grammar": <number 0-25>,
  "vocabulary": <number 0-25>,
  "organization": <number 0-25>,
  "task_achievement": <number 0-25>,
  "total_score": <number 0-100>,
  "feedback": "<detailed feedback in Hebrew>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: evaluationPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          grammar: { type: "number" },
          vocabulary: { type: "number" },
          organization: { type: "number" },
          task_achievement: { type: "number" },
          total_score: { type: "number" },
          feedback: { type: "string" },
          suggestions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Update attempt with evaluation if attempt_id provided
    if (attempt_id) {
      await base44.entities.WritingAttempt.update(attempt_id, {
        status: "evaluated",
        score: response.total_score,
        evaluation: {
          grammar: response.grammar,
          vocabulary: response.vocabulary,
          organization: response.organization,
          task_achievement: response.task_achievement
        },
        feedback: `${response.feedback}\n\nהמלצות לשיפור:\n${response.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      });
    }

    return Response.json({
      success: true,
      evaluation: response
    });

  } catch (error) {
    console.error('Error evaluating writing:', error);
    return Response.json({ 
      error: error.message || 'Failed to evaluate writing' 
    }, { status: 500 });
  }
});