import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🧠 פונקציית Embeddings - יצירת וקטורים למערכת RAG
 * 
 * יוצרת embeddings עבור טקסט באמצעות OpenAI
 * ושומרת אותם במאגר הידע לחיפוש סמנטי
 */

Deno.serve(async (req) => {
  console.log("=".repeat(60));
  console.log("🧠 EMBEDDINGS GENERATOR");
  console.log("=".repeat(60));
  
  try {
    const base44 = createClientFromRequest(req);
    
    // בדיקת הרשאות
    let user;
    try {
      user = await base44.auth.me();
      if (user.role !== 'admin') {
        return Response.json({ 
          success: false, 
          error: 'Admin access required' 
        }, { status: 403 });
      }
    } catch (authError) {
      return Response.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { knowledgeId, batchUpdate } = body;

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    let itemsToProcess = [];

    if (batchUpdate) {
      // עדכון קבוצתי של כל הפריטים ללא embeddings
      console.log("🔄 Batch update mode");
      const allItems = await base44.asServiceRole.entities.KnowledgeBase.list();
      itemsToProcess = allItems.filter(item => !item.embedding || item.embedding.length === 0);
      console.log(`📦 Found ${itemsToProcess.length} items without embeddings`);
    } else if (knowledgeId) {
      // עדכון פריט בודד
      const item = await base44.asServiceRole.entities.KnowledgeBase.filter({ id: knowledgeId });
      if (item.length > 0) {
        itemsToProcess = [item[0]];
      }
    } else {
      return Response.json({
        success: false,
        error: 'Missing knowledgeId or batchUpdate flag'
      }, { status: 400 });
    }

    let processed = 0;
    let failed = 0;
    const batchSize = 5; // עיבוד 5 פריטים בכל פעם

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);
      
      console.log(`\n📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(itemsToProcess.length/batchSize)}`);

      const promises = batch.map(async (item) => {
        try {
          // בניית טקסט מלא לembedding
          const textForEmbedding = buildTextForEmbedding(item);
          
          console.log(`  ⚙️ Generating embedding for: ${item.topic}`);

          // קריאה ל-OpenAI Embeddings API
          const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
              model: "text-embedding-3-small", // מודל חדש וזול יותר
              input: textForEmbedding,
              encoding_format: "float"
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          const embedding = data.data[0].embedding;

          console.log(`  ✅ Embedding generated (${embedding.length} dimensions)`);

          // עדכון הפריט עם ה-embedding
          await base44.asServiceRole.entities.KnowledgeBase.update(item.id, {
            embedding: embedding
          });

          console.log(`  💾 Saved to database`);
          
          processed++;
          return { success: true, id: item.id };
        } catch (error) {
          console.error(`  ❌ Failed for ${item.id}:`, error.message);
          failed++;
          return { success: false, id: item.id, error: error.message };
        }
      });

      await Promise.all(promises);

      // המתנה קטנה בין batches למנוע rate limiting
      if (i + batchSize < itemsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("=".repeat(60));
    console.log(`✅ COMPLETED - Processed: ${processed}, Failed: ${failed}`);
    console.log("=".repeat(60));

    return Response.json({
      success: true,
      processed,
      failed,
      total: itemsToProcess.length
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
 * בניית טקסט מלא ל-embedding
 */
function buildTextForEmbedding(item) {
  let text = '';
  
  // נושא ותת-נושא
  if (item.topic) text += `נושא: ${item.topic}\n`;
  if (item.sub_topic) text += `תת-נושא: ${item.sub_topic}\n`;
  
  // תוכן
  if (item.content) text += `${item.content}\n`;
  
  // LaTeX (בלי הסימנים)
  if (item.content_latex) {
    const cleanLatex = item.content_latex.replace(/\$+/g, ' ');
    text += `נוסחאות: ${cleanLatex}\n`;
  }
  
  // תגיות
  if (item.tags && item.tags.length > 0) {
    text += `תגיות: ${item.tags.join(', ')}\n`;
  }
  
  // מקצוע וסוג
  text += `מקצוע: ${item.subject}\n`;
  text += `סוג: ${item.knowledge_type}\n`;
  
  return text.trim();
}