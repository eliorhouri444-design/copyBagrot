import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎓 מחולל תוכן לפי תוכנית לימודים - משרד החינוך
 */

Deno.serve(async (req) => {
  console.log("🎓 GENERATING FROM CURRICULUM");
  
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Admin access required' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { 
      subject,
      gradeLevel,
      unitLevel,
      questionsPerSubtopic = 3,
      includeVisuals = true
    } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    console.log(`📚 Generating for: ${subject} - Grade ${gradeLevel} - ${unitLevel} units`);

    // **שלב 1: טעינת תוכנית הלימודים**
    const curriculums = await base44.asServiceRole.entities.Curriculum.filter({
      subject: subject,
      grade_level: gradeLevel,
      unit_level: unitLevel,
      is_active: true
    });

    if (curriculums.length === 0) {
      throw new Error(`לא נמצאה תוכנית לימודים עבור ${subject}, כיתה ${gradeLevel}, ${unitLevel} יחידות`);
    }

    const curriculum = curriculums[0];
    const totalGenerated = {
      questions: 0,
      diagrams: 0,
      topics: 0,
      subtopics: 0
    };

    // **שלב 2: מעבר על כל נושא ותת-נושא**
    for (const mainTopic of curriculum.main_topics) {
      console.log(`\n📖 Topic: ${mainTopic.topic_name}`);
      totalGenerated.topics++;

      for (const subtopic of mainTopic.subtopics) {
        console.log(`  🎯 Subtopic: ${subtopic.name}`);
        totalGenerated.subtopics++;

        // **שלב 3: יצירת שאלות לפי סוגים שונים**
        const questionTypes = subtopic.question_types || ["multiple_choice", "calculation", "open_question"];

        for (const qType of questionTypes) {
          for (let i = 0; i < questionsPerSubtopic; i++) {
            try {
              const generatePrompt = `אתה מומחה ב${subject} ויוצר שאלות לפי תוכנית הלימודים של משרד החינוך.

**מידע כללי:**
- מקצוע: ${subject}
- כיתה: ${gradeLevel}
- יחידות: ${unitLevel}
- נושא ראשי: ${mainTopic.topic_name}
- תת-נושא: ${subtopic.name}
- סוג שאלה: ${qType}

**יעדי למידה:**
${subtopic.learning_objectives?.join('\n- ') || 'אין'}

**מושגי מפתח:**
${subtopic.key_concepts?.join(', ') || 'אין'}

**צור שאלה מקצועית ברמת בגרות:**
1. השאלה צריכה להיות ברמת ${unitLevel} יחידות
2. מותאמת לכיתה ${gradeLevel}
3. בשפה ברורה ומתאימה לנוער
4. עם פתרון מפורט שלב-אחר-שלב
5. ${subtopic.visual_needs !== 'none' ? `כולל ${subtopic.visual_needs} מדויק` : 'ללא ויזואליזציה'}
6. תשובה סופית תקנית

**פורמט התשובה:**
החזר JSON:
{
  "question_text": "נוסח השאלה בעברית",
  "question_type": "${qType}",
  "difficulty": "easy/medium/hard",
  ${qType === 'multiple_choice' ? `"options": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"],
  "correct_option": "תשובה 2",` : ''}
  "solution_steps": [
    {
      "step_number": 1,
      "description": "הסבר השלב",
      "calculation": "חישוב אם יש",
      "latex": "נוסחה ב-LaTeX אם יש"
    }
  ],
  "final_answer": "התשובה הסופית",
  "explanation": "הסבר התשובה",
  ${subtopic.visual_needs === 'diagram' || subtopic.visual_needs === 'graph' ? `"diagram_data": {
    "type": "${subtopic.visual_needs}",
    "points": {"A": {"x": 0, "y": 0}, "B": {"x": 3, "y": 4}},
    "lines": [{"from": "A", "to": "B"}],
    "description": "תיאור האיור"
  },` : ''}
  ${subtopic.visual_needs === 'graph' ? `"graph_data": {
    "title": "...",
    "formula": "f(x) = ...",
    "points": [{"x": 0, "y": 0}],
    "chartType": "line"
  },` : ''}
  "tags": ["${mainTopic.topic_name}", "${subtopic.name}"],
  "learning_objective": "יעד למידה שהושג"
}`;

              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${OPENAI_KEY}`
                },
                body: JSON.stringify({
                  model: "gpt-4o",
                  messages: [
                    { 
                      role: "system", 
                      content: `אתה מומחה חינוכי ב${subject} ויוצר שאלות מקצועיות לפי תוכנית לימודים של משרד החינוך. השפה שלך ברורה, מתאימה לנוער, ומדויקת.` 
                    },
                    { role: "user", content: generatePrompt }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.7
                })
              });

              const data = await response.json();
              const questionData = JSON.parse(data.choices[0].message.content);

              // Hash לזיהוי כפילויות
              const hash = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(questionData.question_text)
              );
              const hashHex = Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

              // יצירת איור אם נדרש
              let diagramImageUrl = null;
              
              if (includeVisuals && questionData.diagram_data && subtopic.visual_needs !== 'none') {
                try {
                  const imageResult = await base44.asServiceRole.functions.invoke('generateAdvancedDiagram', {
                    diagramType: questionData.diagram_data.type || subtopic.visual_needs,
                    points: questionData.diagram_data.points || {},
                    lines: questionData.diagram_data.lines || [],
                    shapes: questionData.diagram_data.shapes || [],
                    question: questionData.question_text
                  });

                  if (imageResult.data?.success) {
                    diagramImageUrl = imageResult.data.image_url;
                    console.log(`      🎨 Diagram generated`);
                  }
                } catch (imgError) {
                  console.warn(`      ⚠️ Failed to generate diagram:`, imgError.message);
                }
              }

              // שמירה במאגר
              await base44.asServiceRole.entities.SolvedQuestion.create({
                question_text: questionData.question_text,
                subject: subject,
                topic: mainTopic.topic_name,
                subtopics: [subtopic.name],
                units: unitLevel,
                difficulty: questionData.difficulty,
                solution_steps: questionData.solution_steps,
                final_answer: questionData.final_answer,
                diagrams: diagramImageUrl ? [{
                  type: questionData.diagram_data?.type || subtopic.visual_needs,
                  data: questionData.diagram_data,
                  generated_image_url: diagramImageUrl
                }] : [],
                graph_data: questionData.graph_data,
                tags: [...(questionData.tags || []), `grade_${gradeLevel}`, `${unitLevel}_units`, qType],
                question_hash: hashHex,
                source: 'ai_generated',
                verified: false,
                times_used: 0,
                metadata: {
                  curriculum_based: true,
                  grade_level: gradeLevel,
                  question_type: qType,
                  learning_objective: questionData.learning_objective,
                  options: questionData.options,
                  correct_option: questionData.correct_option
                }
              });

              totalGenerated.questions++;
              if (diagramImageUrl) totalGenerated.diagrams++;

              console.log(`      ✅ Generated ${qType} question ${i + 1}/${questionsPerSubtopic}`);
              
              // Delay
              await new Promise(resolve => setTimeout(resolve, 1500));
              
            } catch (qError) {
              console.error(`      ❌ Failed:`, qError.message);
            }
          }
        }

        // **שלב 4: יצירת דפוס לנושא**
        try {
          const existing = await base44.asServiceRole.entities.QuestionPattern.filter({
            subject: subject,
            topic: mainTopic.topic_name
          });

          if (existing.length === 0) {
            await base44.asServiceRole.entities.QuestionPattern.create({
              pattern_name: `${subject} - ${mainTopic.topic_name}`,
              subject: subject,
              topic: mainTopic.topic_name,
              pattern_keywords: subtopic.key_concepts || [mainTopic.topic_name],
              question_structure: `שאלות בנושא ${mainTopic.topic_name} - ${mainTopic.topic_description}`,
              common_mistakes: [],
              solution_template: `פתרון כללי לשאלות ב${mainTopic.topic_name}`,
              diagram_requirements: {
                requires_diagram: subtopic.visual_needs !== 'none',
                diagram_type: subtopic.visual_needs,
                key_elements: subtopic.key_concepts || []
              },
              priority: mainTopic.importance === 'high' ? 0.9 : mainTopic.importance === 'medium' ? 0.6 : 0.3,
              times_matched: 0
            });
            
            console.log(`  ✅ Pattern created for ${mainTopic.topic_name}`);
          }
        } catch (patternError) {
          console.error(`  ⚠️ Pattern creation failed:`, patternError.message);
        }

        // Delay בין topics
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return Response.json({
      success: true,
      message: `✅ נוצרו ${totalGenerated.questions} שאלות מ-${totalGenerated.topics} נושאים (${totalGenerated.subtopics} תתי-נושאים)`,
      stats: totalGenerated,
      curriculum_used: {
        subject: curriculum.subject,
        grade: curriculum.grade_level,
        units: curriculum.unit_level
      }
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});