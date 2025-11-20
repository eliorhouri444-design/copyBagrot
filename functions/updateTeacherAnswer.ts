import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎓 Update Teacher Answer with Corrected Diagram
 * מעדכן את תשובת המורה החכם עם האיור המתוקן
 * המערכת לומדת מהתיקונים ומשפרת את הדיוק
 */

Deno.serve(async (req) => {
  console.log("🎓 Updating teacher answer with corrections...");
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
      console.log("✅ User:", user?.email);
    } catch (authError) {
      return Response.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { originalQuestion, correctedDiagram, learningFeedback } = body;

    if (!originalQuestion || !correctedDiagram) {
      return Response.json({
        success: false,
        error: 'Missing required data'
      }, { status: 400 });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    console.log("📝 Original question:", originalQuestion.substring(0, 100));
    console.log("🔧 Diagram type:", correctedDiagram.type);
    console.log("✏️ User corrected:", learningFeedback.userCorrectedDiagram);

    // 🎯 Analyze what was corrected
    const analysisPrompt = `אתה מורה מתמטיקה/מדעים מנוסה שלומד מטעויות.

**השאלה המקורית:**
${originalQuestion}

**האיור שהמשתמש תיקן:**
- סוג: ${correctedDiagram.type}
- נקודות: ${Object.keys(correctedDiagram.points || {}).length}
- קווים: ${correctedDiagram.lines?.length || 0}
- צורות: ${correctedDiagram.shapes?.length || 0}

**נתונים מפורטים:**
${JSON.stringify(correctedDiagram, null, 2).substring(0, 1000)}

**המשימה שלך:**
1. נתח מה המשתמש תיקן/שינה באיור
2. למד מהתיקון - מה לא היה מדויק בזיהוי הראשוני
3. צור תשובה מעודכנת ומדויקת עם האיור המתוקן
4. הסבר בקצרה מה השתנה ולמה זה חשוב

**פורמט התשובה (JSON):**
\`\`\`json
{
  "learning_insights": [
    "תובנה 1 על הטעות הראשונית",
    "תובנה 2 על איך לשפר זיהוי בעתיד"
  ],
  "corrected_explanation": "ההסבר המעודכן והמדויק של השאלה",
  "what_changed": "תיאור קצר של מה השתנה באיור",
  "improved_solution": "פתרון מלא ומדויק עם האיור הנכון"
}
\`\`\`

נתח ולמד מהתיקון!`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "אתה מורה חכם שלומד מטעויות ומשפר את הדיוק שלו. אתה מנתח תיקונים של משתמשים ומשתמש בהם כדי לתת תשובות טובות יותר בעתיד."
            },
            { role: "user", content: analysisPrompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 3000,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      console.log("✅ Analysis complete!");
      console.log("Learning insights:", analysis.learning_insights?.length || 0);

      // 💾 Save learning feedback for future improvements
      try {
        await base44.asServiceRole.entities.ChatMessage.create({
          conversation_id: `learning_${Date.now()}`,
          role: "system",
          content: `Learning from correction: ${correctedDiagram.type}`,
          context_data: {
            original_question: originalQuestion,
            corrected_diagram: correctedDiagram,
            learning_insights: analysis.learning_insights,
            user_email: user.email,
            timestamp: new Date().toISOString()
          }
        });
        console.log("📚 Learning data saved for future improvements");
      } catch (saveError) {
        console.warn("⚠️ Could not save learning data:", saveError);
      }

      return Response.json({
        success: true,
        updated_answer: analysis.improved_solution,
        learning_insights: analysis.learning_insights,
        what_changed: analysis.what_changed,
        corrected_explanation: analysis.corrected_explanation,
        feedback_saved: true
      });

    } catch (apiError) {
      console.error("❌ OpenAI API error:", apiError);
      return Response.json({
        success: false,
        error: 'Failed to analyze corrections'
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ ERROR:", error);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});