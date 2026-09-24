import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎨 Custom Diagram Generator
 * מאפשר למשתמש ליצור איור מותאם אישית עם prompt באנגלית
 */

Deno.serve(async (req) => {
  console.log("🎨 Custom Diagram Generator");
  
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
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return Response.json({
        success: false,
        error: 'Valid prompt required (at least 10 characters)'
      }, { status: 400 });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    console.log("📝 User Custom Prompt:", prompt.substring(0, 200) + "...");

    // הוספת הנחיות בסיסיות ל-prompt של המשתמש
    const enhancedPrompt = `${prompt}

IMPORTANT STYLE REQUIREMENTS:
- White background
- Clean black lines only
- No colors, no shading
- Label all points clearly
- Professional textbook style
- High quality geometric diagram`;

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "natural"
        })
      });

      const data = await response.json();
      
      if (data.data?.[0]?.url) {
        console.log("✅ Custom diagram generated successfully!");
        
        return Response.json({
          success: true,
          image_url: data.data[0].url,
          prompt_used: enhancedPrompt
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
        error: 'Failed to communicate with DALL-E API'
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