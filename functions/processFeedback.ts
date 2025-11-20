
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 💡 עיבוד פידבק משתמשים - למידה מדגלולים
 */

Deno.serve(async (req) => {
  console.log("💬 PROCESSING USER FEEDBACK");
  
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
    const { 
      messageId,
      conversationId,
      originalQuestion,
      aiAnswer,
      feedbackType,
      userDescription,
      subject,
      topic,
      units,
      imageUrl
    } = body;

    console.log("📝 Feedback details:");
    console.log("Type:", feedbackType);
    console.log("Subject:", subject);
    console.log("Description:", userDescription);

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // **שלב 1: ניתוח הפידבק באמצעות AI**
    const analysisPrompt = `אתה מומחה בניתוח משוב על מערכות AI חינוכיות.

**השאלה המקורית:**
${originalQuestion}

**התשובה שה-AI נתן:**
${aiAnswer}

**סוג הבעיה שדווחה:** ${feedbackType}
**הסבר המשתמש:** ${userDescription || 'אין הסבר נוסף'}
**מקצוע:** ${subject}

**נתח את הבעיה:**
1. האם הפידבק מוצדק? למה?
2. מה ה-AI לא הבין נכון?
3. איך צריך ה-AI לגשת לשאלות כאלה?
4. מה חסר במאגר הידע?
5. איזו הוראה להוסיף כדי למנוע טעויות דומות?

החזר JSON:
{
  "is_valid_feedback": true/false,
  "root_cause": "הסבר קצר",
  "recommended_fix": "מה לשנות",
  "missing_knowledge": "מידע שחסר",
  "prompt_improvement": "הוראה חדשה למערכת",
  "severity_assessment": "critical/moderate/minor",
  "priority_score": 1-10
}`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "אתה מומחה בניתוח משוב על AI חינוכי." },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    const analysisData = await analysisResponse.json();
    const feedbackAnalysis = JSON.parse(analysisData.choices[0].message.content);

    console.log("✅ Feedback analysis:", feedbackAnalysis);

    // Initializing variables that were potentially defined in removed sections
    // This ensures the file remains functional as per user's instructions.
    const similarFeedbacks = [];
    let promptUpdated = false;
    let knowledgeAdded = false;

    // **שלב 5: שמירת הפידבק**
    const feedback = await base44.asServiceRole.entities.UserFeedback.create({
      message_id: messageId,
      conversation_id: conversationId,
      original_question: originalQuestion,
      ai_answer: aiAnswer,
      feedback_type: feedbackType,
      user_description: userDescription,
      subject: subject,
      topic: topic,
      units: units,
      severity: feedbackAnalysis.severity_assessment,
      image_url: imageUrl,
      status: feedbackAnalysis.priority_score >= 8 ? 'reviewed' : 'pending',
      learning_impact: {
        prompt_updated: promptUpdated,
        similar_feedbacks_count: similarFeedbacks.length,
        priority_score: feedbackAnalysis.priority_score
      },
      was_applied: promptUpdated || knowledgeAdded
    });

    console.log("✅ Feedback saved:", feedback.id);

    // **שלב 6: התראה לאדמין אם קריטי**
    if (feedbackAnalysis.priority_score >= 8) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          title: "🚨 פידבק קריטי התקבל",
          message: `משתמש דיווח על בעיה ב${subject}: ${feedbackType}`,
          type: "warning",
          action_url: `/AdminFeedback?id=${feedback.id}`,
          created_by: 'admin@system.com'
        });
        
        console.log("📧 Admin notification sent");
      } catch (notificationError) {
        console.error("⚠️ Failed to send notification:", notificationError);
      }
    }

    return Response.json({
      success: true,
      feedback_id: feedback.id,
      analysis: feedbackAnalysis,
      learning_impact: {
        prompt_updated: promptUpdated,
        knowledge_added: knowledgeAdded,
        similar_feedbacks: similarFeedbacks.length,
        will_improve: feedbackAnalysis.is_valid_feedback
      },
      message: feedbackAnalysis.is_valid_feedback 
        ? `✅ תודה על הפידבק! המערכת תשתפר (${similarFeedbacks.length} דיווחים דומים)`
        : "הפידבק נשמר לבדיקה"
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
