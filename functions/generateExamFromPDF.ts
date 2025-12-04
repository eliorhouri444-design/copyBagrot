import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

if (!globalThis.process) { globalThis.process = { env: {} }; }

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const STRICT_CREATIVE_PROMPT = `You are an expert exam creator for Israeli Bagrut exams.
Your task is to analyze the STRUCTURE and TOPICS of the provided exam, and then generate a BRAND NEW EXAM.

CRITICAL RULES - READ CAREFULLY:
1. **ZERO PLAGIARISM**: You MUST NOT copy the questions from the input.
2. **NEW NUMBERS**: For Math/Physics/Chemistry - You must change EVERY SINGLE number and function. The logic should be similar, but the answer MUST be different.
3. **NEW TEXTS**: For English/Hebrew/Literature - Do NOT use the same text. Write a NEW text of the same genre and difficulty (e.g., if original is about global warming, write about renewable energy).
4. **SAME STRUCTURE**: Keep the same number of questions, points, and sections.
5. **FULL SOLUTIONS**: Provide step-by-step solutions for the NEW questions.

You must output a JSON object with this structure:
{
  "exam_version": "v2_creative_recreation",
  "subject": "...",
  "unit": "...",
  "questions": [
    {
      "question_number": 1,
      "topic": "Extracted topic...",
      "question_text": "THE NEW GENERATED QUESTION TEXT...",
      "sub_questions": ["a. New sub question...", "b. ..."],
      "solution_steps": "Full solution for the new question...",
      "final_answer": "The new final answer"
    }
  ]
}
`;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let body;
        try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

        const { pdf_url, subject, unit, original_exam_id } = body;
        console.log(`🚀 Processing Exam: ${subject} (${unit})`);

        if (!pdf_url) return Response.json({ error: 'Missing PDF URL' }, { status: 400 });

        // 1. Download & Parse PDF
        const pdfRes = await fetch(pdf_url);
        if (!pdfRes.ok) throw new Error(`Fetch failed: ${pdfRes.status}`);
        const pdfBuffer = await pdfRes.arrayBuffer();
        
        let extractedText = "";
        try {
            const data = await pdf(Buffer.from(pdfBuffer));
            extractedText = data.text;
        } catch (e) {
            console.error("PDF Parse Error:", e);
            return Response.json({ error: 'Failed to parse PDF' }, { status: 500 });
        }

        // Handle Scanned PDFs (Empty Text)
        if (!extractedText || extractedText.trim().length < 50) {
            console.warn("⚠️ Scanned PDF detected. Fallback to Topic-Based Generation.");
            extractedText = `(SCANNED PDF - TEXT UNAVAILABLE). Please generate a generic Bagrut exam for ${subject} ${unit} units, suitable for the summer term.`;
        }

        // 2. Generate with High Creativity
        console.log("🤖 Generating NEW content...");
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: STRICT_CREATIVE_PROMPT },
                { role: "user", content: `Here is the original exam text to analyze structure from:\n\n${extractedText.slice(0, 20000)}\n\nREMEMBER: DO NOT COPY. CREATE NEW QUESTIONS.` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.85, // Higher temperature for creativity
        });

        const content = completion.choices[0].message.content;
        const examJson = JSON.parse(content);

        // 3. Save
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
        console.error("❌ Error:", error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});