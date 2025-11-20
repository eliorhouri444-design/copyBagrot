import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { questionText, diagramType, diagramDescription, subject } = await req.json();

        if (!questionText) {
            return Response.json({ error: 'Missing questionText' }, { status: 400 });
        }

        console.log(`🎨 Generating diagram: ${diagramType || 'auto'}`);

        // 🎯 יצירת prompt לאיור
        const prompt = `אתה מערכת ליצירת איורים מתמטיים, פיזיקליים, כימיים וביולוגיים.

**🎯 משימה:**
צור איור מדויק עבור השאלה הבאה.

**השאלה:**
${questionText}

${diagramDescription ? `**תיאור האיור הרצוי:** ${diagramDescription}` : ''}

**סוג איור:** ${diagramType || 'זיהוי אוטומטי'}
**מקצוע:** ${subject || 'מתמטיקה'}

---

## 📐 סוגי איורים נתמכים:

### 1️⃣ איור גיאומטרי (משולשים, מעגלים, מצולעים):
\`\`\`json
{
  "type": "geometry",
  "geometric_elements": {
    "points": {
      "A": {"x": 0, "y": 0, "label": "A"},
      "B": {"x": 100, "y": 0, "label": "B"},
      "C": {"x": 50, "y": 86.6, "label": "C"}
    },
    "lines": [
      {"from": "A", "to": "B", "style": "solid", "label": ""},
      {"from": "B", "to": "C", "style": "solid", "label": ""},
      {"from": "C", "to": "A", "style": "solid", "label": ""}
    ],
    "shapes": [
      {"type": "triangle", "vertices": ["A", "B", "C"], "fill": "none", "stroke": "black"}
    ],
    "circles": [
      {"center": "O", "radius": 50, "style": "solid"}
    ],
    "angles": [
      {"vertex": "B", "points": ["A", "B", "C"], "value": 60, "label": "60°"}
    ],
    "labels": [
      {"position": {"x": 50, "y": -10}, "text": "AB = 5 cm"},
      {"position": {"x": 120, "y": 43}, "text": "BC = 5 cm"}
    ]
  }
}
\`\`\`

### 2️⃣ גרף פונקציה:
\`\`\`json
{
  "type": "function_graph",
  "functions": [
    {
      "expression": "x^2 - 4",
      "color": "blue",
      "label": "f(x) = x² - 4"
    }
  ],
  "x_range": [-5, 5],
  "y_range": [-5, 5],
  "grid": true,
  "axes_labels": {"x": "x", "y": "y"},
  "special_points": [
    {"x": 0, "y": -4, "label": "קודקוד"},
    {"x": 2, "y": 0, "label": "שורש"},
    {"x": -2, "y": 0, "label": "שורש"}
  ]
}
\`\`\`

### 3️⃣ דיאגרמת פיזיקה (כוחות, תנועה):
\`\`\`json
{
  "type": "physics_diagram",
  "objects": [
    {
      "type": "block",
      "position": {"x": 100, "y": 100},
      "size": {"width": 40, "height": 40},
      "label": "m = 5 kg"
    }
  ],
  "forces": [
    {
      "origin": {"x": 120, "y": 120},
      "direction": {"x": 1, "y": 0},
      "magnitude": 50,
      "label": "F = 20N",
      "color": "red"
    },
    {
      "origin": {"x": 120, "y": 120},
      "direction": {"x": 0, "y": 1},
      "magnitude": 30,
      "label": "mg",
      "color": "blue"
    }
  ],
  "surface": {
    "type": "horizontal",
    "friction_coefficient": 0.2,
    "label": "μ = 0.2"
  }
}
\`\`\`

### 4️⃣ מבנה כימי:
\`\`\`json
{
  "type": "chemistry",
  "molecule": {
    "atoms": [
      {"id": "C1", "element": "C", "position": {"x": 50, "y": 50}},
      {"id": "H1", "element": "H", "position": {"x": 30, "y": 30}},
      {"id": "H2", "element": "H", "position": {"x": 70, "y": 30}},
      {"id": "H3", "element": "H", "position": {"x": 50, "y": 80}}
    ],
    "bonds": [
      {"from": "C1", "to": "H1", "type": "single"},
      {"from": "C1", "to": "H2", "type": "single"},
      {"from": "C1", "to": "H3", "type": "single"}
    ],
    "label": "CH₃"
  }
}
\`\`\`

### 5️⃣ תרשים ביולוגי:
\`\`\`json
{
  "type": "biology",
  "cell_structure": {
    "type": "animal_cell",
    "organelles": [
      {"name": "nucleus", "position": {"x": 100, "y": 100}, "size": 30},
      {"name": "mitochondria", "position": {"x": 60, "y": 80}, "size": 15}
    ],
    "labels": [
      {"position": {"x": 100, "y": 80}, "text": "גרעין"}
    ]
  }
}
\`\`\`

---

## ⚠️ דרישות חובה:

1. **מדויק:** כל הערכים נומריים חייבים להיות מדויקים
2. **ברור:** כל תווית וכיתוב בעברית תקנית
3. **שלם:** כל האלמנטים הנדרשים להבנת השאלה
4. **פשוט:** לא להוסיף אלמנטים מיותרים

צור איור מושלם עכשיו!`,
            file_urls: [fileUrl]
        });

        console.log(`✅ Diagram generated: ${JSON.stringify(detailedAnalysis).substring(0, 100)}...`);

        // 🎨 אם צריך ליצור תמונה
        let diagramImageUrl = null;

        if (detailedAnalysis.type === 'geometry' && detailedAnalysis.geometric_elements) {
            try {
                const imagePrompt = `Create a clean, professional geometric diagram for a mathematics exam.

**Description:**
${diagramDescription || questionText}

**Requirements:**
- Clean white background
- Black lines and text
- Clear labels in Hebrew
- Professional exam quality
- High contrast
- No colors except black and white

Style: Technical drawing, similar to textbook diagrams.`;

                const imageResult = await base44.integrations.Core.GenerateImage({
                    prompt: imagePrompt
                });

                if (imageResult?.url) {
                    diagramImageUrl = imageResult.url;
                    console.log(`🖼️ Diagram image created`);
                }
            } catch (error) {
                console.warn('Image generation failed:', error.message);
            }
        }

        return Response.json({
            success: true,
            diagram: detailedAnalysis,
            diagram_image_url: diagramImageUrl,
            diagram_type: detailedAnalysis.type
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});