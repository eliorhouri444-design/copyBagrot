import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// New, slow-and-accurate multi-stage scanner (does NOT touch existing scanners)
// Input: { exam_pdf_url?: string, solution_pdf_url?: string, image_urls?: string[], subject: string, unit: number, year?: number, season?: 'winter'|'summer'|'special', module_symbol?: string }
// Output: { success, exam?: GenericExamRecord, stages }
Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { exam_pdf_url, solution_pdf_url, image_urls, subject, unit, year, season, module_symbol } = body || {};

    if (!subject || !unit || (!exam_pdf_url && (!image_urls || image_urls.length === 0))) {
      return Response.json({ success: false, error: 'Missing required input (subject, unit, and a PDF or images)' }, { status: 400 });
    }

    const stages = [];

    // Stage 1: Initial extraction (conservative)
    stages.push({ stage: 'initial_extraction', status: 'running' });
    const extractionSchema = {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question_number: { type: 'integer' },
              page_number: { type: 'integer' },
              intro_text: { type: 'string', description: 'HEBREW ONLY' },
              content: { type: 'string', description: 'HEBREW ONLY (fallback)' },
              topic: { type: 'string', description: 'HEBREW' },
              points: { type: 'integer' },
              has_diagram: { type: 'boolean' },
              structure: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    text: { type: 'string', description: 'HEBREW ONLY' },
                    type: { type: 'string', enum: ['number', 'text', 'proof', 'expression'] },
                    points: { type: 'integer' }
                  },
                  required: ['id']
                }
              },
              options: { type: 'array', items: { type: 'string' } },
              correct_answer: { type: 'string', description: 'HEBREW ONLY' },
              explanation: { type: 'string', description: 'HEBREW ONLY' }
            },
            required: ['question_number']
          }
        }
      },
      required: ['questions']
    };

    const combineExtractionResults = (arr) => {
      // Flatten and renumber questions safely
      const all = arr.flatMap((r) => (r?.output?.questions || []));
      all.sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
      return all.map((q, i) => ({ ...q, question_number: q.question_number || i + 1 }));
    };

    const extractionCalls = [];
    if (exam_pdf_url) {
      extractionCalls.push(base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: exam_pdf_url,
        json_schema: extractionSchema
      }));
    }
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      for (const url of image_urls) {
        extractionCalls.push(base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
          file_url: url,
          json_schema: extractionSchema
        }));
      }
    }

    const extractionResults = await Promise.all(extractionCalls);
    const initialQuestions = combineExtractionResults(extractionResults);
    stages[stages.length - 1] = { stage: 'initial_extraction', status: 'completed', count: initialQuestions.length };

    if (initialQuestions.length === 0) {
      return Response.json({ success: false, error: 'No questions extracted at Stage 1' }, { status: 200 });
    }

    // Stage 2: Per-question refinement (slower, multi-pass)
    stages.push({ stage: 'refinement', status: 'running' });
    const refined = [];
    for (const q of initialQuestions) {
      // Pass A: normalize structure & fill missing using LLM with web off
      const passA = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `נרמל שאלה בעברית: הפוך את ה-structure לרשימה של סעיפים (א, ב, ג, 1, 2). החזר JSON בלבד.
שמור טקסטים בעברית בלבד וללא תוספות שאינן מופיעות בשאלה.
QUESTION:\n${(q.intro_text || q.content || '').toString().slice(0, 6000)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            question_text: { type: 'string' },
            structure: {
              type: 'array',
              items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' }, type: { type: 'string' }, points: { type: 'integer' } } }
            }
          }
        }
      });

      const normalizedStructure = Array.isArray(passA?.structure) ? passA.structure : (q.structure || []);

      // Pass B: light consistency check
      const passB = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `בדיקת עקביות קצרה: האם למבנה הבא יש כפילויות/חוסרים? החזר JSON עם structure מתוקן בלבד.
${JSON.stringify(normalizedStructure).slice(0, 6000)}`,
        response_json_schema: { type: 'object', properties: { structure: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' }, type: { type: 'string' }, points: { type: 'integer' } } } } } }
      });

      const structure = Array.isArray(passB?.structure) && passB.structure.length ? passB.structure : normalizedStructure;

      refined.push({
        question_number: q.question_number,
        page_number: q.page_number || 1,
        question_text: passA?.question_text || q.intro_text || q.content || '',
        question_type: structure?.length ? 'structured' : 'open',
        topic: q.topic || subject,
        points: q.points || 0,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        solution_steps: q.solution_steps || [],
        structure,
        answer_fields: structure.map((p) => ({ key: `section_${p.id}`, label: `סעיף ${p.id}`, description: p.text || '', type: p.type === 'number' ? 'number' : 'text', points: p.points })),
        has_diagram: !!q.has_diagram,
        question_image_url: q.question_image_url || null
      });
    }
    stages[stages.length - 1] = { stage: 'refinement', status: 'completed', count: refined.length };

    // Stage 3: Solutions extraction (if PDF provided)
    let merged = refined;
    if (solution_pdf_url) {
      stages.push({ stage: 'solutions_extraction', status: 'running' });
      const solRes = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: solution_pdf_url,
        json_schema: {
          type: 'object',
          properties: {
            solutions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question_number: { type: 'integer' },
                  final_answer: { type: 'string', description: 'HEBREW ONLY' },
                  steps: { type: 'array', items: { type: 'string' } }
                },
                required: ['question_number']
              }
            }
          },
          required: ['solutions']
        }
      });
      const map = new Map();
      for (const s of solRes?.output?.solutions || []) map.set(s.question_number, s);
      merged = refined.map((q) => {
        const s = map.get(q.question_number);
        if (!s) return q;
        return { ...q, correct_answer: s.final_answer || q.correct_answer, solution_steps: Array.isArray(s.steps) ? s.steps : q.solution_steps, explanation: Array.isArray(s.steps) ? s.steps.join('\n') : q.explanation };
      });
      stages[stages.length - 1] = { stage: 'solutions_extraction', status: 'completed' };
    }

    // Stage 4: Persist GenericExam
    stages.push({ stage: 'persist', status: 'running' });
    const seasonStr = season === 'winter' ? 'חורף' : season === 'summer' ? 'קיץ' : 'מיוחד';
    const title = `${subject} - שאלון ${module_symbol || 'כללי'} - ${seasonStr || ''} ${year || ''}`.trim();

    const examData = {
      title,
      subject,
      unit_level: parseInt(unit),
      module_id: module_symbol || 'General',
      description: `סריקה מדויקת (מערכת חדשה) ${year ? '- ' + year : ''}`.trim(),
      duration_minutes: 120,
      total_points: 100,
      passing_grade: 56,
      questions: merged,
      is_generated: false,
      exam_file_url: exam_pdf_url || null,
      solution_file_url: solution_pdf_url || null
    };

    const created = await base44.asServiceRole.entities.GenericExam.create(examData);
    stages[stages.length - 1] = { stage: 'persist', status: 'completed', exam_id: created.id };

    const tookMs = Date.now() - startedAt;
    return Response.json({ success: true, exam: created, stages, took_ms: tookMs });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 200 });
  }
});