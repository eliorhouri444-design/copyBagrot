import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, subject, unitLevel, moduleId, examYear, examSeason } = await req.json();

        if (!fileUrl || !subject || unitLevel === undefined || !moduleId) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`📄 Scanning: ${subject} ${unitLevel}יח' ${moduleId}`);

        // 🔍 שלב 1: ניתוח ראשוני
        const initialAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: `נתח את מבחן הבגרות הזה.

**מטרה:** להבין את המבנה המלא של המבחן כולל איורים וציורים.

**מידע על המבחן:**
- מקצוע: ${subject}
- יחידות: ${unitLevel}
- שאלון: ${moduleId}

**דרישות ניתוח:**

1. **ספירה בסיסית:**
   - כמה דפים יש במסמך?
   - כמה שאלות סה"כ?
   - כמה נקודות סה"כ?

2. **זיהוי איורים:**
   - האם יש איורים גיאומטריים? (משולשים, מעגלים, וכו')
   - האם יש גרפים של פונקציות?
   - האם יש דיאגרמות? (של מערכות, ניסויים, וכו')

3. **רשימת שאלות:**
   לכל שאלה זהה:
   - מספר השאלה
   - הנושא (אלגברה, גיאומטריה, פונקציות וכו')
   - כמה נקודות
   - האם יש איור/שרטוט?
   - אם כן - תאר את האיור במדויק

החזר JSON.`,
            file_urls: [fileUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    total_pages: { type: "integer" },
                    total_questions: { type: "integer" },
                    total_points: { type: "integer" },
                    has_diagrams: { type: "boolean" },
                    questions_overview: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question_number: { type: "integer" },
                                topic: { type: "string" },
                                points: { type: "integer" },
                                has_diagram: { type: "boolean" },
                                diagram_description: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        console.log(`📊 Initial: ${initialAnalysis.total_questions} questions, ${initialAnalysis.total_pages} pages`);

        // 🔍 שלב 2: ניתוח מעמיק
        const detailedAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: `נתח בפירוט מלא את מבחן ${subject} ${unitLevel}יח' שאלון ${moduleId}.

**מידע ראשוני שזוהה:**
- ${initialAnalysis.total_questions} שאלות
- ${initialAnalysis.total_points} נקודות
- ${initialAnalysis.total_pages} דפים

**דרישות ניתוח מפורט:**

## 📋 מבנה כללי:
- משך זמן המבחן (בדקות)
- הוראות כלליות
- התפלגות נקודות

## 📚 ניתוח לכל שאלה:

לכל אחת מ-${initialAnalysis.total_questions} השאלות:

1. **מספר שאלה:** X
2. **נושא מדויק:** (לדוגמה: "פונקציה ריבועית - חקירה")
3. **תת-נושאים:** (למשל: ["גזירה", "קיצון", "גרף"])
4. **רמת קושי:** easy/medium/hard/expert
5. **סוג שאלה:** calculation/proof/open_question/multiple_choice
6. **נקודות:** X
7. **צפי זמן פתרון:** X דקות

8. **האם יש איור?** true/false
9. **אם יש איור - תאר במדויק:**
   - סוג: גיאומטרי/גרף פונקציה/דיאגרמה פיזיקלית/מבנה כימי/תא ביולוגי
   - תיאור מפורט של האיור:
     * נקודות (A, B, C...)
     * קווים (AB, BC...)
     * צורות (משולש, מעגל, ריבוע...)
     * תוויות וערכים (זוויות, אורכים...)
     * צירים (אם יש)

10. **דרגת חשיבות האיור:**
    - essential (חובה להבנת השאלה)
    - helpful (מסייע אבל לא הכרחי)
    - decorative (רק להמחשה)

## 📊 התפלגות נושאים:
סכם כמה שאלות מכל נושא (אלגברה, גיאומטריה וכו')

החזר JSON מפורט.`,
            file_urls: [fileUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    duration_minutes: { type: "integer" },
                    general_instructions: { type: "string" },
                    question_structure: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question_number: { type: "integer" },
                                topic: { type: "string" },
                                sub_topics: { type: "array" },
                                difficulty_level: { type: "string" },
                                question_type: { type: "string" },
                                points: { type: "integer" },
                                estimated_time: { type: "integer" },
                                has_diagram: { type: "boolean" },
                                diagram_details: {
                                    type: "object",
                                    properties: {
                                        diagram_type: { type: "string" },
                                        detailed_description: { type: "string" },
                                        points_list: { type: "array" },
                                        lines_list: { type: "array" },
                                        shapes_list: { type: "array" },
                                        labels_list: { type: "array" },
                                        axes_info: { type: "string" },
                                        importance: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    topic_distribution: { type: "object" },
                    difficulty_distribution: { type: "object" }
                }
            }
        });

        console.log(`✅ Detailed analysis complete`);

        // 📊 חישוב סטטיסטיקות
        const topicDist = {};
        const diffDist = { easy: 0, medium: 0, hard: 0, expert: 0 };

        detailedAnalysis.question_structure?.forEach(q => {
            const topic = q.topic || 'כללי';
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
            topicDist[topic].percentage = (topicDist[topic].points / initialAnalysis.total_points) * 100;
        });

        // 💾 שמירה
        const structureName = `${subject} ${unitLevel}יח' ${moduleId} - ${examYear} ${examSeason}`;

        const existing = await base44.asServiceRole.entities.ExamStructure.filter({
            subject: subject,
            unit_level: unitLevel,
            module_id: moduleId,
            exam_year: examYear,
            exam_season: examSeason
        });

        let savedStructure;

        if (existing.length > 0) {
            savedStructure = await base44.asServiceRole.entities.ExamStructure.update(existing[0].id, {
                structure_name: structureName,
                total_questions: initialAnalysis.total_questions,
                total_points: initialAnalysis.total_points,
                total_pages: initialAnalysis.total_pages,
                duration_minutes: detailedAnalysis.duration_minutes || 150,
                question_structure: detailedAnalysis.question_structure,
                topic_distribution: topicDist,
                difficulty_distribution: diffDist,
                source_file_url: fileUrl,
                is_active: true
            });
        } else {
            savedStructure = await base44.asServiceRole.entities.ExamStructure.create({
                subject: subject,
                unit_level: unitLevel,
                module_id: moduleId,
                exam_year: examYear,
                exam_season: examSeason,
                structure_name: structureName,
                total_questions: initialAnalysis.total_questions,
                total_points: initialAnalysis.total_points,
                total_pages: initialAnalysis.total_pages,
                duration_minutes: detailedAnalysis.duration_minutes || 150,
                question_structure: detailedAnalysis.question_structure,
                topic_distribution: topicDist,
                difficulty_distribution: diffDist,
                source_file_url: fileUrl,
                is_active: true,
                generated_exams_count: 0
            });
        }

        return Response.json({
            success: true,
            message: `✅ נסרק: ${initialAnalysis.total_questions} שאלות`,
            structure_id: savedStructure.id,
            analysis: {
                total_questions: initialAnalysis.total_questions,
                total_points: initialAnalysis.total_points,
                total_pages: initialAnalysis.total_pages,
                has_diagrams: initialAnalysis.has_diagrams,
                diagrams_count: detailedAnalysis.question_structure?.filter(q => q.has_diagram).length || 0
            }
        });

    } catch (error) {
        console.error('❌ Scan error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});