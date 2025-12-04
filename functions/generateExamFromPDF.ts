import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

// Polyfill for pdf-parse dependencies if needed
if (!globalThis.process) {
    globalThis.process = { env: {} };
}

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const MASTER_PROMPT = `You are an official exam generator for the Israeli Ministry of Education matriculation exams (Bagrut).
Subjects: Math, English, Hebrew, History, Civics, Bible, Literature.

GOAL: Create a NEW exam based on the provided original exam text.
The new exam must have the EXACT SAME STRUCTURE, DIFFICULTY, and QUESTION TYPES as the original, but with DIFFERENT CONTENT (numbers, stories, sentences).

STRICT RULES:
1. DO NOT COPY the original questions. Create variations.
2. Math: Change numbers/functions but keep the logic/topic identical. Verify solvability.
3. English: Write a NEW text/story of the same length and level. Create new questions.
4. Maintain the exact same numbering (Chapter 1, Question 1, Sections a/b/c...).
5. Provide FULL SOLUTIONS for every question.
6. OUTPUT MUST BE VALID JSON ONLY. No markdown, no backticks.

JSON Structure:
{
  "exam_version": "new_generated",
  "subject": "...",
  "unit": "...",
  "questions": [
    {
      "question_number": 1,
      "topic": "...",
      "question_text": "The full text of the question...",
      "sub_questions": ["a. ...", "b. ..."],
      "solution_steps": "Step 1: ...\nStep 2: ...",
      "final_answer": "x = 5"
    }
  ]
}
`;

Deno.serve(async (req) => {
    try {
        // 1. Init & Auth
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        let body;
        try {
            body = await req.json();
        } catch {
            return Response.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { pdf_url, subject, unit, original_exam_id } = body;
        console.log(`🚀 Generating Exam: ${subject} (${unit} units) from ${pdf_url}`);

        if (!pdf_url) return Response.json({ error: 'Missing PDF URL' }, { status: 400 });

        // 3. Download PDF
        const pdfRes = await fetch(pdf_url);
        if (!pdfRes.ok) throw new Error(`Failed to fetch PDF: ${pdfRes.status}`);
        const pdfBuffer = await pdfRes.arrayBuffer();

        // 4. Extract Text
        let extractedText = "";
        try {
            const data = await pdf(Buffer.from(pdfBuffer));
            extractedText = data.text;
        } catch (e) {
            console.error("PDF Parse Error:", e);
            return Response.json({ error: 'Failed to parse PDF file' }, { status: 500 });
        }

        // Check if text is empty (Scanned PDF)
        if (!extractedText || extractedText.trim().length < 50) {
            console.warn("⚠️ PDF seems to be an image (scanned).");
            return Response.json({ 
                error: 'PDF contains no text (scanned image). Please convert to text-based PDF first.',
                success: false 
            }, { status: 200 }); // Return 200 with success:false to handle gracefully in frontend
        }

        console.log(`📄 Extracted ${extractedText.length} characters.`);

        // 5. Send to OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: MASTER_PROMPT },
                { role: "user", content: `Subject: ${subject}, Unit: ${unit}\n\nOriginal Exam Text (Partial):\n${extractedText.slice(0, 25000)}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Empty response from AI");

        let examJson;
        try {
            examJson = JSON.parse(content);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            // Try to clean json
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '');
            examJson = JSON.parse(cleanContent);
        }

        // 6. Save Result
        const generatedExam = await base44.entities.GeneratedExam.create({
            original_exam_id: original_exam_id || null,
            subject: subject,
            unit: parseInt(unit),
            exam_json: examJson,
            status: "completed",
            created_at: new Date().toISOString()
        });

        console.log("✅ Exam Generated & Saved:", generatedExam.id);

        return Response.json({ success: true, data: generatedExam });

    } catch (error) {
        console.error("❌ Critical Error:", error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});