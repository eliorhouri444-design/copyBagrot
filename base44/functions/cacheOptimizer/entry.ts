import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🚀 Cache Optimizer - אופטימיזציה חכמה של המטמון
 * שלב 3: ניהול מתקדם, ניקוי אוטומטי, אנליטיקס
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Admin only' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { operation } = body;

    console.log("🚀 Cache Optimizer - Operation:", operation);

    if (operation === 'cleanup') {
      // ניקוי שאלות לא פופולריות
      const allQuestions = await base44.asServiceRole.entities.SolvedQuestion.list();
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const toDelete = allQuestions.filter(q => {
        const isOld = new Date(q.created_date) < thirtyDaysAgo;
        const notUsed = (q.times_used || 0) === 0;
        const notVerified = !q.verified;
        
        return isOld && notUsed && notVerified;
      });

      let deletedCount = 0;
      for (const q of toDelete) {
        await base44.asServiceRole.entities.SolvedQuestion.delete(q.id);
        deletedCount++;
      }

      console.log(`✅ Deleted ${deletedCount} unused questions`);

      return Response.json({
        success: true,
        deleted_count: deletedCount,
        remaining: allQuestions.length - deletedCount
      });
    }

    if (operation === 'optimize') {
      // אופטימיזציה של השאלות
      const allQuestions = await base44.asServiceRole.entities.SolvedQuestion.list();
      
      // מיזוג שאלות כמעט זהות
      const duplicatePairs = [];
      
      for (let i = 0; i < allQuestions.length; i++) {
        for (let j = i + 1; j < allQuestions.length; j++) {
          const q1 = allQuestions[i];
          const q2 = allQuestions[j];
          
          if (q1.question_hash === q2.question_hash) {
            duplicatePairs.push([q1, q2]);
          }
        }
      }

      let mergedCount = 0;
      for (const [q1, q2] of duplicatePairs) {
        const keepQuestion = q1.times_used >= q2.times_used ? q1 : q2;
        const deleteQuestion = keepQuestion.id === q1.id ? q2 : q1;
        
        await base44.asServiceRole.entities.SolvedQuestion.update(keepQuestion.id, {
          times_used: (q1.times_used || 0) + (q2.times_used || 0),
          avg_rating: ((q1.avg_rating || 0) + (q2.avg_rating || 0)) / 2
        });
        
        await base44.asServiceRole.entities.SolvedQuestion.delete(deleteQuestion.id);
        mergedCount++;
      }

      console.log(`✅ Merged ${mergedCount} duplicate questions`);

      return Response.json({
        success: true,
        merged_count: mergedCount
      });
    }

    if (operation === 'analytics') {
      // אנליטיקס מתקדם
      const allQuestions = await base44.asServiceRole.entities.SolvedQuestion.list();
      
      const totalQuestions = allQuestions.length;
      const totalUsage = allQuestions.reduce((sum, q) => sum + (q.times_used || 0), 0);
      const verifiedCount = allQuestions.filter(q => q.verified).length;
      
      const bySubject = {};
      const byDifficulty = {};
      const bySource = {};
      
      allQuestions.forEach(q => {
        bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
        byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
        bySource[q.source] = (bySource[q.source] || 0) + 1;
      });

      const topUsed = allQuestions
        .sort((a, b) => (b.times_used || 0) - (a.times_used || 0))
        .slice(0, 10)
        .map(q => ({
          id: q.id,
          question: q.question_text.substring(0, 100),
          times_used: q.times_used,
          subject: q.subject,
          topic: q.topic
        }));

      const cacheHitRate = totalUsage > totalQuestions 
        ? ((totalUsage - totalQuestions) / totalUsage * 100).toFixed(1)
        : 0;

      const estimatedCostSaved = (totalUsage - totalQuestions) * 0.02; // $0.02 per API call

      return Response.json({
        success: true,
        analytics: {
          total_questions: totalQuestions,
          total_usage: totalUsage,
          verified_count: verifiedCount,
          verification_rate: ((verifiedCount / totalQuestions) * 100).toFixed(1) + '%',
          cache_hit_rate: cacheHitRate + '%',
          estimated_cost_saved: '$' + estimatedCostSaved.toFixed(2),
          by_subject: bySubject,
          by_difficulty: byDifficulty,
          by_source: bySource,
          top_used: topUsed,
          avg_usage_per_question: (totalUsage / totalQuestions).toFixed(2)
        }
      });
    }

    if (operation === 'preload') {
      // טעינה מקדימה של שאלות פופולריות
      const { subject, topic, count = 50 } = body;
      
      const popularQuestions = await base44.asServiceRole.entities.SolvedQuestion.filter({
        subject: subject,
        topic: topic
      });

      const sorted = popularQuestions
        .sort((a, b) => (b.times_used || 0) - (a.times_used || 0))
        .slice(0, count);

      return Response.json({
        success: true,
        preloaded: sorted.length,
        questions: sorted.map(q => ({
          id: q.id,
          question: q.question_text.substring(0, 100),
          times_used: q.times_used
        }))
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid operation'
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Cache Optimizer Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});