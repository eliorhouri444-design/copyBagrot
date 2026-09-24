import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🔍 Semantic Search מתקדם
 * 
 * חיפוש היברידי משולב:
 * 1. Vector similarity (semantic)
 * 2. Keyword matching (BM25-like)
 * 3. Metadata filtering
 * 4. Re-ranking
 */

Deno.serve(async (req) => {
  console.log("=".repeat(60));
  console.log("🔍 SEMANTIC SEARCH");
  console.log("=".repeat(60));
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await req.json();
    const { query, filters, topK = 5, hybridWeight = 0.7 } = body;

    if (!query) {
      return Response.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 });
    }

    console.log("🔎 Query:", query);
    console.log("🎯 Filters:", filters);
    console.log("📊 Top K:", topK);

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");

    // **שלב 1: יצירת embedding לשאילתה**
    console.log("\n📍 Step 1: Generating query embedding...");
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        encoding_format: "float"
      })
    });

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    console.log("✅ Query embedding generated");

    // **שלב 2: שליפת כל הפריטים הרלוונטיים**
    console.log("\n📚 Step 2: Fetching knowledge items...");
    
    let knowledgeItems = await base44.asServiceRole.entities.KnowledgeBase.filter({
      active: true
    });

    // סינון לפי metadata
    if (filters?.subject) {
      knowledgeItems = knowledgeItems.filter(k => k.subject === filters.subject);
    }
    if (filters?.unit_level) {
      knowledgeItems = knowledgeItems.filter(k => k.unit_level === filters.unit_level);
    }
    if (filters?.difficulty) {
      knowledgeItems = knowledgeItems.filter(k => k.difficulty === filters.difficulty);
    }

    console.log(`📦 Found ${knowledgeItems.length} items after filtering`);

    // **שלב 3: חישוב דמיון וקטורי**
    console.log("\n🧮 Step 3: Computing similarity scores...");
    
    const itemsWithScores = knowledgeItems
      .filter(item => item.embedding && item.embedding.length > 0)
      .map(item => {
        // חישוב cosine similarity
        const vectorScore = cosineSimilarity(queryEmbedding, item.embedding);
        
        // חישוב keyword score
        const keywordScore = calculateKeywordScore(query, item);
        
        // שילוב היברידי
        const hybridScore = (hybridWeight * vectorScore) + ((1 - hybridWeight) * keywordScore);
        
        return {
          ...item,
          scores: {
            vector: vectorScore,
            keyword: keywordScore,
            hybrid: hybridScore
          }
        };
      });

    console.log(`✅ Scored ${itemsWithScores.length} items`);

    // **שלב 4: מיון ולקיחת Top K**
    console.log("\n🏆 Step 4: Ranking and selecting top results...");
    
    const topResults = itemsWithScores
      .sort((a, b) => b.scores.hybrid - a.scores.hybrid)
      .slice(0, topK);

    console.log(`✅ Selected top ${topResults.length} results`);

    // **שלב 5: Re-ranking (אופציונלי) - לפי priority**
    const reranked = topResults.map(item => {
      const priorityBoost = (item.priority || 0.5) * 0.2;
      const finalScore = item.scores.hybrid + priorityBoost;
      return {
        ...item,
        scores: {
          ...item.scores,
          final: finalScore
        }
      };
    }).sort((a, b) => b.scores.final - a.scores.final);

    console.log("=".repeat(60));
    console.log("✅ SEARCH COMPLETED");
    console.log("=".repeat(60));

    return Response.json({
      success: true,
      results: reranked.map(item => ({
        id: item.id,
        subject: item.subject,
        topic: item.topic,
        sub_topic: item.sub_topic,
        content: item.content,
        content_latex: item.content_latex,
        source_url: item.source_url,
        difficulty: item.difficulty,
        scores: item.scores
      })),
      metadata: {
        total_searched: knowledgeItems.length,
        total_scored: itemsWithScores.length,
        returned: reranked.length,
        query_length: query.length
      }
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
 * חישוב Cosine Similarity בין שני וקטורים
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

/**
 * חישוב ציון מילות מפתח (BM25-like)
 */
function calculateKeywordScore(query, item) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  const searchableText = [
    item.topic,
    item.sub_topic,
    item.content,
    item.chunk_text,
    ...(item.tags || [])
  ].join(' ').toLowerCase();
  
  let score = 0;
  let matchedTerms = 0;
  
  for (const term of queryTerms) {
    if (searchableText.includes(term)) {
      // ציון גבוה יותר לנושא/תת-נושא
      if (item.topic?.toLowerCase().includes(term)) {
        score += 3;
      } else if (item.sub_topic?.toLowerCase().includes(term)) {
        score += 2;
      } else {
        score += 1;
      }
      matchedTerms++;
    }
  }
  
  // נרמול לפי מספר המונחים
  return queryTerms.length > 0 ? score / queryTerms.length : 0;
}