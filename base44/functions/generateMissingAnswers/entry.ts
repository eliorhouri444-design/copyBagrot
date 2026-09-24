import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { subject_id, unit_level, topic_id } = await req.json();

    // Get questions
    const filter = { is_active: true };
    if (subject_id) filter.subject_id = subject_id;
    if (unit_level) filter.unit_level = unit_level;
    if (topic_id) filter.topic_id = topic_id;

    const questions = await base44.asServiceRole.entities.QuestionBank.filter(filter);
    
    // Get existing solutions
    const solutions = await base44.asServiceRole.entities.SolutionBank.list();
    const solutionMap = new Map(solutions.map(s => [s.question_id, s]));
    
    const questionsWithoutSolutions = questions.filter(q => !solutionMap.has(q.question_id));

    if (questionsWithoutSolutions.length === 0) {
      return Response.json({ success: true, message: 'כל השאלות כבר יש להן תשובות', created: 0 });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return Response.json({ error: 'Missing API key' }, { status: 500 });
    }

    const created = [];
    const failed = [];

    for (const question of questionsWithoutSolutions) {
      try {
        let prompt = `You are an expert English teacher. Question: ${question.question_text}`;

        if (question.question_type === 'multi_choice' || question.question_type === 'multiple_choice') {
          prompt += `\nOptions: ${question.options?.join(', ')}\nProvide ONLY the correct answer.`;
        } else {
          prompt += `\nProvide the correct short answer.`;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert English teacher. Provide concise, accurate answers.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 100
          })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const answer = data.choices[0].message.content.trim();

        await base44.asServiceRole.entities.SolutionBank.create({
          question_id: question.question_id,
          solution_text: `Correct answer: ${answer}`,
          solution_steps: [],
          final_answers: [{ part_id: 'main', value: answer, unit: null, variants: [] }],
          acceptable_variants: [],
          rubric: [],
          verified: false
        });

        created.push({ question_id: question.question_id, answer });

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        failed.push({ question_id: question.question_id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      total_without_solutions: questionsWithoutSolutions.length,
      created: created.length,
      failed: failed.length,
      results: { created, failed }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});