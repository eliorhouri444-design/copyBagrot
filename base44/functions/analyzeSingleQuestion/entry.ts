import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Analyze a single question (image URL or uploaded file URL) and return structured JSON
// Input: { image_url?: string, file_url?: string, subject?: string, unit_level?: number, module_id?: string }
// Output: {
//   success: true,
//   analysis: {
//     question_text: string,
//     primary_topic: string,
//     topics: string[],
//     difficulty_level: 'easy'|'medium'|'hard'|'expert',
//     question_type: 'calculation'|'proof'|'multiple_choice'|'open'|'short_answer'|'two_answers',
//     parts: [{ part_id: 'א', description: string, points: number|null, expected_answer_type?: string }],
//     diagram: { has_diagram: boolean, type?: 'histogram'|'graph'|'geometry'|'other', description?: string, histogram?: { x_label?: string, y_label?: string, bars?: {label: string, value: number}[] }, graph?: { x_axis_label?: string, y_axis_label?: string, points?: {x:number,y:number,label?:string}[], functions?: string[] }, geometry?: { points?: Record<string,{x:number,y:number,label?:string}>, lines?: {from:string,to:string,label?:string}[], shapes?: {type:string, vertices:string[]}[] } },
//     meta: { subject?: string, unit_level?: number, module_id?: string, source_url: string }
//   }
// }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, file_url, subject = 'מתמטיקה', unit_level, module_id } = body || {};

    const sourceUrl = file_url || image_url;
    if (!sourceUrl) {
      return Response.json({ error: 'Provide image_url or file_url' }, { status: 400 });
    }

    const prompt = `
אתה מנתח שאלה בודדת מתוך בחינת בגרות בעברית ומחזיר JSON מובנה ומדויק.

חובה:
- אל תדלג על אף סעיף (א, ב, ג, ד, ה...). אם סעיף משוער בלבד, סמן points=null אך כלול אותו.
- שמור RTL בטקסט.
- אם יש תרשים/גרף/היסטוגרמה/איור – תאר וגם דגם במבנה נתונים.

משימות:
1) חילוץ טקסט השאלה המלא.
2) זיהוי נושאים (topics) ו-primary_topic.
3) רמת קושי: easy/medium/hard/expert.
4) סוג שאלה: calculation/proof/multiple_choice/open/short_answer/two_answers.
5) חילוץ כל הסעיפים בסדר נכון: part_id (א/ב/ג...), description קצרה, points (אם לא מופיע – null), expected_answer_type (number/fraction/text/mcq/logic/steps).
6) זיהוי דיאגרמה: has_diagram + type (histogram/graph/geometry/other) + description, ובנוסף:
   - histogram: x_label, y_label, bars:[{label,value}]
   - graph: x_axis_label, y_axis_label, points:[{x,y,label?}], functions:[...]
   - geometry: points{A:{x,y,label?}}, lines[{from,to,label?}], shapes[{type,vertices[]}]

החזר JSON בלבד במבנה שנגדיר בסכמה. אם נתון חסר – השאר ריק/Null, אל תמציא.
נתונים משלימים:
- מקצוע: ${subject}
- יחידות: ${unit_level ?? ''}
- שאלון: ${module_id ?? ''}
`;

    const llm = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [sourceUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          question_text: { type: 'string' },
          topics: { type: 'array', items: { type: 'string' } },
          primary_topic: { type: 'string' },
          difficulty_level: { type: 'string' },
          question_type: { type: 'string' },
          parts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                part_id: { type: 'string' },
                description: { type: 'string' },
                points: { type: 'number' },
                expected_answer_type: { type: 'string' }
              }
            }
          },
          diagram: {
            type: 'object',
            properties: {
              has_diagram: { type: 'boolean' },
              type: { type: 'string' },
              description: { type: 'string' },
              histogram: {
                type: 'object',
                properties: {
                  x_label: { type: 'string' },
                  y_label: { type: 'string' },
                  bars: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'number' } } } }
                }
              },
              graph: {
                type: 'object',
                properties: {
                  x_axis_label: { type: 'string' },
                  y_axis_label: { type: 'string' },
                  points: { type: 'array', items: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, label: { type: 'string' } } } },
                  functions: { type: 'array', items: { type: 'string' } }
                }
              },
              geometry: {
                type: 'object',
                properties: {
                  points: { type: 'object' },
                  lines: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string' } } } },
                  shapes: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, vertices: { type: 'array', items: { type: 'string' } } } } }
                }
              }
            }
          }
        }
      }
    });

    // Fallback: אם חלקים לא זוהו – נסה לפצל מהטקסט
    let parts = Array.isArray(llm.parts) ? llm.parts : [];
    if (!parts.length && llm.question_text) {
      try {
        const split = await base44.integrations.Core.InvokeLLM({
          prompt: `חלק את הטקסט הבא לסעיפים (א/ב/ג/ד/ה) ללא דילוגים. החזר JSON בלבד: parts[{part_id, description, points, expected_answer_type}]\n\n${llm.question_text.slice(0, 8000)}`,
          response_json_schema: {
            type: 'object',
            properties: {
              parts: {
                type: 'array',
                items: { type: 'object', properties: { part_id: { type: 'string' }, description: { type: 'string' }, points: { type: 'number' }, expected_answer_type: { type: 'string' } } }
              }
            }
          }
        });
        parts = Array.isArray(split?.parts) ? split.parts : parts;
      } catch (_) {}
    }

    // Normalize order א-ת
    const heb = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י'];
    parts = parts.sort((a,b)=> heb.indexOf(a.part_id||'') - heb.indexOf(b.part_id||''));

    const analysis = {
      question_text: llm.question_text || '',
      primary_topic: llm.primary_topic || (Array.isArray(llm.topics) ? llm.topics[0] : ''),
      topics: Array.isArray(llm.topics) ? llm.topics : [],
      difficulty_level: llm.difficulty_level || 'medium',
      question_type: llm.question_type || 'open',
      parts: parts.map(p=>({ part_id: p.part_id || '', description: p.description || '', points: Number.isFinite(p.points) ? p.points : null, expected_answer_type: p.expected_answer_type || undefined })),
      diagram: {
        has_diagram: !!(llm.diagram?.has_diagram),
        type: llm.diagram?.type || undefined,
        description: llm.diagram?.description || undefined,
        histogram: llm.diagram?.histogram || undefined,
        graph: llm.diagram?.graph || undefined,
        geometry: llm.diagram?.geometry || undefined
      },
      meta: { subject, unit_level, module_id, source_url: sourceUrl }
    };

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('analyzeSingleQuestion error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});