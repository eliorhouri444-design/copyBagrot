import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🗄️ פונקציית /ingest - קליטת ידע למאגר
 * 
 * קולטת מסמכים (PDF/טקסט/JSON), מפרקת אותם לחלקים,
 * ושומרת במאגר הידע עם מטה-דאטה
 */

Deno.serve(async (req) => {
  console.log("=".repeat(60));
  console.log("🗄️ INGEST KNOWLEDGE");
  console.log("=".repeat(60));
  
  try {
    const base44 = createClientFromRequest(req);
    
    // בדיקת הרשאות - רק מנהלים
    let user;
    try {
      user = await base44.auth.me();
      if (user.role !== 'admin') {
        return Response.json({ 
          success: false, 
          error: 'Admin access required' 
        }, { status: 403 });
      }
      console.log("✅ Admin user:", user?.email);
    } catch (authError) {
      return Response.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { content, metadata, autoChunk } = body;

    console.log("📝 Content length:", content?.length);
    console.log("🏷️ Metadata:", metadata);

    if (!content || !metadata?.subject || !metadata?.topic) {
      return Response.json({
        success: false,
        error: 'Missing required fields: content, subject, topic'
      }, { status: 400 });
    }

    let chunks = [];

    // חלוקה אוטומטית לחלקים
    if (autoChunk) {
      chunks = smartChunk(content, 600); // 600 תווים לחלק
      console.log("✂️ Auto-chunked into", chunks.length, "pieces");
    } else {
      chunks = [content];
    }

    const created = [];

    // יצירת רשומות במאגר
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const knowledgeItem = await base44.asServiceRole.entities.KnowledgeBase.create({
        subject: metadata.subject,
        knowledge_type: metadata.knowledge_type || 'תיאוריה',
        content: chunk,
        content_latex: extractLatex(chunk),
        unit_level: metadata.unit_level || '',
        topic: metadata.topic,
        sub_topic: metadata.sub_topic || '',
        priority: metadata.priority || 0.5,
        active: true,
        source_url: metadata.source_url || '',
        year: metadata.year || new Date().getFullYear(),
        lang: metadata.lang || 'he',
        tags: metadata.tags || [],
        difficulty: metadata.difficulty || 'בינוני',
        chunk_text: cleanText(chunk)
      });

      created.push(knowledgeItem);
      console.log(`✅ Created item ${i + 1}/${chunks.length}`);
    }

    console.log("=".repeat(60));
    console.log("✅ SUCCESS - Created", created.length, "knowledge items");
    console.log("=".repeat(60));

    return Response.json({
      success: true,
      created: created.length,
      items: created.map(item => ({
        id: item.id,
        topic: item.topic,
        length: item.content.length
      }))
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

/**
 * חלוקה חכמה לחלקים
 */
function smartChunk(text, maxChunkSize = 600) {
  const chunks = [];
  const paragraphs = text.split('\n\n');
  
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * חילוץ LaTeX
 */
function extractLatex(text) {
  const latexMatches = text.match(/\$\$?[^\$]+\$\$?/g);
  return latexMatches ? latexMatches.join(' ') : '';
}

/**
 * ניקוי טקסט
 */
function cleanText(text) {
  return text
    .replace(/\$\$?[^\$]+\$\$?/g, ' ') // הסרת LaTeX
    .replace(/[^\u0590-\u05FF\u0020-\u007Ea-zA-Z0-9]/g, ' ') // השארת עברית/אנגלית/מספרים
    .replace(/\s+/g, ' ')
    .trim();
}