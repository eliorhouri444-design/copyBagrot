// Hook לטעינת כל נתוני דף הבית בקריאה אחת
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { DataCache, createCacheKey, cachedFetch } from './DataCache';

export function useHomeData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await base44.auth.me();
      
      if (!user?.subject_selected) {
        setData({ user, needsOnboarding: true });
        setIsLoading(false);
        return;
      }
      
      const subject = user.selected_subject || 'אנגלית';
      const units = parseInt(user.selected_units || 3);
      const cacheKey = createCacheKey('home_data', { subject, units, email: user.email });
      
      // בדוק cache (אלא אם forceRefresh)
      if (!forceRefresh) {
        const cached = DataCache.get(cacheKey);
        if (cached) {
          console.log('📦 Home data from cache');
          setData({ ...cached, user });
          setIsLoading(false);
          return;
        }
      }
      
      console.log('🌐 Fetching home data from server');
      
      // קריאה מקבילית אחת לכל הנתונים
      const [topics, attempts, examAttempts, modules] = await Promise.all([
        base44.entities.TopicNew.filter(
          { subject_id: subject, unit_level: units, is_active: true },
          null,
          50
        ),
        base44.entities.AttemptNew.filter(
          { created_by: user.email, subject_id: subject },
          "-created_date",
          100 // מוגבל ל-100 האחרונים
        ),
        base44.entities.ExamAttempt.filter(
          { subject: subject, unit_level: units },
          "-created_date",
          30 // מוגבל ל-30 האחרונים
        ),
        base44.entities.ModuleDefinition.filter(
          { subject: subject, unit_level: units },
          null,
          20
        )
      ]);
      
      // חישוב סטטיסטיקות ב-Client Side
      const stats = calculateStats(attempts, examAttempts, topics);
      
      // בניית מודולים עם defaults
      const finalModules = buildModules(modules, subject, units);
      
      // מצא פעילות אחרונה
      const lastActivity = findLastActivity(attempts, examAttempts, topics, finalModules);
      
      const homeData = {
        topics,
        attempts,
        examAttempts,
        modules: finalModules,
        stats,
        lastActivity,
        subject,
        units
      };
      
      // שמור ב-cache ל-5 דקות
      DataCache.set(cacheKey, homeData, DataCache.DURATION.SHORT);
      
      setData({ ...homeData, user });
      
    } catch (err) {
      console.error('Error loading home data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // טעינה ראשונית
  useEffect(() => {
    loadData();
  }, [loadData]);

  // האזנה לאירועי עדכון
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 Cache update triggered - refreshing home data');
      loadData(true);
    };
    
    window.addEventListener('practice-complete', handleUpdate);
    window.addEventListener('exam-complete', handleUpdate);
    window.addEventListener('cache-update', handleUpdate);
    
    return () => {
      window.removeEventListener('practice-complete', handleUpdate);
      window.removeEventListener('exam-complete', handleUpdate);
      window.removeEventListener('cache-update', handleUpdate);
    };
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh: () => loadData(true)
  };
}

// ============================================
// פונקציות חישוב ב-Client Side
// ============================================

function calculateStats(attempts, examAttempts, topics) {
  // חישוב רמת שליטה כללית
  const correctAttempts = attempts.filter(a => a.status === 'correct').length;
  const totalAttempts = attempts.length;
  const practiceAccuracy = totalAttempts > 0 
    ? Math.round((correctAttempts / totalAttempts) * 100) 
    : 0;
  
  // חישוב ממוצע בגרויות
  const completedExams = examAttempts.filter(e => e.is_completed);
  const examAverage = completedExams.length > 0
    ? Math.round(completedExams.reduce((sum, e) => sum + (e.score_percent || 0), 0) / completedExams.length)
    : 0;
  
  // שליטה כללית (משוקלל)
  const overallMastery = Math.round((practiceAccuracy * 0.4) + (examAverage * 0.6));
  
  // ספירת נושאים
  const topicsWithAttempts = new Set(attempts.map(a => a.topic_id)).size;
  
  // שאלות היום
  const today = new Date().toISOString().split('T')[0];
  const todayAttempts = attempts.filter(a => 
    a.created_date?.startsWith(today)
  ).length;
  
  return {
    practiceAccuracy,
    examAverage,
    overallMastery,
    topicsWithAttempts,
    totalTopics: topics.length,
    todayAttempts,
    totalPracticeAttempts: totalAttempts,
    totalExamAttempts: examAttempts.length,
    completedExams: completedExams.length
  };
}

function buildModules(customModules, subject, units) {
  const defaultModulesStructure = {
    "אנגלית": {
      3: [
        { id: "C", title: "מודול C", color: "from-purple-500 to-purple-600" },
        { id: "A", title: "מודול A", color: "from-blue-500 to-blue-600" },
        { id: "B", title: "מודול B", color: "from-cyan-500 to-cyan-600" }
      ],
      4: [
        { id: "C", title: "מודול C", color: "from-blue-500 to-blue-600" },
        { id: "D", title: "מודול D", color: "from-orange-500 to-orange-600" },
        { id: "E", title: "מודול E", color: "from-pink-500 to-pink-600" }
      ],
      5: [
        { id: "E", title: "מודול E", color: "from-indigo-500 to-indigo-600" },
        { id: "F", title: "מודול F", color: "from-rose-500 to-rose-600" },
        { id: "G", title: "מודול G", color: "from-green-500 to-green-600" }
      ]
    },
    "מתמטיקה": {
      3: [
        { id: "801", title: "שאלון 801", color: "from-purple-500 to-purple-600" },
        { id: "802", title: "שאלון 802", color: "from-blue-500 to-blue-600" }
      ],
      4: [
        { id: "803", title: "שאלון 803", color: "from-green-500 to-green-600" },
        { id: "804", title: "שאלון 804", color: "from-purple-500 to-purple-600" }
      ],
      5: [
        { id: "805", title: "שאלון 805", color: "from-indigo-500 to-indigo-600" },
        { id: "806", title: "שאלון 806", color: "from-purple-500 to-purple-600" }
      ]
    }
  };

  const defaultMods = defaultModulesStructure[subject]?.[units] || [];
  const modulesMap = new Map();
  
  defaultMods.forEach(mod => modulesMap.set(mod.id, mod));
  
  customModules.forEach(mod => {
    const existing = modulesMap.get(mod.module_id);
    if (existing) {
      modulesMap.set(mod.module_id, { ...existing, ...mod, id: mod.module_id });
    } else {
      modulesMap.set(mod.module_id, { ...mod, id: mod.module_id });
    }
  });

  return Array.from(modulesMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
}

function findLastActivity(attempts, examAttempts, topics, modules) {
  // תרגול אחרון לא הושלם
  const incompletePractice = attempts
    .filter(a => !a.is_completed)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  
  // בגרות אחרונה לא הושלמה
  const incompleteExam = examAttempts
    .filter(e => !e.is_completed)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  if (!incompletePractice && !incompleteExam) return null;

  if (!incompleteExam || (incompletePractice && 
      new Date(incompletePractice.created_date) > new Date(incompleteExam.created_date))) {
    return {
      type: 'practice',
      topic: topics.find(t => t.topic_id === incompletePractice.topic_id)?.name || 'תרגול',
      sessionId: incompletePractice.session_id,
      topicId: incompletePractice.topic_id
    };
  } else {
    const examModule = modules.find(m => incompleteExam.module_id === m.id);
    return {
      type: 'exam',
      topic: examModule?.title || incompleteExam.module_id || 'שאלון',
      examId: incompleteExam.exam_id,
      moduleId: incompleteExam.module_id
    };
  }
}

export default useHomeData;