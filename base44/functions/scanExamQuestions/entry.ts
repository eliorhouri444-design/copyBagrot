import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📄 סריקת בוחן - העלאת שאלות מרובות אוטומטית
 */

Deno.serve(async (req) => {
  console.log("📄 SCANNING EXAM");
  
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
    const { fileUrl, subject, units, topic } = body;

    console.log("📂 Processing file:", fileUrl);

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // **שלב 1: קריאת הקובץ**
    const fileResponse = await fetch(fileUrl);
    const fileText = await fileResponse.text();

    console.log("✅ File loaded, length:", fileText.length);

    // **שלב 2: זיהוי שאלות בקובץ**
    const extractPrompt = `אתה מומחה בסריקת מבחנים וזיהוי שאלות.

**תוכן המסמך:**
${fileText.substring(0, 8000)}

**זהה את כל השאלות במסמך:**
1. מספר השאלה
2. נוסח השאלה
3. תת-שאלות (א, ב, ג וכו')
4. נתונים
5. דרישות

החזר JSON:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "נוסח מלא",
      "sub_questions": ["א. ...", "ב. ..."],
      "given_data": ["נתון 1", "נתון 2"],
      "requirements": ["מצא...", "הוכח..."],
      "has_diagram": true/false,
      "estimated_difficulty": "easy/medium/hard"
    }
  ],
  "total_questions": 5,
  "exam_title": "כותרת המבחן"
}`;

    const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "אתה מומחה בסריקת מבחנים." },
          { role: "user", content: extractPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const extractData = await extractResponse.json();
    const extracted = JSON.parse(extractData.choices[0].message.content);

    console.log(`✅ Extracted ${extracted.questions.length} questions`);

    // **שלב 3: פתרון כל שאלה ושמירה**
    const solvedQuestions = [];
    
    for (const q of extracted.questions.slice(0, 10)) { // מגבלה של 10 שאלות בבת אחת
      try {
        console.log(`🔄 Solving question ${q.question_number}...`);

        // ניתוח השאלה
        const analysisResult = await base44.functions.invoke('analyzeQuestion', {
          question: q.question_text,
          subject: subject,
          units: units
        });

        // פתרון השאלה
        const solutionResult = await base44.functions.invoke('solveAndLearn', {
          question: q.question_text,
          subject: subject,
          topic: topic,
          units: units,
          analysisData: analysisResult.data,
          shouldSaveToBank: true
        });

        if (solutionResult.data?.success) {
          solvedQuestions.push({
            question_number: q.question_number,
            question_id: solutionResult.data.question_id,
            status: 'solved'
          });

          console.log(`✅ Question ${q.question_number} solved and saved`);
        }

        // Delay כדי לא להעמיס על OpenAI
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (qError) {
        console.error(`❌ Failed to solve question ${q.question_number}:`, qError);
        solvedQuestions.push({
          question_number: q.question_number,
          status: 'failed',
          error: qError.message
        });
      }
    }

    return Response.json({
      success: true,
      exam_title: extracted.exam_title,
      total_questions_found: extracted.questions.length,
      processed: solvedQuestions.length,
      solved: solvedQuestions.filter(q => q.status === 'solved').length,
      failed: solvedQuestions.filter(q => q.status === 'failed').length,
      questions: solvedQuestions,
      message: `✅ סרקתי ${extracted.questions.length} שאלות, פתרתי ${solvedQuestions.filter(q => q.status === 'solved').length}`
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});