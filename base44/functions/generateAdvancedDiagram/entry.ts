import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎨 Advanced Multi-Subject Diagram Generator
 * תומך בגיאומטריה, גרפים, ביולוגיה, כימיה, פיזיקה וסטטיסטיקה
 */

Deno.serve(async (req) => {
  console.log("🎨 Generating advanced multi-subject diagram...");
  
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
    const { 
      diagramType, 
      points, 
      lines, 
      shapes, 
      curves,
      labels,
      arrows,
      graphData, 
      bioElements, 
      chemElements, 
      question 
    } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    console.log("📊 Diagram data:");
    console.log("- Type:", diagramType);
    console.log("- Points:", Object.keys(points || {}).length);
    console.log("- Lines:", lines?.length || 0);
    console.log("- Shapes:", shapes?.length || 0);

    // 🎯 Build subject-specific prompt
    let prompt = `Create a PROFESSIONAL, HIGH-QUALITY diagram for ${diagramType.toUpperCase()}.\n\n`;

    if (question) {
      prompt += `**CONTEXT:**\n"${question}"\n\n`;
    }

    // Geometry/Physics - existing logic
    if (diagramType === "geometry" || diagramType === "physics") {
      if (shapes && shapes.length > 0) {
        prompt += `**SHAPES (${shapes.length}):**\n`;
        shapes.forEach((shape, idx) => {
          prompt += `${idx + 1}. ${shape.type || 'polygon'} with vertices ${shape.vertices?.join(', ')}\n`;
        });
        prompt += `\n`;
      }

      prompt += `**POINTS (${Object.keys(points || {}).length}):**\n`;
      Object.entries(points || {}).forEach(([name, point]) => {
        prompt += `- Point ${name} at (${point.x.toFixed(1)}, ${point.y.toFixed(1)})\n`;
      });

      prompt += `\n**LINES (${lines?.length || 0}):**\n`;
      if (lines && lines.length > 0) {
        lines.forEach((line, idx) => {
          const style = line.style === 'dashed' ? 'DASHED' : 'SOLID';
          prompt += `${idx + 1}. ${style} line from ${line.from} to ${line.to}\n`;
        });
      }

      prompt += `\n**STYLE:**\n`;
      prompt += `- Pure white background\n`;
      prompt += `- Thin black lines (2-3.5px)\n`;
      prompt += `- Red dots for points\n`;
      prompt += `- Bold black labels\n`;
      prompt += `- Professional textbook quality\n`;
    }

    // Graph/Function
    else if (diagramType === "graph") {
      prompt += `**GRAPH SPECIFICATIONS:**\n`;
      prompt += `- X-axis: ${graphData?.xAxis?.min || -10} to ${graphData?.xAxis?.max || 10}\n`;
      prompt += `- Y-axis: ${graphData?.yAxis?.min || -10} to ${graphData?.yAxis?.max || 10}\n`;
      
      if (graphData?.functions && graphData.functions.length > 0) {
        prompt += `\n**FUNCTIONS TO PLOT:**\n`;
        graphData.functions.forEach((func, idx) => {
          prompt += `${idx + 1}. ${func.expression} (color: ${func.color || 'blue'})\n`;
        });
      }

      if (graphData?.points && graphData.points.length > 0) {
        prompt += `\n**MARKED POINTS:**\n`;
        graphData.points.forEach((pt, idx) => {
          prompt += `${idx + 1}. Point at (${pt.x}, ${pt.y})${pt.label ? ` labeled "${pt.label}"` : ''}\n`;
        });
      }

      prompt += `\n**STYLE:**\n`;
      prompt += `- Clean coordinate system with grid\n`;
      prompt += `- Labeled axes\n`;
      prompt += `- Smooth function curves\n`;
      prompt += `- Professional mathematics textbook style\n`;
    }

    // Biology
    else if (diagramType === "biology") {
      prompt += `**BIOLOGICAL DIAGRAM:**\n`;
      
      if (bioElements && bioElements.length > 0) {
        prompt += `\n**ELEMENTS TO DRAW:**\n`;
        bioElements.forEach((elem, idx) => {
          prompt += `${idx + 1}. ${elem.type} (${elem.name})\n`;
          if (elem.description) prompt += `   Details: ${elem.description}\n`;
        });
      }

      prompt += `\n**STYLE:**\n`;
      prompt += `- Scientific illustration style\n`;
      prompt += `- Clear labels with leader lines\n`;
      prompt += `- Appropriate colors (membrane: blue, nucleus: purple, etc.)\n`;
      prompt += `- Clean, educational biology textbook quality\n`;
      prompt += `- Cross-section or 3D view as appropriate\n`;
    }

    // Chemistry
    else if (diagramType === "chemistry") {
      prompt += `**CHEMICAL DIAGRAM:**\n`;
      
      if (chemElements && chemElements.length > 0) {
        prompt += `\n**MOLECULES/STRUCTURES:**\n`;
        chemElements.forEach((elem, idx) => {
          prompt += `${idx + 1}. ${elem.formula || elem.name}\n`;
          if (elem.bondType) prompt += `   Bond type: ${elem.bondType}\n`;
        });
      }

      prompt += `\n**STYLE:**\n`;
      prompt += `- Standard chemistry notation\n`;
      prompt += `- Atoms as colored spheres (or stick model)\n`;
      prompt += `- Bonds clearly marked (single, double, triple)\n`;
      prompt += `- Charges and lone pairs if relevant\n`;
      prompt += `- Professional chemistry textbook quality\n`;
    }

    // Statistics
    else if (diagramType === "statistics") {
      prompt += `**STATISTICAL VISUALIZATION:**\n`;
      
      if (graphData?.chartType) {
        prompt += `- Chart type: ${graphData.chartType}\n`;
      }
      
      if (graphData?.data) {
        prompt += `\n**DATA:**\n`;
        prompt += JSON.stringify(graphData.data, null, 2);
      }

      prompt += `\n**STYLE:**\n`;
      prompt += `- Clean, professional statistical chart\n`;
      prompt += `- Clear axes and labels\n`;
      prompt += `- Appropriate colors\n`;
      prompt += `- Legend if multiple series\n`;
      prompt += `- Publication-quality statistics graph\n`;
    }

    prompt += `\n**CRITICAL REQUIREMENTS:**\n`;
    prompt += `- High precision and accuracy\n`;
    prompt += `- Professional educational quality\n`;
    prompt += `- Clear, readable labels\n`;
    prompt += `- Appropriate for ${diagramType} subject\n`;
    prompt += `- Suitable for exam/textbook use\n`;

    console.log("📤 Sending to DALL-E 3...");

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
        console.log("✅ Advanced diagram generated!");
        
        return Response.json({
          success: true,
          image_url: data.data[0].url,
          diagram_type: diagramType,
          revised_prompt: data.data[0].revised_prompt
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