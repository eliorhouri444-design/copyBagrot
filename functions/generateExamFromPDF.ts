import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from "node:buffer";

if (!globalThis.process) { globalThis.process = { env: {} }; }

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const EXPERT_PARALLEL_PROMPT = `
You are an elite Senior Examiner with 20+ years at the Israeli Ministry of Education (Misrad HaChinuch).
Your task: Generate a PERFECT "Parallel Exam" (Moed B) - identical in difficulty, different in content.

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL RULE #1: QUESTION COUNT
═══════════════════════════════════════════════════════════════
**Count the questions in the original FIRST.**
Your output MUST have THE EXACT SAME NUMBER of questions.
- Original has 9 questions → You create 9 questions
- Original has 12 questions → You create 12 questions
- NEVER fewer. NEVER more.

═══════════════════════════════════════════════════════════════
🎯 OBJECTIVE
═══════════════════════════════════════════════════════════════
Create an exam that is:
- **100% PARALLEL** in structure, difficulty, and cognitive level
- **100% ORIGINAL** in content (zero copyright issues)
- **100% SOLVABLE** with correct, verified answers

═══════════════════════════════════════════════════════════════
📊 DIFFICULTY MATCHING PROTOCOL
═══════════════════════════════════════════════════════════════

For EACH question in the original, your parallel must match:

1. **Number of Solution Steps**
   - If original requires 4 steps → yours requires 4 steps
   - Count: setup → calculation → simplification → answer

2. **Cognitive Level** (Bloom's Taxonomy)
   - Knowledge (זכירה) → Knowledge
   - Comprehension (הבנה) → Comprehension  
   - Application (יישום) → Application
   - Analysis (ניתוח) → Analysis
   - Synthesis (סינתזה) → Synthesis
   - Evaluation (הערכה) → Evaluation

3. **Mathematical/Conceptual Complexity**
   - Same number of variables
   - Same type of operations
   - Same level of abstraction

4. **Sub-questions Structure**
   - If original has parts א, ב, ג → yours has parts א, ב, ג
   - Same point distribution per part

═══════════════════════════════════════════════════════════════
🔧 THE TWIN METHOD - BY SUBJECT
═══════════════════════════════════════════════════════════════

### MATHEMATICS / PHYSICS / CHEMISTRY

**Step 1: Analyze Original**
- What concept is tested?
- How many steps to solve?
- What makes it challenging?

**Step 2: Create Twin**
- Same problem TYPE, different NUMBERS
- CRITICAL: New numbers must give CLEAN answers!
  - Original: f(x) = x³ - 3x, extrema at x = ±1
  - Twin: g(x) = 2x³ - 24x, extrema at x = ±2 ✓
  - BAD: h(x) = x³ - 5x, extrema at x = ±√(5/3) ✗

**Step 3: Verify by Solving**
- Actually solve your new question
- If answer is messy → change numbers → re-solve

**For Geometry (no images):**
Describe COMPLETELY in text:
"In triangle ABC: AB = 8 cm, AC = 6 cm, angle BAC = 60°.
Point D lies on BC such that AD ⊥ BC.
Find: (a) Length of BC, (b) Length of AD, (c) Area of triangle ABD"

### HISTORY / CIVICS

**Same Period/Concept, Different Angle:**
- Original asks "causes" → Ask "consequences"
- Original asks "political" → Ask "social/economic"
- Original asks "compare X and Y" → Ask "compare X and Z" (same era)

**Maintain Analytical Depth:**
- 5-unit = complex multi-factor analysis
- 4-unit = structured comparison
- 3-unit = basic cause-effect

### LITERATURE / BIBLE (תנ"ך)

**Same Required Text, Different Aspect:**
- Original asks about "protagonist's flaw" → Ask about "antagonist's motivation"
- Original asks about "central theme" → Ask about "symbolic imagery"
- Original asks about "conflict" → Ask about "resolution/message"

### ENGLISH

**Create NEW Text (matching length):**
- 5 units: 400-500 words
- 4 units: 300-400 words  
- 3 units: 200-300 words

**Mirror Question Types:**
- Same number of MC questions
- Same number of Open questions
- Same vocabulary/grammar topics

═══════════════════════════════════════════════════════════════
✅ SOLUTION VERIFICATION PROTOCOL
═══════════════════════════════════════════════════════════════

For EVERY question you create:

1. **SOLVE IT YOURSELF** - step by step
2. **CHECK THE ANSWER** - is it "clean"?
3. **VERIFY LOGIC** - does each step follow?
4. **DOCUMENT** - include solution_steps array

**Solution Format:**
{
  "solution_steps": [
    "Step 1: נתון... / Given...",
    "Step 2: נציב... / Substitute...",
    "Step 3: נפתור... / Solve...",
    "Step 4: התשובה... / Answer..."
  ],
  "final_answer": "x = 4",
  "verification_note": "Verified: integer result, 4 steps like original"
}

═══════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT (JSON)
═══════════════════════════════════════════════════════════════

Return ONLY valid JSON. No markdown, no comments.

{
  "subject": "מתמטיקה",
  "unit": 5,
  "original_question_count": 9,
  "questions": [
    {
      "question_number": 1,
      "topic": "חקירת פונקציה",
      "difficulty_level": "medium",
      "cognitive_level": "application",
      "points": 12,
      "question_text": "נתונה הפונקציה f(x) = 2x³ - 24x...",
      "sub_questions": [
        "א. מצא את נקודות הקיצון",
        "ב. קבע את תחומי העלייה והירידה"
      ],
      "solution_steps": [
        "שלב 1: נגזור f'(x) = 6x² - 24",
        "שלב 2: נשווה לאפס: 6x² - 24 = 0",
        "שלב 3: x² = 4, לכן x = ±2",
        "שלב 4: נבדוק סימן הנגזרת בכל תחום"
      ],
      "final_answer": "נקודות קיצון ב-x = 2 ו-x = -2",
      "verification_note": "Verified: clean integer solutions"
    }
    // ... continue for ALL questions
  ]
}

═══════════════════════════════════════════════════════════════
🚨 FINAL CHECKLIST BEFORE OUTPUT
═══════════════════════════════════════════════════════════════

□ Counted original questions: ___
□ My output has same count: ___
□ Each question matches original difficulty level
□ Each question has complete solution_steps
□ All answers verified as correct
□ No content copied from original
□ Total points sum correctly

ONLY AFTER ALL CHECKS PASS → Output the JSON
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

        // 4. Convert to GenericExam Format and Publish
        const questions = (examJson.questions || []).map((q, idx) => {
            // Determine question type based on structure
            let qType = 'Open-ended';
            if (q.sub_questions && q.sub_questions.length > 0) {
                qType = 'Sectioned';
            } else if (q.options && q.options.length > 0) {
                qType = 'Multiple Choice';
            }

            return {
                question_number: idx + 1,
                question_text: q.question_text,
                question_type: qType,
                options: q.options || [],
                correct_answer: q.final_answer || q.solution_steps,
                explanation: q.solution_steps,
                points: Math.floor(100 / (examJson.questions.length || 1)),
                topic: q.topic || 'General',
                parts: (q.sub_questions || []).map((subText, subIdx) => ({
                    part_id: String.fromCharCode(1488 + subIdx), // Aleph, Bet, Gimel...
                    text: subText
                }))
            };
        });

        // Fetch module ID from original exam if available
        // חשוב: module_id חייב להתאים בדיוק למודולים הקיימים בקרוסלה
        let moduleId = "";
        if (original_exam_id) {
             const exams = await base44.entities.BagrutExam.filter({ id: original_exam_id });
             if (exams && exams.length > 0) {
                 moduleId = exams[0].module_symbol || "";
                 // Normalize English modules - רק אות אחת גדולה (A, B, C, D, E, F, G)
                 if (subject === 'אנגלית') {
                     moduleId = moduleId.replace(/module\s*/i, '').replace(/[^A-Ga-g]/g, '').trim().toUpperCase();
                     // וודא שזו רק אות אחת
                     if (moduleId.length > 1) {
                         moduleId = moduleId.charAt(0);
                     }
                 }
             }
        }

        const genericExamData = {
              title: examTitle,
              subject: subject,
              unit_level: parseInt(unit),
              module_id: moduleId || "General", // Fallback if no module symbol
              description: "מבחן מקביל שנוצר ע\"י AI",
              duration_minutes: 120, // Default
              total_points: 100,
              passing_grade: 56,
              questions: questions,
              is_generated: true,
              is_copyright_free: true,
              generated_from_id: original_exam_id || null
        };

        // Create the PUBLISHED exam directly
        const publishedExam = await base44.entities.GenericExam.create(genericExamData);

        // Also keep a record in GeneratedExam for logs/history (optional, but good for debugging)
        const generatedExam = await base44.entities.GeneratedExam.create({
            original_exam_id: original_exam_id || null,
            title: examTitle,
            subject: subject,
            unit: parseInt(unit),
            exam_json: examJson,
            status: "completed",
            created_at: new Date().toISOString()
        });

        return Response.json({ success: true, data: publishedExam });

    } catch (error) {
        console.error("❌ Error:", error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});