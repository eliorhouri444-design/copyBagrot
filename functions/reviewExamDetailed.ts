import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { examAttemptId } = await req.json();

        if (!examAttemptId) {
            return Response.json({ error: 'Missing examAttemptId' }, { status: 400 });
        }

        console.log(`📊 Starting detailed review for exam attempt: ${examAttemptId}`);

        // טעינת הניסיון במבחן
        const attempts = await base44.entities.ExamAttempt.filter({ id: examAttemptId });
        
        if (attempts.length === 0) {
            return Response.json({ error: 'Exam attempt not found' }, { status: 404 });
        }

        const attempt = attempts[0];

        // בדיקה שהמשתמש הוא בעל הניסיון או אדמין
        if (attempt.created_by !== user.email && user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - not your exam' }, { status: 403 });
        }

        // טעינת המבחן המקורי
        const exams = await base44.entities.GenericExam.filter({ id: attempt.exam_id });
        
        if (exams.length === 0) {
            return Response.json({ error: 'Original exam not found' }, { status: 404 });
        }

        const exam = exams[0];

        console.log(`📝 Reviewing ${attempt.answers?.length || 0} answers for ${exam.subject}`);

        // בדיקה מפורטת של כל שאלה
        const questionReviews = [];
        let totalPointsEarned = 0;

        for (let i = 0; i < (attempt.answers?.length || 0); i++) {
            const answer = attempt.answers[i];
            const question = exam.questions?.[i];

            if (!question) continue;

            console.log(`Reviewing question ${i + 1}/${attempt.answers.length}`);

            // בניית פרומפט לפי סוג המקצוע
            let reviewPrompt = '';

            if (exam.subject === 'אנגלית' || exam.subject === 'עברית') {
                // בדיקה לשונית מתקדמת
                reviewPrompt = `אתה בוחן מקצועי לבגרות ב${exam.subject}.

**שאלה ${question.question_number}:**
${question.question_text}

**תשובה נכונה:**
${question.correct_answer}

**תשובת התלמיד:**
${answer.user_answer}

**משימתך:**
1. בדוק אם **התוכן נכון** - האם התלמיד הבין נכון והשיב נכון מבחינת תוכן
2. זהה **שגיאות כתיב** - spelling, grammar, punctuation
3. קבע **ציון:**
   - אם התוכן נכון אבל יש שגיאות כתיב → הורד נקודות חלקית (לא כל הנקודות!)
   - אם התוכן שגוי → 0 נקודות
   - אם הכל נכון → נקודות מלאות

**נקודות מקסימליות לשאלה:** ${question.points || 10}

**החזר JSON:**
{
  "content_correct": true/false,
  "language_errors": [
    {"error_type": "spelling", "error_text": "...", "correction": "...", "points_deducted": 1}
  ],
  "points_earned": 8.5,
  "feedback": "התוכן נכון אבל יש 2 שגיאות כתיב קלות..."
}`;

            } else if (exam.subject === 'מתמטיקה' || exam.subject === 'פיזיקה') {
                // בדיקה צעד-אחר-צעד
                reviewPrompt = `אתה בוחן מקצועי לבגרות ב${exam.subject}.

**שאלה ${question.question_number}:**
${question.question_text}

**תשובה נכונה:**
${question.correct_answer}

**הסבר הפתרון הנכון:**
${question.explanation || 'לא ניתן'}

**תשובת התלמיד:**
${answer.user_answer}

${answer.drawing_url ? `**ציור/כתב יד של התלמיד:**
[ניתח את הציור/כתב היד המצורף]
` : ''}

**משימתך:**
1. **נתח צעד אחר צעד** - זהה כל שלב בפתרון של התלמיד
2. **בדוק כל שלב:**
   - האם השלב נכון?
   - כמה נקודות מגיע לו על השלב הזה?
   - מה הפידבק?
3. **חשב ציון כולל:**
   - אם התלמיד עשה 80% מהדרך נכון אבל טעה בתשובה הסופית → תן לו 80% מהנקודות!
   - אם טעה באמצע אבל המשיך נכון → תן ציון יחסי
   - אם הכל נכון → נקודות מלאות

**נקודות מקסימליות לשאלה:** ${question.points || 10}

**החזר JSON:**
{
  "step_by_step_review": [
    {
      "step_number": 1,
      "step_description": "הגדרת משתנים",
      "is_correct": true,
      "points_earned": 2,
      "feedback": "מצוין! הגדרת נכון..."
    },
    {
      "step_number": 2,
      "step_description": "חישוב...",
      "is_correct": false,
      "points_earned": 0,
      "feedback": "טעות בחישוב, היה צריך...",
      "correct_approach": "הדרך הנכונה היא..."
    }
  ],
  "points_earned": 6.5,
  "final_answer_correct": false,
  "feedback": "הדרך שלך הייתה נכונה עד שלב 3, אבל..."
}`;

            } else {
                // בדיקה כללית
                reviewPrompt = `בדוק את התשובה:

שאלה: ${question.question_text}
תשובה נכונה: ${question.correct_answer}
תשובת תלמיד: ${answer.user_answer}

נקודות מקסימליות: ${question.points || 10}

החזר JSON:
{
  "is_correct": true/false,
  "points_earned": 10,
  "feedback": "..."
}`;
            }

            // קריאה ל-AI לבדיקה
            const reviewResult = await base44.integrations.Core.InvokeLLM({
                prompt: reviewPrompt,
                file_urls: answer.drawing_url ? [answer.drawing_url] : null,
                response_json_schema: {
                    type: "object",
                    properties: {
                        content_correct: { type: "boolean" },
                        language_errors: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    error_type: { type: "string" },
                                    error_text: { type: "string" },
                                    correction: { type: "string" },
                                    points_deducted: { type: "number" }
                                }
                            }
                        },
                        step_by_step_review: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    step_number: { type: "integer" },
                                    step_description: { type: "string" },
                                    is_correct: { type: "boolean" },
                                    points_earned: { type: "number" },
                                    feedback: { type: "string" },
                                    correct_approach: { type: "string" }
                                }
                            }
                        },
                        points_earned: { type: "number" },
                        final_answer_correct: { type: "boolean" },
                        is_correct: { type: "boolean" },
                        feedback: { type: "string" }
                    }
                }
            });

            const pointsEarned = reviewResult.points_earned || (reviewResult.is_correct ? (question.points || 10) : 0);
            totalPointsEarned += pointsEarned;

            questionReviews.push({
                question_number: question.question_number || (i + 1),
                user_answer: answer.user_answer,
                user_drawing_url: answer.drawing_url,
                scanned_content: answer.scanned_content,
                correct_answer: question.correct_answer,
                is_fully_correct: reviewResult.content_correct || reviewResult.is_correct || false,
                partial_credit: pointsEarned > 0 && pointsEarned < (question.points || 10),
                points_earned: pointsEarned,
                max_points: question.points || 10,
                step_by_step_review: reviewResult.step_by_step_review || [],
                language_errors: reviewResult.language_errors || [],
                content_feedback: {
                    content_accuracy: reviewResult.content_correct || reviewResult.is_correct || false,
                    strengths: [],
                    weaknesses: [],
                    improvement_suggestions: []
                },
                overall_feedback: reviewResult.feedback || ''
            });
        }

        // חישוב ציון סופי
        const maxPoints = exam.questions.reduce((sum, q) => sum + (q.points || 10), 0);
        const finalScore = (totalPointsEarned / maxPoints) * 100;

        // יצירת המלצות כלליות
        const recommendationsPrompt = `סקור את הביצועים הכוללים:

מקצוע: ${exam.subject}
ציון: ${finalScore.toFixed(1)}
סך נקודות: ${totalPointsEarned}/${maxPoints}

שאלות שנענו נכון: ${questionReviews.filter(r => r.is_fully_correct).length}/${questionReviews.length}
שאלות עם ציון חלקי: ${questionReviews.filter(r => r.partial_credit).length}

תן 3-5 המלצות ללמידה מותאמות אישית.

החזר JSON:
{
  "strengths": ["נקודת חוזק 1", "נקודת חוזק 2"],
  "areas_for_improvement": ["שיפור 1", "שיפור 2"],
  "study_recommendations": ["המלצה 1", "המלצה 2"]
}`;

        const recommendations = await base44.integrations.Core.InvokeLLM({
            prompt: recommendationsPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    strengths: { type: "array", items: { type: "string" } },
                    areas_for_improvement: { type: "array", items: { type: "string" } },
                    study_recommendations: { type: "array", items: { type: "string" } }
                }
            }
        });

        // שמירת הביקורת המפורטת
        const detailedReview = await base44.entities.DetailedExamReview.create({
            exam_attempt_id: examAttemptId,
            subject: exam.subject,
            unit_level: exam.unit_level,
            total_score: finalScore,
            question_reviews: questionReviews,
            strengths: recommendations.strengths || [],
            areas_for_improvement: recommendations.areas_for_improvement || [],
            study_recommendations: recommendations.study_recommendations || [],
            reviewed_at: new Date().toISOString(),
            review_version: "1.0"
        });

        // עדכון ה-ExamAttempt עם הציון המדויק
        await base44.entities.ExamAttempt.update(examAttemptId, {
            score_percent: finalScore,
            earned_points: totalPointsEarned,
            total_points: maxPoints,
            passed: finalScore >= 56
        });

        return Response.json({
            success: true,
            message: `✅ הבדיקה הושלמה!`,
            review: detailedReview,
            final_score: finalScore,
            points: `${totalPointsEarned}/${maxPoints}`
        });

    } catch (error) {
        console.error('❌ Error reviewing exam:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});