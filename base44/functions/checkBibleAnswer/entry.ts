import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      question_text, 
      student_answer, 
      source_verses, 
      correct_answer,
      max_points,
      requires_biblical_basis = true 
    } = body;

    if (!question_text || !student_answer) {
      return Response.json({ 
        error: 'Missing required fields: question_text, student_answer' 
      }, { status: 400 });
    }

    // Build comprehensive prompt for Bible answer checking
    const prompt = `אתה בודק בחינות בגרות בתנ"ך לפי הנחיות משרד החינוך.
בדוק את התשובה על פי הטקסט בלבד, לא לפי דעה אישית.

📖 השאלה:
${question_text}

📝 תשובת התלמיד:
${student_answer}

${source_verses ? `📜 פסוקי המקור: ${source_verses}` : ''}
${correct_answer ? `✅ תשובה מצופה: ${correct_answer}` : ''}

📋 קריטריוני בדיקה:
1. דיוק עובדתי - האם התשובה נכונה מבחינה עובדתית
2. ביסוס מהכתוב - ${requires_biblical_basis ? 'חובה לציין פסוקים או להתייחס למקור' : 'לא חובה אך מעלה את הציון'}
3. שלמות התשובה - האם כל הפרטים הנדרשים מופיעים
4. רמת ניסוח - האם התשובה ברורה ומובנת

חשוב:
• קבל ניסוחים שונים עם אותו תוכן (ענייני, לא מילולי)
• אם חסר פסוק או נימוק → הורד ניקוד
• אם יש סתירה לכתוב → הגדר כטעות
• אם התלמיד ציין את העיקר אך חסרים פרטים → ציון חלקי

תן ציון מספרי מדויק, הסבר קצר מה חסר ומה לשפר.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          result: {
            type: "string",
            enum: ["נכון", "חלקי", "שגוי"],
            description: "תוצאת הבדיקה"
          },
          score: {
            type: "number",
            description: "הציון שהתלמיד קיבל"
          },
          max_score: {
            type: "number",
            description: "הציון המקסימלי"
          },
          percentage: {
            type: "number",
            description: "אחוז הצלחה"
          },
          factual_accuracy: {
            type: "string",
            description: "האם התשובה נכונה עובדתית"
          },
          biblical_basis: {
            type: "string",
            description: "האם יש ביסוס מהכתוב"
          },
          completeness: {
            type: "string",
            description: "האם התשובה שלמה"
          },
          explanation: {
            type: "string",
            description: "הסבר מפורט של הציון"
          },
          missing_elements: {
            type: "array",
            items: { type: "string" },
            description: "מה חסר בתשובה"
          },
          improvement_suggestions: {
            type: "array",
            items: { type: "string" },
            description: "המלצות לשיפור"
          },
          verses_referenced: {
            type: "array",
            items: { type: "string" },
            description: "הפסוקים שהתלמיד ציין (אם בכלל)"
          }
        },
        required: ["result", "score", "max_score", "percentage", "explanation"]
      }
    });

    // Add max_points to response
    response.max_score = max_points || response.max_score || 10;
    
    // Calculate percentage if not provided
    if (!response.percentage) {
      response.percentage = Math.round((response.score / response.max_score) * 100);
    }

    return Response.json({
      success: true,
      evaluation: response
    });

  } catch (error) {
    console.error('Error checking Bible answer:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});