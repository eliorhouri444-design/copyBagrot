import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎓 למידה מתיקוני אדמין - המערכת משפרת את עצמה
 */

Deno.serve(async (req) => {
  console.log("📚 LEARNING FROM ADMIN CORRECTION");
  
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Admin access required' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { 
      correctionId,
      originalQuestion,
      originalAnswer,
      correctedAnswer,
      correctionReason,
      severity,
      subject,
      topic,
      units,
      adminNotes,
      messageId,
      conversationId
    } = body;

    console.log("🔍 Analyzing correction...");
    console.log("Subject:", subject);
    console.log("Severity:", severity);
    console.log("Reason:", correctionReason);

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // **שלב 1: ניתוח הטעות**
    const analysisPrompt = `אתה מומחה בניתוח טעויות של AI במערכות חינוך.

**השאלה המקורית:**
${originalQuestion}

**התשובה השגויה שה-AI נתן:**
${originalAnswer}

**התשובה הנכונה (לאחר תיקון אדמין):**
${correctedAnswer}

**סיבת התיקון:** ${correctionReason}
**חומרה:** ${severity}
**הערות אדמין:** ${adminNotes || 'אין'}

**נתח מה השתבש:**
1. מה בדיוק היה שגוי?
2. למה ה-AI טעה?
3. איך למנוע טעויות דומות בעתיד?
4. האם זה דפוס שחוזר?

החזר JSON:
{
  "error_type": "calculation | explanation | missing_context | wrong_interpretation | other",
  "root_cause": "הסבר קצר על הסיבה",
  "prevention_strategy": "איך למנוע בעתיד",
  "suggested_knowledge": "מידע שחסר במאגר הידע",
  "pattern_detected": "האם זה דפוס שחוזר (כן/לא)",
  "impact_score": 1-10
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
          { role: "system", content: "אתה מומחה בניתוח טעויות AI ושיפור מערכות לימוד." },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    const analysisData = await analysisResponse.json();
    const errorAnalysis = JSON.parse(analysisData.choices[0].message.content);

    console.log("✅ Error analysis:", errorAnalysis);

    // **שלב 2: עדכון מאגר הידע**
    let knowledgeAdded = false;
    
    if (errorAnalysis.suggested_knowledge && errorAnalysis.suggested_knowledge.length > 50) {
      try {
        await base44.asServiceRole.entities.KnowledgeBase.create({
          subject: subject,
          knowledge_type: 'תיאוריה',
          content: errorAnalysis.suggested_knowledge,
          topic: topic || 'כללי',
          unit_level: units?.toString() || '3',
          priority: errorAnalysis.impact_score >= 7 ? 0.9 : 0.7,
          active: true,
          tags: ['admin_correction', correctionReason, severity]
        });
        
        knowledgeAdded = true;
        console.log("✅ Knowledge added to database");
      } catch (kbError) {
        console.error("⚠️ Failed to add knowledge:", kbError);
      }
    }

    // **שלב 3: עדכון ההגדרות הגלובליות של המורה**
    try {
      const tutorSettings = await base44.asServiceRole.entities.TutorSettings.filter({
        setting_key: 'global_instructions'
      });

      if (tutorSettings.length > 0) {
        const currentInstructions = tutorSettings[0].instructions || '';
        
        const newInstruction = `
---
⚠️ **תיקון אדמין #${Date.now()}** (${new Date().toLocaleDateString('he-IL')}):
- **נושא:** ${subject} - ${topic || 'כללי'}
- **טעות שהייתה:** ${errorAnalysis.error_type}
- **איך למנוע:** ${errorAnalysis.prevention_strategy}
- **חומרה:** ${severity}
${adminNotes ? `- **הערות:** ${adminNotes}` : ''}
`;

        await base44.asServiceRole.entities.TutorSettings.update(tutorSettings[0].id, {
          instructions: currentInstructions + newInstruction,
          last_updated_by: user.email
        });

        console.log("✅ Global instructions updated");
      }
    } catch (settingsError) {
      console.error("⚠️ Failed to update settings:", settingsError);
    }

    // **שלב 4: עדכון ההודעה המקורית**
    if (messageId) {
      try {
        const messages = await base44.asServiceRole.entities.ChatMessage.filter({
          id: messageId
        });

        if (messages.length > 0) {
          await base44.asServiceRole.entities.ChatMessage.update(messageId, {
            content: correctedAnswer,
            context_data: {
              ...messages[0].context_data,
              corrected_by_admin: true,
              correction_date: new Date().toISOString(),
              original_answer: originalAnswer,
              correction_reason: correctionReason,
              admin_notes: adminNotes
            }
          });
          
          console.log("✅ Original message updated with correction");
        }
      } catch (msgError) {
        console.error("⚠️ Failed to update message:", msgError);
      }
    }

    // **שלב 5: חיפוש תיקונים דומים**
    const similarCorrections = await base44.asServiceRole.entities.TeacherCorrection.filter({
      subject: subject,
      correction_reason: correctionReason
    });

    console.log(`📊 Found ${similarCorrections.length} similar corrections`);

    // **שלב 6: שמירת התיקון**
    const correction = await base44.asServiceRole.entities.TeacherCorrection.create({
      original_question: originalQuestion,
      original_answer: originalAnswer,
      corrected_answer: correctedAnswer,
      correction_reason: correctionReason,
      subject: subject,
      topic: topic,
      units: units,
      severity: severity,
      admin_notes: adminNotes,
      message_id: messageId,
      conversation_id: conversationId,
      was_applied: true,
      learning_impact: {
        prompt_updated: true,
        knowledge_added: knowledgeAdded,
        similar_corrections: similarCorrections.length
      }
    });

    console.log("✅ Correction saved:", correction.id);

    return Response.json({
      success: true,
      correction_id: correction.id,
      learning_impact: {
        error_analysis: errorAnalysis,
        knowledge_added: knowledgeAdded,
        prompt_updated: true,
        similar_corrections_count: similarCorrections.length,
        message_updated: !!messageId
      },
      message: `✅ התיקון נשמר והמערכת למדה! נמצאו ${similarCorrections.length} תיקונים דומים.`
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});