import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📚 טעינת נתוני משרד החינוך - יצירת תוכניות לימודים
 */

Deno.serve(async (req) => {
  console.log("📚 LOADING MINISTRY DATA");
  
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
    const { subject, gradeLevel, unitLevel } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // **פרומפט לטעינת מידע אמיתי**
    const ministryPrompt = `אתה מומחה בתוכניות לימודים של משרד החינוך הישראלי.

**צור תוכנית לימודים מפורטת:**
- מקצוע: ${subject}
- כיתה: ${gradeLevel}
- יחידות: ${unitLevel}

**כלול:**
1. כל הנושאים הראשיים בתוכנית (לפי משרד החינוך)
2. תתי-נושאים מפורטים לכל נושא
3. יעדי למידה ספציפיים
4. מושגי מפתח
5. סוגי שאלות נפוצים לכל נושא
6. צרכים ויזואליים (איור/גרף/תרשים)
7. משקל כל נושא בבחינת הבגרות
8. מבנה הבחינה (כמה נקודות, כמה זמן, חלוקה לחלקים)

**התבסס על:**
- תוכנית הלימודים הרשמית של משרד החינוך
- מיקוד בגרות עדכני
- דוגמאות מבחינות אמיתיות

החזר JSON מפורט:
{
  "main_topics": [
    {
      "topic_name": "שם הנושא",
      "topic_description": "תיאור",
      "subtopics": [
        {
          "name": "תת-נושא",
          "description": "תיאור",
          "learning_objectives": ["מטרה 1", "מטרה 2"],
          "key_concepts": ["מושג 1", "מושג 2"],
          "question_types": ["multiple_choice", "calculation"],
          "visual_needs": "diagram/graph/none"
        }
      ],
      "weight_in_exam": 20,
      "importance": "high/medium/low"
    }
  ],
  "exam_structure": {
    "total_points": 100,
    "duration_minutes": 180,
    "sections": [{"name": "חלק א", "points": 40}],
    "question_distribution": {"multiple_choice": 30, "open": 70}
  },
  "learning_objectives": ["יעד 1", "יעד 2"],
  "reference_materials": [
    {"title": "ספר לימוד", "url": "https://...", "type": "textbook"}
  ]
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
            content: "אתה מומחה בתוכניות לימודים של משרד החינוך הישראלי. אתה יודע את התוכן המדויק, המבנה והדרישות לכל מקצוע ורמה." 
          },
          { role: "user", content: ministryPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    const data = await response.json();
    const curriculumData = JSON.parse(data.choices[0].message.content);

    console.log("✅ Curriculum data received from AI");

    // שמירה בדאטאבייס
    const curriculum = await base44.asServiceRole.entities.Curriculum.create({
      subject: subject,
      grade_level: gradeLevel,
      unit_level: unitLevel,
      main_topics: curriculumData.main_topics,
      exam_structure: curriculumData.exam_structure,
      learning_objectives: curriculumData.learning_objectives,
      reference_materials: curriculumData.reference_materials,
      year: new Date().getFullYear(),
      updated_by_ministry: new Date().toISOString().split('T')[0],
      is_active: true
    });

    console.log("✅ Curriculum saved:", curriculum.id);

    return Response.json({
      success: true,
      message: `✅ תוכנית לימודים נטענה עבור ${subject} (${curriculumData.main_topics.length} נושאים)`,
      curriculum_id: curriculum.id,
      topics_count: curriculumData.main_topics.length,
      subtopics_count: curriculumData.main_topics.reduce((sum, t) => sum + t.subtopics.length, 0)
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});