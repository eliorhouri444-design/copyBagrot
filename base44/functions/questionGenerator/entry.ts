import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// 📚 כללי רמות יחידות
const UNIT_LEVEL_RULES = {
  3: {
    max_steps: 4,
    allowed_tools: ["משוואות ריבועיות", "חזקות", "שורשים", "פונקציות פשוטות"],
    forbidden_tools: ["נגזרות", "אינטגרלים", "טריגונומטריה", "לוגריתמים"]
  },
  4: {
    max_steps: 7,
    allowed_tools: ["נגזרות פשוטות", "פונקציות רציונליות", "טריגו בסיסי", "גרפים"],
    forbidden_tools: ["אינטגרלים", "נגזרת מנה מורכבת", "דה מואבר", "טריגו הפוכה"]
  },
  5: {
    max_steps: 12,
    allowed_tools: ["אינטגרלים", "נגזרות מתקדמות", "טריגו מלא", "אופטימיזציה"],
    forbidden_tools: ["משוואות דיפרנציאליות", "אנליזה וקטורית"]
  }
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { originalQuestion, subject, topic, difficulty, count = 5, unitLevel } = await req.json();

        if (!originalQuestion) {
            return Response.json({ error: 'Missing originalQuestion' }, { status: 400 });
        }

        console.log(`🎯 Generating ${count} similar questions for: ${topic || subject}`);

        // ✅ קבע כללים לפי יחידה
        const rules = unitLevel ? UNIT_LEVEL_RULES[unitLevel] : null;

        const prompt = `אתה יוצר שאלות תרגול במתמטיקה ברמה מקצועית.

**🎯 משימה:**
צור ${count} שאלות **דומות** לשאלה המקורית, אך עם **נתונים חדשים לחלוטין**.

**השאלה המקורית:**
${originalQuestion}

${rules ? `
**📋 כללי רמת ${unitLevel} יחידות:**
- מקסימום שלבים: ${rules.max_steps}
- כלים מותרים: ${rules.allowed_tools.join(', ')}
- כלים אסורים: ${rules.forbidden_tools.join(', ')}
` : ''}

---

## ⚠️ דרישות חובה:

### 1️⃣ דמיון למקור:
- **אותו סוג שאלה** (חקירה/פתרון/חישוב)
- **אותו נושא מתמטי** (${topic || 'כללי'})
- **אותה מבנה** (כמה סעיפים, סוג דרישות)

### 2️⃣ שוני מהמקור:
- **נתונים חדשים לחלוטין** (מספרים, פרמטרים)
- **הקשר שונה** (לא להעתיק את הסיפור)
- **פתרון ייחודי** (אותה שיטה, תוצאות שונות)

### 3️⃣ רמת קושי:
- ${difficulty === 'easy' ? 'קל - פחות שלבים, מספרים פשוטים' : ''}
- ${difficulty === 'medium' ? 'בינוני - כמו המקור' : ''}
- ${difficulty === 'hard' ? 'קשה יותר - יותר שלבים, מספרים מורכבים' : ''}

---

## 📝 מבנה תשובה לכל שאלה:

{
  "question_number": 1,
  "question_text": "[ניסוח השאלה המלא]",
  "difficulty_level": "easy/medium/hard",
  "topic": "${topic || 'כללי'}",
  "full_solution": "[פתרון מלא שלב אחר שלב]",
  "final_answer": "[תשובה סופית עם יחידות]",
  "estimated_time": X  // זמן בדקות
}

---

## 🎯 דוגמאות:

**שאלה מקורית:**
"פתור: x² - 5x + 6 = 0"

**שאלות דומות טובות:**
1. "פתור: x² - 7x + 12 = 0"
2. "פתור: 2x² - 8x + 6 = 0"
3. "פתור: x² + 3x - 10 = 0"

**❌ שאלה לא טובה:**
"חשב את האינטגרל של x²"
→ זה נושא אחר לחלוטין!

---

**שאלה מקורית:**
"נתונה f(x) = x² - 4x + 3. מצא תחומי עליה וירידה."

**שאלות דומות טובות:**
1. "נתונה f(x) = x² - 6x + 5. מצא תחומי עליה וירידה."
2. "נתונה f(x) = 2x² - 8x + 7. מצא תחומי עליה וירידה."
3. "נתונה g(x) = -x² + 4x - 1. מצא תחומי עליה וירידה."

---

## 🔍 בדיקה עצמית לפני שליחה:

לכל שאלה, שאל את עצמך:
✅ האם זה אותו **סוג** שאלה?
✅ האם הנתונים **שונים** מהמקור?
✅ האם הפתרון **אפשרי** ב-${rules?.max_steps || 10} שלבים?
✅ האם השאלה **לא משתמשת** בכלים אסורים?
✅ האם הניסוח **ברור וחד-משמעי**?

אם התשובה לאחת מהשאלות "לא" → **תקן את השאלה!**

---

צור **${count} שאלות מושלמות** עכשיו.`;

        console.log('🤖 Calling LLM...');

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    questions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question_number: { type: "integer" },
                                question_text: { type: "string" },
                                difficulty_level: { type: "string" },
                                topic: { type: "string" },
                                full_solution: { type: "string" },
                                final_answer: { type: "string" },
                                estimated_time: { type: "integer" }
                            }
                        }
                    }
                }
            }
        });

        const generatedCount = result.questions?.length || 0;
        console.log(`✅ Generated ${generatedCount} questions`);

        return Response.json({
            success: true,
            questions: result.questions,
            count: generatedCount,
            metadata: {
                original_question: originalQuestion.substring(0, 100),
                subject: subject,
                topic: topic,
                difficulty: difficulty,
                unit_level: unitLevel,
                rules_applied: rules ? true : false
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});