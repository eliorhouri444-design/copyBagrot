import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📝 פונקציית /quiz - יצירת בוחן מותאם
 * 
 * יוצרת בוחן מותאם אישית על סמך:
 * - נושאים חלשים של התלמיד
 * - טעויות נפוצות
 * - השיחה הנוכחית
 */

Deno.serve(async (req) => {
  console.log("=".repeat(60));
  console.log("📝 GENERATE QUIZ");
  console.log("=".repeat(60));
  
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
    const { subject, topic, difficulty, questionCount = 10, conversationId } = body;

    console.log("📚 Subject:", subject);
    console.log("📖 Topic:", topic);
    console.log("🎯 Difficulty:", difficulty);
    console.log("🔢 Questions:", questionCount);

    // טעינת פרופיל למידה
    const profiles = await base44.entities.UserLearningProfile.filter({
      created_by: user.email
    });
    const profile = profiles[0];

    // טעינת נושאים חלשים
    const weakTopics = profile?.weak_topics?.[subject] || [];
    console.log("📉 Weak topics:", weakTopics);

    // בניית פרומפט ל-LLM
    const prompt = buildQuizPrompt({
      subject,
      topic,
      difficulty,
      questionCount,
      weakTopics,
      profile
    });

    console.log("🤖 Generating quiz with LLM...");

    // יצירת הבוחן
    const quizJson = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" }
                },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                difficulty: { type: "string" },
                topic: { type: "string" }
              }
            }
          }
        }
      }
    });

    console.log("✅ Quiz generated:", quizJson.questions?.length, "questions");

    // שמירת הבוחן
    const customExam = await base44.entities.CustomExam.create({
      title: quizJson.title || `בוחן ${subject} - ${topic}`,
      subject,
      unit_level: parseInt(user?.selected_units) || 5,
      questions: quizJson.questions,
      based_on_topics: [topic, ...weakTopics],
      generated_at: new Date().toISOString()
    });

    console.log("=".repeat(60));
    console.log("✅ SUCCESS - Quiz saved with ID:", customExam.id);
    console.log("=".repeat(60));

    return Response.json({
      success: true,
      quiz: {
        id: customExam.id,
        title: customExam.title,
        questionCount: customExam.questions.length,
        url: `/exam/custom/${customExam.id}`
      }
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * בניית פרומפט ליצירת בוחן
 */
function buildQuizPrompt({ subject, topic, difficulty, questionCount, weakTopics, profile }) {
  return `
אתה מומחה ליצירת בחינות ובוחנים בישראל.

צור בוחן ב**עברית** במקצוע ${subject}, נושא: ${topic}.

**דרישות:**
- ${questionCount} שאלות אמריקאיות (4 אפשרויות לכל שאלה)
- רמת קושי: ${difficulty || 'בינוני'}
- שאלות מגוונות ומאתגרות
- הסבר קצר לכל תשובה נכונה

${weakTopics.length > 0 ? `**התמקד בנושאים חלשים של התלמיד:** ${weakTopics.join(', ')}` : ''}

**פורמט:**
כל שאלה צריכה:
- question_number: מספר השאלה (1, 2, 3...)
- question_text: נוסח השאלה בעברית
- options: 4 אפשרויות תשובה (מערך של strings)
- correct_answer: התשובה הנכונה (אחת מהאפשרויות)
- explanation: הסבר קצר למה זו התשובה הנכונה
- difficulty: "קל", "בינוני", או "קשה"
- topic: הנושא המדויק של השאלה

צור ${questionCount} שאלות איכותיות!
`.trim();
}