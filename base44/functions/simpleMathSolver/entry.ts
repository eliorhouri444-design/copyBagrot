import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return Response.json({ 
                success: false,
                error: 'Missing image URL' 
            }, { status: 400 });
        }

        console.log('🚀 Simple Math Solver - Solving...');

        const prompt = `אתה מורה מומחה למתמטיקה. 
יש לך תמונה של שאלת מתמטיקה - תפתור אותה בצורה ברורה ומסודרת.

**הוראות:**

1. קרא את השאלה מהתמונה
2. רשום את הנתונים
3. פתור שלב אחר שלב - הראה כל חישוב
4. רשום את התשובה הסופית

**פתור עכשיו:**`;

        const solution = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: [imageUrl]
        });

        console.log('✅ Solution ready');

        return Response.json({
            success: true,
            solution: solution || 'לא נמצא פתרון',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        return Response.json({
            success: false,
            error: error.message || 'שגיאה בפתרון'
        }, { status: 500 });
    }
});