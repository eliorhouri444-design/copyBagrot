import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🧮 Symbolab-Style Advanced Math Solver
 * מערכת פתרון מתמטית מתקדמת עם מספר שיטות פתרון וצעדים מפורטים
 */

Deno.serve(async (req) => {
  console.log("🧮 SYMBOLAB-STYLE SOLVER STARTED");
  
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { expression, subject, units, problemType, imageUrl } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    console.log("📐 Expression:", expression?.substring(0, 100));
    console.log("🎯 Problem type:", problemType || 'auto-detect');

    // מערכת הפרומפטים המתקדמת לפי סוג בעיה
    const systemPrompts = {
      algebra: `אתה מערכת פתרון אלגברה מתקדמת בסגנון Symbolab.

**כלים זמינים:**
- פישוט ביטויים אלגבריים מורכבים
- פתרון משוואות (ליניאריות, ריבועיות, פולינומיות, רציונליות)
- פירוק לגורמים (שיטות: גורם משותף, קבוצות, נוסחת הפירוק, נוסחה ריבועית)
- מערכות משוואות (הצבה, חיסור, מטריצות)
- אי-שוויונות
- פונקציות ומציאת שורשים

**עקרונות:**
- תמיד הצג שיטות פתרון חלופיות אם קיימות
- בדוק את התוצאה בהצבה חזרה
- הסבר מתי שיטה עובדת ומתי לא`,

      calculus: `אתה מערכת חשבון אינפיניטסימלי מומחית בסגנון Symbolab.

**כלים זמינים:**
- גבולות (שיטות: הצבה ישירה, L'Hôpital, Taylor, סנדוויץ')
- נגזרות (כללים: חזקה, מכפלה, מנה, שרשרת, נגזרת הפוכה)
- אינטגרלים (שיטות: ישיר, הצבה, חלקים, שברים חלקיים, טריגונומטרי)
- קיצון (נקודות קריטיות, נגזרת שנייה, גרף)
- סדרות וטורים

**עקרונות:**
- תמיד ציין איזו שיטה אתה בוחר ולמה
- הראה בדיקת תוצאה (נגזרת של אינטגרל וכו')
- צייר גרף אם רלוונטי`,

      trigonometry: `אתה מומחה טריגונומטריה בסגנון Symbolab.

**כלים זמינים:**
- זהויות טריגונומטריות (פיתגורס, זוגיות/אי-זוגיות, סכום/הפרש)
- פתרון משוואות טריגונומטריות
- מעגל היחידה וזוויות מיוחדות
- חוקי סינוס וקוסינוס במשולשים
- גרפים של פונקציות טריגונומטריות

**עקרונות:**
- השתמש במעגל היחידה לויזואליזציה
- תן פתרונות כלליים (+ 2πk)
- הראה זהויות רלוונטיות`,

      geometry: `אתה מומחה גאומטריה בסגנון Symbolab.

**כלים זמינים:**
- משולשים (פיתגורס, שטחים, היקפים, משפט התלתן)
- מעגלים (שטח, היקף, מיתרים, משיקים, זוויות)
- רב-מצולעים ומרובעים מיוחדים
- גופים תלת-מימדיים
- קואורדינטות ווקטורים
- טרנספורמציות

**עקרונות:**
- תמיד צייר איור מפורט עם כל הנתונים
- סמן נתונים בצבע אחד ונעלמים באחר
- הראה כמה דרכים לפתור אם יש`,

      matrices: `אתה מומחה אלגברה לינארית בסגנון Symbolab.

**כלים זמינים:**
- פעולות בסיס (חיבור, כפל, סקלר)
- דטרמיננטה (שיטות: קופקטורים, עיבוד שורות)
- מטריצה הופכית
- דירוג מטריצה
- ערכים ווקטורים עצמיים
- מערכות משוואות (Gauss, Cramer)

**עקרונות:**
- הצג כל מטריצה בצורה נקייה
- סמן שורות/עמודות בפעולות
- הסבר מתי פעולה אפשרית/בלתי אפשרית`,

      probability: `אתה מומחה הסתברות וסטטיסטיקה בסגנון Symbolab.

**כלים זמינים:**
- הסתברות קלאסית ומותנית
- קומבינטוריקה (תמורות, צירופים)
- התפלגויות (בינומית, נורמלית, פואסון)
- תוחלת, שונות, סטיית תקן
- מדגם ואוכלוסייה

**עקרונות:**
- הסבר כל נוסחה לפני שימוש
- הראה התפלגות בגרף
- הסבר את המשמעות של התוצאה`
    };

    const userPrompt = `פתור את השאלה הבאה בדיוק מקסימלי:

**השאלה:**
${expression}

**הנחיות פתרון:**
1. זהה את סוג הבעיה (אלגברה/חדו"א/טריגונומטריה/גאומטריה וכו')
2. בחר את שיטת הפתרון המתאימה ביותר והסבר למה
3. פתור צעד אחר צעד עם הסברים מפורטים לכל מעבר
4. הצג חישובים ביניים - אל תדלג על שום דבר
5. בדוק את התוצאה (הצבה חזרה/נגזרת/אימות)
6. הצע 1-2 שיטות פתרון חלופיות אם קיימות
7. אם צריך ויזואליזציה:
   - גרף: ספק JSON עם נקודות מדויקות
   - איור גאומטרי: ציין כל נקודה ומידה במדויק
8. הוסף 2 תרגילים דומים לתרגול נוסף

**פורמט LaTeX:** השתמש ב-$x^2$ או $$\\frac{a}{b}$$

**חשוב מאוד:**
- כל שלב חייב להיות ברור ומובן
- הסבר את הלוגיקה מאחורי כל מעבר
- אם יש מספר דרכים - הצג את הקצרה ביותר תחילה
- ציין תנאים (תחום הגדרה, הגבלות)

החזר JSON במבנה הבא:
{
  "problem_type_detected": "סוג הבעיה שזוהה",
  "recommended_method": "השיטה המומלצת ולמה",
  "solution_steps": [
    {
      "step_number": 1,
      "rule_name": "שם הכלל/טכניקה",
      "description": "הסבר מפורט של השלב בעברית",
      "calculation": "החישוב או הנוסחה",
      "formula_used": "נוסחה ספציפית אם יש",
      "result_of_step": "תוצאת ביניים",
      "why_this_step": "למה עשינו את השלב הזה"
    }
  ],
  "final_answer": "תשובה סופית ברורה",
  "verification": {
    "method": "שיטת הבדיקה",
    "check": "החישוב לבדיקה",
    "valid": true/false
  },
  "alternative_methods": [
    {
      "method_name": "שם השיטה",
      "brief_explanation": "הסבר קצר",
      "pros": "יתרונות",
      "cons": "חסרונות"
    }
  ],
  "visualization": {
    "type": "graph/geometry/none",
    "graph_data": {
      "title": "כותרת הגרף",
      "formula": "הנוסחה",
      "points": [{"x": 0, "y": 0}],
      "chartType": "line/scatter",
      "xLabel": "X",
      "yLabel": "Y",
      "description": "תיאור הגרף"
    },
    "geometry_data": {
      "points": {"A": {"x": 0, "y": 0}},
      "lines": [{"from": "A", "to": "B"}],
      "shapes": [{"type": "triangle", "points": ["A","B","C"]}]
    }
  },
  "difficulty": "easy/medium/hard/expert",
  "similar_exercises": ["תרגיל 1", "תרגיל 2"],
  "tags": ["נושא1", "נושא2"],
  "full_solution_markdown": "הפתרון המלא בפורמט markdown עם LaTeX"
}`;

    const systemMessage = problemType && systemPrompts[problemType] 
      ? systemPrompts[problemType]
      : `אתה מערכת פתרון מתמטית מתקדמת בסגנון Symbolab.
אתה מדויק, מפורט, מציג מספר שיטות פתרון, ותמיד מסביר את ההיגיון מאחורי כל צעד.
אתה תומך בכל תחומי המתמטיקה: אלגברה, חדו"א, טריגונומטריה, גאומטריה, מטריצות, הסתברות וסטטיסטיקה.`;

    console.log("🤖 Calling advanced solver with OpenAI GPT-4o...");

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // טמפרטורה נמוכה מאוד לדיוק מקסימלי
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    console.log("✅ Advanced solution generated successfully");
    console.log("📊 Problem type:", result.problem_type_detected);
    console.log("🎯 Method used:", result.recommended_method);
    console.log("📝 Steps count:", result.solution_steps?.length || 0);

    return Response.json({
      success: true,
      solution: result,
      metadata: {
        solver_type: 'symbolab_advanced',
        problem_type: result.problem_type_detected,
        method_used: result.recommended_method,
        has_alternatives: result.alternative_methods?.length > 0,
        has_visualization: !!result.visualization,
        verification_passed: result.verification?.valid,
        steps_count: result.solution_steps?.length || 0
      }
    });

  } catch (error) {
    console.error("❌ Symbolab solver error:", error);
    return Response.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});