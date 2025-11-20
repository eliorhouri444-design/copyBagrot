import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔬 Advanced Exam Scanner
 * Scans exams with EXACT precision - preserves original language, structure, and diagrams
 * NO TRANSLATION - keeps everything in the original language
 */

Deno.serve(async (req) => {
  console.log('🔬 Starting Advanced Exam Scanner');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { fileUrl, subject, unitLevel, moduleId, examYear, examSeason } = await req.json();

    if (!fileUrl || !subject) {
      return Response.json({ error: 'Missing fileUrl or subject' }, { status: 400 });
    }

    console.log(`📄 Scanning: ${subject} ${unitLevel}units Module ${moduleId}`);

    // Build language-specific instructions
    let languageInstruction = '';
    let exampleQuestionsInOriginalLang = '';
    
    if (subject === 'אנגלית') {
      languageInstruction = `
**CRITICAL LANGUAGE RULE:**
- This is an ENGLISH exam - ALL questions are in ENGLISH
- Extract question text EXACTLY as written in English
- DO NOT translate to Hebrew
- Keep all section names in English (PART I, WRITTEN RECEPTION, etc.)
- Keep all options in English (A, B, C, D)
- Keep all instructions in English`;

      exampleQuestionsInOriginalLang = `
Example of correct extraction:
{
  "question_number": 1,
  "question_text": "What is the main idea of paragraph II?",
  "options": ["The robots help people", "Technology is advancing", "Space exploration is dangerous"],
  "correct_answer": "A",
  "topic": "Reading Comprehension"
}`;
    } else {
      languageInstruction = `
- שאלות בעברית - תחלץ בדיוק כמו שכתוב בעברית
- שמור על המבנה המקורי`;

      exampleQuestionsInOriginalLang = `
דוגמה:
{
  "question_number": 1,
  "question_text": "מהו הרעיון המרכזי של הפסקה?",
  "correct_answer": "התפתחות הטכנולוגיה"
}`;
    }

    // PHASE 1: Structure Analysis
    console.log('📊 Phase 1: Analyzing exam structure...');
    
    const structureAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert exam analyzer. Analyze this Israeli matriculation exam with PERFECT accuracy.

**Exam Info:**
- Subject: ${subject}
- Unit Level: ${unitLevel}
- Module: ${moduleId}
- Year: ${examYear || 'Unknown'}
- Season: ${examSeason || 'Unknown'}

${languageInstruction}

**Your Task:**
Extract the EXACT structure:

1. **General Info:**
   - Total pages
   - Total questions
   - Total points
   - Duration in minutes

2. **Sections (if any):**
   - Section number
   - Section name (KEEP IN ORIGINAL LANGUAGE - e.g., "PART I: WRITTEN RECEPTION")
   - Points per section
   - Question range (e.g., "1-7")

3. **Question Structure:**
For EACH question:
   - question_number: the actual question number
   - question_text: EXACT text in ORIGINAL LANGUAGE (English for English exams!)
   - question_type: (multiple_choice, short_answer, open_question, calculation, essay, etc.)
   - topic: main topic area
   - sub_topics: array of subtopics
   - points: points for this question
   - difficulty_level: easy/medium/hard
   - options: array of options (for multiple choice) - IN ORIGINAL LANGUAGE
   - has_diagram: true/false
   - diagram_description: if has diagram, describe in detail
   - reading_passage_text: if this is reading comprehension, extract the FULL passage text

${exampleQuestionsInOriginalLang}

**CRITICAL RULES:**
- Extract text EXACTLY as written - NO TRANSLATION
- For English exams: ALL content must be in English
- For Hebrew exams: ALL content must be in Hebrew
- Count every single question
- Note every diagram/image
- Extract reading passages in full

Return complete JSON structure.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          total_pages: { type: "integer" },
          total_questions: { type: "integer" },
          total_points: { type: "integer" },
          duration_minutes: { type: "integer" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section_number: { type: "integer" },
                section_name: { type: "string" },
                points: { type: "integer" },
                question_range: { type: "string" }
              }
            }
          },
          question_structure: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string" },
                question_type: { type: "string" },
                topic: { type: "string" },
                sub_topics: { type: "array", items: { type: "string" } },
                points: { type: "integer" },
                difficulty_level: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                has_diagram: { type: "boolean" },
                diagram_description: { type: "string" },
                reading_passage_text: { type: "string" }
              }
            }
          },
          reading_passages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                passage_text: { type: "string" },
                related_questions: { type: "array", items: { type: "integer" } }
              }
            }
          }
        }
      }
    });

    console.log(`✅ Structure analyzed: ${structureAnalysis.total_questions} questions found`);

    // PHASE 2: Extract Full Questions with Answers
    console.log('📝 Phase 2: Extracting full questions and answers...');
    
    const fullQuestionsExtraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Now extract COMPLETE question data including answers.

**Exam:** ${subject} ${unitLevel}units Module ${moduleId}

${languageInstruction}

**Extract for each of the ${structureAnalysis.total_questions} questions:**

1. question_number
2. question_text (EXACT text in ORIGINAL language)
3. question_type
4. options (for multiple choice) - EXACT text in ORIGINAL language
5. correct_answer (EXACT as written)
6. explanation (brief explanation in Hebrew for grading reference)
7. points
8. topic

${exampleQuestionsInOriginalLang}

**For Reading Comprehension questions:**
- Extract the full reading passage
- Note which questions refer to which passage

**For Math/Science questions:**
- If there's a diagram, describe it in extreme detail:
  * Points (A, B, C with coordinates if shown)
  * Lines (AB, BC, etc.)
  * Shapes (triangle ABC, circle with center O)
  * Labels (angles, lengths, values)
  * Axes (if graph)

**VERIFY:**
- Question count matches ${structureAnalysis.total_questions}
- All questions in ORIGINAL language
- NO translation occurred

Return complete JSON.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string" },
                question_type: { type: "string" },
                topic: { type: "string" },
                points: { type: "integer" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                has_diagram: { type: "boolean" },
                diagram_details: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    description: { type: "string" },
                    points: { type: "array", items: { type: "string" } },
                    lines: { type: "array", items: { type: "string" } },
                    shapes: { type: "array", items: { type: "string" } },
                    labels: { type: "array", items: { type: "string" } },
                    coordinates: { type: "object" }
                  }
                }
              }
            }
          },
          reading_passages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                related_questions: { type: "array", items: { type: "integer" } }
              }
            }
          }
        }
      }
    });

    console.log(`✅ Extracted ${fullQuestionsExtraction.questions?.length || 0} complete questions`);

    // Calculate distributions
    const topicDist = {};
    const diffDist = { easy: 0, medium: 0, hard: 0, expert: 0 };

    structureAnalysis.question_structure?.forEach(q => {
      const topic = q.topic || 'General';
      if (!topicDist[topic]) {
        topicDist[topic] = { count: 0, points: 0, percentage: 0 };
      }
      topicDist[topic].count++;
      topicDist[topic].points += (q.points || 0);

      const diff = q.difficulty_level || 'medium';
      if (diffDist[diff] !== undefined) {
        diffDist[diff]++;
      }
    });

    Object.keys(topicDist).forEach(topic => {
      topicDist[topic].percentage = Math.round((topicDist[topic].points / structureAnalysis.total_points) * 100);
    });

    // Save to database
    const structureName = `${subject} ${unitLevel}יח' ${moduleId} - ${examYear} ${examSeason}`;
    
    console.log('💾 Saving structure to database...');

    const existing = await base44.asServiceRole.entities.ExamStructure.filter({
      subject: subject,
      unit_level: unitLevel,
      module_id: moduleId,
      exam_year: examYear,
      exam_season: examSeason
    });

    let savedStructure;

    const structureData = {
      structure_name: structureName,
      total_questions: structureAnalysis.total_questions,
      total_points: structureAnalysis.total_points,
      duration_minutes: structureAnalysis.duration_minutes,
      sections: structureAnalysis.sections || [],
      question_structure: structureAnalysis.question_structure,
      topic_distribution: topicDist,
      difficulty_distribution: diffDist,
      source_file_url: fileUrl,
      is_active: true,
      metadata: {
        scanned_by: user.email,
        scan_date: new Date().toISOString(),
        full_questions: fullQuestionsExtraction.questions || [],
        reading_passages: fullQuestionsExtraction.reading_passages || []
      }
    };

    if (existing.length > 0) {
      savedStructure = await base44.asServiceRole.entities.ExamStructure.update(existing[0].id, structureData);
    } else {
      savedStructure = await base44.asServiceRole.entities.ExamStructure.create({
        subject: subject,
        unit_level: unitLevel,
        module_id: moduleId,
        exam_year: examYear,
        exam_season: examSeason,
        ...structureData,
        generated_exams_count: 0
      });
    }

    console.log(`✅ Structure saved: ID ${savedStructure.id}`);

    // Save questions to QuestionBank
    console.log('📚 Saving questions to QuestionBank...');
    let savedQuestionsCount = 0;

    for (const question of (fullQuestionsExtraction.questions || [])) {
      try {
        const questionId = `${subject}_${unitLevel}_${moduleId}_q${question.question_number}_${examYear}${examSeason}`;
        
        const existing = await base44.asServiceRole.entities.QuestionBank.filter({
          question_id: questionId
        });

        const questionData = {
          question_id: questionId,
          subject_id: subject,
          unit_level: unitLevel,
          module_id: moduleId,
          origin_type: 'bagrut',
          origin_details: `${examYear} ${examSeason} שאלון ${moduleId}`,
          topic_id: question.topic,
          question_text: question.question_text,
          question_type: question.question_type,
          max_score: question.points || 10,
          difficulty_level: question.difficulty_level || 'medium',
          options: question.options || [],
          is_active: true
        };

        if (question.has_diagram && question.diagram_details) {
          questionData.question_image_url = `diagram_needed_${questionId}`;
          questionData.tags = ['has_diagram'];
        }

        if (existing.length > 0) {
          await base44.asServiceRole.entities.QuestionBank.update(existing[0].id, questionData);
        } else {
          await base44.asServiceRole.entities.QuestionBank.create(questionData);
        }

        // Save solution if available
        const solutionData = {
          question_id: questionId,
          solution_text: question.explanation || '',
          final_answers: [{
            part_id: "main",
            value: question.correct_answer || ''
          }],
          verified: false
        };

        const existingSolution = await base44.asServiceRole.entities.SolutionBank.filter({
          question_id: questionId
        });

        if (existingSolution.length === 0) {
          await base44.asServiceRole.entities.SolutionBank.create(solutionData);
        } else {
          await base44.asServiceRole.entities.SolutionBank.update(existingSolution[0].id, solutionData);
        }

        savedQuestionsCount++;
      } catch (error) {
        console.error(`Error saving question ${question.question_number}:`, error);
      }
    }

    console.log(`✅ Saved ${savedQuestionsCount} questions to QuestionBank`);

    return Response.json({
      success: true,
      message: `✅ Scanned: ${structureAnalysis.total_questions} questions, ${structureAnalysis.total_points} points`,
      structure: {
        id: savedStructure.id,
        total_questions: structureAnalysis.total_questions,
        total_points: structureAnalysis.total_points,
        duration: structureAnalysis.duration_minutes,
        sections: structureAnalysis.sections?.length || 0,
        questions_saved_to_bank: savedQuestionsCount
      }
    });

  } catch (error) {
    console.error('❌ Scanner Error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});