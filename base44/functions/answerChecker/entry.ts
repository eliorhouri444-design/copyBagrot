import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { question, studentAnswer, correctSolution, checkingMode = 'detailed' } = await req.json();

        if (!question || !studentAnswer) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('🔍 Checking answer for:', question.substring(0, 50));

        const prompt = `אתה בודק תשובות מתמטיות ברמה מקצועית.

**🎯 משימה: בדיקת תשובה מפורטת**

**השאלה:**
${question}

**תשובת התלמיד:**
${studentAnswer}

${correctSolution ? `**פתרון נכון:**\n${correctSolution}` : ''}

**⚠️ הוראות בדיקה קריטיות:**

1️⃣ **ניתוח השלבים (20 נק'):**
   - האם התלמיד הבין את השאלה?
   - האם זיהה את הנתונים הנכונים?
   - האם יודע מה מבוקש?

2️⃣ **שיטת הפתרון (30 נק'):**
   - האם בחר בשיטה הנכונה?
   - האם השתמש בנוסחאות/משפטים נכונים?
   - האם הסדר לוגי?

3️⃣ **ביצוע החישובים (40 נק'):**
   - האם החישובים מדויקים?
   - האם יש טעויות אריתמטיות?
   - האם השתמש ביחידות נכונות?

4️⃣ **תשובה סופית (10 נק'):**
   - האם התשובה הסופית נכונה?
   - האם כתב ביחידות?
   - האם ענה על מה שנשאל?

**בדיקת גיאומטריה:**
- האם השתמש במשפטים גיאומטריים נכונים?
- האם הקשר בין זוויות נכון? (מרכזית vs היקפית)
- האם הנוסחאות נכונות? (שטח, היקף, זוויות)

**החזר JSON:**

{
  "is_correct": true/false,
  "score_percentage": 0-100,
  "breakdown": {
    "understanding": 0-20,
    "method": 0-30,
    "execution": 0-40,
    "final_answer": 0-10
  },
  "feedback_hebrew": {
    "positive": ["דבר 1 שהיה טוב", "דבר 2"],
    "needs_improvement": ["דבר 1 לשיפור", "דבר 2"],
    "critical_errors": ["טעות חמורה 1", "טעות 2"]
  },
  "detailed_analysis": {
    "step_by_step": [
      {
        "step_number": 1,
        "student_did": "מה התלמיד עשה",
        "is_correct": true/false,
        "feedback": "משוב על השלב"
      }
    ],
    "missing_steps": ["שלב שחסר 1", "שלב 2"],
    "wrong_formulas": ["נוסחה שגויה שהשתמש בה"],
    "arithmetic_errors": ["טעות חישוב בשלב X"]
  },
  "recommendations": [
    "חזור על: חוקי זוויות במעגל",
    "תרגל: משפט פיתגורס",
    "שים לב: יחידות במהירות"
  ],
  "similar_mistakes": "סוג הטעות הנפוצה (אם יש)"
}

**דוגמאות למשוב:**

**תשובה מצוינת (95%):**
{
  "positive": ["זיהית נכון את הנתונים", "השתמשת בשיטה הנכונה", "החישובים מדויקים"],
  "needs_improvement": ["ניתן להוסיף בדיקת יחידות"],
  "critical_errors": []
}

**תשובה עם טעות (65%):**
{
  "positive": ["הבנת נכון את השאלה", "התחלת בשיטה הנכונה"],
  "needs_improvement": ["טעות בחישוב בשלב 3", "לא בדקת את התוצאה"],
  "critical_errors": ["השתמשת בנוסחה שגויה: F=ma במקום v²=u²+2as"]
}

**תשובה שגויה (30%):**
{
  "positive": ["ניסית לפתור באופן שיטתי"],
  "needs_improvement": ["לא זיהית נכון את סוג הבעיה"],
  "critical_errors": ["לא השתמשת במשפט הנכון", "טעות חישוב גדולה", "לא בדקת יחידות"]
}

בדוק בקפדנות ותן משוב מקצועי!`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    is_correct: { type: "boolean" },
                    score_percentage: { type: "number" },
                    breakdown: { type: "object" },
                    feedback_hebrew: { type: "object" },
                    detailed_analysis: { type: "object" },
                    recommendations: { type: "array" },
                    similar_mistakes: { type: "string" }
                }
            }
        });

        console.log('✅ Checking complete');

        return Response.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});