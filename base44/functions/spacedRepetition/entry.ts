import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 📅 Spaced Repetition - חזרה מרווחת אופטימלית
 * 
 * מערכת SM-2 (SuperMemo 2) לתזמון חזרות
 */

Deno.serve(async (req) => {
  console.log("📅 SPACED REPETITION");
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { action, topicKey, quality } = body;

    if (action === 'schedule') {
      // קבל נושאים לחזרה היום
      const stats = await base44.entities.UserTopicStats.filter({
        created_by: user.email
      });

      const today = new Date();
      const itemsDue = [];

      for (const stat of stats) {
        const nextReview = stat.next_review_date ? new Date(stat.next_review_date) : today;
        
        if (nextReview <= today) {
          itemsDue.push({
            topic_key: stat.topic_key,
            subject: stat.subject,
            unit_level: stat.unit_level,
            interval: stat.review_interval || 1,
            repetitions: stat.repetitions || 0,
            easiness: stat.easiness_factor || 2.5
          });
        }
      }

      return Response.json({
        success: true,
        itemsDue: itemsDue.length,
        items: itemsDue.slice(0, 10) // עד 10 נושאים ליום
      });

    } else if (action === 'update') {
      // עדכון אחרי חזרה
      const stats = await base44.entities.UserTopicStats.filter({
        created_by: user.email,
        topic_key: topicKey
      });

      if (stats.length === 0) {
        return Response.json({ success: false, error: 'Topic not found' }, { status: 404 });
      }

      const stat = stats[0];
      const result = calculateNextReview(
        quality,
        stat.repetitions || 0,
        stat.easiness_factor || 2.5,
        stat.review_interval || 1
      );

      await base44.entities.UserTopicStats.update(stat.id, {
        repetitions: result.repetitions,
        easiness_factor: result.easiness,
        review_interval: result.interval,
        next_review_date: result.nextReviewDate.toISOString()
      });

      return Response.json({
        success: true,
        nextReview: result.nextReviewDate,
        interval: result.interval,
        message: getEncouragementMessage(quality)
      });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

/**
 * אלגוריתם SM-2
 */
function calculateNextReview(quality, repetitions, easiness, interval) {
  // quality: 0-5 (0=לא זכרתי, 5=מושלם)
  
  let newEasiness = easiness;
  let newRepetitions = repetitions;
  let newInterval = interval;

  if (quality >= 3) {
    // תשובה נכונה
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easiness);
    }
    newRepetitions++;
  } else {
    // תשובה שגויה - התחל מחדש
    newRepetitions = 0;
    newInterval = 1;
  }

  // עדכון קושי
  newEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (newEasiness < 1.3) {
    newEasiness = 1.3;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easiness: newEasiness,
    interval: newInterval,
    nextReviewDate
  };
}

/**
 * הודעת עידוד
 */
function getEncouragementMessage(quality) {
  const messages = {
    5: '🌟 מושלם! תראה את זה שוב בעוד הרבה זמן!',
    4: '✨ מצוין! המשך ככה!',
    3: '👍 טוב! עוד קצת תרגול ותהיה שם!',
    2: '💪 בסדר, צריך עוד תרגול',
    1: '📚 קצת קשה - בוא נחזור על זה בקרוב',
    0: '🔄 בואו נתרגל את זה שוב מחר'
  };
  
  return messages[quality] || messages[3];
}