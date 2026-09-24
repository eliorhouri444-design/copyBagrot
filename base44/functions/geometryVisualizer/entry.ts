import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { diagramDescription, diagramData } = await req.json();

        if (!diagramDescription && !diagramData) {
            return Response.json({ error: 'Missing diagram info' }, { status: 400 });
        }

        console.log('🎨 Generating geometry visualization');

        // יצירת תיאור מפורט לאיור
        const prompt = `אתה מומחה בוויזואליזציה גיאומטרית וגרפית.

**🎯 משימה: תאר איור גיאומטרי/גרפי במדויק**

${diagramDescription ? `**תיאור האיור:**\n${diagramDescription}` : ''}

${diagramData ? `**נתוני האיור:**\n${JSON.stringify(diagramData, null, 2)}` : ''}

**החזר JSON עם מידע מלא:**

{
  "diagram_type": "geometry/graph/physics/chemistry",
  "title": "כותרת האיור",
  "description": "תיאור מפורט של האיור",
  
  "coordinate_system": {
    "type": "cartesian/polar/3d",
    "x_range": [-10, 10],
    "y_range": [-10, 10],
    "grid": true
  },
  
  "points": {
    "A": {
      "x": 0,
      "y": 0,
      "label": "A",
      "color": "#3B82F6",
      "size": 8
    }
  },
  
  "lines": [
    {
      "from": "A",
      "to": "B",
      "type": "solid/dashed/dotted",
      "color": "#1F2937",
      "width": 2,
      "label": "AB = 5 ס\"מ",
      "arrow": false
    }
  ],
  
  "shapes": [
    {
      "type": "triangle/rectangle/circle/polygon",
      "vertices": ["A", "B", "C"],
      "fill": "#EFF6FF",
      "fillOpacity": 0.3,
      "stroke": "#3B82F6",
      "strokeWidth": 2
    }
  ],
  
  "curves": [
    {
      "type": "parabola/circle/ellipse/function",
      "equation": "y = x^2",
      "points": [{"x": -2, "y": 4}, {"x": 0, "y": 0}],
      "color": "#8B5CF6",
      "width": 3
    }
  ],
  
  "angles": [
    {
      "vertex": "B",
      "from_line": "BA",
      "to_line": "BC",
      "value": 90,
      "unit": "degrees",
      "show_arc": true,
      "label": "90°"
    }
  ],
  
  "labels": [
    {
      "text": "AB = 5 ס\"מ",
      "position": {"x": 2.5, "y": 2.5},
      "fontSize": 14,
      "color": "#1F2937"
    }
  ],
  
  "special_elements": [
    {
      "type": "perpendicular_mark/parallel_mark/midpoint",
      "location": "on line AB at point M",
      "description": "סימון אמצע"
    }
  ],
  
  "instructions": "הוראות ציור נוספות אם נדרש"
}

**דוגמה למשולש ישר זווית:**
{
  "diagram_type": "geometry",
  "points": {
    "A": {"x": 0, "y": 0, "label": "A"},
    "B": {"x": 3, "y": 0, "label": "B"},
    "C": {"x": 0, "y": 4, "label": "C"}
  },
  "lines": [
    {"from": "A", "to": "B", "label": "3 ס\"מ"},
    {"from": "B", "to": "C", "label": "5 ס\"מ"},
    {"from": "C", "to": "A", "label": "4 ס\"מ"}
  ],
  "shapes": [
    {"type": "triangle", "vertices": ["A","B","C"]}
  ],
  "angles": [
    {"vertex": "A", "value": 90, "show_arc": true}
  ]
}`;

        const visualization = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    diagram_type: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    coordinate_system: { type: "object" },
                    points: { type: "object" },
                    lines: { type: "array" },
                    shapes: { type: "array" },
                    curves: { type: "array" },
                    angles: { type: "array" },
                    labels: { type: "array" },
                    special_elements: { type: "array" },
                    instructions: { type: "string" }
                }
            }
        });

        console.log('✅ Visualization data generated');

        return Response.json({
            success: true,
            visualization: visualization,
            svg_ready: true
        });

    } catch (error) {
        console.error('❌ Visualization Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});