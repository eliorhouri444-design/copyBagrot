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
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { pdf_url, subject, unit, original_exam_id } = await req.json();

        if (!pdf_url || !subject) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Extract Text from PDF
        console.log("Downloading PDF...");
        const pdfResponse = await fetch(pdf_url);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const pdfBuffer = Buffer.from(pdfArrayBuffer);
        
        console.log("Extracting text...");
        const pdfData = await pdf(pdfBuffer);
        const extractedText = pdfData.text;

        // 2. Call OpenAI
        console.log("Calling OpenAI...");
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using gpt-4o as gpt-5 is not available publicly yet
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
                        original_exam_text: extractedText.substring(0, 100000) // Limit length
                    })
                }
            ],
            response_format: { type: "json_object" }
        });

        const generatedContent = completion.choices[0].message.content;
        const examJson = JSON.parse(generatedContent);

        // 3. Save to Database
        const generatedExam = await base44.entities.GeneratedExam.create({
            original_exam_id: original_exam_id || null,
            subject: subject,
            unit: parseInt(unit),
            exam_json: examJson,
            status: "completed",
            created_at: new Date().toISOString()
        });

        return Response.json({ success: true, data: generatedExam });

    } catch (error) {
        console.error("Error generating exam:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});