import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Scan a single question image into structured data (parts + diagram)
// Input JSON: { image_url: string, subject?: string, unit_level?: number, module_id?: string }
// Output JSON: { success, question: { question_text, parts: [...], has_diagram, diagram: {...} } }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, subject = 'מתמטיקה', unit_level, module_id } = body || {};

    if (!image_url) {
      return Response.json({ error: 'image_url is required' }, { status: 400 });
    }

    // Pre-OCR to improve section detection
    const ocrRes = await base44.functions.invoke('advancedOCR', { imageUrl: image_url, enhanceQuality: true });
    const ocrText = ocrRes?.data?.formatted_text || ocrRes?.data?.ocr?.text_detected || '';
    const ocrSections = Array.isArray(ocrRes?.data?.detected_sections) ? ocrRes.data.detected_sections : [];

    // LLM extraction with OCR context
    const extractionPrompt = `
    אתה מנתח תמונת שאלה מבגרות ומחזיר מבנה נתונים מדויק בעברית.

    משימות:
    1) חילוץ טקסט השאלה המלא.
    2) זיהוי כל סעיפי המשנה (א, ב, ג, ד, ה...) ללא דילוגים; אם הניקוד לא מופיע – points=null.
    3) אם יש תרשים/גרף/היסטוגרמה/איור – החזר תיאור מפורט ושדות מבניים לשחזור המדויק.
    4) אל תמציא נתונים שלא קיימים; אם נתון חסר – השאר ריק.
    5) החזר JSON בלבד לפי הסכמה.

    טקסט מ-OCR לעזר בפילוח סעיפים:
    ${ (ocrText || '').slice(0, 4000) }

    הקשר (אם רלוונטי):
    - מקצוע: ${subject}
    - יחידות: ${unit_level ?? ''}
    - שאלון: ${module_id ?? ''}
    `;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: {
          question_text: { type: 'string' },
          topic: { type: 'string' },
          points: { type: 'integer' },
          parts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                part_id: { type: 'string' }, // א/ב/ג/ד/ה
                description: { type: 'string' },
                answer_type: { type: 'string' }, // number/fraction/text/mcq
                points: { type: 'integer' }
              }
            }
          },
          has_diagram: { type: 'boolean' },
          diagram: {
            type: 'object',
            properties: {
              type: { type: 'string' }, // histogram/graph/geometry/other
              axes: {
                type: 'object',
                properties: {
                  x_label: { type: 'string' },
                  y_label: { type: 'string' },
                  x_ticks: { type: 'array', items: { type: 'string' } },
                  y_ticks: { type: 'array', items: { type: 'string' } }
                }
              },
              histogram: {
                type: 'object',
                properties: {
                  bars: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        value: { type: 'number' }
                      }
                    }
                  }
                }
              },
              graph: {
                type: 'object',
                properties: {
                  functions: { type: 'array', items: { type: 'string' } },
                  key_points: {
                    type: 'array',
                    items: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, label: { type: 'string' } } }
                  }
                }
              },
              geometry: {
                type: 'object',
                properties: {
                  points: {
                    type: 'object',
                    additionalProperties: {
                      type: 'object',
                      properties: { x: { type: 'number' }, y: { type: 'number' }, label: { type: 'string' } }
                    }
                  },
                  lines: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string' } } } },
                  shapes: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, vertices: { type: 'array', items: { type: 'string' } } } } }
                }
              },
              notes: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    });

    // Normalize & fallback using OCR-detected sections
    let parts = Array.isArray(result.parts) ? result.parts : [];
    if (!parts.length && Array.isArray(ocrSections) && ocrSections.length) {
      parts = ocrSections.map((s, idx) => ({
        part_id: s.part_id || ['א','ב','ג','ד','ה','ו','ז'][idx] || String(idx + 1),
        description: s.heading || s.text || '',
        answer_type: 'text',
        points: Number.isFinite(s.points) ? s.points : null
      }));
    }

    const hebrewOrder = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'];
    const order = (id) => { const i = hebrewOrder.indexOf(id); return i >= 0 ? i : 999; };
    parts = parts
      .map(p => ({
        ...p,
        points: Number.isFinite(p.points) ? p.points : null
      }))
      .sort((a, b) => order(a.part_id) - order(b.part_id));

    return Response.json({
      success: true,
      question: {
        question_text: result.question_text || '',
        topic: result.topic || '',
        points: result.points || null,
        parts,
        has_diagram: !!result.has_diagram,
        diagram: result.diagram || null,
        meta: { subject, unit_level, module_id, image_url }
      }
    });
  } catch (error) {
    console.error('scanQuestionImage error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});