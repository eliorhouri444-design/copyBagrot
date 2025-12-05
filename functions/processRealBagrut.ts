import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

if (!globalThis.process) { globalThis.process = { env: {} }; }

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const EXTRACTION_PROMPT = `
You are an expert data extraction specialist for complex Israeli Bagrut exams.
You are analyzing a document that may be LONG and contain MULTIPLE PAGES.
It is CRITICAL that you extract EVERY SINGLE QUESTION found in the text, from beginning to end.

You have two inputs:
1. EXAM TEXT: The actual questions asked (often multiple pages).
2. SOLUTION TEXT: The official answers/rubric (optional).

Your Goal: Combine them into a single JSON structure representing the full exam.

RULES:
1. **Coverage**: SCAN THE ENTIRE TEXT. Do not stop after the first few questions. Many exams have 5-8 questions spanning multiple pages.
2. **Question Text**: Must be COPIED EXACTLY from the Exam Text. Do not summarize.
   - If a question has sub-parts (סעיף א, סעיף ב), include the full text of all parts in the "question_text".
   - Include any introductory text or diagrams descriptions relevant to the question.
3. **Correct Answer**: Extract the final mapping answer from the Solution Text.
4. **Solution Steps**: Break down the official solution into clear, logical steps.
5. **Points**: Estimate points based on standard Bagrut distribution if not explicitly stated (usually 20-33% per question).

OUTPUT JSON FORMAT:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Original Hebrew text including all sub-parts...",
      "points": 20,
      "correct_answer": "The final answer",
      "solution_steps": ["Step 1...", "Step 2..."],
      "topic": "Geometry/Algebra/etc"
    }
  ]
}

CRITICAL:
- Do not invent questions.
- If the exam is long, take your time to process all pages.
- If solution text is missing for a question, leave solution_steps empty but keep the question.
- IGNORE administrative text (instructions to examinees, formulas sheet), focus on the QUESTIONS.
`;

async function extractTextFromUrl(url) {
    if (!url) return "";
    try {
        const res = await fetch(url);
        if (!res.ok) return "";
        const buffer = await res.arrayBuffer();
        const data = await pdf(Buffer.from(buffer));
        return data.text;
    } catch (e) {
        console.error("PDF Parse Error:", e);
        return "";
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { exam_pdf_url, solution_pdf_url, subject, unit, year, season, module_symbol } = body;

        if (!exam_pdf_url) return Response.json({ error: 'Missing Exam PDF' }, { status: 400 });

        // 0. Check for duplicates
        const existing = await base44.asServiceRole.entities.GenericExam.filter({ exam_file_url: exam_pdf_url });
        if (existing.length > 0) {
            return Response.json({ success: true, data: existing[0], message: 'Exam already exists' });
        }

        // 1. Extract Text from both PDFs
        const [examText, solutionText] = await Promise.all([
            extractTextFromUrl(exam_pdf_url),
            extractTextFromUrl(solution_pdf_url)
        ]);

        if (!examText || examText.length < 50) {
            return Response.json({ error: 'Failed to extract text from Exam PDF (might be scanned image)' }, { status: 400 });
        }

        // 2. Process with LLM
        // Increase context limit for larger exams (gpt-4o supports 128k, we take a safe chunk)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: EXTRACTION_PROMPT },
                { role: "user", content: `EXAM TEXT:\n${examText.slice(0, 100000)}\n\nSOLUTION TEXT:\n${solutionText ? solutionText.slice(0, 30000) : "No solution text provided."}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Low temp for precision
            max_tokens: 4096 // Allow long responses for complex exams
        });

        const content = completion.choices[0].message.content;
        const parsedData = JSON.parse(content);

        // 2.5 Infer Module if missing
        let finalModuleSymbol = module_symbol;
        if (!finalModuleSymbol && exam_pdf_url) {
            const filename = exam_pdf_url.split('/').pop().toUpperCase();
            
            // English: Check for A, B, C, D, E, F, G
            // Look for patterns like "2018A.pdf", "_A_", "Module A"
            const engMatch = filename.match(/[_.-]?([ABCDEFG])(\.pdf|[_.-])/i);
            if (engMatch && subject === 'אנגלית') {
                finalModuleSymbol = engMatch[1];
            }

            // Math: Check for 801-807, 581-582, 481-482
            // Look for patterns like "804", "581"
            const mathMatch = filename.match(/(80[1-7]|58[1-2]|48[1-2]|38[1-2])/);
            if (mathMatch && subject === 'מתמטיקה') {
                finalModuleSymbol = mathMatch[1];
            }
        }

        // 3. Construct the GenericExam object
        const seasonStr = season === 'winter' ? 'חורף' : 'קיץ';
        const title = `${subject} - שאלון ${finalModuleSymbol || 'כללי'} - ${seasonStr} ${year}`;
        
        // Normalize questions
        const questions = parsedData.questions.map((q, idx) => ({
            question_number: q.question_number || idx + 1,
            question_text: q.question_text,
            question_type: 'open_question', // Default to open for Bagrut
            topic: q.topic || subject,
            points: q.points || 0,
            options: [],
            correct_answer: q.correct_answer || '',
            explanation: q.solution_steps ? q.solution_steps.join('\n') : '',
            solution_steps: q.solution_steps || [],
            parts: []
        }));

        // 4. Save to Database
        const examData = {
            title: title,
            subject: subject,
            unit_level: parseInt(unit),
            module_id: finalModuleSymbol || "General",
            description: `בגרות רשמית ${seasonStr} ${year}`,
            duration_minutes: 120, // Standard
            total_points: 100,
            passing_grade: 56,
            questions: questions,
            is_generated: false, // This is a REAL exam
            is_copyright_free: false, // Just a flag, handled by disclaimer
            exam_file_url: exam_pdf_url, // Keep reference
            solution_file_url: solution_pdf_url // Keep reference
        };

        const savedExam = await base44.asServiceRole.entities.GenericExam.create(examData);

        // Also save mapped solutions to SolutionBank for smart feedback
        for (const q of questions) {
            if (q.solution_steps.length > 0 || q.correct_answer) {
                await base44.asServiceRole.entities.SolutionBank.create({
                    question_id: `real_${savedExam.id}_q${q.question_number}`,
                    solution_text: q.correct_answer,
                    solution_steps: q.solution_steps.map((s, i) => ({ step: i+1, description: s })),
                    verified: true
                });
            }
        }

        return Response.json({ success: true, data: savedExam });

    } catch (error) {
        console.error("Error processing Bagrut:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});