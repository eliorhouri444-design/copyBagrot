import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            subject_id, 
            unit_level, 
            weak_topics,
            count = 10 
        } = await req.json();

        console.log('🎯 Generating adaptive practice for weak topics:', weak_topics);

        // שלב 1: מצא שאלות בנושאים החלשים
        const targetQuestions = [];

        for (const topicId of weak_topics) {
            const topicQuestions = await base44.entities.QuestionBank.filter({
                subject_id,
                unit_level,
                topic_id: topicId,
                is_active: true
            });

            targetQuestions.push(...topicQuestions);
        }

        console.log(`✅ Found ${targetQuestions.length} questions in weak topics`);

        // שלב 2: מיין לפי רמת קושי - התחל מהקל
        const sorted = targetQuestions.sort((a, b) => {
            const difficultyOrder = { easy: 1, medium: 2, hard: 3, expert: 4 };
            return difficultyOrder[a.difficulty_level] - difficultyOrder[b.difficulty_level];
        });

        // שלב 3: קח מספר מוגבל
        const selected = sorted.slice(0, count);

        // שלב 4: צור סשן תרגול
        const session = await base44.entities.PracticeSessionNew.create({
            session_id: `adaptive_${Date.now()}`,
            session_type: 'custom',
            subject_id,
            unit_level,
            questions: selected.map(q => q.question_id),
            started_at: new Date().toISOString()
        });

        console.log('✅ Created adaptive practice session:', session.id);

        return Response.json({
            success: true,
            session_id: session.id,
            questions: selected,
            message: `נוצרו ${selected.length} שאלות מותאמות לנושאים החלשים שלך`
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});