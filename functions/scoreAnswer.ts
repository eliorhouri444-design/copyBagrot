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

        const { 
            question_id, 
            user_answer_text, 
            user_answer_structure,
            subject_id 
        } = await req.json();

        if (!question_id || !user_answer_text) {
            return Response.json({ 
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        console.log('🎯 Scoring answer for question:', question_id);

        // שלב 1: שלוף שאלה
        const questions = await base44.entities.QuestionBank.filter({ question_id });
        if (questions.length === 0) {
            return Response.json({ error: 'Question not found' }, { status: 404 });
        }
        const question = questions[0];

        // שלב 2: שלוף פתרון רשמי
        const solutions = await base44.entities.SolutionBank.filter({ question_id });
        if (solutions.length === 0) {
            return Response.json({ error: 'Solution not found' }, { status: 404 });
        }
        const solution = solutions[0];

        // שלב 3: בחר פונקציית ניקוד לפי מקצוע
        let scoringResult;
        
        if (subject_id === 'math' || subject_id === 'מתמטיקה') {
            scoringResult = await scoreMathAnswer(
                question, 
                solution, 
                user_answer_text, 
                user_answer_structure
            );
        } else if (subject_id === 'english' || subject_id === 'אנגלית') {
            scoringResult = await scoreEnglishAnswer(
                question, 
                solution, 
                user_answer_text
            );
        } else if (['physics', 'chemistry', 'biology', 'פיזיקה', 'כימיה', 'ביולוגיה'].includes(subject_id)) {
            scoringResult = await scoreScienceAnswer(
                question, 
                solution, 
                user_answer_text, 
                user_answer_structure
            );
        } else {
            // מקצועות עיוניים
            scoringResult = await scoreTextualAnswer(
                question, 
                solution, 
                user_answer_text
            );
        }

        // שלב 4: שמור ניסיון
        const attempt = await base44.entities.AttemptNew.create({
            attempt_id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            question_id,
            subject_id: question.subject_id,
            user_answer_text,
            user_answer_structure,
            score: scoringResult.score,
            max_score: question.max_score,
            percentage: Math.round((scoringResult.score / question.max_score) * 100),
            detailed_feedback: scoringResult.feedback,
            scoring_breakdown: scoringResult.breakdown,
            status: scoringResult.status,
            ai_model_used: 'gpt-4o'
        });

        console.log('✅ Answer scored:', scoringResult.score, '/', question.max_score);

        return Response.json({
            success: true,
            attempt_id: attempt.id,
            score: scoringResult.score,
            max_score: question.max_score,
            percentage: Math.round((scoringResult.score / question.max_score) * 100),
            status: scoringResult.status,
            feedback: scoringResult.feedback,
            breakdown: scoringResult.breakdown,
            show_solution: scoringResult.status === 'incorrect'
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

// ========================================
// מתמטיקה
// ========================================
async function scoreMathAnswer(question, solution, userAnswer, userStructure) {
    const rubric = solution.rubric || [];
    const finalAnswers = solution.final_answers || [];

    const prompt = `אתה בוחן מתמטיקה מנוסה. תפקידך לתת ניקוד חלקי לפי כללים ברורים.

# השאלה:
${question.question_text}

# הפתרון הרשמי:
${solution.solution_text}

שלבי הפתרון:
${solution.solution_steps?.map((s, i) => `${i + 1}. ${s.description}`).join('\n') || ''}

תשובות נכונות:
${finalAnswers.map(a => `סעיף ${a.part_id}: ${a.value} ${a.unit || ''} (גם: ${a.variants?.join(', ') || 'אין'})`).join('\n')}

# Rubric (טבלת ניקוד):
${JSON.stringify(rubric, null, 2)}

# תשובת התלמיד:
${userAnswer}

${userStructure ? `פירוט לפי סעיפים:\n${JSON.stringify(userStructure, null, 2)}` : ''}

---

# כללי ניקוד למתמטיקה:

1. **דרך נכונה + תשובה נכונה** → 100%
2. **דרך נכונה + טעות חישוב קטנה בסוף** → 60-80%
3. **דרך חלקית או שימוש לא נכון במשפט** → 30-50%
4. **רק תשובה נכונה ללא דרך (כשדרך נדרשת)** → 20-40%
5. **תשובה שגויה ודרך לא נכונה** → 0-10%

---

# תפקידך:

דרג את תשובת התלמיד ותחזיר JSON:

\`\`\`json
{
  "score": <מספר נקודות>,
  "status": "correct" | "partial" | "incorrect",
  "feedback": "משוב מפורט - מה נכון ומה לא",
  "breakdown": [
    {
      "part_id": "a",
      "score": <נקודות>,
      "max_score": <מקסימום>,
      "feedback": "הסבר ספציפי לסעיף",
      "criteria_met": ["דרך נכונה", "הצבה נכונה"],
      "criteria_missed": ["טעות חישוב בסוף"]
    }
  ]
}
\`\`\`

**אל תחרוג ממספר הנקודות המקסימלי!**`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "אתה בוחן מתמטיקה מקצועי. תמיד מחזיר JSON תקני." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
}

// ========================================
// אנגלית
// ========================================
async function scoreEnglishAnswer(question, solution, userAnswer) {
    const finalAnswers = solution.final_answers || [];

    const prompt = `אתה בוחן אנגלית מנוסה.

# השאלה:
${question.question_text}

# תשובה נכונה:
${finalAnswers.map(a => `${a.value} (גם: ${a.variants?.join(', ') || 'אין'})`).join(', ')}

# תשובת התלמיד:
${userAnswer}

---

# כללי ניקוד לאנגלית:

**Vocabulary / Fill-in-blank:**
- משמעות נכונה + כתיב תקין → 100%
- משמעות נכונה + שגיאת כתיב קטנה → 70-80%
- מילה שגויה לגמרי → 0%

**הבנת הנקרא:**
- כל הרעיון המרכזי → 100%
- חסר פרט משני → 70-80%
- חסר רעיון מרכזי או סותר → 0-40%

**Writing:**
- 40% תוכן (רעיון, מבנה)
- 30% דקדוק
- 20% אוצר מילים
- 10% כתיב ופיסוק

---

תחזיר JSON:
\`\`\`json
{
  "score": <נקודות>,
  "status": "correct" | "partial" | "incorrect",
  "feedback": "משוב מפורט",
  "breakdown": []
}
\`\`\``;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "אתה בוחן אנגלית. תמיד מחזיר JSON תקני." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
}

// ========================================
// מדעים (פיזיקה/כימיה/ביולוגיה)
// ========================================
async function scoreScienceAnswer(question, solution, userAnswer, userStructure) {
    const prompt = `אתה בוחן מדעים מנוסה.

# השאלה:
${question.question_text}

# הפתרון הרשמי:
${solution.solution_text}

# תשובת התלמיד:
${userAnswer}

---

# כללי ניקוד למדעים:

- 40% – בחירת נוסחה/חוק נכון
- 40% – דרך חישוב מסודרת
- 20% – תשובה מספרית + יחידות נכונות

---

תחזיר JSON:
\`\`\`json
{
  "score": <נקודות>,
  "status": "correct" | "partial" | "incorrect",
  "feedback": "משוב",
  "breakdown": []
}
\`\`\``;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "אתה בוחן מדעים. תמיד מחזיר JSON תקני." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
}

// ========================================
// מקצועות עיוניים
// ========================================
async function scoreTextualAnswer(question, solution, userAnswer) {
    const prompt = `אתה בוחן מקצועות עיוניים (היסטוריה, אזרחות, תנ"ך).

# השאלה:
${question.question_text}

# תשובה מומלצת:
${solution.solution_text}

# תשובת התלמיד:
${userAnswer}

---

# כללי ניקוד:

- 70% – האם העיקר (מושגים מרכזיים) מופיע
- 30% – ניסוח, בהירות, סדר

---

תחזיר JSON:
\`\`\`json
{
  "score": <נקודות>,
  "status": "correct" | "partial" | "incorrect",
  "feedback": "משוב",
  "breakdown": []
}
\`\`\``;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "אתה בוחן מקצועות עיוניים. תמיד מחזיר JSON תקני." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
}