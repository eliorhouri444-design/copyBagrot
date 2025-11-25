import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Global event for mastery updates
const MASTERY_UPDATE_EVENT = 'mastery-update';
const PRACTICE_COMPLETE_EVENT = 'practice-complete';
const EXAM_COMPLETE_EVENT = 'exam-complete';

// Hook לחישוב מדדי שליטה לנושאים ושאלונים
export function useMasteryData(subject, units) {
  const [topicsMastery, setTopicsMastery] = useState([]);
  const [modulesMastery, setModulesMastery] = useState([]);
  const [overallMastery, setOverallMastery] = useState({
    totalTopicMastery: 0,
    examsMastery: 0,
    readinessScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [rawData, setRawData] = useState({
    topics: [],
    attempts: [],
    examAttempts: [],
    modules: []
  });

  // טעינת נתונים מהשרת
  const loadMasteryData = useCallback(async () => {
    if (!subject || !units) return;
    
    setIsLoading(true);
    try {
      const [user, topics, attempts, examAttempts, modules] = await Promise.all([
        base44.auth.me(),
        base44.entities.TopicNew.filter({ subject_id: subject, unit_level: parseInt(units), is_active: true }),
        base44.entities.AttemptNew.list("-created_date", 2000),
        base44.entities.ExamAttempt.list("-created_date", 500),
        base44.entities.ModuleDefinition.filter({ subject: subject, unit_level: parseInt(units) })
      ]);

      const userAttempts = attempts.filter(a => a.created_by === user.email && a.subject_id === subject);
      const userExamAttempts = examAttempts.filter(e => e.created_by === user.email);

      setRawData({ topics, attempts: userAttempts, examAttempts: userExamAttempts, modules });

      // חישוב mastery לנושאים
      const topicsWithMastery = calculateTopicsMastery(topics, userAttempts);
      setTopicsMastery(topicsWithMastery);

      // חישוב mastery לשאלונים
      const modulesWithMastery = calculateModulesMastery(modules, userExamAttempts);
      setModulesMastery(modulesWithMastery);

      // חישוב מדדים כלליים
      const overall = calculateOverallMastery(topicsWithMastery, modulesWithMastery);
      setOverallMastery(overall);

    } catch (error) {
      console.error("Error loading mastery data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [subject, units]);

  useEffect(() => {
    loadMasteryData();
  }, [loadMasteryData]);

  // האזנה לאירועי עדכון גלובליים
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 Mastery update triggered');
      loadMasteryData();
    };

    window.addEventListener(MASTERY_UPDATE_EVENT, handleUpdate);
    window.addEventListener(PRACTICE_COMPLETE_EVENT, handleUpdate);
    window.addEventListener(EXAM_COMPLETE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(MASTERY_UPDATE_EVENT, handleUpdate);
      window.removeEventListener(PRACTICE_COMPLETE_EVENT, handleUpdate);
      window.removeEventListener(EXAM_COMPLETE_EVENT, handleUpdate);
    };
  }, [loadMasteryData]);

  // פונקציה לעדכון מדדים אחרי פעולה
  const updateMasteryScores = useCallback(async () => {
    await loadMasteryData();
  }, [loadMasteryData]);

  return {
    topicsMastery,
    modulesMastery,
    overallMastery,
    isLoading,
    updateMasteryScores,
    rawData
  };
}

// חישוב mastery לנושאים
function calculateTopicsMastery(topics, attempts) {
  return topics.map(topic => {
    const topicAttempts = attempts.filter(a => a.topic_id === topic.topic_id);
    const totalAttempts = topicAttempts.length;
    
    if (totalAttempts === 0) {
      return {
        ...topic,
        mastery: {
          subjectMastery: 0,
          attemptsCount: 0,
          correctPercentage: 0,
          errorPercentage: 0,
          weakAreas: [],
          uniqueQuestions: 0,
          correct: 0,
          wrong: 0,
          partial: 0
        }
      };
    }

    const correct = topicAttempts.filter(a => a.status === 'correct').length;
    const wrong = topicAttempts.filter(a => a.status === 'incorrect').length;
    const partial = topicAttempts.filter(a => a.status === 'partial').length;
    
    const uniqueQuestions = new Set(topicAttempts.map(a => a.question_id)).size;
    const correctPercentage = Math.round((correct / totalAttempts) * 100);
    const errorPercentage = Math.round((wrong / totalAttempts) * 100);

    // חישוב SubjectMastery - משקלל נכונות, כמות וייחודיות
    const accuracyWeight = 0.5;
    const volumeWeight = 0.3;
    const uniquenessWeight = 0.2;

    const accuracyScore = correctPercentage;
    const volumeScore = Math.min(100, (totalAttempts / 20) * 100); // 20 ניסיונות = 100%
    const uniquenessScore = Math.min(100, (uniqueQuestions / 10) * 100); // 10 שאלות ייחודיות = 100%

    const subjectMastery = Math.round(
      accuracyScore * accuracyWeight +
      volumeScore * volumeWeight +
      uniquenessScore * uniquenessWeight
    );

    // זיהוי אזורים חלשים - שאלות שנענו שגוי יותר מפעם אחת
    const questionErrors = {};
    topicAttempts.filter(a => a.status === 'incorrect').forEach(a => {
      questionErrors[a.question_id] = (questionErrors[a.question_id] || 0) + 1;
    });
    const weakAreas = Object.entries(questionErrors)
      .filter(([_, count]) => count >= 2)
      .map(([qId]) => qId);

    return {
      ...topic,
      mastery: {
        subjectMastery,
        attemptsCount: totalAttempts,
        correctPercentage,
        errorPercentage,
        weakAreas,
        uniqueQuestions,
        correct,
        wrong,
        partial
      }
    };
  });
}

// חישוב mastery לשאלונים (מודולים)
function calculateModulesMastery(modules, examAttempts) {
  return modules.map(module => {
    // התאמת ניסיונות למודול
    const moduleAttempts = examAttempts.filter(attempt => {
      if (module.entity === 'ModuleAExam' && attempt.exam_type === 'module_a') return true;
      if (module.entity === 'ModuleBExam' && attempt.exam_type === 'module_b') return true;
      if (module.entity === 'ModuleCExam' && attempt.exam_type === 'module_c') return true;
      if (module.entity === 'GenericExam' && attempt.module_id === module.module_id) return true;
      return false;
    });

    const completedExams = moduleAttempts.filter(a => a.is_completed);
    const totalExams = completedExams.length;

    if (totalExams === 0) {
      return {
        ...module,
        mastery: {
          examMastery: 0,
          completedExams: 0,
          totalAvailable: 100, // מספר בגרויות זמינות
          averageExamScore: 0,
          passedExams: 0,
          examWeakAreas: [],
          bestScore: 0,
          lastScore: 0
        }
      };
    }

    const scores = completedExams.map(e => e.score_percent || 0);
    const averageExamScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalExams);
    const passedExams = completedExams.filter(e => (e.score_percent || 0) >= 56).length;
    const bestScore = Math.max(...scores);
    const lastScore = scores[scores.length - 1] || 0;

    // ExamMastery - משקלל ממוצע, עקביות והצלחה
    const avgWeight = 0.4;
    const consistencyWeight = 0.3;
    const passRateWeight = 0.3;

    const avgScore = averageExamScore;
    const consistencyScore = totalExams >= 3 ? 
      Math.max(0, 100 - (Math.max(...scores) - Math.min(...scores))) : 50;
    const passRateScore = (passedExams / totalExams) * 100;

    const examMastery = Math.round(
      avgScore * avgWeight +
      consistencyScore * consistencyWeight +
      passRateScore * passRateWeight
    );

    // זיהוי נושאים חלשים מהבגרויות
    const topicErrors = {};
    completedExams.forEach(exam => {
      if (exam.answers) {
        exam.answers.forEach(ans => {
          if (!ans.is_correct && ans.topic) {
            topicErrors[ans.topic] = (topicErrors[ans.topic] || 0) + 1;
          }
        });
      }
    });
    const examWeakAreas = Object.entries(topicErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    return {
      ...module,
      mastery: {
        examMastery,
        completedExams: totalExams,
        totalAvailable: 100,
        averageExamScore,
        passedExams,
        examWeakAreas,
        bestScore,
        lastScore
      }
    };
  });
}

// חישוב מדדים כלליים
function calculateOverallMastery(topicsWithMastery, modulesWithMastery) {
  // TotalTopicMastery - ממוצע של כל הנושאים
  const topicScores = topicsWithMastery.map(t => t.mastery.subjectMastery);
  const totalTopicMastery = topicScores.length > 0
    ? Math.round(topicScores.reduce((a, b) => a + b, 0) / topicScores.length)
    : 0;

  // ExamsMastery - ממוצע של כל השאלונים
  const examScores = modulesWithMastery.map(m => m.mastery.examMastery);
  const examsMastery = examScores.length > 0
    ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length)
    : 0;

  // ReadinessScore - שילוב של שניהם
  const readinessScore = Math.round(
    totalTopicMastery * 0.4 + 
    examsMastery * 0.6
  );

  return {
    totalTopicMastery,
    examsMastery,
    readinessScore
  };
}

// פונקציה לעדכון מדדים אחרי פעולה (לשימוש גלובלי)
export async function triggerMasteryUpdate() {
  // שלח אירוע לעדכון
  window.dispatchEvent(new CustomEvent('mastery-update'));
}