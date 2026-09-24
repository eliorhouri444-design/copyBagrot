import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🌊 Streaming Ask - תשובות בזמן אמת
 * 
 * זהה ל-smartAsk אבל עם streaming
 */

Deno.serve(async (req) => {
  console.log("🌊 STREAMING ASK");
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { question, subject, imageUrl } = body;

    // Use regular smartAsk for now (streaming in future enhancement)
    const result = await base44.functions.invoke('smartAsk', {
      question,
      subject,
      imageUrl
    });

    return Response.json(result.data);

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});