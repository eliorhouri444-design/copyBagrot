import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdf_url, subject, unit_level, module_id } = await req.json();

    console.log('📥 מוריד PDF מ:', pdf_url);
    
    // הורדת PDF
    const pdfResponse = await fetch(pdf_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('✅ PDF הורד בהצלחה, גודל:', pdfBuffer.byteLength, 'bytes');
    
    // שליחה ל-AI לניתוח מלא ישירות עם הבאפר
    console.log('🤖 שולח ל-AI לניתוח...');
    const analysisPrompt = `
אתה מומחה לניתוח מבחני בגרות. נתח את המבחן הבא בצורה מפורטת ביותר:

📋 **מידע בסיסי:**
- מקצוע: ${subject}
- רמה: ${unit_level} יחידות
- שאלון: ${module_id}

🎯 **דרישות הניתוח:**

1. **מבנה כללי:**
   - כמה חלקים יש במבחן?
   - כמה שאלות בכל חלק?
   - מה משך הבחינה?
   - מה חלוקת הנקודות?

2. **לכל שאלה:**
   - מס' השאלה
   - נושא/תת-נושא
   - סוג השאלה (אמריקאית, פתוחה, חיבור, הוכחה וכו')
   - רמת קושי (קל/בינוני/קשה)
   - נקודות
   - האם יש דיאגרמה/תרשים?
   - מבנה פנימי (סעיפים א', ב', ג' וכו')

3. **תבניות:**
   - איזה סוגי שאלות חוזרים?
   - מה המבנה הטיפוסי?
   - איזה נושאים מופיעים הכי הרבה?

4. **הנחיות:**
   - מה הכללים של המבחן?
   - איזה עזרים מותרים?
   - הוראות מיוחדות?

החזר JSON מפורט עם כל המידע הזה.
`;

    // Upload file for LLM analysis
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const file = new File([blob], 'exam.pdf', { type: 'application/pdf' });
    
    const structure = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: file,
      response_json_schema: {
        type: "object",
        properties: {
          exam_info: {
            type: "object",
            properties: {
              subject: { type: "string" },
              unit_level: { type: "integer" },
              module_id: { type: "string" },
              duration_minutes: { type: "integer" },
              total_points: { type: "integer" },
              year: { type: "integer" },
              season: { type: "string" }
            }
          },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section_number: { type: "integer" },
                section_name: { type: "string" },
                section_type: { type: "string" },
                points: { type: "integer" },
                question_range: { type: "string" },
                instructions: { type: "string" }
              }
            }
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                topic: { type: "string" },
                sub_topics: { type: "array", items: { type: "string" } },
                question_type: { type: "string" },
                difficulty_level: { type: "string" },
                points: { type: "integer" },
                has_diagram: { type: "boolean" },
                diagram_type: { type: "string" },
                parts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      part_id: { type: "string" },
                      points: { type: "integer" },
                      description: { type: "string" }
                    }
                  }
                },
                cognitive_level: { type: "string" }
              }
            }
          },
          patterns: {
            type: "object",
            properties: {
              common_question_types: { type: "array", items: { type: "string" } },
              topic_distribution: { type: "object" },
              difficulty_distribution: { type: "object" }
            }
          },
          instructions: {
            type: "object",
            properties: {
              general_rules: { type: "array", items: { type: "string" } },
              allowed_tools: { type: "array", items: { type: "string" } },
              special_notes: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // שמירה ב-ExamStructure
    const savedStructure = await base44.asServiceRole.entities.ExamStructure.create({
      subject: subject,
      unit_level: unit_level,
      module_id: module_id,
      exam_year: structure.exam_info?.year || new Date().getFullYear(),
      exam_season: structure.exam_info?.season || 'קיץ',
      structure_name: `${subject} ${unit_level} יח' - שאלון ${module_id}`,
      total_questions: structure.questions?.length || 0,
      total_points: structure.exam_info?.total_points || 100,
      duration_minutes: structure.exam_info?.duration_minutes || 90,
      sections: structure.sections || [],
      question_structure: structure.questions || [],
      topic_distribution: structure.patterns?.topic_distribution || {},
      difficulty_distribution: structure.patterns?.difficulty_distribution || {},
      source_file_url: pdf_url,
      is_active: true,
      metadata: {
        scanned_by: user.email,
        scan_date: new Date().toISOString(),
        patterns: structure.patterns,
        instructions: structure.instructions
      }
    });

    return Response.json({
      success: true,
      structure_id: savedStructure.id,
      structure: structure,
      message: 'מבנה המבחן נותח ונשמר בהצלחה'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});