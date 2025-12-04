// Hook לטעינת כל נתוני דף הבגרויות בקריאה אחת
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { DataCache, createCacheKey } from './DataCache';

export function useExamsData(subject, units) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!subject || !units) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await base44.auth.me();
      const cacheKey = createCacheKey('exams_data', { subject, units, email: user.email });
      
      // בדוק cache
      if (!forceRefresh) {
        const cached = DataCache.get(cacheKey);
        if (cached) {
          console.log('📦 Exams data from cache');
          setData({ ...cached, user });
          setIsLoading(false);
          return;
        }
      }
      
      console.log('🌐 Fetching exams data from server');
      
      // קריאה מקבילית אחת לכל הנתונים
      const [
        moduleDefinitions,
        genericExams,
        moduleAExams,
        moduleBExams,
        moduleCExams,
        examAttempts
      ] = await Promise.all([
        base44.entities.ModuleDefinition.filter(
          { subject: subject, unit_level: parseInt(units) },
          'order',
          20
        ),
        base44.entities.GenericExam.filter(
          { subject: subject, unit_level: parseInt(units) },
          "-created_date",
          100
        ),
        subject === 'אנגלית' ? base44.entities.ModuleAExam.filter(
          { subject: subject, unit_level: parseInt(units) },
          null,
          50
        ) : Promise.resolve([]),
        subject === 'אנגלית' ? base44.entities.ModuleBExam.filter(
          { subject: subject, unit_level: parseInt(units) },
          null,
          50
        ) : Promise.resolve([]),
        subject === 'אנגלית' ? base44.entities.ModuleCExam.filter(
          { subject: subject, unit_level: parseInt(units) },
          null,
          50
        ) : Promise.resolve([]),
        base44.entities.ExamAttempt.filter(
          { created_by: user.email, subject: subject, unit_level: parseInt(units) },
          "-created_date",
          100
        )
      ]);
      
      // בניית מודולים עם defaults
      const modules = buildExamModules(moduleDefinitions, subject, units);
      
      // מיפוי כל הבגרויות
      const allExamsMap = new Map();
      [...genericExams, ...moduleAExams, ...moduleBExams, ...moduleCExams].forEach(exam => {
        allExamsMap.set(exam.id, exam);
      });
      
      // חישוב סטטיסטיקות למודולים ב-Client Side
      const modulesWithStats = calculateModuleStats(modules, examAttempts, {
        genericExams,
        moduleAExams,
        moduleBExams,
        moduleCExams
      });
      
      const examsData = {
        modules: modulesWithStats,
        allExamsMap: Object.fromEntries(allExamsMap),
        examAttempts,
        genericExams,
        moduleAExams,
        moduleBExams,
        moduleCExams,
        subject,
        units
      };
      
      // שמור ב-cache ל-10 דקות
      DataCache.set(cacheKey, examsData, DataCache.DURATION.MEDIUM);
      
      setData({ ...examsData, user });
      
    } catch (err) {
      console.error('Error loading exams data:', err);
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
      console.log('🔄 Exams cache update triggered');
      loadData(true);
    };
    
    window.addEventListener('exam-complete', handleUpdate);
    window.addEventListener('cache-update', handleUpdate);
    
    return () => {
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
// פונקציות עזר
// ============================================

function buildExamModules(customModules, subject, units) {
  const defaultModulesStructure = {
    "אנגלית": {
      3: [
        { id: "C", title: "מודול C", description: "קריאה והבנה", entity: "ModuleCExam", color: "from-purple-500 to-purple-600", order: 0 },
        { id: "A", title: "מודול A", description: "הבנת נשמע", entity: "ModuleAExam", color: "from-blue-500 to-blue-600", order: 1 },
        { id: "B", title: "מודול B", description: "הבנת נשמע מתקדמת", entity: "ModuleBExam", color: "from-cyan-500 to-cyan-600", order: 2 }
      ],
      4: [
        { id: "C", title: "מודול C", description: "הבנת הנקרא", entity: "ModuleCExam", color: "from-blue-500 to-blue-600", order: 0 },
        { id: "D", title: "מודול D", description: "הבעה בכתב", entity: "GenericExam", color: "from-orange-500 to-orange-600", order: 1 },
        { id: "E", title: "מודול E", description: "קריאה מתקדמת", entity: "GenericExam", color: "from-pink-500 to-pink-600", order: 2 }
      ],
      5: [
        { id: "E", title: "מודול E", description: "קריאה גבוהה", entity: "GenericExam", color: "from-indigo-500 to-indigo-600", order: 0 },
        { id: "F", title: "מודול F", description: "כתיבה מתקדמת", entity: "GenericExam", color: "from-rose-500 to-rose-600", order: 1 },
        { id: "G", title: "מודול G", description: "כתיבה יצירתית", entity: "GenericExam", color: "from-green-500 to-green-600", order: 2 }
      ]
    },
    "מתמטיקה": {
      3: [
        { id: "801", title: "שאלון 801", description: "אלגברה בסיסית", entity: "GenericExam", color: "from-purple-500 to-purple-600", order: 0 },
        { id: "802", title: "שאלון 802", description: "גיאומטריה וסטטיסטיקה", entity: "GenericExam", color: "from-blue-500 to-blue-600", order: 1 }
      ],
      4: [
        { id: "803", title: "שאלון 803", description: "טריגונומטריה", entity: "GenericExam", color: "from-green-500 to-green-600", order: 0 },
        { id: "804", title: "שאלון 804", description: "פונקציות מתקדמות", entity: "GenericExam", color: "from-purple-500 to-purple-600", order: 1 }
      ],
      5: [
        { id: "805", title: "שאלון 805", description: "חקירה ודיפרנציאלי", entity: "GenericExam", color: "from-indigo-500 to-indigo-600", order: 0 },
        { id: "806", title: "שאלון 806", description: "אינטגרלים וסדרות", entity: "GenericExam", color: "from-purple-500 to-purple-600", order: 1 }
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

function calculateModuleStats(modules, examAttempts, exams) {
  // פונקציית עזר להתאמה גמישה של מודולים (זהה לזו ב-Exams.js)
  const matchesModule = (moduleId, targetModuleId) => {
    if (!moduleId) return false;
    const id = String(moduleId).trim().toUpperCase();
    const target = String(targetModuleId).trim().toUpperCase();
    
    // התאמה מדויקת
    if (id === target) return true;
    
    // התאמה עם קידומת
    if (id === `MODULE ${target}`) return true;
    if (id === `MODULE${target}`) return true;
    if (id === `SHALON ${target}`) return true;
    
    // התאמה נומרית אגרסיבית (חילוץ מספרים)
    const idNum = id.replace(/\D/g, '');
    const targetNum = target.replace(/\D/g, '');
    if (idNum && targetNum) {
      // התאמה מלאה או סיומת (035804 תואם ל-804)
      if (parseInt(idNum) === parseInt(targetNum)) return true;
      if (idNum.endsWith(targetNum) || targetNum.endsWith(idNum)) return true;
    }
    
    // התאמה רגילה להסרת אפסים מובילים (למקרה שאין מספרים אחרים)
    if (id.replace(/^0+/, '') === target.replace(/^0+/, '')) return true;
    
    // אנגלית - סיומת אות בודדת (למשל "MODULE E" תואם ל-"E")
    if (target.length === 1 && (id.endsWith(` ${target}`) || id === target)) return true;
    
    return false;
  };

  return modules.map(module => {
    // מצא בגרויות של המודול (נסיונות)
    const moduleAttempts = examAttempts.filter(attempt => {
      if (module.entity === 'ModuleAExam' && attempt.exam_type === 'module_a') return true;
      if (module.entity === 'ModuleBExam' && attempt.exam_type === 'module_b') return true;
      if (module.entity === 'ModuleCExam' && attempt.exam_type === 'module_c') return true;
      
      // שימוש בהתאמה גמישה עבור GenericExam
      if (module.entity === 'GenericExam' && matchesModule(attempt.module_id, module.id)) return true;
      return false;
    });
    
    const totalAttempts = moduleAttempts.length;
    const passedAttempts = moduleAttempts.filter(a => (a.score_percent || 0) >= 56).length;
    const avgScore = totalAttempts > 0 
      ? Math.round(moduleAttempts.reduce((sum, a) => sum + (a.score_percent || 0), 0) / totalAttempts)
      : 0;
    
    // חלוקה לפי טווחי ציונים
    const excellentAttempts = moduleAttempts.filter(a => (a.score_percent || 0) >= 86).length;
    const mediumAttempts = moduleAttempts.filter(a => {
      const score = a.score_percent || 0;
      return score >= 56 && score < 86;
    }).length;
    const failedAttempts = moduleAttempts.filter(a => (a.score_percent || 0) < 56).length;
    
    // ספירת בגרויות זמינות למודול (כולל התאמה גמישה)
    let availableExams = 0;
    if (module.id === 'A') {
      availableExams = exams.moduleAExams.length + exams.genericExams.filter(e => matchesModule(e.module_id, 'A')).length;
    } else if (module.id === 'B') {
      availableExams = exams.moduleBExams.length + exams.genericExams.filter(e => matchesModule(e.module_id, 'B')).length;
    } else if (module.id === 'C') {
      availableExams = exams.moduleCExams.length + exams.genericExams.filter(e => matchesModule(e.module_id, 'C')).length;
    } else {
      availableExams = exams.genericExams.filter(e => matchesModule(e.module_id, module.id)).length;
    }
    
    return {
      ...module,
      stats: {
        totalAttempts,
        passedAttempts,
        avgScore,
        excellentAttempts,
        mediumAttempts,
        failedAttempts,
        availableExams,
        progress: Math.min(100, Math.round((totalAttempts / Math.max(availableExams, 5)) * 100))
      }
    };
  });
}

export default useExamsData;