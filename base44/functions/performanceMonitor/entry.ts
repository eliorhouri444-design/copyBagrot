import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 📊 Performance Monitor
 * מעקב אחר ביצועים, זמני תגובה, שימוש במשאבים
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
    const { event_type, duration_ms, metadata } = body;

    console.log("📊 Performance Event:", event_type, duration_ms + "ms");

    // שמירה ב-ChatMessage כ-metadata
    if (event_type === 'solver_response') {
      const performanceData = {
        event: event_type,
        duration: duration_ms,
        timestamp: new Date().toISOString(),
        user: user.email,
        metadata: metadata
      };

      // יצירת דוח ביצועים
      const report = {
        response_time: duration_ms,
        is_slow: duration_ms > 5000,
        is_fast: duration_ms < 2000,
        quality_score: duration_ms < 2000 ? 100 : duration_ms < 5000 ? 80 : 50,
        recommendations: []
      };

      if (duration_ms > 5000) {
        report.recommendations.push('שקול שימוש במטמון');
        report.recommendations.push('בדוק אם יש שאלה דומה במאגר');
      }

      if (metadata?.cached) {
        report.recommendations.push('✅ המטמון עבד מצוין!');
      }

      return Response.json({
        success: true,
        performance: report,
        data: performanceData
      });
    }

    if (event_type === 'get_stats') {
      // סטטיסטיקות ביצועים כלליות
      const allMessages = await base44.asServiceRole.entities.ChatMessage.filter({
        role: 'assistant'
      });

      const responseTimes = allMessages
        .filter(m => m.response_time_ms)
        .map(m => m.response_time_ms);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

      const fastResponses = responseTimes.filter(t => t < 2000).length;
      const slowResponses = responseTimes.filter(t => t > 5000).length;

      return Response.json({
        success: true,
        stats: {
          total_responses: allMessages.length,
          avg_response_time: Math.round(avgResponseTime),
          fast_responses: fastResponses,
          slow_responses: slowResponses,
          fast_rate: ((fastResponses / responseTimes.length) * 100).toFixed(1) + '%',
          slow_rate: ((slowResponses / responseTimes.length) * 100).toFixed(1) + '%'
        }
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid operation'
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Performance Monitor Error:", error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});