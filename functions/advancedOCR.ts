import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔍 Advanced Math OCR - חלופה ל-Mathpix
 * משתמש ב-OpenAI Vision GPT-4o לזיהוי נוסחאות מתמטיות
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, enhanceQuality = true } = body;

    if (!imageUrl) {
      return Response.json({
        success: false,
        error: 'Image URL is required'
      }, { status: 400 });
    }

    console.log("🔍 Advanced OCR - Processing:", imageUrl);

    // ✅ שלב 1: OCR מתקדם עם הדגשה על כתב יד בעברית + מבנה סעיפים
    const ocrPrompt = `אתה מנוע OCR מתקדם לכתב יד בעברית עם תמיכה מלאה בנוסחאות מתמטיות, תרשימים וקשרים לוגיים.

נתון: תמונה של שאלה/פתרון בכתב יד.

מטרות:
1) חילוץ טקסט מלא ומדויק (עברית/אנגלית/מספרים/סימנים מיוחדים) בסדר הגיוני מימין לשמאל.
2) זיהוי נוסחאות מתמטיות והמרתן ל-LaTeX מדויק כולל אינדקסים/שורשים/שברים/אינטגרלים/וקטורים/מטריצות.
3) זיהוי מבנה סעיפים (א, ב, ג, ד, ה...) ללא דילוגים, כולל כותרת/תיאור קצר לכל סעיף וניסיון לחלץ תשובה סופית אם יש.
4) זיהוי תרשימים/גרפים/היסטוגרמות/איורים גיאומטריים וייצוגם במבנה נתונים מפורט לשחזור.
5) הפקת קשרים לוגיים בין משפטים/שלבים ("נתון"→"נדרש"→"לכן"→"מכאן").
6) זיהוי סמלים מיוחדים (≥ ≤ ≠ ∠ ∘ ⊥ ∥ Σ Π √ ־ → ↦ …) והחזרתם כטקסט/LaTeX.

${enhanceQuality ? `
🎯 דיוק גבוה:
- אל תחסיר סעיפים; אם משוער שחסר, סמן missing_suspected=true והערה.
- שמור על RTL בטקסט והימנע מערבוב סדר אותיות.
- אשר כל LaTeX פעמיים והימנע משגיאות תחביר.
` : ''}

דוגמאות LaTeX:
- \frac{a}{b}, \sqrt{x}, x^{2}, \int_{a}^{b} f(x)\,dx, \sum_{i=1}^{n} x_i, \vec{v},
  \begin{bmatrix} a & b \\ c & d \end{bmatrix}

החזר JSON בלבד עם השדות הבאים.`;

    const ocrResult = await base44.integrations.Core.InvokeLLM({
      prompt: ocrPrompt,
      file_urls: [imageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          text_detected: { type: "string" },
          latex_formulas: { type: "array", items: { type: "string" } },
          special_symbols: { type: "array", items: { type: "string" } },
          detected_sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                part_id: { type: "string" },
                heading: { type: "string" },
                text: { type: "string" },
                final_answer: { type: "string" },
                points: { type: "number" }
              }
            }
          },
          answers_by_part: {
            type: "array",
            items: {
              type: "object",
              properties: {
                part_id: { type: "string" },
                answer_text: { type: "string" },
                final_answer: { type: "string" }
              }
            }
          },
          histogram_detected: {
            type: "object",
            properties: {
              has_histogram: { type: "boolean" },
              x_label: { type: "string" },
              y_label: { type: "string" },
              bars: {
                type: "array",
                items: { type: "object", properties: { label: { type: "string" }, value: { type: "number" } } }
              }
            }
          },
          geometry_detected: {
            type: "object",
            properties: {
              has_geometry: { type: "boolean" },
              points: { type: "object", additionalProperties: { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, label: { type: "string" } } } },
              lines: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, label: { type: "string" } } } },
              shapes: { type: "array", items: { type: "object", properties: { type: { type: "string" }, points: { type: "array", items: { type: "string" } }, radius: { type: "number" } } } }
            }
          },
          graph_detected: {
            type: "object",
            properties: {
              has_graph: { type: "boolean" },
              x_axis_label: { type: "string" },
              y_axis_label: { type: "string" },
              points: { type: "array", items: { type: "object", properties: { x: { type: "number" }, y: { type: "number" } } } },
              function_equation: { type: "string" }
            }
          },
          logic_graph: {
            type: "object",
            properties: {
              nodes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } } } },
              edges: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, label: { type: "string" } } } }
            }
          },
          confidence: { type: "number" },
          detected_language: { type: "string" },
          problem_type: { type: "string" },
          missing_suspected: { type: "boolean" },
          coverage_notes: { type: "string" }
        }
      }
    });

    // 🧩 Post-process: זיהוי וחיזוק מבנה סעיפים (כולל לא מסומנים/מעורבים)
              let sections = Array.isArray(ocrResult.detected_sections) ? ocrResult.detected_sections : [];

              // Helper: heuristic splitter for mixed markers: א., א), (א), 1., 1), (1), ב(1), bullets
              const heuristicSplit = (textRaw) => {
                const text = String(textRaw || '').replace(/\r/g, '');
                const lines = text.split(/\n+/);
                const markers = [];
                const pushMarker = (idx, id, title) => markers.push({ idx, id, title: title || '' });

                const letterRe = /^\s*([א-ת])\s*[).:】】】】\.]\s+/;
                const letterParenRe = /^\s*\(\s*([א-ת])\s*\)\s+/;
                const numRe = /^\s*(\d{1,2})\s*[).:】】】】\.]\s+/;
                const numParenRe = /^\s*\(\s*(\d{1,2})\s*\)\s+/;
                const nestedRe = /^\s*([א-ת])\s*\(\s*(\d{1,2})\s*\)\s+/; // ב(1)
                const bulletRe = /^\s*[•\-*–]\s+/;

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  let m;
                  if ((m = nestedRe.exec(line))) { pushMarker(i, `${m[1]}(${m[2]})`, line.replace(nestedRe, '').trim()); continue; }
                  if ((m = letterRe.exec(line))) { pushMarker(i, m[1], line.replace(letterRe, '').trim()); continue; }
                  if ((m = letterParenRe.exec(line))) { pushMarker(i, m[1], line.replace(letterParenRe, '').trim()); continue; }
                  if ((m = numRe.exec(line))) { pushMarker(i, `${m[1]}`, line.replace(numRe, '').trim()); continue; }
                  if ((m = numParenRe.exec(line))) { pushMarker(i, `${m[1]}`, line.replace(numParenRe, '').trim()); continue; }
                  if (bulletRe.test(line)) { pushMarker(i, `•${markers.length + 1}`, line.replace(bulletRe, '').trim()); continue; }
                }

                // If no explicit markers but multi-demand text, split by verbs
                if (!markers.length) {
                  const demandSplit = text.split(/(?=\b(מצא|חשב|הוכח|הסבר|קבע|פרק|גזור|חשב|פתור)\b)/);
                  if (demandSplit.length > 1) {
                    let letterIdx = 0; const letters = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
                    let pos = 0; const chunks = [];
                    for (const chunk of demandSplit) {
                      const start = text.indexOf(chunk, pos); pos = start + chunk.length;
                      chunks.push({ start, text: chunk.trim() });
                    }
                    chunks.sort((a,b) => a.start - b.start);
                    return chunks.map((c, i) => ({
                      part_id: letters[letterIdx + i] || `${i+1}`,
                      heading: '',
                      text: c.text,
                      final_answer: '',
                      points: null
                    }));
                  }
                  return [];
                }

                // Build sections by slicing between markers
                const out = [];
                for (let i = 0; i < markers.length; i++) {
                  const cur = markers[i];
                  const endIdx = i < markers.length - 1 ? markers[i + 1].idx : lines.length;
                  const body = lines.slice(cur.idx, endIdx).join('\n');
                  const cleaned = body
                    .replace(nestedRe, '')
                    .replace(letterRe, '')
                    .replace(letterParenRe, '')
                    .replace(numRe, '')
                    .replace(numParenRe, '')
                    .replace(bulletRe, '')
                    .trim();
                  out.push({ part_id: cur.id, heading: cur.title, text: cleaned, final_answer: '', points: null });
                }
                return out;
              };

              // Heuristic enhancement: if sections missing or too few, try to split from OCR text
              let heuristicsUsed = false;
              if (!sections.length || sections.length < 2) {
                const heur = heuristicSplit(ocrResult.text_detected);
                if (heur.length) {
                  // Merge with existing (prefer longer text per part_id)
                  const byId = new Map();
                  for (const s of (sections || [])) {
                    byId.set(s.part_id || s.section_id || s.id || 'א', s);
                  }
                  for (const h of heur) {
                    const id = h.part_id || 'א';
                    const prev = byId.get(id);
                    if (!prev || String(h.text || '').length > String(prev.text || prev.content || '').length) {
                      byId.set(id, h);
                    }
                  }
                  sections = Array.from(byId.values());
                  heuristicsUsed = true;
                }
              }

              // LLM fallback as secondary pass if still nothing
              try {
                if (!sections.length) {
                  const sec = await base44.integrations.Core.InvokeLLM({
                    prompt: `חלק את הטקסט הבא לסעיפים (כולל תת-סעיפים כמו ב(1), ב(2)) ללא דילוגים. הכרה גם בסימונים 1), (1), 1., ובתבליטים. החזר JSON בלבד עם [{part_id, heading, text, final_answer, points}].\n\n${(ocrResult.text_detected||'').slice(0,8000)}`,
                    response_json_schema: {
                      type: 'object',
                      properties: {
                        sections: {
                          type: 'array',
                          items: { type: 'object', properties: { part_id: { type: 'string' }, heading: { type: 'string' }, text: { type: 'string' }, final_answer: { type: 'string' }, points: { type: 'number' } } }
                        }
                      }
                    }
                  });
                  if (Array.isArray(sec?.sections) && sec.sections.length) {
                    sections = sec.sections;
                  }
                }
              } catch (_) {}

              // Normalize part_ids and trim
              sections = (sections || []).map((s, idx) => ({
                part_id: String(s.part_id || s.section_id || s.id || '').trim() || ['א','ב','ג','ד','ה','ו','ז','ח'][idx] || String(idx+1),
                heading: String(s.heading || '').trim(),
                text: String(s.text || s.content || '').trim(),
                final_answer: String(s.final_answer || '').trim(),
                points: Number.isFinite(s.points) ? s.points : null
              }));

              // Attach back
              ocrResult.detected_sections = sections;
    console.log("✅ OCR Result:", {
      confidence: ocrResult.confidence,
      language: ocrResult.detected_language,
      type: ocrResult.problem_type,
      formulas: ocrResult.latex_formulas?.length || 0
    });

    return Response.json({
      success: true,
      ocr: ocrResult,
      formatted_text: ocrResult.text_detected,
      latex: ocrResult.latex_formulas,
      special_symbols: ocrResult.special_symbols || [],
      detected_sections: sections.length ? sections : (ocrResult.detected_sections || []),
      answers_by_part: ocrResult.answers_by_part || [],
      histogram: ocrResult.histogram_detected || null,
      has_geometry: ocrResult.geometry_detected?.has_geometry || false,
      has_graph: ocrResult.graph_detected?.has_graph || false,
      logic_graph: ocrResult.logic_graph || null,
      metadata: {
                    confidence: ocrResult.confidence,
                    language: ocrResult.detected_language,
                    problem_type: ocrResult.problem_type,
                    processing_engine: 'OpenAI GPT-4o Vision',
                    alternative_to: 'Mathpix OCR',
                    missing_suspected: !!ocrResult.missing_suspected,
                    coverage_notes: ocrResult.coverage_notes || '',
                    structure_confidence: (Array.isArray(sections) ? (sections.length >= 3 ? 0.9 : (sections.length === 2 ? 0.7 : (sections.length === 1 ? 0.4 : 0))) : 0)
                  }
    });

  } catch (error) {
    console.error("❌ Advanced OCR Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});