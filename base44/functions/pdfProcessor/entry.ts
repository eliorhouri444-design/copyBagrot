import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📄 PDF Processor מתקדם
 * 
 * עיבוד אוטומטי של PDF:
 * 1. חילוץ טקסט
 * 2. זיהוי LaTeX ונוסחאות
 * 3. OCR לתמונות
 * 4. פיצול חכם לפרקים
 * 5. יצירת metadata אוטומטי
 */

Deno.serve(async (req) => {
  console.log("=".repeat(60));
  console.log("📄 PDF PROCESSOR");
  console.log("=".repeat(60));
  
  try {
    const base44 = createClientFromRequest(req);
    
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
    const { fileUrl, metadata } = body;

    if (!fileUrl) {
      return Response.json({
        success: false,
        error: 'File URL is required'
      }, { status: 400 });
    }

    console.log("📥 File URL:", fileUrl);

    // **שלב 1: הורדת הקובץ**
    console.log("\n📦 Step 1: Downloading file...");
    
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }
    
    const fileBlob = await fileResponse.blob();
    console.log(`✅ Downloaded ${fileBlob.size} bytes`);

    // **שלב 2: חילוץ טקסט (Base44 built-in או API חיצוני)**
    console.log("\n📝 Step 2: Extracting text...");
    
    // אם הקובץ הוא PDF - נשתמש ב-Base44 ExtractDataFromUploadedFile
    // או API חיצוני כמו PyPDF2/pdfplumber
    
    let extractedText = '';
    
    try {
      // ניסיון עם Base44 built-in
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            full_text: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      if (extractResult.status === 'success') {
        extractedText = extractResult.output?.full_text || '';
        console.log(`✅ Extracted ${extractedText.length} characters`);
      } else {
        throw new Error(extractResult.details || 'Extraction failed');
      }
    } catch (extractError) {
      console.log("⚠️ Base44 extraction failed, falling back to LLM...");
      
      // Fallback: שימוש ב-Vision API
      const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
      
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "חלץ את כל הטקסט מהמסמך הזה. שמור על מבנה ונוסחאות LaTeX."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "חלץ את כל התוכן מהמסמך" },
                { type: "image_url", image_url: { url: fileUrl } }
              ]
            }
          ],
          max_tokens: 4000
        })
      });
      
      const visionData = await visionResponse.json();
      extractedText = visionData.choices?.[0]?.message?.content || '';
      console.log(`✅ Extracted via Vision: ${extractedText.length} characters`);
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error('Failed to extract meaningful text from PDF');
    }

    // **שלב 3: זיהוי אוטומטי של metadata**
    console.log("\n🏷️ Step 3: Detecting metadata...");
    
    const detectedMetadata = await detectMetadata(extractedText, metadata, base44);
    console.log("✅ Metadata detected:", detectedMetadata);

    // **שלב 4: פיצול חכם לסעיפים**
    console.log("\n✂️ Step 4: Smart chunking...");
    
    const chunks = intelligentChunk(extractedText, detectedMetadata);
    console.log(`✅ Created ${chunks.length} chunks`);

    // **שלב 5: שמירה במאגר + יצירת embeddings**
    console.log("\n💾 Step 5: Saving to knowledge base...");
    
    const savedItems = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const knowledgeItem = await base44.asServiceRole.entities.KnowledgeBase.create({
        subject: detectedMetadata.subject,
        knowledge_type: detectedMetadata.knowledge_type,
        content: chunk.content,
        content_latex: chunk.latex,
        unit_level: detectedMetadata.unit_level,
        topic: chunk.topic || detectedMetadata.topic,
        sub_topic: chunk.subTopic,
        priority: 0.7,
        active: true,
        source_url: fileUrl,
        year: detectedMetadata.year,
        lang: 'he',
        tags: detectedMetadata.tags,
        difficulty: detectedMetadata.difficulty,
        chunk_text: chunk.cleanText
      });
      
      savedItems.push(knowledgeItem);
      console.log(`  ✅ Saved chunk ${i + 1}/${chunks.length}`);
    }

    // **שלב 6: יצירת embeddings (אסינכרוני)**
    console.log("\n🧠 Step 6: Generating embeddings (async)...");
    
    // קריאה אסינכרונית ליצירת embeddings
    base44.functions.invoke('embeddings', {
      batchUpdate: true
    }).catch(err => {
      console.error("⚠️ Embeddings generation failed:", err);
    });

    console.log("=".repeat(60));
    console.log(`✅ SUCCESS - Created ${savedItems.length} knowledge items`);
    console.log("=".repeat(60));

    return Response.json({
      success: true,
      processed: {
        chunks: savedItems.length,
        totalChars: extractedText.length,
        metadata: detectedMetadata
      },
      items: savedItems.map(item => ({
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
 * זיהוי אוטומטי של metadata
 */
async function detectMetadata(text, providedMetadata, base44) {
  const prompt = `
נתח את הטקסט הבא וזהה:
1. מקצוע (מתמטיקה/פיזיקה/ביולוגיה/אנגלית וכו')
2. סוג התוכן (תיאוריה/דוגמה/בגרות/פתרון)
3. נושא ראשי
4. רמת קושי (קל/בינוני/קשה)
5. תגיות רלוונטיות

הטקסט:
${text.substring(0, 2000)}...

החזר JSON בדיוק בפורמט הזה:
{
  "subject": "...",
  "knowledge_type": "...",
  "topic": "...",
  "difficulty": "...",
  "tags": ["...", "..."]
}
`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          knowledge_type: { type: "string" },
          topic: { type: "string" },
          difficulty: { type: "string" },
          tags: { type: "array", items: { type: "string" } }
        }
      }
    });
    
    return {
      ...result,
      unit_level: providedMetadata?.unit_level || "5",
      year: providedMetadata?.year || new Date().getFullYear()
    };
  } catch (error) {
    console.log("⚠️ Auto-detection failed, using defaults");
    return {
      subject: providedMetadata?.subject || "מתמטיקה",
      knowledge_type: "תיאוריה",
      topic: providedMetadata?.topic || "כללי",
      difficulty: "בינוני",
      tags: [],
      unit_level: "5",
      year: new Date().getFullYear()
    };
  }
}

/**
 * פיצול חכם לסעיפים
 */
function intelligentChunk(text, metadata) {
  const chunks = [];
  
  // זיהוי כותרות (דפוסים עבריים נפוצים)
  const sections = text.split(/\n(?=פרק|נושא|חלק|סעיף|\d+\.\s)/);
  
  for (const section of sections) {
    if (section.trim().length < 100) continue; // דילוג על סעיפים קצרים מדי
    
    // חילוץ כותרת
    const firstLine = section.split('\n')[0];
    const topic = firstLine.length < 100 ? firstLine.trim() : metadata.topic;
    
    // חילוץ LaTeX
    const latexMatches = section.match(/\$\$?[^\$]+\$\$?/g);
    const latex = latexMatches ? latexMatches.join(' ') : '';
    
    // ניקוי טקסט לחיפוש
    const cleanText = section
      .replace(/\$\$?[^\$]+\$\$?/g, ' ')
      .replace(/[^\u0590-\u05FF\u0020-\u007Ea-zA-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // פיצול נוסף אם ארוך מדי
    if (section.length > 1500) {
      const subChunks = smartSplit(section, 800);
      subChunks.forEach((subChunk, idx) => {
        chunks.push({
          content: subChunk,
          latex,
          cleanText: cleanText.substring(idx * 800, (idx + 1) * 800),
          topic,
          subTopic: idx > 0 ? `${topic} (חלק ${idx + 1})` : null
        });
      });
    } else {
      chunks.push({
        content: section,
        latex,
        cleanText,
        topic,
        subTopic: null
      });
    }
  }
  
  return chunks;
}

/**
 * פיצול חכם שמשמר הקשר
 */
function smartSplit(text, maxSize) {
  const chunks = [];
  const paragraphs = text.split('\n\n');
  
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxSize && currentChunk.length > 0) {
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