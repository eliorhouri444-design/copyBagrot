import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🚀 Enhanced Caching System - חלופה ל-Redis
 * משתמש ב-SolvedQuestion entity כמערכת caching מתקדמת
 */

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

    const body = await req.json();
    const { operation, question, subject, topic, similarity_threshold = 0.85 } = body;

    console.log("🚀 Cache Operation:", operation);

    // ✅ שלב 1: חישוב hash לשאלה
    const questionHash = async (text) => {
      const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
      const encoder = new TextEncoder();
      const data = encoder.encode(normalized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    if (operation === 'get') {
      // חיפוש במטמון
      const hash = await questionHash(question);
      
      // חיפוש exact match
      const exactMatches = await base44.asServiceRole.entities.SolvedQuestion.filter({
        question_hash: hash,
        subject: subject
      });

      if (exactMatches.length > 0) {
        const cached = exactMatches[0];
        
        // עדכון usage counter
        await base44.asServiceRole.entities.SolvedQuestion.update(cached.id, {
          times_used: (cached.times_used || 0) + 1
        });

        console.log("✅ Cache HIT (exact):", cached.id);

        return Response.json({
          success: true,
          cached: true,
          cache_type: 'exact',
          solution: cached,
          metadata: {
            times_used: cached.times_used + 1,
            last_used: new Date().toISOString(),
            cache_age_hours: Math.round((Date.now() - new Date(cached.created_date).getTime()) / 3600000)
          }
        });
      }

      // חיפוש similar matches
      const allQuestions = await base44.asServiceRole.entities.SolvedQuestion.filter({
        subject: subject,
        topic: topic
      });

      // Simple similarity check
      const similarQuestions = allQuestions.filter(q => {
        const sim = calculateSimilarity(question, q.question_text);
        return sim >= similarity_threshold;
      }).sort((a, b) => b.times_used - a.times_used);

      if (similarQuestions.length > 0) {
        const cached = similarQuestions[0];
        
        await base44.asServiceRole.entities.SolvedQuestion.update(cached.id, {
          times_used: (cached.times_used || 0) + 1
        });

        console.log("✅ Cache HIT (similar):", cached.id);

        return Response.json({
          success: true,
          cached: true,
          cache_type: 'similar',
          solution: cached,
          metadata: {
            similarity: calculateSimilarity(question, cached.question_text),
            times_used: cached.times_used + 1
          }
        });
      }

      console.log("❌ Cache MISS");
      return Response.json({
        success: true,
        cached: false
      });
    }

    if (operation === 'set') {
      // שמירה במטמון
      const { solution, difficulty, tags } = body;
      const hash = await questionHash(question);

      const newCache = await base44.asServiceRole.entities.SolvedQuestion.create({
        question_text: question,
        question_hash: hash,
        subject: subject,
        topic: topic,
        difficulty: difficulty || 'medium',
        solution_steps: solution.solution_steps || [],
        final_answer: solution.final_answer,
        tags: tags || [],
        source: 'ai_generated',
        verified: false,
        times_used: 1,
        diagrams: solution.diagrams || [],
        graph_data: solution.graph_data || null
      });

      console.log("✅ Cached new solution:", newCache.id);

      return Response.json({
        success: true,
        cached: true,
        cache_id: newCache.id
      });
    }

    if (operation === 'stats') {
      // סטטיסטיקות מטמון
      const allCached = await base44.asServiceRole.entities.SolvedQuestion.list();
      
      const totalQuestions = allCached.length;
      const totalUsage = allCached.reduce((sum, q) => sum + (q.times_used || 0), 0);
      const avgUsage = totalQuestions > 0 ? totalUsage / totalQuestions : 0;
      const cacheHitRate = totalUsage > totalQuestions ? ((totalUsage - totalQuestions) / totalUsage * 100).toFixed(1) : 0;

      return Response.json({
        success: true,
        stats: {
          total_cached_questions: totalQuestions,
          total_usage: totalUsage,
          average_usage_per_question: avgUsage.toFixed(2),
          estimated_cache_hit_rate: cacheHitRate + '%',
          by_subject: getBySubject(allCached),
          by_difficulty: getByDifficulty(allCached),
          most_used: allCached.sort((a, b) => (b.times_used || 0) - (a.times_used || 0)).slice(0, 10)
        }
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid operation'
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Cache Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Helper: Simple text similarity
function calculateSimilarity(text1, text2) {
  const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
  const t1 = normalize(text1);
  const t2 = normalize(text2);
  
  if (t1 === t2) return 1.0;
  
  const words1 = new Set(t1.split(' '));
  const words2 = new Set(t2.split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Helper: Group by subject
function getBySubject(questions) {
  const grouped = {};
  questions.forEach(q => {
    grouped[q.subject] = (grouped[q.subject] || 0) + 1;
  });
  return grouped;
}

// Helper: Group by difficulty
function getByDifficulty(questions) {
  const grouped = {};
  questions.forEach(q => {
    const diff = q.difficulty || 'medium';
    grouped[diff] = (grouped[diff] || 0) + 1;
  });
  return grouped;
}