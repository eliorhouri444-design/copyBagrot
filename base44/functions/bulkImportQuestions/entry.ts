import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const { questions, solutions } = await req.json();

    console.log('📥 קיבלנו:', { 
      questionsCount: questions?.length || 0, 
      solutionsCount: solutions?.length || 0,
      firstQuestion: questions?.[0]
    });

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'חייב לספק מערך שאלות' 
      }, { status: 400 });
    }

    // הגבלה מקסימלית של 10,000 שאלות בפעם אחת
    if (questions.length > 10000) {
      return Response.json({
        success: false,
        error: `ניתן להוסיף מקסימום 10,000 שאלות בפעם אחת. קיבלנו ${questions.length} שאלות.`
      }, { status: 400 });
    }

    // בדיקת כפילויות - טען את כל השאלות הקיימות
    const existingQuestions = await base44.asServiceRole.entities.QuestionBank.list("question_id", 20000);
    const existingQuestionIds = new Set(existingQuestions.map(q => q.question_id));
    const existingSolutions = await base44.asServiceRole.entities.SolutionBank.list("question_id", 20000);
    const existingSolutionIds = new Set(existingSolutions.map(s => s.question_id));

    let questionsAdded = 0;
    let solutionsAdded = 0;
    let questionsSkipped = 0;
    let solutionsSkipped = 0;
    const errors = [];

    // הוספת שאלות
    for (const question of questions) {
      try {
        // בדיקת כפילות
        if (existingQuestionIds.has(question.question_id)) {
          console.log(`⏭️ דילוג על שאלה קיימת: ${question.question_id}`);
          questionsSkipped++;
          continue;
        }

        console.log('➕ מוסיף שאלה:', {
          question_id: question.question_id,
          subject_id: question.subject_id,
          topic_id: question.topic_id,
          module_id: question.module_id,
          has_reading_text: !!question.reading_text
        });

        const questionData = {
          question_id: question.question_id,
          subject_id: question.subject_id,
          unit_level: question.unit_level,
          origin_type: question.origin_type || 'teacher_custom',
          origin_details: question.origin_details || '',
          topic_id: question.topic_id || null,
          subtopic_id: question.subtopic_id || null,
          question_text: question.question_text,
          question_image_url: question.question_image_url || null,
          reading_text: question.reading_text || null,
          question_type: question.question_type,
          max_score: question.max_score,
          difficulty_level: question.difficulty_level || 'medium',
          parts: question.parts || [],
          options: question.options || [],
          tags: question.tags || [],
          is_active: question.is_active !== false,
          usage_count: 0,
          avg_score: null
        };

        if (question.module_id) {
          questionData.module_id = question.module_id;
        }

        await base44.asServiceRole.entities.QuestionBank.create(questionData);

        questionsAdded++;
        existingQuestionIds.add(question.question_id);
        console.log('✅ שאלה נוספה בהצלחה:', question.question_id);
      } catch (error) {
        console.error('❌ שגיאה בהוספת שאלה:', question.question_id, error.message);
        errors.push(`Question ${question.question_id}: ${error.message}`);
      }
    }

    // הוספת פתרונות
    if (solutions && Array.isArray(solutions) && solutions.length > 0) {
      for (const solution of solutions) {
        try {
          // בדיקת כפילות
          if (existingSolutionIds.has(solution.question_id)) {
            console.log(`⏭️ דילוג על פתרון קיים: ${solution.question_id}`);
            solutionsSkipped++;
            continue;
          }

          console.log('➕ מוסיף פתרון:', solution.question_id);

          await base44.asServiceRole.entities.SolutionBank.create({
            question_id: solution.question_id,
            solution_text: solution.solution_text,
            solution_steps: solution.solution_steps || [],
            final_answers: solution.final_answers || [],
            acceptable_variants: solution.acceptable_variants || [],
            rubric: solution.rubric || [],
            explanation_video_url: solution.explanation_video_url || null,
            verified: solution.verified || false
          });

          solutionsAdded++;
          existingSolutionIds.add(solution.question_id);
          console.log('✅ פתרון נוסף בהצלחה:', solution.question_id);
        } catch (error) {
          console.error('❌ שגיאה בהוספת פתרון:', solution.question_id, error.message);
          errors.push(`Solution ${solution.question_id}: ${error.message}`);
        }
      }
    }

    console.log('📊 סיכום:', { 
      questionsAdded, 
      questionsSkipped, 
      solutionsAdded, 
      solutionsSkipped,
      errorsCount: errors.length 
    });

    return Response.json({
      success: true,
      questions_added: questionsAdded,
      questions_skipped: questionsSkipped,
      solutions_added: solutionsAdded,
      solutions_skipped: solutionsSkipped,
      errors: errors,
      message: `נוספו ${questionsAdded} שאלות ו-${solutionsAdded} פתרונות. דולגו ${questionsSkipped} שאלות כפולות ו-${solutionsSkipped} פתרונות כפולים.`
    });

  } catch (error) {
    console.error('❌ שגיאה כללית:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});