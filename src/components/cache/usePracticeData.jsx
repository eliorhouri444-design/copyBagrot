// Hook לטעינת כל נתוני דף התרגול בקריאה אחת
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { DataCache, createCacheKey } from './DataCache';

export function usePracticeData(subject, units) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!subject || !units) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await base44.auth.me();
      const cacheKey = createCacheKey('practice_data', { subject, units, email: user.email });
      
      // בדוק cache
      if (!forceRefresh) {
        const cached = DataCache.get(cacheKey);
        if (cached) {
          console.log('📦 Practice data from cache');
          setData({ ...cached, user });
          setIsLoading(false);
          return;
        }
      }
      
      console.log('🌐 Fetching practice data from server');
      
      // קריאה מקבילית אחת
      const [topics, questions, attempts, recentSessions] = await Promise.all([
        base44.entities.TopicNew.filter(
          { subject_id: subject, unit_level: parseInt(units), is_active: true },
          'order',
          50
        ),
        base44.entities.QuestionBank.filter(
          { subject_id: subject, unit_level: parseInt(units), is_active: true },
          null,
          500
        ),
        base44.entities.AttemptNew.filter(
          { created_by: user.email, subject_id: subject },
          "-created_date",
          200
        ),
        base44.entities.PracticeSessionNew.filter(
          { created_by: user.email, subject_id: subject },
          "-created_date",
          20
        )
      ]);
      
      // חישוב סטטיסטיקות לכל נושא ב-Client Side
      const topicsWithStats = calculateTopicStats(topics, questions, attempts);
      
      const practiceData = {
        topics: topicsWithStats,
        questions,
        attempts,
        recentSessions,
        subject,
        units
      };
      
      // שמור ב-cache ל-5 דקות
      DataCache.set(cacheKey, practiceData, DataCache.DURATION.SHORT);
      
      setData({ ...practiceData, user });
      
    } catch (err) {
      console.error('Error loading practice data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [subject, units]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // האזנה לאירועי עדכון
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 Practice cache update triggered');
      loadData(true);
    };
    
    window.addEventListener('practice-complete', handleUpdate);
    window.addEventListener('cache-update', handleUpdate);
    
    // רענון כשחוזרים לדף
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // בדוק אם ה-cache פג תוקף
        const cacheKey = createCacheKey('practice_data', { subject, units });
        if (!DataCache.get(cacheKey)) {
          loadData();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('practice-complete', handleUpdate);
      window.removeEventListener('cache-update', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData, subject, units]);

  return {
    data,
    isLoading,
    error,
    refresh: () => loadData(true)
  };
}

// ============================================
// חישוב סטטיסטיקות נושאים ב-Client
// ============================================

function calculateTopicStats(topics, questions, attempts) {
  // בנה מפה של שאלות לכל נושא
  const questionsByTopic = {};
  questions.forEach(q => {
    if (!q.topic_id) return;
    if (!questionsByTopic[q.topic_id]) {
      questionsByTopic[q.topic_id] = [];
    }
    questionsByTopic[q.topic_id].push(q);
  });
  
  // בנה מפה של ניסיונות לכל נושא
  const attemptsByTopic = {};
  attempts.forEach(a => {
    if (!a.topic_id) return;
    if (!attemptsByTopic[a.topic_id]) {
      attemptsByTopic[a.topic_id] = [];
    }
    attemptsByTopic[a.topic_id].push(a);
  });
  
  return topics.map(topic => {
    const topicQuestions = questionsByTopic[topic.topic_id] || [];
    const topicAttempts = attemptsByTopic[topic.topic_id] || [];
    
    // ספירת שאלות ייחודיות שנענו נכון
    const correctAnswersMap = {};
    topicAttempts.forEach(a => {
      if (a.status === 'correct') {
        correctAnswersMap[a.question_id] = true;
      }
    });
    const uniqueCorrectAnswers = Object.keys(correctAnswersMap).length;
    
    // ספירת סטים לפי ציונים
    const sessionMap = {};
    topicAttempts.forEach(a => {
      const sessionId = a.session_id || 'unknown';
      if (!sessionMap[sessionId]) sessionMap[sessionId] = [];
      sessionMap[sessionId].push(a);
    });
    
    let failedSets = 0, mediumSets = 0, excellentSets = 0;
    Object.entries(sessionMap).forEach(([key, sessionAttempts]) => {
      if (key === 'unknown') return;
      const correct = sessionAttempts.filter(a => a.status === 'correct').length;
      const total = sessionAttempts.length;
      const percentage = total > 0 ? (correct / total) * 100 : 0;
      
      if (percentage < 56) failedSets++;
      else if (percentage <= 85) mediumSets++;
      else excellentSets++;
    });
    
    const totalQuestionsInTopic = topicQuestions.length;
    const progress = totalQuestionsInTopic > 0 
      ? Math.min(100, Math.round((uniqueCorrectAnswers / totalQuestionsInTopic) * 100)) 
      : 0;
    
    return {
      ...topic,
      questionCount: totalQuestionsInTopic,
      stats: {
        correct: topicAttempts.filter(a => a.status === 'correct').length,
        wrong: topicAttempts.filter(a => a.status === 'incorrect').length,
        total: topicAttempts.length,
        progress,
        uniqueCorrectAnswers,
        totalQuestionsInTopic,
        failedSets,
        mediumSets,
        excellentSets
      }
    };
  });
}

export default usePracticeData;