import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const MASTER_PROMPT = `אתה מחולל רשמי של מבחני בגרות עבור כל מקצועות הליבה של משרד החינוך בישראל:
מתמטיקה (3/4/5 יחידות), אנגלית (3/4/5), לשון, היסטוריה, אזרחות, תנ”ך, ספרות.

מטרתך: ליצור מבחן חדש לחלוטין, ללא זכויות יוצרים, אך עם מבנה, רמת קושי וסוג שאלות זהה למבחן המקורי שנשלח אליך.

קיבלת מהמערכת JSON המכיל:
- subject (מקצוע)
- unit (מספר יחידות)
- original_exam_text (טקסט המבחן המקורי)
- mode ("generate_exam_from_pdf")

חוקי ברזל:

1. אסור להעתיק משפטים, מספרים, נתונים, שמות, טקסטים או נוסחים מהמבחן המקורי.
2. יש ליצור שאלות חדשות לחלוטין לפי אותם נושאים וסוגי מיומנויות.
3. יש לשמור על אותו מבנה מספרי: מספר פרקים, מספר שאלות בכל פרק, וסוגי סעיפים.
4. יש לייצר פתרון מלא, מדויק ומוסבר לכל שאלה.
5. חובה לבצע DOUBLE VERIFICATION:
   (א) לפתור את השאלה שיצרת.
   (ב) לפתור מחדש בלי לראות את הפתרון הראשון.
   (ג) אם יש הבדל – צור שאלה חדשה.
6. מתמטיקה: לבצע בדיקה מתמטית (הצבה, נגזרת, אינטגרל, פתרון משוואה).
7. אנגלית: לשמור על מבני שאלוני A–E.
8. היסטוריה/אזרחות: להשתמש בעובדות נכונות, אך לא להעתיק ממקורות.
9. לשון: לשמור על מבני הבנת הנקרא, תחביר, תחליפים.
10. המבחן חייב להיות ברמת בגרות, ללא פישוט יתר.
11. התשובה חייבת להיות JSON בלבד במבנה הבא:

{
  "exam_version": "new",
  "subject": "",
  "unit": "",
  "questions": [
    {
      "question_id": "Q1",
      "topic": "",
      "question_text": "",
      "sub_questions": [],
      "solution_steps": "",
      "final_answer": "",
      "verification_pass_1": "",
      "verification_pass_2": "",
      "is_verified": true
    }
  ]
}

אין להחזיר מלל חופשי – רק JSON תקין.
כל שאלה שלא עוברת אימות → יש לייצר מחדש עד שהיא תקינה.`;

Deno.serve(async (req) => {
    try {
        console.log("🚀 Starting generateExamFromPDF function");
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.error("❌ Unauthorized: No user found");
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
             console.error("❌ Unauthorized: User is not admin", user.role);
             return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("❌ Failed to parse JSON body:", e);
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { pdf_url, subject, unit, original_exam_id } = body;

        if (!pdf_url || !subject) {
            console.error("❌ Missing required fields:", { pdf_url, subject });
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Extract Text from PDF
        console.log(`📥 Downloading PDF from: ${pdf_url}`);
        let extractedText = "";
        try {
            const pdfResponse = await fetch(pdf_url);
            if (!pdfResponse.ok) {
                throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
            }
            const pdfArrayBuffer = await pdfResponse.arrayBuffer();
            const pdfBuffer = Buffer.from(pdfArrayBuffer);
            
            console.log("📄 Extracting text using pdf-parse...");
            const pdfData = await pdf(pdfBuffer);
            extractedText = pdfData.text;
            console.log(`✅ Text extracted successfully. Length: ${extractedText.length} characters.`);
        } catch (pdfError) {
            console.error("❌ PDF Extraction Error:", pdfError);
            return Response.json({ 
                error: 'Failed to process PDF file. Please ensure it is a valid PDF.',
                details: pdfError.message 
            }, { status: 500 });
        }

        if (!extractedText || extractedText.trim().length === 0) {
             console.error("❌ Extracted text is empty");
             return Response.json({ error: 'Could not extract text from the PDF. It might be an image-only PDF.' }, { status: 400 });
        }

        // 2. Call OpenAI
        console.log("🤖 Calling OpenAI...");
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: MASTER_PROMPT
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            mode: "generate_exam_from_pdf",
                            subject: subject,
                            unit: unit,
                            // Limit text length to avoid token limits and reduce cost/time
                            original_exam_text: extractedText.substring(0, 50000) 
                        })
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
            });

            const generatedContent = completion.choices[0].message.content;
            console.log("✅ OpenAI Response received. Length:", generatedContent.length);
            
            let examJson;
            try {
                examJson = JSON.parse(generatedContent);
            } catch (jsonError) {
                console.error("❌ Failed to parse OpenAI response as JSON:", jsonError);
                return Response.json({ error: 'AI returned invalid JSON format' }, { status: 500 });
            }

            // 3. Save to Database
            console.log("💾 Saving to GeneratedExam entity...");
            const generatedExam = await base44.entities.GeneratedExam.create({
                original_exam_id: original_exam_id || null,
                subject: subject,
                unit: parseInt(unit),
                exam_json: examJson,
                status: "completed",
                created_at: new Date().toISOString()
            });

            console.log("✅ Exam saved successfully:", generatedExam.id);
            return Response.json({ success: true, data: generatedExam });

        } catch (openaiError) {
            console.error("❌ OpenAI API Error:", openaiError);
            return Response.json({ error: 'AI Generation failed', details: openaiError.message }, { status: 500 });
        }

    } catch (error) {
        console.error("❌ Unhandled Server Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});