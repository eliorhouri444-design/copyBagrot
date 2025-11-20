import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { questionText, geometryData } = await req.json();

        // בניית פרומפט מאוד ספציפי ל-DALL-E 3
        let diagramPrompt = `Create a precise geometric diagram for this Israeli Bagrut math question:

"${questionText}"

IMPORTANT REQUIREMENTS:
- White background (#FFFFFF)
- Black lines for shapes (2px width)
- Hebrew labels for all points using Hebrew letters
- Professional textbook style, clean and minimal
- No decorative elements, only the exact geometric shapes mentioned
- High resolution (1024x1024)
- Clear and readable labels`;

        // הוספת פרטי הגיאומטריה אם קיימים
        if (geometryData && geometryData.points && geometryData.points.length > 0) {
            diagramPrompt += `\n\nGEOMETRIC DATA:`;
            
            // נקודות
            diagramPrompt += `\nPoints: ${geometryData.points.map(p => `${p.name} at (${p.x}, ${p.y})`).join(', ')}`;
            
            // צורות
            if (geometryData.shapes && geometryData.shapes.length > 0) {
                diagramPrompt += `\n\nShapes:`;
                geometryData.shapes.forEach(shape => {
                    diagramPrompt += `\n- ${shape.type} with points: ${shape.points.join(', ')}`;
                    if (shape.radius) diagramPrompt += ` (radius: ${shape.radius})`;
                    if (shape.width && shape.height) diagramPrompt += ` (${shape.width} x ${shape.height})`;
                });
            }
            
            // קווים
            if (geometryData.lines && geometryData.lines.length > 0) {
                diagramPrompt += `\n\nLines:`;
                geometryData.lines.forEach(line => {
                    diagramPrompt += `\n- Line from ${line.from} to ${line.to}`;
                    if (line.label) diagramPrompt += ` labeled "${line.label}"`;
                });
            }
        }

        diagramPrompt += `\n\nStyle: Clean mathematical textbook diagram, white background, black lines, Hebrew labels, professional quality.`;

        console.log('📊 Generating diagram with prompt:', diagramPrompt);

        // יצירת האיור עם DALL-E 3
        const imageResult = await base44.integrations.Core.GenerateImage({
            prompt: diagramPrompt
        });

        if (!imageResult || !imageResult.url) {
            throw new Error('Failed to generate image');
        }

        console.log('✅ Diagram generated successfully:', imageResult.url);

        return Response.json({
            success: true,
            imageUrl: imageResult.url,
            geometryData: geometryData,
            message: 'איור גיאומטרי נוצר בהצלחה'
        });

    } catch (error) {
        console.error("Geometry diagram error:", error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});