import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🏗️ מחולל בנק ידע אוטומטי - יוצר שאלות ופתרונות לכל המקצועות
 */

Deno.serve(async (req) => {
  console.log("🏗️ GENERATING KNOWLEDGE BASE");
  
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
      subjects = [],
      questionsPerTopic = 5,
      includeImages = true,
      units = [3, 4, 5]
    } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    
    const totalGenerated = {
      questions: 0,
      diagrams: 0,
      patterns: 0
    };

    // **נושאים לפי מקצוע**
    const topicsBySubject = {
      "מתמטיקה": [
        { name: "אלגברה", subtopics: ["משוואות ריבועיות", "מערכות משוואות", "פולינומים", "אי-שוויונות"] },
        { name: "גיאומטריה", subtopics: ["משולשים", "מרבעים", "מעגלים", "יחסי קטעים", "דמיון וחפיפה"] },
        { name: "טריגונומטריה", subtopics: ["זהויות טריגונומטריות", "משולש ישר-זווית", "מעגל היחידה"] },
        { name: "פונקציות", subtopics: ["פונקציה לינארית", "פונקציה ריבועית", "פונקציה מעריכית", "פונקציה לוגריתמית"] },
        { name: "נגזרות", subtopics: ["כללי גזירה", "נקודות קיצון", "משיקים", "שיעורי שינוי"] },
        { name: "אינטגרלים", subtopics: ["אינטגרל מסוים", "שטחים", "נפחים"] },
        { name: "וקטורים", subtopics: ["חיבור וקטורים", "מכפלה סקלרית", "מכפלה וקטורית"] },
        { name: "הסתברות", subtopics: ["מאורעות", "הסתברות מותנית", "משתנה מקרי"] }
      ],
      "פיזיקה": [
        { name: "מכניקה", subtopics: ["תנועה", "כוחות", "אנרגיה", "תנע", "תנועה מעגלית"] },
        { name: "חשמל", subtopics: ["חוק אוהם", "מעגלים חשמליים", "קבלים", "השראה"] },
        { name: "אופטיקה", subtopics: ["שבירה", "השתקפות", "עדשות", "מראות"] },
        { name: "גלים", subtopics: ["גל מכני", "גל אלקטרומגנטי", "התאבכות", "דופלר"] },
        { name: "קוונטים", subtopics: ["אפקט פוטואלקטרי", "אטום בוהר", "גלי חומר"] }
      ],
      "ביולוגיה": [
        { name: "תא", subtopics: ["מבנה התא", "חלבונים", "DNA", "חלוקת תא"] },
        { name: "גנטיקה", subtopics: ["תורשה מנדלית", "מוטציות", "הנדסה גנטית"] },
        { name: "אבולוציה", subtopics: ["ברירה טבעית", "הסתגלות", "מינים"] },
        { name: "אקולוגיה", subtopics: ["מחזורי חומר", "אוכלוסיות", "מערכות אקולוגיות"] },
        { name: "פיזיולוגיה", subtopics: ["מערכת העצבים", "מערכת הנשימה", "מערכת העיכול"] }
      ],
      "אנגלית": [
        { name: "Grammar", subtopics: ["Tenses", "Conditionals", "Passive Voice", "Reported Speech"] },
        { name: "Vocabulary", subtopics: ["Idioms", "Phrasal Verbs", "Academic Words"] },
        { name: "Reading Comprehension", subtopics: ["Main Idea", "Inference", "Vocabulary in Context"] },
        { name: "Writing", subtopics: ["Essay Structure", "Argumentative", "Descriptive"] }
      ],
      "כימיה": [
        { name: "כימיה כללית", subtopics: ["מבנה אטום", "קשרים כימיים", "טבלה מחזורית"] },
        { name: "כימיה אורגנית", subtopics: ["פחמימות", "חומצות קרבוקסיליות", "אלכוהולים"] },
        { name: "סטויכיומטריה", subtopics: ["מולים", "משוואות", "ריכוזים"] },
        { name: "תרמוכימיה", subtopics: ["אנתלפיה", "אנטרופיה", "אנרגיית גיבס"] }
      ],
      "היסטוריה": [
        { name: "מלחמת העולם הראשונה", subtopics: ["סיבות", "מהלך", "תוצאות"] },
        { name: "מלחמת העולם השנייה", subtopics: ["עליית הנאציזם", "שואה", "מלחמה קרה"] },
        { name: "היסטוריה של ישראל", subtopics: ["ציונות", "הקמת המדינה", "מלחמות"] }
      ]
    };

    for (const subject of subjects) {
      console.log(`\n📚 Generating for subject: ${subject}`);
      
      const topics = topicsBySubject[subject] || [];
      
      for (const topic of topics) {
        console.log(`  📖 Topic: ${topic.name}`);
        
        for (const subtopic of topic.subtopics) {
          console.log(`    🎯 Subtopic: ${subtopic}`);
          
          // **יצירת שאלות**
          for (let i = 0; i < questionsPerTopic; i++) {
            try {
              const generatePrompt = `אתה מומחה ב${subject} ויוצר שאלות בגרות מעולות.

**מקצוע:** ${subject}
**נושא:** ${topic.name}
**תת-נושא:** ${subtopic}
**יחידות:** ${units.join(', ')}

**צור שאלה איכותית:**
1. שאלה מאתגרת ומעניינת
2. פתרון מפורט שלב-אחר-שלב
3. אם צריך איור - ציין נקודות A(x,y), B(x,y) וכו'
4. אם צריך גרף - ספק graph-data JSON
5. תשובה סופית ברורה
6. תגיות רלוונטיות

החזר JSON:
{
  "question_text": "נוסח השאלה",
  "difficulty": "easy/medium/hard/expert",
  "solution_steps": [
    {
      "step_number": 1,
      "description": "הסבר",
      "calculation": "חישוב או נוסחה"
    }
  ],
  "final_answer": "התשובה",
  "needs_diagram": true/false,
  "diagram_type": "geometry/graph/physics/biology/chemistry",
  "diagram_data": {
    "points": {"A": {"x": 0, "y": 0}},
    "lines": [{"from": "A", "to": "B"}]
  },
  "graph_data": {
    "title": "...",
    "points": [{"x": 0, "y": 0}]
  },
  "tags": ["tag1", "tag2"]
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
                      content: `אתה מחולל שאלות מקצועי ב${subject}` 
                    },
                    { role: "user", content: generatePrompt }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.7
                })
              });

              const data = await response.json();
              const questionData = JSON.parse(data.choices[0].message.content);

              // שמירה במאגר
              const hash = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(questionData.question_text)
              );
              const hashHex = Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

              let diagramImageUrl = null;
              
              // יצירת איור אם נדרש
              if (questionData.needs_diagram && includeImages && questionData.diagram_data) {
                try {
                  const imageResult = await base44.asServiceRole.functions.invoke('generateAdvancedDiagram', {
                    diagramType: questionData.diagram_type,
                    points: questionData.diagram_data.points || {},
                    lines: questionData.diagram_data.lines || [],
                    shapes: questionData.diagram_data.shapes || [],
                    question: questionData.question_text
                  });

                  if (imageResult.data?.success) {
                    diagramImageUrl = imageResult.data.image_url;
                  }
                } catch (imgError) {
                  console.warn("⚠️ Failed to generate diagram:", imgError);
                }
              }

              await base44.asServiceRole.entities.SolvedQuestion.create({
                question_text: questionData.question_text,
                subject: subject,
                topic: topic.name,
                subtopics: [subtopic],
                units: units[0],
                difficulty: questionData.difficulty,
                solution_steps: questionData.solution_steps,
                final_answer: questionData.final_answer,
                diagrams: diagramImageUrl ? [{
                  type: questionData.diagram_type,
                  data: questionData.diagram_data,
                  generated_image_url: diagramImageUrl
                }] : [],
                graph_data: questionData.graph_data,
                tags: questionData.tags || [topic.name, subtopic],
                question_hash: hashHex,
                source: 'ai_generated',
                verified: false,
                times_used: 0
              });

              totalGenerated.questions++;
              if (diagramImageUrl) totalGenerated.diagrams++;

              console.log(`      ✅ Generated question ${i + 1}/${questionsPerTopic}`);
              
              // Delay למניעת rate limit
              await new Promise(resolve => setTimeout(resolve, 1500));
              
            } catch (qError) {
              console.error(`      ❌ Failed to generate question:`, qError);
            }
          }

          // **יצירת דפוס לנושא**
          try {
            const patternPrompt = `צור דפוס שאלות ל-${subtopic} ב${subject}.

כלול:
- מילות מפתח לזיהוי
- מבנה שאלה כללי
- טעויות נפוצות
- תבנית פתרון
- דרישות לאיור

החזר JSON:
{
  "pattern_keywords": ["keyword1", "keyword2"],
  "question_structure": "תיאור מבנה",
  "common_mistakes": [{"mistake": "...", "correction": "..."}],
  "solution_template": "תבנית פתרון",
  "diagram_requirements": {
    "requires_diagram": true/false,
    "diagram_type": "geometry/graph/...",
    "key_elements": ["element1", "element2"]
  }
}`;

            const patternResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_KEY}`
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: "אתה מומחה בזיהוי דפוסים." },
                  { role: "user", content: patternPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
              })
            });

            const patternData = await patternResponse.json();
            const pattern = JSON.parse(patternData.choices[0].message.content);

            await base44.asServiceRole.entities.QuestionPattern.create({
              pattern_name: `${subject} - ${subtopic}`,
              subject: subject,
              topic: topic.name,
              pattern_keywords: pattern.pattern_keywords,
              question_structure: pattern.question_structure,
              common_mistakes: pattern.common_mistakes,
              solution_template: pattern.solution_template,
              diagram_requirements: pattern.diagram_requirements,
              priority: 0.7,
              times_matched: 0
            });

            totalGenerated.patterns++;
            console.log(`    ✅ Pattern created for ${subtopic}`);
            
          } catch (patternError) {
            console.error(`    ⚠️ Failed to create pattern:`, patternError);
          }

          // Delay בין subtopics
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    return Response.json({
      success: true,
      message: `✅ נוצרו ${totalGenerated.questions} שאלות, ${totalGenerated.diagrams} איורים, ${totalGenerated.patterns} דפוסים`,
      stats: totalGenerated,
      subjects_processed: subjects.length
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});