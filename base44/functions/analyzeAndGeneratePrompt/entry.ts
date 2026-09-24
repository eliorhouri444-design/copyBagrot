import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🔍 Analyze Math Question & Generate DALL-E Prompt
 * מנתח שאלה בעברית/אנגלית ומייצר prompt מדויק ל-DALL-E
 */

Deno.serve(async (req) => {
  console.log("🔍 Analyzing question and generating prompt...");
  
  try {
    const base44 = createClientFromRequest(req);
    
    // אימות משתמש
    let user;
    try {
      user = await base44.auth.me();
      console.log("✅ User:", user?.email);
    } catch (authError) {
      return Response.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { question, imageUrl } = body;

    if (!question && !imageUrl) {
      return Response.json({
        success: false,
        error: 'Question text or image required'
      }, { status: 400 });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    console.log("📝 Question:", question?.substring(0, 100));
    console.log("🖼️ Has Image:", !!imageUrl);

    // בניית הפרומפט לניתוח
    const analysisPrompt = `אתה מומחה במתמטיקה וגיאומטריה.

${question ? `**השאלה:**\n${question}\n\n` : ''}

**המשימה שלך:**
1. נתח את השאלה הגיאומטרית
2. זהה את כל הצורות, נקודות, קווים
3. צור prompt מפורט באנגלית ל-DALL-E
4. תן הסבר בעברית למשתמש

**פורמט התשובה (JSON):**
\`\`\`json
{
  "hebrew_explanation": "הסבר בעברית - מה יש בשאלה",
  "shapes": ["rectangle ABCD", "triangle DEF"],
  "points": [
    "Point A at bottom-left",
    "Point B at top-left",
    "Point C at top-right",
    "Point D at bottom-right"
  ],
  "lines": [
    "Draw line from A to C (diagonal)",
    "Draw line from B to D (diagonal)"
  ],
  "intersections": [
    "Mark point E where AC and BD intersect"
  ],
  "extensions": [
    "Extend line AB beyond B, mark point F"
  ],
  "dall_e_prompt": "Draw a 2D geometric diagram with the following:\\n\\n- A rectangle labeled A (bottom-left), B (top-left), C (top-right), D (bottom-right).\\n- Draw diagonal line AC.\\n- Draw diagonal line BD.\\n- Mark point E at the intersection of AC and BD.\\n- Extend line AB beyond point B and mark point F.\\n- Label all points clearly: A, B, C, D, E, F.\\n- Use thin black straight lines, white background, no shading, minimal clean style."
}
\`\`\`

נתח בדיוק!`;

    // אם יש תמונה - נשלח גם אותה
    const messages = [
      { 
        role: "system", 
        content: "אתה מומחה גיאומטריה. אתה מנתח שאלות ומייצר prompts מדויקים ל-DALL-E."
      }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: analysisPrompt },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: analysisPrompt
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0
      })
    });

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    console.log("✅ Analysis complete!");
    console.log("Shapes:", analysis.shapes?.length);
    console.log("Points:", analysis.points?.length);
    console.log("Lines:", analysis.lines?.length);

    // בניית פרומפט מסודר
    let structuredPrompt = "Draw a 2D geometric diagram with the following:\n\n";
    
    if (analysis.shapes) {
      analysis.shapes.forEach(shape => {
        structuredPrompt += `- ${shape}.\n`;
      });
    }
    
    if (analysis.points) {
      analysis.points.forEach(point => {
        structuredPrompt += `- ${point}.\n`;
      });
    }
    
    if (analysis.lines) {
      analysis.lines.forEach(line => {
        structuredPrompt += `- ${line}.\n`;
      });
    }
    
    if (analysis.intersections) {
      analysis.intersections.forEach(inter => {
        structuredPrompt += `- ${inter}.\n`;
      });
    }
    
    if (analysis.extensions) {
      analysis.extensions.forEach(ext => {
        structuredPrompt += `- ${ext}.\n`;
      });
    }
    
    structuredPrompt += "- Label all points clearly with capital letters.\n";
    structuredPrompt += "- Use thin black straight lines, white background, no shading, minimal clean style.";

    // תרגום הסבר לעברית
    const hebrewSummary = `**הסבר בעברית:**

${analysis.hebrew_explanation || 'נותח השאלה בהצלחה'}

**מה נמצא בשאלה:**
${analysis.shapes ? `\n🔺 צורות: ${analysis.shapes.join(', ')}` : ''}
${analysis.points ? `\n📍 נקודות: ${analysis.points.length} נקודות` : ''}
${analysis.lines ? `\n📏 קווים: ${analysis.lines.length} קווים` : ''}
${analysis.intersections ? `\n✖️ חיתוכים: ${analysis.intersections.length}` : ''}
${analysis.extensions ? `\n↗️ המשכים: ${analysis.extensions.length}` : ''}

**Prompt שנוצר:**
\`\`\`
${structuredPrompt}
\`\`\`
`;

    return Response.json({
      success: true,
      analysis: {
        hebrew_explanation: analysis.hebrew_explanation,
        shapes: analysis.shapes,
        points: analysis.points,
        lines: analysis.lines,
        intersections: analysis.intersections,
        extensions: analysis.extensions
      },
      prompt: structuredPrompt,
      hebrew_summary: hebrewSummary,
      dall_e_prompt: analysis.dall_e_prompt || structuredPrompt
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});