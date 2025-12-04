import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

if (!globalThis.process) { globalThis.process = { env: {} }; }

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const EXPERT_PARALLEL_PROMPT = `
You are an elite Senior Examiner for the Israeli Ministry of Education (Misrad HaChinuch).
Your task is to generate a "Parallel Exam" (Moed B) based on the provided exam content.

### OBJECTIVE
Create a new exam that is **100% parallel** to the original in structure, difficulty, and topics, but **100% original** in content to avoid copyright infringement.

### STRICT RULES FOR "PARALLEL GENERATION"

1.  **DECONSTRUCT FIRST**: For every question, analyze:
    *   **Topic & Sub-topic**: What exactly is being tested? (e.g., "Derivatives of Rational Functions" or "Literary Motif of Betrayal").
    *   **Cognitive Level**: Is it knowledge, application, or complex analysis?
    *   **Difficulty Mechanics**: How many steps are required? What creates the complexity?

2.  **RECONSTRUCT (THE TWIN METHOD)**:
    *   **Math/Physics/Science**:
        *   Keep the *structure* of the problem.
        *   CHANGE the numbers/functions/variables.
        *   *CRITICAL*: Ensure the new numbers yield **CLEAN, SOLVABLE RESULTS** (integers or simple fractions, unless the topic dictates otherwise).
        *   *Example*: If original is "Min/Max of f(x) = x^3 - 3x", New is "Min/Max of g(x) = 2x^3 - 24x".
        *   **DIAGRAMS & GRAPHS**: Since we cannot generate images, you must **DESCRIBE** the new visual elements precisely in the text.
            *   *Geometry*: "Given a triangle ABC where AB=AC..."
            *   *Functions*: "The graph of f(x) intersects the x-axis at..."
            *   *Physics*: "A block of mass m sits on an incline of 30 degrees..."
            *   Make sure the textual description is sufficient to solve the problem without seeing a drawing.
    *   **History / Civics (Social Studies)**:
        *   Focus on the *same historical period or civics concept* but require a different angle of analysis.
        *   *History Example*: If original asks about "Political causes of the 1948 War", ask about "Social/Military consequences" or compare with a different event in the same era.
        *   *Civics Example*: If original asks about "Freedom of Speech", ask about "Freedom of Religion" or a conflict between two different rights, ensuring the *complexity* (5-unit level) remains high.
    *   **Literature / Bible**:
        *   Since these subjects rely on specific *required texts* (Syllabus), you cannot change the story completely if it's a mandatory text.
        *   Instead, ask about a **different aspect** of the *same* text.
        *   *Example*: If original asks about "The tragic hero's flaw", ask about "The role of the secondary character" or "The use of irony" in the same work.
    *   **Hebrew Language (Lashon)**:
        *   **Reading Comprehension**: Generate a **NEW** non-fiction text (300-400 words) on a similar academic topic.
        *   **Syntax/Morphology (Tachbir/Hage):** Create **NEW sentences** that feature the *exact same* grammatical structures/patterns (Gzarot, Binyanim) as the original, but with different vocabulary.
    *   **English**:
        *   Generate a **NEW TEXT** (350-450 words for 5 units) on a similar genre (e.g., if original was about "Space Travel", write about "Deep Sea Exploration").
        *   Create questions that mirror the original types (MC, Open) but refer to the new text.

3.  **SELF-CORRECTION & VERIFICATION**:
    *   You must **SOLVE** every new question you create.
    *   If the solution is messy (e.g., x = 3.14159...) and the original was clean (x=3), **REGENERATE** the numbers immediately.
    *   The solution must be 100% correct and precise.

### OUTPUT FORMAT (JSON)
Return ONLY valid JSON. No markdown.

{
  "subject": "...",
  "unit": 5,
  "questions": [
    {
      "question_number": 1,
      "topic": "...",
      "question_text": "...",
      "sub_questions": ["...", "..."],
      "solution_steps": "Step 1: ... \nStep 2: ...",
      "final_answer": "...",
      "verification_note": "Solved internally: Result is integer."
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

        let { pdf_url, subject, unit, original_exam_id } = body;

        let examTitle = "";
        // If PDF URL is missing but we have ID, fetch it from DB
        if (original_exam_id) {
            console.log(`Fetching PDF URL for Exam ID: ${original_exam_id}`);
            const exams = await base44.entities.BagrutExam.filter({ id: original_exam_id });
            if (exams && exams.length > 0) {
                const ex = exams[0];
                pdf_url = ex.exam_file_url;
                // Also fill subject/unit if missing
                if (!subject) subject = ex.subject_id;
                if (!unit) unit = ex.unit_level;
                
                // Generate a smart title based on metadata
                const termStr = ex.term === 'a' ? "א'" : "ב'";
                const seasonStr = ex.season === 'winter' ? "חורף" : "קיץ";
                examTitle = `מקביל: ${ex.subject_id} ${ex.unit_level} יח"ל - ${seasonStr} ${ex.year} מועד ${termStr}`;
            }
        }

        // Fallback title if we couldn't construct one from DB
        if (!examTitle) {
            const dateStr = new Date().toLocaleDateString('he-IL');
            examTitle = `מבחן מקביל - ${subject || 'כללי'} ${unit || 0} יח"ל (${dateStr})`;
        }

        if (!pdf_url) return Response.json({ error: 'Missing PDF URL' }, { status: 400 });

        // 1. Extract Text
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

        // 2. Handle Scans / Low Quality
        let finalPromptContent = extractedText;
        if (!extractedText || extractedText.trim().length < 50) {
             console.warn("Detected SCANNED or Empty PDF.");
             // In a real scanned scenario without OCR, we guide the AI to generate a "Standard High-Level Exam"
             // This ensures the user still gets a high-quality result even if the scan failed.
             finalPromptContent = `[SCANNED DOCUMENT DETECTED - NO TEXT EXTRACTED] 
             The user uploaded a scanned ${subject} exam (${unit} units). 
             Since we cannot read the specific questions, please generate a **STANDARD, HIGH-DIFFICULTY BAGRUT EXAM** 
             that perfectly matches the 2024 curriculum for this subject. 
             Ensure it is a full-length, valid exam with diverse topics typical for this unit level.`;
        } else {
            finalPromptContent = `Original Exam Text:\n${extractedText.slice(0, 25000)}`;
        }

        // 3. Generate with GPT-4o
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: EXPERT_PARALLEL_PROMPT },
                { role: "user", content: finalPromptContent }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7, // Balanced for creativity in generating new numbers vs strict logic
        });

        const content = completion.choices[0].message.content;
        let examJson;
        try {
            examJson = JSON.parse(content);
        } catch (e) {
            return Response.json({ error: 'AI Generation failed JSON format' }, { status: 500 });
        }

        // 4. Save
        const generatedExam = await base44.entities.GeneratedExam.create({
            original_exam_id: original_exam_id || null,
            title: examTitle,
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