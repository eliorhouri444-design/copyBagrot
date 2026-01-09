import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { exam_pdf_url, solution_pdf_url, solution_part_urls = [], subject, unit, year, season, module_symbol } = body;

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
                                page_number: { type: "integer", description: "The page number in the PDF where this question appears" },
                                intro_text: { type: "string", description: "The main introductory text of the question in HEBREW ONLY. Preserve formatting." },
                                sections: { 
                                    type: "array", 
                                    items: { 
                                        type: "object", 
                                        properties: {
                                            section_id: { type: "string", description: "The section identifier (e.g., 'א', 'ב', '1', '2')" },
                                            content: { type: "string", description: "The content of the specific sub-section in HEBREW ONLY" }
                                        }
                                    } 
                                },
                                topic: { type: "string", description: "The topic of the question in HEBREW" },
                                points: { type: "integer" },
                                structure: {
                                    type: "array",
                                    description: "CRITICAL: The internal structure of the question. List ALL sub-questions and sections (א, ב, ג, 1, 2) that require an answer.",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string", description: "The section identifier (e.g., 'א', 'ב(1)', 'ג')" },
                                            text: { type: "string", description: "The text of the sub-question" },
                                            type: { type: "string", enum: ["number", "text", "proof", "expression"], description: "Expected answer type" },
                                            points: { type: "integer", description: "Points for this specific section" }
                                        },
                                        required: ["id", "type"]
                                    }
                                },
                                answer_fields: { 
                                    type: "array", 
                                    description: "DEPRECATED - Use 'structure' instead for full section mapping.",
                                    items: { type: "object", properties: { label: {type: "string"}, key: {type: "string"}, type: {type: "string"} } }
                                },
                                explanation: { type: "string", description: "ULTRA-CRITICAL: The output for this field MUST be in the HEBREW language. Provide a detailed step-by-step explanation. If the source material is in English, you MUST translate the entire explanation to HEBREW. NO ENGLISH is allowed in the output." },
                                has_diagram: { type: "boolean", description: "CRITICAL: Analyze the question area. Set to 'true' if ANY non-text element like a diagram, geometric shape, coordinate system, graph, or illustration is present. Set to 'false' otherwise. This is very important." }
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

        // 2.5 Generate diagrams for questions that need them
        console.log("Generating diagrams for questions...");
        const diagramPromises = questions.map(async (q) => {
            if (q.has_diagram) {
                try {
                    console.log(`Generating diagram for question ${q.question_number}...`);
                    const diagramPrompt = `CRITICAL INSTRUCTION: Generate a VERY simple, clean, black and white 2D line-art diagram for the geometric shape described in the text.
                    - ONLY draw the main shape and its vertices (e.g., for a pyramid SABCD, draw the pyramid and label the points S, A, B, C, D, and the center O if mentioned).
                    - Use dashed lines for hidden edges to show perspective.
                    - DO NOT add any measurements, angles, dimensions, formulas, or extra construction lines. The diagram must be as simple and clean as a standard textbook geometry figure.
                    - The diagram should ONLY contain the shape and its vertex labels. Nothing else.
                    The geometric problem description is: ${q.intro_text || ''} ${q.sections ? q.sections.map(s => s.content).join(' ') : ''}`;

                    const imageResponse = await base44.asServiceRole.integrations.Core.GenerateImage({
                        prompt: diagramPrompt
                    });

                    if (imageResponse && imageResponse.url) {
                        console.log(`Diagram generated for question ${q.question_number}: ${imageResponse.url}`);
                        q.question_image_url_generated = imageResponse.url; // Use a new field to avoid conflicts
                    }
                } catch (genErr) {
                    console.error(`Failed to generate diagram for question ${q.question_number}:`, genErr);
                }
            }
            return q;
        });

        questions = await Promise.all(diagramPromises);
        console.log("Diagram generation complete.");

        // 2. Extract Solutions (if provided)
        if (solution_part_urls && Array.isArray(solution_part_urls) && solution_part_urls.length > 0) {
            console.log("Merging multiple solution parts (from site) ... count:", solution_part_urls.length);
            try {
                // We won't actually merge bytes server-side here; instead, pass parts to extractor one by one and merge steps
                const allSteps = [];
                const allFinals = [];
                for (const partUrl of solution_part_urls) {
                    const part = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
                        file_url: partUrl,
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
                    if (part.status === 'success' && part.output?.solutions) {
                        for (const s of part.output.solutions) {
                            allFinals.push({ q: s.question_number, a: s.final_answer || '' });
                            (s.steps || []).forEach(step => allSteps.push({ q: s.question_number, step }));
                        }
                    }
                }
                // Build map
                const byQ = new Map();
                allSteps.forEach(({ q, step }) => {
                    const arr = byQ.get(q) || [];
                    arr.push(step);
                    byQ.set(q, arr);
                });
                const finals = new Map();
                allFinals.forEach(({ q, a }) => { if (a) finals.set(q, a); });

                // Merge into questions after exam extraction later (we'll access this closure var)
                globalThis.__mergedSolutions = { byQ, finals };
            } catch (e) {
                console.error('Merging solution parts failed (continue without merge):', e);
            }
        } else if (solution_pdf_url) {
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
                                        final_answer: { type: "string", description: "ULTRA-CRITICAL: The final answer. The output for this field MUST be in the HEBREW language. NO ENGLISH. Translate if needed." },
                                        steps: { type: "array", items: { type: "string", description: "ULTRA-CRITICAL: A single step in the solution. The output for this field MUST be in the HEBREW language. NO ENGLISH. Translate the entire step to HEBREW if the source is in English." } }
                                    },
                                    required: ["question_number"]
                                }
                            }
                        },
                        required: ["solutions"]
                    }
                });

                const mergedFromParts = globalThis.__mergedSolutions;
                        if (mergedFromParts) {
                            const solutionsMap = new Map();
                            // build pseudo items
                            for (const [q, stepsArr] of mergedFromParts.byQ || []) {
                                solutionsMap.set(parseInt(q), { question_number: parseInt(q), final_answer: mergedFromParts.finals?.get(parseInt(q)) || '', steps: stepsArr });
                            }
                            if (solutionsMap.size > 0) {
                                questions = questions.map(q => {
                                    const sol = solutionsMap.get(q.question_number);
                                    return {
                                        ...q,
                                        correct_answer: sol?.final_answer || q.correct_answer || '',
                                        solution_steps: sol?.steps || q.solution_steps || [],
                                        explanation: sol?.steps ? sol.steps.join('\n') : (q.explanation || '')
                                    };
                                });
                                console.log('Merged solutions from parts successfully.');
                            }
                        } else if (solutionExtraction.status === 'success' && solutionExtraction.output?.solutions) {
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
        
        const finalQuestions = questions.map((q, idx) => {
            // Construct a clean structured text
            let formattedText = q.intro_text || q.question_text || "";
            if (q.content && !q.intro_text) formattedText = q.content; // Fallback

            // Use the new 'structure' array if available, otherwise fallback to old 'sections' or 'parts' logic
            let structure = q.structure || [];
            
            // Backwards compatibility / Bible logic mapping
            if (structure.length === 0 && q.sections) {
                structure = q.sections.map(s => ({
                    id: s.section_id,
                    text: s.content,
                    type: "text",
                    points: 0
                }));
            } else if (structure.length === 0 && q.parts) {
                 structure = q.parts.map(p => ({
                    id: p.part_id,
                    text: p.text,
                    type: "text",
                    points: p.points
                }));
            }

            // Create structured answer fields based on the detected structure
            const answerFields = structure.map(part => ({
                key: `section_${part.id}`,
                label: `סעיף ${part.id}`,
                description: part.text, // Show the specific question text for this section
                type: part.type === 'number' ? 'number' : 'text',
                points: part.points
            }));

            return {
                question_number: q.question_number || idx + 1,
                page_number: q.page_number || 1,
                question_text: formattedText,
                question_type: structure.length > 0 ? 'structured' : 'open',
                topic: q.topic || subject,
                points: q.points || Math.round(100 / questions.length),
                options: [],
                correct_answer: q.correct_answer || '',
                explanation: q.explanation || '',
                solution_steps: q.solution_steps || [],
                answer_fields: answerFields, // This is now the main driver for the UI
                structure: structure, // Keep the full structure data
                has_diagram: q.has_diagram || false,
                question_image_url: q.question_image_url_generated || (q.has_diagram ? "pending_crop" : null)
            };
        });

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