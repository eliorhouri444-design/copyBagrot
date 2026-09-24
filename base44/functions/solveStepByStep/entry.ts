import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { question, subject, imageUrl, analysisData } = await req.json();

        if (!question) {
            return Response.json({ error: 'Missing question' }, { status: 400 });
        }

        console.log('🧮 Advanced solving:', subject);

        // 🎯 הוראות המורה החכם
        const geometryRules = `
**📐 כללי גיאומטריה קריטיים:**

1️⃣ **ניתוח לפני פתרון:**
   - זהה סוג זוויות: מרכזית/היקפית/חיצונית
   - זהה סוג קווים: מקביל/ניצב/משיק
   - בדוק יחסים: שורש/ריבוע/חלוקה

2️⃣ **כל צעד עם הסבר מלא:**
   - מאיפה הגיע הקשר? (משפט, הגדרה, נתון)
   - איזה משפט גיאומטרי נשתמש?
   - למה הקשר הזה נכון?

3️⃣ **חוקי זוויות במעגל:**
   - זווית מרכזית = 2 × זווית היקפית (על אותה קשת)
   - טרפז חסום: סכום זוויות נגדיות = 180°
   - זווית היקפית על קוטר = 90°

4️⃣ **נוסחאות מעגל:**
   - משיק ורדיוס: ניצבים
   - אורך קשת: l = R·θ (בדיאנים)
   - שטח גזרה: S = (1/2)R²θ
   - משפט הפתגורס: a² + b² = c²

5️⃣ **בדיקת סבירות בסוף:**
   - האם הערכים הגיוניים?
   - האם זווית בין 0° ל-360°?
   - האם אורך חיובי?
   - האם שטח חיובי?`;

        const prompt = `אתה מערכת פתרון מתמטית מקצועית ברמת דיוק 99%.

${geometryRules}

**השאלה:**
${question}

${analysisData ? `
**ניתוח שהתקבל:**
- מקצוע: ${analysisData.subject}
- נושא: ${analysisData.main_topic}
- קושי: ${analysisData.difficulty_level}
- נתונים: ${JSON.stringify(analysisData.given_data)}
- נדרש למצוא: ${analysisData.required_to_find?.join(', ')}
` : ''}

**⚠️ דרישות פתרון:**

## 🎯 שלב 0: הבנה ואסטרטגיה

### מה נתון?
רשום **כל** נתון בפורמט ברור:
- משתנה = ערך יחידה
- דוגמה: v₀ = 10 m/s, a = 5 m/s²

### מה מבוקש?
רשום **במדויק** מה צריך למצוא

### אסטרטגיה:
- **משפטים שנשתמש:** (פיתגורס, זוויות במעגל, וכו')
- **נוסחאות:** כתוב ב-LaTeX
- **סדר פעולות:** מה קודם, מה אחר כך

---

## 📐 שלבי הפתרון

### שלב 1: [שם השלב]

**📌 מה עושים:**
[הסבר מילולי - **למה** אנחנו עושים זאת]

**🔧 על פי איזה משפט:**
[שם המשפט המלא + מאיפה הוא בא]

**📝 חישוב:**
\`\`\`
צעד 1: נציב נתונים
[כתוב בבירור]

צעד 2: נשתמש בנוסחה
[כתוב את הנוסחה]

צעד 3: נחשב
[פירוט מלא]
\`\`\`

**✅ תוצאת ביניים:**
[התוצאה עם יחידות]

**💡 בדיקת הגיון:**
[האם זה הגיוני? למה?]

**⚠️ שגיאות נפוצות:**
[מה לא לעשות]

---

[חזור על המבנה לכל שלב...]

---

## 🏁 תשובה סופית

**📌 התשובה המלאה:**
[כתוב בצורה ברורה עם יחידות]

---

## ✅ בדיקה ואימות

### בדיקת יחידות:
[בדוק שכל היחידות תואמות]

### בדיקת סבירות:
[האם התוצאה הגיונית?]

### בדיקה חלופית (אם אפשר):
[פתור בדרך נוספת]

---

## 📚 סיכום

**מושגים שהשתמשנו:**
[רשימת משפטים ונוסחאות]

**טיפים לשאלות דומות:**
[עצות]

**⚠️ חשוב:**
- כל חישוב **מדויק**
- כל נוסחה ב-**LaTeX תקני**
- כל שלב עם **הסבר מלא**
- **בדוק פעמיים** לפני סיום`;

        const solution = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: imageUrl ? [imageUrl] : undefined
        });

        console.log('✅ Solution complete');

        const finalAnswerMatch = solution.match(/📌\s*התשובה המלאה:?\*?\*?\s*\n(.+?)(?:\n\n|$)/s);
        const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : "ראה פתרון מלא";

        return Response.json({
            success: true,
            solution: solution,
            final_answer: finalAnswer,
            accuracy_level: "99%"
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});