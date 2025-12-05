import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { exam_pdf_url, solution_pdf_url, subject, unit, year, season, module_symbol } = body;

        if (!exam_pdf_url) {
            return Response.json({ error: 'Missing Exam PDF' }, { status: 400 });
        }

        console.log(`Starting processing for ${subject} exam...`);

        // 1. Extract Questions from Exam PDF
        // Using ExtractDataFromUploadedFile integration which handles OCR and structure
        console.log("Extracting questions from exam PDF...");
        const examExtraction = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: exam_pdf_url,
            json_schema: {
                type: "object",
                properties: {
                    questions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question_number: { type: "integer" },
                                content: { type: "string", description: "The full text content of the question, including all sub-sections (א, ב, etc.)" },
                                topic: { type: "string" },
                                points: { type: "integer" }
                            },
                            required: ["question_number", "content"]
                        }
                    }
                },
                required: ["questions"]
            }
        });

        if (examExtraction.status === 'error' || !examExtraction.output?.questions) {
            console.error("Exam extraction failed:", examExtraction);
            const errorDetails = typeof examExtraction.details === 'string' ? examExtraction.details : JSON.stringify(examExtraction.details);
            return Response.json({ error: 'נכשל בחילוץ שאלות מהמבחן. וודא שהקובץ תקין. פרטים: ' + errorDetails }, { status: 500 });
        }

        let questions = examExtraction.output.questions;
        console.log(`Extracted ${questions.length} questions.`);

        // 2. Extract Solutions (if provided)
        if (solution_pdf_url) {
            console.log("Extracting solutions from solution PDF...");
            try {
                const solutionExtraction = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
                    file_url: solution_pdf_url,
                    json_schema: {
                        type: "object",
                        properties: {
                            solutions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        question_number: { type: "integer" },
                                        final_answer: { type: "string" },
                                        steps: { type: "array", items: { type: "string" } }
                                    },
                                    required: ["question_number"]
                                }
                            }
                        },
                        required: ["solutions"]
                    }
                });

                if (solutionExtraction.status === 'success' && solutionExtraction.output?.solutions) {
                    const solutionsMap = new Map(solutionExtraction.output.solutions.map(s => [s.question_number, s]));
                    
                    // Merge solutions into questions
                    questions = questions.map(q => {
                        const sol = solutionsMap.get(q.question_number);
                        return {
                            ...q,
                            correct_answer: sol?.final_answer || '',
                            solution_steps: sol?.steps || [],
                            explanation: sol?.steps ? sol.steps.join('\n') : ''
                        };
                    });
                    console.log("Solutions merged successfully.");
                } else {
                    console.warn("Solution extraction returned no data or failed softly.");
                }
            } catch (solErr) {
                console.error("Error extracting solutions (continuing without them):", solErr);
            }
        }

        // 3. Normalize Data for GenericExam
        const seasonStr = season === 'winter' ? 'חורף' : 'קיץ';
        const title = `${subject} - שאלון ${module_symbol || 'כללי'} - ${seasonStr} ${year}`;
        
        const finalQuestions = questions.map((q, idx) => ({
            question_number: q.question_number || idx + 1,
            question_text: q.content || q.question_text || "Question content missing",
            question_type: 'open_question',
            topic: q.topic || subject,
            points: q.points || Math.round(100 / questions.length), // Default points if missing
            options: [],
            correct_answer: q.correct_answer || '',
            explanation: q.explanation || '',
            solution_steps: q.solution_steps || [],
            parts: []
        }));

        // 4. Save to Database
        const examData = {
            title: title,
            subject: subject,
            unit_level: parseInt(unit),
            module_id: module_symbol || "General",
            description: `בגרות רשמית ${seasonStr} ${year}`,
            duration_minutes: 120,
            total_points: 100,
            passing_grade: 56,
            questions: finalQuestions,
            is_generated: false,
            exam_file_url: exam_pdf_url,
            solution_file_url: solution_pdf_url
        };

        // Check for existing generic exam with same file_url to avoid duplicates
        const existingExams = await base44.asServiceRole.entities.GenericExam.filter({ exam_file_url: exam_pdf_url });
        let savedExam;
        
        if (existingExams.length > 0) {
            console.log("Updating existing exam...");
            // Update existing
            await base44.asServiceRole.entities.GenericExam.update(existingExams[0].id, examData);
            savedExam = { ...examData, id: existingExams[0].id };
        } else {
            console.log("Creating new exam...");
            savedExam = await base44.asServiceRole.entities.GenericExam.create(examData);
        }

        // Save solutions to SolutionBank
        try {
            for (const q of finalQuestions) {
                if (q.solution_steps.length > 0 || q.correct_answer) {
                    const qId = `real_${savedExam.id}_q${q.question_number}`;
                    // Check if solution exists
                    const existingSols = await base44.asServiceRole.entities.SolutionBank.filter({ question_id: qId });
                    
                    const solutionData = {
                        question_id: qId,
                        solution_text: q.correct_answer,
                        solution_steps: q.solution_steps.map((s, i) => ({ step: i + 1, description: s })),
                        verified: true
                    };

                    if (existingSols.length > 0) {
                        await base44.asServiceRole.entities.SolutionBank.update(existingSols[0].id, solutionData);
                    } else {
                        await base44.asServiceRole.entities.SolutionBank.create(solutionData);
                    }
                }
            }
        } catch (dbErr) {
            console.error("Error saving solutions to bank:", dbErr);
            // Don't fail the whole process for this
        }

        return Response.json({ success: true, data: savedExam });

    } catch (error) {
        console.error("Process Bagrut Main Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});