
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🔍 ניתוח שאלה וחיפוש במאגר
 * זיהוי שאלות דומות, דפוסים, והחזרת פתרונות קיימים
 */

Deno.serve(async (req) => {
  console.log("🔍 ANALYZING QUESTION");
  
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
    const { question, subject, units, imageUrl } = body;

    console.log("📝 Question:", question.substring(0, 100));
    console.log("📚 Subject:", subject);

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // **שלב 1: זיהוי דפוס השאלה**
    const patternPrompt = `אתה מומחה בזיהוי דפוסי שאלות לימודיות.

**השאלה:**
${question}

**מקצוע:** ${subject}

**זהה:**
1. נושא ראשי (geometry, functions, algebra וכו')
2. תת-נושא ספציפי (ratio of segments, linear function וכו')
3. מילות מפתח (מלבן, חיתוך, יחס, פונקציה וכו')
4. האם צריך איור? איזה סוג?
5. רמת קושי (easy/medium/hard/expert)

החזר JSON:
{
  "main_topic": "string",
  "subtopics": ["string"],
  "keywords": ["string"],
  "needs_diagram": true/false,
  "diagram_type": "geometry/graph/physics/other",
  "difficulty": "easy/medium/hard/expert",
  "question_type": "calculation/proof/construction/analysis"
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
          { role: "system", content: "אתה מומחה בזיהוי דפוסי שאלות." },
          { role: "user", content: patternPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const patternData = await patternResponse.json();
    const analysis = JSON.parse(patternData.choices[0].message.content);

    console.log("✅ Pattern analysis:", analysis);

    // **שלב 2: חיפוש שאלות דומות במאגר**
    const allSolved = await base44.asServiceRole.entities.SolvedQuestion.filter({
      subject: subject
    });

    console.log(`📊 Found ${allSolved.length} solved questions in database`);

    // חיפוש לפי keywords
    const matchingQuestions = allSolved.filter(solvedQuestion => {
      const questionLower = solvedQuestion.question_text.toLowerCase();
      const keywordMatches = analysis.keywords.filter(keyword => 
        questionLower.includes(keyword.toLowerCase())
      ).length;
      
      return keywordMatches >= Math.min(2, analysis.keywords.length);
    });

    console.log(`🎯 Found ${matchingQuestions.length} matching questions`);

    // **שלב 3: חישוב דמיון**
    const questionsWithSimilarity = matchingQuestions.map(solvedQuestion => {
      const similarity = calculateSimilarity(question, solvedQuestion.question_text);
      return {
        ...solvedQuestion,
        similarity
      };
    }).sort((questionA, questionB) => questionB.similarity - questionA.similarity);

    // **שלב 4: האם יש פתרון קיים?**
    const bestMatch = questionsWithSimilarity[0];
    const hasExactMatch = bestMatch && bestMatch.similarity > 0.85;

    console.log(`🎯 Best match similarity: ${bestMatch?.similarity || 0}`);

    // **שלב 5: חיפוש דפוסים**
    const patterns = await base44.asServiceRole.entities.QuestionPattern.filter({
      subject: subject,
      topic: analysis.main_topic
    });

    const matchingPatterns = patterns.filter(p => {
      const patternMatches = p.pattern_keywords.filter(kw =>
        question.toLowerCase().includes(kw.toLowerCase())
      ).length;
      
      return patternMatches >= 1;
    });

    console.log(`🔍 Found ${matchingPatterns.length} matching patterns`);

    return Response.json({
      success: true,
      analysis: analysis,
      has_exact_match: hasExactMatch,
      best_match: bestMatch ? {
        id: bestMatch.id,
        question: bestMatch.question_text,
        similarity: bestMatch.similarity,
        solution_steps: bestMatch.solution_steps,
        final_answer: bestMatch.final_answer,
        diagrams: bestMatch.diagrams,
        graph_data: bestMatch.graph_data
      } : null,
      similar_questions: questionsWithSimilarity.slice(0, 5).map(sq => ({
        id: sq.id,
        question: sq.question_text.substring(0, 150),
        similarity: sq.similarity,
        topic: sq.topic
      })),
      matching_patterns: matchingPatterns.map(p => ({
        id: p.id,
        name: p.pattern_name,
        solution_template: p.solution_template,
        common_mistakes: p.common_mistakes,
        diagram_requirements: p.diagram_requirements
      })),
      recommendation: hasExactMatch 
        ? "use_existing" 
        : questionsWithSimilarity.length > 0 && bestMatch.similarity > 0.6
          ? "adapt_existing"
          : "solve_new"
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * חישוב דמיון בין שתי שאלות
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
