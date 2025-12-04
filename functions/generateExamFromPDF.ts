import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

if (!globalThis.process) { globalThis.process = { env: {} }; }

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const HIGH_FIDELITY_PROMPT = `You are a Senior Chief Examiner for the Israeli Ministry of Education (Misrad HaChinuch).
Your goal is to create a "Moed B" (Make-up Exam) based on the provided "Moed A" exam text.

**THE GOLDEN RULE:**
A "Moed B" exam must be IDENTICAL in structure, topics, and difficulty level to "Moed A", but with DIFFERENT content.
It must look and feel exactly like a real Bagrut exam.

**INSTRUCTIONS FOR EACH QUESTION:**
1. **ANALYZE**: Identify the exact topic, sub-topic, cognitive skill, and difficulty level of the original question.
2. **CLONE STRUCTURE**: Create a new question that tests the *exact same* skill but changes the specific numbers, functions, or text.
   - **Math/Science**: If original Q1 asks to find min/max of f(x)=x^3-3x, New Q1 must ask for min/max of a SIMILAR function (e.g., g(x)=2x^3-6x) that yields clean, solvable results suitable for a high-school exam. DO NOT generate unsolvable problems.
   - **Humanities (Bible/Lit/History)**: If original asks about a specific motif in a story, ask about a *different* motif in the *same* story/chapter, or a parallel theme in the required syllabus.
   - **English**: Write a NEW reading comprehension text (300-400 words) on a similar genre (e.g., Science/Social) with the SAME vocabulary level (Band III/IV). Generate questions that parallel the original types (Multiple choice, Open-ended).

3. **VERIFY SOLUTION**:
   - You MUST solve the question yourself internally.
   - Ensure the final answer is clean and reasonable (e.g., no complex decimals unless typical for the subject).
   - Provide a detailed, step-by-step solution in Hebrew (except for English exams).

**OUTPUT FORMAT (JSON ONLY):**
{
  "exam_version": "high_fidelity_moed_b",
  "subject": "...",
  "unit": "...",
  "questions": [
    {
      "question_number": 1,
      "topic": "Specific Topic (e.g., Differential Calculus - Rational Functions)",
      "difficulty": "Hard",
      "question_text": "The new question text...",
      "sub_questions": ["א. ...", "ב. ..."],
      "solution_steps": "1. ...\n2. ...",
      "final_answer": "x=4, y=2"
    }
  ]
}

**CRITICAL:**
- OUTPUT MUST BE VALID JSON.
- LANGUAGE: Hebrew (unless subject is English).
- DO NOT COPY ORIGINAL CONTENT. PARALLEL IT.
`;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let body;
        try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

        const { pdf_url, subject, unit, original_exam_id } = body;
        console.log(`🚀 Generating High-Fidelity Exam: ${subject} (${unit})`);

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

        // Fallback for Scanned PDFs
        if (!extractedText || extractedText.trim().length < 100) {
             // If scanned, we rely on the Subject/Unit to generate a "Standard" exam
             extractedText = `[SCANNED DOC] Please generate a STANDARD ${unit}-unit Bagrut exam for ${subject}. Structure it according to the official 2024 curriculum.`;
        }

        // 2. Generate with GPT-4o (Best Logic)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using the smartest model available
            messages: [
                { role: "system", content: HIGH_FIDELITY_PROMPT },
                { role: "user", content: `Original Exam Content:\n\n${extractedText.slice(0, 30000)}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5, // Lower temperature for precision and correctness (less random hallucination)
        });

        const content = completion.choices[0].message.content;
        let examJson;
        try {
            examJson = JSON.parse(content);
        } catch (e) {
            console.error("JSON Parse Error", e);
            return Response.json({ error: 'AI Generation failed format check' }, { status: 500 });
        }

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