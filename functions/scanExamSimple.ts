import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            console.error('❌ Unauthorized');
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, subject, unitLevel, moduleId, examYear, examSeason } = await req.json();

        if (!fileUrl || !subject || !moduleId) {
            console.error('❌ Missing fields:', { fileUrl, subject, moduleId });
            return Response.json({ 
                success: false,
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        console.log(`📊 Starting scan: ${subject} ${unitLevel}יח' ${moduleId}`);
        console.log(`📄 File: ${fileUrl}`);

        // פרומפט בהתאם למקצוע
        let subjectPrompt = '';
        
        if (subject === 'אנגלית') {
            subjectPrompt = `**ENGLISH EXAM - CRITICAL INSTRUCTIONS:**
- This is an ENGLISH matriculation exam
- ALL question text MUST be extracted in English (exactly as written)
- ALL answer options MUST be in English
- ALL section names in English (PART I, WRITTEN RECEPTION, etc.)
- Identify reading passages and extract them FULLY in English
- Writing section prompts must be in English
- **ABSOLUTELY NO TRANSLATION TO HEBREW**
- Extract EXACTLY as written in the original exam`;
        } else if (subject === 'מתמטיקה') {
            subjectPrompt = `**מבחן מתמטיקה** - שים לב:
- שאלות חישוב עם נוסחאות
- שאלות הוכחה
- זהה איורים גאומטריים, גרפים
- סוגי שאלות: calculation, proof, open_question`;
        } else if (subject === 'פיזיקה') {
            subjectPrompt = `**מבחן פיזיקה** - שים לב:
- שאלות חישוב פיזיקליות
- זהה דיאגרמות, גרפים, תרשימים
- נושאים: מכניקה, חשמל, אופטיקה
- נוסחאות ואיורים רבים`;
        } else if (subject === 'היסטוריה') {
            subjectPrompt = `**מבחן היסטוריה** - שים לב:
- טקסטים היסטוריים, מסמכים
- שאלות הבנה והסקה
- שאלות על תקופות, אישים, אירועים
- חלק כתיבה/מסה`;
        } else if (subject === 'ספרות') {
            subjectPrompt = `**מבחן ספרות** - שים לב:
- קטעים מיצירות ספרותיות
- שאלות על עלילה, דמויות, נושאים
- שאלות הבנה וניתוח
- חלק כתיבה/מסה`;
        } else if (subject === 'גאוגרפיה') {
            subjectPrompt = `**מבחן גאוגרפיה** - שים לב:
- מפות, טבלאות, גרפים
- שאלות על מקומות, אזורים
- שאלות ניתוח נתונים
- נושאים: אקלים, אוכלוסייה, כלכלה`;
        } else if (subject === 'כימיה') {
            subjectPrompt = `**מבחן כימיה** - שים לב:
- נוסחאות כימיות, תגובות
- איורים של מולקולות, תרכובות
- שאלות חישוב והוכחה
- נושאים: אורגנית, אנאורגנית`;
        } else if (subject === 'ביולוגיה') {
            subjectPrompt = `**מבחן ביולוגיה** - שים לב:
- איורים ביולוגיים (תאים, איברים)
- שאלות על מערכות הגוף
- תהליכים ביולוגיים
- נושאים: תא, פיזיולוגיה, גנטיקה`;
        } else {
            subjectPrompt = `**מבחן ${subject}**`;
        }

        console.log('🤖 Calling LLM for analysis...');
        
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `אתה מנתח מבחני בגרות ישראליים ברמה מקצועית.

**המבחן:**
- מקצוע: ${subject}
- רמה: ${unitLevel === 0 ? 'ללא רמות' : unitLevel + ' יחידות'}
- שאלון/מודול: ${moduleId}
- שנה: ${examYear || 'לא ידוע'}
- מועד: ${examSeason || 'לא ידוע'}

${subjectPrompt}

**Your Task:**
Analyze and extract with PERFECT accuracy:

### 1️⃣ General Info:
- Total questions count
- Total points
- Duration (in minutes)
- Total pages

### 2️⃣ Section Structure:
If divided into sections (Part A, Part B, Reading, Writing, etc.):
- Section number
- Section name (KEEP IN ORIGINAL LANGUAGE)
- Points per section
- Question range (1-3, 4-7, etc.)

### 3️⃣ Question Structure:
For EVERY question:
- question_number: the actual number
- topic: main topic area
- sub_topics: array of subtopics
- difficulty_level: easy/medium/hard
- question_type: type of question
- points: points value
- **question_text: Copy EXACTLY as written in ORIGINAL LANGUAGE (English for English exams!)**
- options: if multiple choice, ALL options in ORIGINAL LANGUAGE
- has_diagram: true/false
- diagram_description: if diagram exists, describe in detail

### 4️⃣ התפלגות נושאים:
עבור כל נושא שמופיע:
- שם הנושא
- כמה שאלות
- סך נקודות

### 5️⃣ תוכן מיוחד למקצוע:
${subject === 'אנגלית' ? '- זהה וחלץ טקסטים/סיפורים לקריאה (תוכן מלא)\n- זהה שאלות כתיבה' : ''}
${subject === 'מתמטיקה' ? '- זהה נוסחאות, איורים גאומטריים' : ''}
${subject === 'היסטוריה' || subject === 'ספרות' ? '- זהה טקסטים, קטעים, מסמכים (תוכן מלא)' : ''}

**CRITICAL RULES - NO EXCEPTIONS:**
- Be precise with numbers - count every question and point
- Identify all topics correctly
- **For ENGLISH exams: Extract questions EXACTLY in English - DO NOT TRANSLATE TO HEBREW**
- **For OTHER subjects: Extract in Hebrew as written**
- Extract full content (stories, passages) in ORIGINAL language
- For multiple choice: extract ALL options in ORIGINAL language
- Section names: KEEP in original language (e.g., "PART I: WRITTEN RECEPTION")

החזר JSON מובנה.`,
            file_urls: [fileUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    total_questions: { type: "integer" },
                    total_points: { type: "integer" },
                    duration_minutes: { type: "integer" },
                    total_pages: { type: "integer" },
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
                                topic: { type: "string" },
                                sub_topics: { type: "array", items: { type: "string" } },
                                difficulty_level: { type: "string" },
                                question_type: { type: "string" },
                                points: { type: "integer" },
                                question_text: { type: "string" },
                                has_diagram: { type: "boolean" },
                                diagram_description: { type: "string" },
                                has_text: { type: "boolean" },
                                text_content: { type: "string" }
                            }
                        }
                    },
                    topic_distribution: {
                        type: "object",
                        additionalProperties: {
                            type: "object",
                            properties: {
                                count: { type: "integer" },
                                points: { type: "integer" }
                            }
                        }
                    },
                    special_content: {
                        type: "object",
                        properties: {
                            reading_texts: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        content: { type: "string" },
                                        related_questions: { type: "array", items: { type: "integer" } }
                                    }
                                }
                            },
                            writing_prompts: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        console.log(`✅ LLM analysis complete:`, {
            questions: result.total_questions,
            points: result.total_points,
            pages: result.total_pages,
            sections: result.sections?.length || 0,
            special_content: !!result.special_content
        });

        // שמירה למסד נתונים
        const structureName = `${subject} ${unitLevel}יח' שאלון ${moduleId} - ${examYear} ${examSeason}`;
        
        console.log('💾 Saving to database...');

        // בדיקה אם קיים
        const existing = await base44.asServiceRole.entities.ExamStructure.filter({
            subject: subject,
            unit_level: unitLevel,
            module_id: moduleId,
            exam_year: examYear,
            exam_season: examSeason
        });

        let saved;
        if (existing.length > 0) {
            console.log(`📝 Updating existing structure: ${existing[0].id}`);
            saved = await base44.asServiceRole.entities.ExamStructure.update(existing[0].id, {
                structure_name: structureName,
                total_questions: result.total_questions,
                total_points: result.total_points,
                duration_minutes: result.duration_minutes,
                total_pages: result.total_pages,
                sections: result.sections,
                question_structure: result.question_structure,
                topic_distribution: result.topic_distribution,
                special_content: result.special_content,
                source_file_url: fileUrl,
                is_active: true,
                metadata: {
                    scanned_by: user.email,
                    scan_date: new Date().toISOString(),
                    last_updated: new Date().toISOString()
                }
            });
        } else {
            console.log('✨ Creating new structure');
            saved = await base44.asServiceRole.entities.ExamStructure.create({
                subject: subject,
                unit_level: unitLevel,
                module_id: moduleId,
                exam_year: examYear,
                exam_season: examSeason,
                structure_name: structureName,
                total_questions: result.total_questions,
                total_points: result.total_points,
                duration_minutes: result.duration_minutes,
                total_pages: result.total_pages,
                sections: result.sections,
                question_structure: result.question_structure,
                topic_distribution: result.topic_distribution,
                special_content: result.special_content,
                source_file_url: fileUrl,
                is_active: true,
                generated_exams_count: 0,
                metadata: {
                    scanned_by: user.email,
                    scan_date: new Date().toISOString()
                }
            });
        }

        console.log(`✅ Saved successfully! ID: ${saved.id}`);

        const message = `✅ נסרק: ${result.total_pages || '?'} דפים, ${result.total_questions} שאלות, ${result.total_points} נקודות`;

        return Response.json({
            success: true,
            message: message,
            structure: {
                id: saved.id,
                structure_name: saved.structure_name,
                total_questions: saved.total_questions,
                total_points: saved.total_points,
                total_pages: saved.total_pages
            },
            analysis: result
        });

    } catch (error) {
        console.error('❌ Scan Error:', error);
        console.error('Stack:', error.stack);
        
        return Response.json({
            success: false,
            error: error.message || 'שגיאה לא ידועה בסריקה'
        }, { status: 500 });
    }
});