import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { questions, userAnswers, readingText } = body;

    if (!questions || !userAnswers || !readingText) {
      return Response.json({ 
        error: 'חסרים שדות חובה: questions, userAnswers, readingText' 
      }, { status: 400 });
    }

    console.log(`🎯 Checking ${questions.length} Extended Reading answers...`);

    const checkedResults = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const question of questions) {
      const userAnswer = userAnswers[question.question_number];
      const correctAnswer = question.correct_answer;
      
      maxScore += question.points || 1;

      // Multiple choice - exact match
      if (question.question_type === "multiple_choice" || question.options?.length > 0) {
        const isCorrect = userAnswer === correctAnswer;
        const points = isCorrect ? (question.points || 1) : 0;
        totalScore += points;

        checkedResults.push({
          ...question,
          userAnswer,
          isCorrect,
          points,
          feedback: isCorrect ? "✅ נכון!" : `❌ התשובה הנכונה היא ${correctAnswer}`
        });
        continue;
      }

      // Open questions - need AI checking
      const aiCheckResult = await checkWithAI(
        question,
        userAnswer,
        correctAnswer,
        readingText,
        base44
      );

      totalScore += aiCheckResult.points;
      checkedResults.push({
        ...question,
        userAnswer,
        ...aiCheckResult
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Generate deep insights
    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: `בהתבסס על הטקסט הבא:

"${readingText}"

תן תובנות מעמיקות לתלמיד:

1. מה המסר המרכזי של הטקסט?
2. מה אפשר להבין "בין השורות"?
3. מה טון הכותב (hopeful, critical, neutral)?
4. מה עמדת הכותב בנושא?
5. מה מסקנה שלא כתובה מפורשות?
6. טיפים לקריאה טובה יותר

כתוב הכל בעברית, בצורה ברורה ופשוטה.`,
      response_json_schema: {
        type: "object",
        properties: {
          main_message: { type: "string" },
          between_the_lines: { type: "string" },
          writers_tone: { type: "string" },
          writers_position: { type: "string" },
          implicit_conclusion: { type: "string" },
          reading_tips: {
            type: "array",
            items: { type: "string" },
            description: "טיפים לקריאה טובה יותר"
          }
        }
      }
    });

    console.log(`✅ Score: ${totalScore}/${maxScore} (${percentage}%)`);

    return Response.json({
      success: true,
      results: checkedResults,
      totalScore,
      maxScore,
      percentage,
      insights
    });

  } catch (error) {
    console.error('❌ Error checking Extended Reading:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

async function checkWithAI(question, userAnswer, correctAnswer, readingText, base44) {
  console.log(`🤖 AI checking Q${question.question_number}: ${question.question_text.substring(0, 50)}...`);

  try {
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה בודק אנגלית לבגרות. בדוק את תשובת התלמיד לפי הטקסט.

📖 הטקסט:
${readingText}

❓ השאלה:
${question.question_text}

✅ תשובה נכונה (לעזרה):
${correctAnswer}

📝 תשובת התלמיד:
"${userAnswer}"

---

בדוק:
1. האם התשובה נכונה לוגית לפי הטקסט?
2. האם היא מכילה את הרעיונות המרכזיים?
3. איפה בטקסט (פסקה כמה) מופיע הרמז לתשובה?

תן ציון:
- Correct (2/2) - אם התשובה נכונה לגמרי
- Partially Correct (1/2) - אם יש רעיון נכון אבל חסר פרט
- Incorrect (0/2) - אם התשובה לא נכונה

כתוב הכל בעברית.`,
      response_json_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["correct", "partial", "incorrect"] },
          points: { type: "number", description: "0, 1, or 2" },
          feedback_hebrew: { type: "string", description: "הסבר למה נכון/לא נכון" },
          text_reference: { type: "string", description: "היכן בטקסט מופיע הרמז" },
          what_was_missing: { type: "string", description: "מה חסר (אם partial/incorrect)" }
        }
      }
    });

    return {
      isCorrect: aiResult.status === "correct",
      status: aiResult.status,
      points: aiResult.points || 0,
      feedback: aiResult.feedback_hebrew,
      textReference: aiResult.text_reference,
      whatWasMissing: aiResult.what_was_missing
    };
  } catch (error) {
    console.error(`Error in AI check for Q${question.question_number}:`, error);
    
    // Fallback: keyword matching
    const keywords = correctAnswer.toLowerCase().split(' ').filter(w => w.length > 3);
    const userLower = (userAnswer || "").toLowerCase();
    const matchCount = keywords.filter(kw => userLower.includes(kw)).length;
    const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;

    const isCorrect = matchRatio >= 0.7;
    const points = isCorrect ? 2 : matchRatio >= 0.4 ? 1 : 0;

    return {
      isCorrect,
      status: isCorrect ? "correct" : matchRatio >= 0.4 ? "partial" : "incorrect",
      points,
      feedback: isCorrect ? "תשובה נכונה" : "התשובה חלקית או לא מדויקת מספיק",
      textReference: "",
      whatWasMissing: ""
    };
  }
}