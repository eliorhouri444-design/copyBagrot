import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return Response.json({ error: 'Missing image' }, { status: 400 });
        }

        console.log('📸 Solving math problem from image...');

        const solution = await base44.integrations.Core.InvokeLLM({
            prompt: `תפתור את שאלת המתמטיקה בתמונה בצורה מפורטת:

1. קרא את השאלה
2. רשום את הנתונים
3. פתור שלב אחר שלב עם חישובים מלאים
4. כתוב את התשובה הסופית

תן פתרון מקצועי וברור!`,
            file_urls: [imageUrl]
        });

        console.log('✅ Solution generated');

        return Response.json({
            success: true,
            solution: solution
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});