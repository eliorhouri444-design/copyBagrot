import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎨 DALL-E 3 Ultra Precise Geometry Generator
 * מייצר איורים גיאומטריים HD מדויקים ויפים
 */

Deno.serve(async (req) => {
  console.log("🎨 Generating ultra precise HD geometry image...");
  
  try {
    const base44 = createClientFromRequest(req);
    
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
    const { points, lines, shapes, question } = body;

    if (!points || Object.keys(points).length === 0) {
      return Response.json({
        success: false,
        error: 'Points required'
      }, { status: 400 });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    console.log("📊 Diagram data:");
    console.log("- Points:", Object.keys(points).length);
    console.log("- Lines:", lines?.length || 0);
    console.log("- Shapes:", shapes?.length || 0);
    console.log("- Question context:", question?.substring(0, 100));

    // 🎯 בניית פרומפט אולטרה מדויק
    let prompt = `Create an ULTRA PRECISE, HIGH-QUALITY geometric diagram for a mathematics textbook.

`;

    // הקשר לשאלה
    if (question) {
      prompt += `**PROBLEM CONTEXT:**
"${question}"

This diagram must perfectly represent the geometric setup described above.

`;
    }

    // תיאור צורות
    if (shapes && shapes.length > 0) {
      prompt += `**GEOMETRIC SHAPES (${shapes.length}):**\n`;
      shapes.forEach((shape, idx) => {
        const vertexNames = shape.vertices ? shape.vertices.join(', ') : '';
        const shapeType = shape.type || 'polygon';
        prompt += `${idx + 1}. A ${shapeType} formed by connecting vertices ${vertexNames} in order\n`;
      });
      prompt += `\n`;
    }

    // מיקום נקודות מדויק ביותר
    prompt += `**POINT POSITIONS (EXACT - ${Object.keys(points).length} points):**\n`;
    const sortedPoints = Object.entries(points).sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedPoints.forEach(([name, point]) => {
      const posX = point.x;
      const posY = point.y;
      
      // תיאור מיקום מדויק
      let position = '';
      
      // X axis
      if (posX <= 3) position += 'far left';
      else if (posX <= 6) position += 'left side';
      else if (posX <= 10) position += 'center';
      else if (posX <= 14) position += 'right side';
      else position += 'far right';
      
      position += ', ';
      
      // Y axis
      if (posY <= 3) position += 'bottom';
      else if (posY <= 6) position += 'lower area';
      else if (posY <= 10) position += 'middle';
      else if (posY <= 14) position += 'upper area';
      else position += 'top';
      
      prompt += `- Point ${name} positioned at ${position}\n`;
      prompt += `  Coordinates: (${posX.toFixed(1)}, ${posY.toFixed(1)}) - maintain exact relative distances\n`;
    });

    // קווים - כל אחד במדויק
    prompt += `\n**LINES TO DRAW (CRITICAL - ${lines?.length || 0} lines):**\n`;
    if (lines && lines.length > 0) {
      lines.forEach((line, idx) => {
        const styleDesc = line.style === 'dashed' ? 'DASHED (use 5px dash, 3px gap)' : 'SOLID';
        const thickness = line.style === 'dashed' ? 'medium (2-2.5px)' : 'slightly thicker (3-3.5px)';
        
        prompt += `${idx + 1}. Draw a ${styleDesc}, ${thickness} straight line connecting:\n`;
        prompt += `   From point ${line.from} to point ${line.to}\n`;
        prompt += `   This line must be perfectly straight, no curves!\n`;
      });
    } else {
      prompt += `Draw lines connecting all vertices of each shape to form complete polygons.\n`;
    }

    // תוויות
    prompt += `\n**LABELING (SUPER CRITICAL):**\n`;
    sortedPoints.forEach(([name]) => {
      prompt += `- Label "${name}" must be clearly visible, bold, black, placed near its point\n`;
    });

    // הנחיות סגנון קריטיות
    prompt += `\n**STYLE REQUIREMENTS (MANDATORY - DO NOT DEVIATE):**

✓ **Background:** Pure solid white (#FFFFFF), absolutely NO texture, NO patterns, NO grid lines
✓ **Lines:** Thin, perfectly straight, solid black (#000000), width 2-3.5px depending on type
✓ **Dashed lines:** Consistent 5px dash, 3px gap pattern
✓ **Points:** Small filled red circles (#DC2626), diameter 5-6px at each labeled vertex
✓ **Labels:** Bold, black, uppercase letters (18-22px font), positioned clearly near each point
✓ **Precision:** Maintain EXACT relative positions and distances between all points
✓ **Clarity:** High contrast, razor-sharp lines, professional textbook quality
✓ **Simplicity:** NO shading, NO gradients, NO colors except black/red, NO decorations
✓ **Accuracy:** Every line must connect EXACTLY the specified points, no approximations

✗ **FORBIDDEN:**
- NO artistic interpretation or creative additions
- NO extra points, lines, or shapes beyond what's specified
- NO shadows, glows, or 3D effects
- NO grid lines or coordinate axes unless explicitly requested
- NO curves where straight lines are specified
- NO color fills except minimal shape fills (very light, almost white)

**QUALITY VERIFICATION:**
Before finalizing, verify:
1. All ${Object.keys(points).length} points are present and labeled
2. All ${lines?.length || 0} lines are drawn exactly as specified
3. Line styles (solid/dashed) match specifications
4. No extra elements were added
5. Background is pure white
6. Labels are clear and properly positioned

**THIS IS FOR A MATHEMATICS EXAMINATION - PRECISION IS ABSOLUTELY CRITICAL!**

The diagram must look like it was drawn by a professional technical illustrator for a mathematics textbook.`;

    console.log("📤 Sending ultra precise prompt to DALL-E 3...");
    console.log("Prompt length:", prompt.length, "characters");

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "natural"
        })
      });

      const data = await response.json();
      
      if (data.data?.[0]?.url) {
        console.log("✅ HD image generated successfully!");
        console.log("Image URL:", data.data[0].url.substring(0, 100) + "...");
        
        return Response.json({
          success: true,
          image_url: data.data[0].url,
          revised_prompt: data.data[0].revised_prompt,
          metadata: {
            points_count: Object.keys(points).length,
            lines_count: lines?.length || 0,
            shapes_count: shapes?.length || 0,
            model: "dall-e-3",
            quality: "hd",
            size: "1024x1024"
          }
        });
      } else {
        console.error("❌ DALL-E error:", data.error);
        return Response.json({
          success: false,
          error: data.error?.message || 'Failed to generate image'
        }, { status: 500 });
      }
    } catch (dalleError) {
      console.error("❌ DALL-E API error:", dalleError);
      return Response.json({
        success: false,
        error: 'Failed to communicate with DALL-E API: ' + dalleError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ ERROR:", error);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});