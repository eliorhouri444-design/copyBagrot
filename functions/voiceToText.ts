import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🎤 Voice to Text - Whisper API
 */

Deno.serve(async (req) => {
  console.log("🎤 VOICE TO TEXT");
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { audioUrl } = body;

    if (!audioUrl) {
      return Response.json({ success: false, error: 'Audio URL required' }, { status: 400 });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // Download audio
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();

    // Create form data
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'he');

    // Call Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: formData
    });

    const data = await response.json();

    return Response.json({
      success: true,
      text: data.text || ''
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});