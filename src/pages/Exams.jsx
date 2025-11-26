import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useExamsData } from "@/components/cache/useExamsData";
import { DataCache } from "@/components/cache/DataCache";
import { createPageUrl } from "@/utils";
import { BookOpen, CheckCircle, Award, Clock, Play, Crown, X, Upload, Settings, Trophy, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Accessibility, Shield, TrendingDown, Lock, Target, TrendingUp, Edit2, Trash2, Loader2, BookCheck, FileCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from
"@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ModuleCarousel from "@/components/exams/ModuleCarousel";
import { differenceInDays } from "date-fns";
import { calculateCurrentProgress, calculateRecommendedGoals } from "@/components/tracking/GoalsTracker";
import GoalsDisplay from "@/components/tracking/GoalsDisplay";

export default function ExamsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showAttemptDetails, setShowAttemptDetails] = useState(null);
  const [showAllExams, setShowAllExams] = useState(false);
  const [currentExamIndex, setCurrentExamIndex] = useState({});
  const [showAllExamsModule, setShowAllExamsModule] = useState(null);
  const [showAccessibilityDialog, setShowAccessibilityDialog] = useState(false);
  const [showModuleOrderDialog, setShowModuleOrderDialog] = useState(false);
  const [extraTime, setExtraTime] = useState(0);
  const [fontSize, setFontSize] = useState("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [showModuleEditDialog, setShowModuleEditDialog] = useState(false);
  const [showAddModuleDialog, setShowAddModuleDialog] = useState(false);
  const [editingModuleData, setEditingModuleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdDialog, setShowAdDialog] = useState(null);
  const [unlockedAttempts, setUnlockedAttempts] = useState(new Set());

  const [cachedSubject, setCachedSubject] = useState(() => localStorage.getItem('selected_subject') || 'אנגלית');
  const [cachedUnits, setCachedUnits] = useState(() => localStorage.getItem('selected_units') || '3');

  const { data: examsData, isLoading: isExamsLoading, error: examsError } = useExamsData(cachedSubject, cachedUnits);

  const displaySubject = examsData?.subject || cachedSubject;
  const displayUnits = parseInt(examsData?.units || cachedUnits);

  const subjectColors = {
    "אנגלית": "bg-blue-600",
    "מתמטיקה": "bg-purple-600",
    "פיזיקה": "bg-green-600",
    "ספרות": "bg-pink-600",
    "היסטוריה": "bg-amber-600",
    "גאוגרפיה": "bg-cyan-600",
    "כימיה": "bg-orange-600",
    "ביולוגיה": "bg-teal-600",
    "אזרחות": "bg-indigo-600",
    "תנ\"ך": "bg-rose-600"
  };

  const defaultModulesStructure = {
    "אנגלית": {
      3: [
      { id: "C", title: "מודול C", description: "קריאה והבנה", details: "Reading Comprehension", duration: 90, color: "from-purple-500 to-purple-600", points: "70+30", parts: ["Reading"], entity: "ModuleCExam", order: 0 },
      { id: "A", title: "מודול A", description: "הבנת נשמע", details: "Listening", duration: 90, color: "from-blue-500 to-blue-600", points: "70+30", parts: ["Listening"], entity: "ModuleAExam", order: 1 },
      { id: "B", title: "מודול B", description: "הבנת נשמע מתקדמת", details: "Advanced Listening", duration: 90, color: "from-cyan-500 to-cyan-600", points: "70+30", parts: ["Listening"], entity: "ModuleBExam", order: 2 }],

      4: [
      { id: "C", title: "מודול C", description: "הבנת הנקרא", details: "Reading Comprehension", duration: 90, color: "from-blue-500 to-blue-600", points: "70+30", parts: ["Reading"], entity: "ModuleCExam", order: 0 },
      { id: "D", title: "מודול D", description: "הבעה בכתב", details: "Writing", duration: 120, color: "from-orange-500 to-orange-600", points: "70+30", parts: ["Writing"], entity: "GenericExam", order: 1 },
      { id: "E", title: "מודול E", description: "קריאה מתקדמת", details: "Advanced Reading", duration: 120, color: "from-pink-500 to-pink-600", points: "100", parts: ["Reading"], entity: "GenericExam", order: 2 }],

      5: [
      { id: "E", title: "מודול E", description: "קריאה גבוהה", details: "High-level Reading", duration: 150, color: "from-indigo-500 to-indigo-600", points: "100", parts: ["Reading"], entity: "GenericExam", order: 0 },
      { id: "F", title: "מודול F", description: "כתיבה מתקדמת", details: "Advanced Writing", duration: 120, color: "from-rose-500 to-rose-600", points: "100", parts: ["Writing"], entity: "GenericExam", order: 1 },
      { id: "G", title: "מודול G", description: "כתיבה יצירתית", details: "Creative Writing", duration: 90, color: "from-green-500 to-green-600", points: "100", parts: ["Writing"], entity: "GenericExam", order: 2 }]

    },
    "מתמטיקה": {
      3: [
      { id: "801", title: "שאלון 801", description: "אלגברה בסיסית", details: "משוואות, חזקות, שורשים, בעיות מילוליות", duration: 150, color: "from-purple-500 to-purple-600", points: "60", parts: ["אלגברה"], entity: "GenericExam", order: 0 },
      { id: "802", title: "שאלון 802", description: "גיאומטריה וסטטיסטיקה", details: "פונקציות ריבועיות, גיאומטריה, סטטיסטיקה", duration: 150, color: "from-blue-500 to-blue-600", points: "60", parts: ["גאומטריה"], entity: "GenericExam", order: 1 }],

      4: [
      { id: "803", title: "שאלון 803", description: "טריגונומטריה ופונקציות", details: "טריגו, גזירה, בעיות קצב, גיאומטריה", duration: 150, color: "from-green-500 to-green-600", points: "40", parts: ["טריגונומטריה"], entity: "GenericExam", order: 0 },
      { id: "804", title: "שאלון 804", description: "פונקציות מתקדמות", details: "פונקציות רציונליות, אי-שוויונים, חקירה", duration: 150, color: "from-purple-500 to-purple-600", points: "60", parts: ["פונקציות"], entity: "GenericExam", order: 1 }],

      5: [
      { id: "805", title: "שאלון 805", description: "חקירה ודיפרנציאלי", details: "נגזרות מתקדמות, חקירה, קצב משתנה", duration: 150, color: "from-indigo-500 to-indigo-600", points: "50", parts: ["דיפרנציאל"], entity: "GenericExam", order: 0 },
      { id: "806", title: "שאלון 806", description: "אינטגרלים וסדרות", details: "אינטגרלים, שטחים, סדרות, לוגריתמים", duration: 150, color: "from-purple-500 to-purple-600", points: "50", parts: ["אינטגרלים"], entity: "GenericExam", order: 1 }]

    },
    "פיזיקה": {
      5: [
      { id: "581", title: "שאלון 581", description: "מכניקה", details: "קינמטיקה, דינמיקה, אנרגיה", duration: 120, color: "from-green-500 to-green-600", points: "100", parts: ["מכניקה"], entity: "GenericExam", order: 0 },
      { id: "582", title: "שאלון 582", description: "חשמל, גלים וחום", details: "חשמל סטטי, מגנטיות, גלים, תרמודינמיקה", duration: 120, color: "from-blue-500 to-blue-600", points: "100", parts: ["חשמל", "גלים", "חום"], entity: "GenericExam", order: 1 }]

    },
    "כימיה": {
      5: [
      { id: "043381", title: "שאלון 043381", description: "כימיה חלק א'", details: "מבנה החומר, תמיסות, קינטיקה", duration: 180, color: "from-orange-500 to-orange-600", points: "100", parts: ["כימיה"], entity: "GenericExam", order: 0 },
      { id: "043382", title: "שאלון 043382", description: "כימיה חלק ב'", details: "שיווי משקל, כימיה אורגנית", duration: 180, color: "from-red-500 to-red-600", points: "100", parts: ["כימיה"], entity: "GenericExam", order: 1 },
      { id: "043383", title: "שאלון 043383", description: "כימיה חלק ג'", details: "עבודת חקר", duration: 120, color: "from-pink-500 to-pink-600", points: "100", parts: ["חקר"], entity: "GenericExam", order: 2 }]

    },
    "ביולוגיה": {
      5: [
      { id: "054581", title: "שאלון 054581", description: "ביולוגיה חלק א'", details: "התא, גנטיקה, גוף האדם", duration: 180, color: "from-teal-500 to-teal-600", points: "100", parts: ["ביולוגיה"], entity: "GenericExam", order: 0 },
      { id: "054582", title: "שאלון 054582", description: "ביולוגיה חלק ב'", details: "אקולוגיה, אבולוציה", duration: 180, color: "from-green-500 to-green-600", points: "100", parts: ["ביולוגיה"], entity: "GenericExam", order: 1 },
      { id: "054583", title: "שאלון 054583", description: "עבודת חקר", details: "מחקר מעשי", duration: 120, color: "from-emerald-500 to-emerald-600", points: "100", parts: ["חקר"], entity: "GenericExam", order: 2 }]

    },
    "ספרות": {
      2: [
      { id: "2101", title: "שאלון 2101", description: "ספרות 2 יחידות", details: "שירה, סיפור קצר, אמצעים אומנותיים", duration: 180, color: "from-pink-500 to-pink-600", points: "100", parts: ["ספרות"], entity: "GenericExam", order: 0 }],

      5: [
      { id: "2102", title: "שאלון 2102", description: "ספרות 5 יחידות - חלק א'", details: "שירה, דמות ומסר", duration: 180, color: "from-rose-500 to-rose-600", points: "100", parts: ["ספרות"], entity: "GenericExam", order: 0 },
      { id: "2103", title: "שאלון 2103", description: "ספרות 5 יחידות - חלק ב'", details: "סיפור קצר, אמצעים אומנותיים", duration: 180, color: "from-fuchsia-500 to-fuchsia-600", points: "100", parts: ["ספרות"], entity: "GenericExam", order: 1 }]

    },
    "היסטוריה": {
      2: [
      { id: "2211", title: "שאלון 2211", description: "היסטוריה 2 יחידות", details: "ציונות, השואה, הקמת המדינה", duration: 180, color: "from-amber-500 to-amber-600", points: "100", parts: ["היסטוריה"], entity: "GenericExam", order: 0 }],

      5: [
      { id: "2212", title: "שאלון 2212", description: "היסטוריה 5 יחידות - ישראל", details: "ציונות, מדינת ישראל", duration: 180, color: "from-yellow-500 to-yellow-600", points: "100", parts: ["היסטוריה"], entity: "GenericExam", order: 0 },
      { id: "2213", title: "שאלון 2213", description: "היסטוריה 5 יחידות - אירופה", details: "אירופה ועם ישראל, השואה", duration: 180, color: "from-orange-500 to-orange-600", points: "100", parts: ["היסטוריה"], entity: "GenericExam", order: 1 }]

    },
    "גאוגרפיה": {
      5: [
      { id: "046511", title: "שאלון 046511", description: "גאוגרפיה עיונית", details: "אקלים, מים, אוכלוסייה, ישראל", duration: 180, color: "from-cyan-500 to-cyan-600", points: "100", parts: ["גאוגרפיה"], entity: "GenericExam", order: 0 },
      { id: "046512", title: "שאלון 046512", description: "מפות ונתונים", details: "קריאת מפות, ניתוח נתונים", duration: 120, color: "from-sky-500 to-sky-600", points: "100", parts: ["מפות"], entity: "GenericExam", order: 1 },
      { id: "046581", title: "שאלון 046581", description: "עבודת חקר", details: "מחקר שטח", duration: 120, color: "from-teal-500 to-teal-600", points: "100", parts: ["חקר"], entity: "GenericExam", order: 2 }]

    },
    "אזרחות": {
      2: [
      { id: "1121", title: "שאלון 1121", description: "שאלון חובה", details: "דמוקרטיה, זכויות אדם, מוסדות", duration: 120, color: "from-indigo-500 to-indigo-600", points: "70", parts: ["אזרחות"], entity: "GenericExam", order: 0 },
      { id: "1122", title: "שאלון 1122", description: "שאלון פתוח", details: "חוקי יסוד, השלטון בישראל", duration: 90, color: "from-violet-500 to-violet-600", points: "30", parts: ["אזרחות"], entity: "GenericExam", order: 1 }]

    },
    "תנ\"ך": {
      2: [
      { id: "1211", title: "שאלון 1211", description: "תנ\"ך 2 יחידות", details: "שמואל, מלכים, נביאים", duration: 180, color: "from-rose-500 to-rose-600", points: "100", parts: ["תנ\"ך"], entity: "GenericExam", order: 0 }],

      5: [
      { id: "1212", title: "שאלון 1212", description: "תנ\"ך 5 יחידות - חלק א'", details: "שמואל, פילוג הממלכה", duration: 180, color: "from-red-500 to-red-600", points: "100", parts: ["תנ\"ך"], entity: "GenericExam", order: 0 },
      { id: "1213", title: "שאלון 1213", description: "תנ\"ך 5 יחידות - חלק ב'", details: "מלכים, נביאים אחרונים", duration: 180, color: "from-pink-500 to-pink-600", points: "100", parts: ["תנ\"ך"], entity: "GenericExam", order: 1 }]

    }
  };

  const customModules = examsData?.modules?.filter((m) => !defaultModulesStructure[displaySubject]?.[displayUnits]?.some((dm) => dm.id === m.id)) || [];

  const currentModules = examsData?.modules || [];

  const [moduleOrder, setModuleOrder] = useState([]);

  const allModuleAExams = examsData?.moduleAExams || [];
  const allModuleBExams = examsData?.moduleBExams || [];
  const allModuleCExams = examsData?.moduleCExams || [];
  const allGenericExams = examsData?.genericExams || [];

  const allExamsMap = useMemo(() => {
    return examsData?.allExamsMap ? new Map(Object.entries(examsData.allExamsMap)) : new Map();
  }, [examsData]);

  const examAttempts = examsData?.examAttempts || [];

  const handleEditModule = (module) => {
    setEditingModuleData({
      module_id: module.id,
      subject: displaySubject,
      unit_level: displayUnits,
      title: module.title,
      description: module.description,
      details: module.details,
      parts: Array.isArray(module.parts) ? module.parts.join(', ') : '',
      duration: module.duration,
      points: module.points,
      color: module.color,
      entity: module.entity,
      order: module.order
    });
    setShowModuleEditDialog(true);
  };

  const handleSaveModuleEdit = async () => {
    if (!editingModuleData) return;

    try {
      const existing = customModules.find((m) => m.module_id === editingModuleData.module_id);

      const moduleData = {
        subject: editingModuleData.subject,
        unit_level: editingModuleData.unit_level,
        module_id: editingModuleData.module_id,
        title: editingModuleData.title,
        description: editingModuleData.description,
        details: editingModuleData.details,
        duration: parseInt(editingModuleData.duration),
        points: editingModuleData.points,
        color: editingModuleData.color,
        parts: editingModuleData.parts.split(',').map((p) => p.trim()).filter(Boolean),
        entity: editingModuleData.entity,
        order: editingModuleData.order
      };

      if (existing) {
        await base44.entities.ModuleDefinition.update(existing.id, moduleData);
      } else {
        await base44.entities.ModuleDefinition.create(moduleData);
      }
      DataCache.invalidatePattern(`exams_data_${displaySubject}_${displayUnits}`);
      queryClient.invalidateQueries(['custom-modules', displaySubject, displayUnits]);

      alert('המודול עודכן בהצלחה! ✅');
      setShowModuleEditDialog(false);
      setEditingModuleData(null);
    } catch (error) {
      console.error('Error saving module:', error);
      alert('שגיאה בשמירת המודול: ' + error.message);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המודול '${editingModuleData?.title}'? פעולה זו בלתי הפיכה.`)) return;

    try {
      const existing = customModules.find((m) => m.module_id === moduleId);
      if (existing) {
        await base44.entities.ModuleDefinition.delete(existing.id);
        DataCache.invalidatePattern(`exams_data_${displaySubject}_${displayUnits}`);
        queryClient.invalidateQueries(['custom-modules', displaySubject, displayUnits]);
        alert('המודול נמחק בהצלחה.');
      } else {
        alert('מודול זה אינו מוגדר כמודול מותאם אישית ואינו ניתן למחיקה.');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('שגיאה במחיקת המודול: ' + error.message);
    }
  };

  const handleAddNewModule = () => {
    setEditingModuleData({
      module_id: '',
      title: '',
      description: '',
      details: '',
      parts: '',
      duration: 90,
      points: '100',
      color: 'from-blue-500 to-indigo-600',
      entity: 'GenericExam',
      order: 999
    });
    setShowAddModuleDialog(true);
  };

  const handleSaveNewModule = async () => {
    if (!editingModuleData || !editingModuleData.module_id || !editingModuleData.title) {
      alert('חובה למלא מזהה שאלון וכותרת');
      return;
    }

    try {
      const moduleData = {
        module_id: editingModuleData.module_id,
        subject: displaySubject,
        unit_level: displayUnits,
        title: editingModuleData.title,
        description: editingModuleData.description || '',
        details: editingModuleData.details || '',
        duration: parseInt(editingModuleData.duration) || 90,
        points: editingModuleData.points || '100',
        color: editingModuleData.color || 'from-blue-500 to-indigo-600',
        parts: editingModuleData.parts ? editingModuleData.parts.split(',').map((p) => p.trim()).filter(Boolean) : [],
        entity: editingModuleData.entity || 'GenericExam',
        order: parseInt(editingModuleData.order) || 999
      };

      await base44.entities.ModuleDefinition.create(moduleData);
      alert('השאלון נוסף בהצלחה! ✅');
      setShowAddModuleDialog(false);
      setEditingModuleData(null);
      DataCache.invalidatePattern(`exams_data_${displaySubject}_${displayUnits}`);
      queryClient.invalidateQueries(['custom-modules', displaySubject, displayUnits]);
    } catch (error) {
      console.error('Error adding module:', error);
      alert('שגיאה בהוספת השאלון: ' + error.message);
    }
  };

  useEffect(() => {
    if (examsData?.user) {
      const currentUser = examsData.user;
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser?.selected_subject) {
        setCachedSubject(currentUser.selected_subject);
        localStorage.setItem('selected_subject', currentUser.selected_subject);
      }
      if (currentUser?.selected_units) {
        setCachedUnits(currentUser.selected_units.toString());
        localStorage.setItem('selected_units', currentUser.selected_units.toString());
      }
      if (currentUser?.accessibility_settings) {
        setExtraTime(currentUser.accessibility_settings.extra_time || 0);
        setFontSize(currentUser.accessibility_settings.font_size || "normal");
        setHighContrast(currentUser.accessibility_settings.high_contrast || false);
      }
    } else if (!isExamsLoading) {
      setIsLoading(false); // Finished loading but no user
    }
  }, [examsData, isExamsLoading]);

  useEffect(() => {
    if (user) {
      const orderKey = `${displaySubject}_${displayUnits}`;
      const savedOrder = user?.module_order?.[orderKey];
      if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
        setModuleOrder(savedOrder);
      } else {
        const defaultModules = defaultModulesStructure[displaySubject]?.[displayUnits] || [];
        setModuleOrder(defaultModules.map((m) => m.id));
      }
    } else {
      const defaultModules = defaultModulesStructure[displaySubject]?.[displayUnits] || [];
      setModuleOrder(defaultModules.map((m) => m.id));
    }
  }, [displaySubject, displayUnits, user]);

  const overallStats = useMemo(() => {
    if (isExamsLoading || !examAttempts) {
      return { topicsStarted: 0, totalTopics: 0, avgProgress: 0 };
    }
    return { topicsStarted: 0, totalTopics: 0, avgProgress: 0 };
  }, [examAttempts, isLoading]);

  const getProgressColor = (progress) => {
    if (progress >= 80) return "#22C55E";
    if (progress >= 50) return "#FACC15";
    return "#EF4444";
  };

  const getModuleExams = (moduleId) => {
    let exams = [];

    if (displaySubject === 'אנגלית') {
      if (moduleId === "A") {
        const moduleAExams = allModuleAExams.filter((e) =>
        e.subject === displaySubject && parseInt(e.unit_level) === parseInt(displayUnits)
        ).map((e) => ({ ...e, exam_type: "module_a" }));

        const genericExamsA = allGenericExams.filter((e) =>
        e.subject === displaySubject &&
        parseInt(e.unit_level) === parseInt(displayUnits) &&
        e.module_id === moduleId
        ).map((e) => ({ ...e, exam_type: "generic" }));

        exams = [...moduleAExams, ...genericExamsA];
      } else if (moduleId === "B") {
        const moduleBExams = allModuleBExams.filter((e) =>
        e.subject === displaySubject && parseInt(e.unit_level) === parseInt(displayUnits)
        ).map((e) => ({ ...e, exam_type: "module_b" }));

        const genericExamsB = allGenericExams.filter((e) =>
        e.subject === displaySubject &&
        parseInt(e.unit_level) === parseInt(displayUnits) &&
        e.module_id === moduleId
        ).map((e) => ({ ...e, exam_type: "generic" }));

        exams = [...moduleBExams, ...genericExamsB];
      } else if (moduleId === "C") {
        const moduleCExams = allModuleCExams.filter((e) => {
          const examUnits = parseInt(e.unit_level || e.units);
          return e.subject === displaySubject && examUnits === parseInt(displayUnits);
        }).map((e) => ({ ...e, exam_type: "module_c" }));

        const genericExamsC = allGenericExams.filter((e) =>
        e.subject === displaySubject &&
        parseInt(e.unit_level) === parseInt(displayUnits) &&
        e.module_id === moduleId
        ).map((e) => ({ ...e, exam_type: "generic" }));

        exams = [...moduleCExams, ...genericExamsC];
      } else {
        // עבור מודולים אחרים באנגלית (G, D, E, F וכו')
        exams = allGenericExams.filter((e) =>
        e.subject === displaySubject &&
        parseInt(e.unit_level) === parseInt(displayUnits) &&
        e.module_id === moduleId
        ).map((e) => ({ ...e, exam_type: "generic" }));
      }
    } else {
      exams = allGenericExams.filter((e) =>
      e.subject === displaySubject &&
      parseInt(e.unit_level) === parseInt(displayUnits) &&
      e.module_id === moduleId
      ).map((e) => ({ ...e, exam_type: "generic" }));
    }

    console.log(`📋 Module ${moduleId} exams found:`, exams.length, exams.map((e) => ({ id: e.id, title: e.title, type: e.exam_type })));

    exams.sort((a, b) => {
      const titleA = a.title || '';
      const titleB = b.title || '';
      const numA = parseInt(titleA.match(/\d+/)) || 0;
      const numB = parseInt(titleB.match(/\d+/)) || 0;
      if (numA !== numB) return numA - numB;
      return titleA.localeCompare(titleB, 'he', { numeric: true });
    });

    const isPremium = user?.is_premium === true;
    if (!isPremium) {
      exams = exams.slice(0, 5);
    }

    return exams;
  };

  const { currentAverage, hoursCompleted, weeklyProgress } = useMemo(() => {
    if (!examAttempts || !examAttempts.length) {
      return { currentAverage: 0, hoursCompleted: 0, weeklyProgress: 0 };
    }

    const totalScore = examAttempts.reduce((sum, attempt) => sum + (attempt.score_percent || 0), 0);
    const average = totalScore / examAttempts.length;

    return {
      currentAverage: Math.round(average),
      hoursCompleted: 0,
      weeklyProgress: 0
    };
  }, [examAttempts]);

  const handleExamClick = (exam) => {
    const totalAttempts = examAttempts.length;
    const isPremium = user?.is_premium === true;

    if (!isPremium && totalAttempts >= 50) {
      alert("הגעת למגבלה של 50 מבחנים חינם! 🎓\nשדרג לפרימיום כדי להמשיך ללמוד ללא הגבלה.");
      navigate(createPageUrl("Premium"));
      return;
    }

    if (!exam?.id) {
      console.error('❌ Cannot navigate - exam has no ID:', exam);
      alert('שגיאה: מזהה מבחן חסר');
      return;
    }

    console.log('✅ Navigating to exam:', exam.id, 'Type:', exam.exam_type);

    let targetPage = '';

    if (exam.exam_type === "module_a") {
      targetPage = "ExamModuleA";
    } else if (exam.exam_type === "module_b") {
      targetPage = "ExamModuleB";
    } else if (exam.exam_type === "module_c") {
      targetPage = "ExamModuleC";
    } else if (exam.exam_type === "generic") {
      if (exam.subject === 'מתמטיקה') {
        targetPage = "ExamMath";
      } else if (exam.subject === 'פיזיקה') {
        targetPage = "ExamPhysics";
      } else if (exam.subject === 'ספרות') {
        targetPage = "ExamLiterature";
      } else if (exam.subject === 'כימיה') {
        targetPage = "ExamChemistry";
      } else if (exam.subject === 'ביולוגיה') {
        targetPage = "ExamBiology";
      } else {
        targetPage = "ExamGeneric";
      }
    } else {
      console.warn('⚠️ Unknown exam type:', exam.exam_type);
      targetPage = "ExamGeneric";
    }

    try {
      sessionStorage.setItem('currentExamId', exam.id);
      console.log('💾 Stored examId in sessionStorage:', exam.id);
    } catch (error) {
      console.error('Error storing examId:', error);
    }

    const targetPath = createPageUrl(targetPage);
    const fullPath = `${targetPath}?examId=${encodeURIComponent(exam.id)}`;

    console.log('📍 Navigating to:', fullPath);
    console.log('📍 examId being passed:', exam.id);

    window.location.href = fullPath;
  };

  const handleRandomExam = (moduleId) => {
    const totalAttempts = examAttempts.length;
    const isPremium = user?.is_premium === true;

    if (!isPremium && totalAttempts >= 50) {
      alert("הגעת למגבלה של 50 מבחנים חינם! 🎓\nשדרג לפרימיום כדי להמשיך ללמוד ללא הגבלה.");
      navigate(createPageUrl("Premium"));
      return;
    }

    const moduleExams = getModuleExams(moduleId);

    if (!moduleExams || moduleExams.length === 0) {
      const currentModule = currentModules.find((m) => m.id === moduleId);
      const moduleName = currentModule ? currentModule.title : moduleId;
      alert(`אין מבחנים זמינים במודול ${moduleName}`);
      return;
    }

    // For free users, cycle through exams in order (1->2->3->4->5->1...)
    if (!isPremium) {
      // Get attempts for this specific module
      const moduleAttemptCount = examAttempts.filter((a) => {
        if (a.module_id === moduleId) return true;
        // Also check by exam_type for Module A/B/C
        if (moduleId === 'A' && a.exam_type === 'module_a') return true;
        if (moduleId === 'B' && a.exam_type === 'module_b') return true;
        if (moduleId === 'C' && a.exam_type === 'module_c') return true;
        return false;
      }).length;

      // Calculate which exam to show (cycle through the 5 available)
      const examIndex = moduleAttemptCount % moduleExams.length;
      const examToStart = moduleExams[examIndex];

      if (examToStart) {
        console.log('✅ Starting exam (free user cycle):', examToStart.id, 'Module:', moduleId, 'Index:', examIndex);
        handleExamClick(examToStart);
        return;
      }
    }

    // For premium users, prefer unattempted exams
    const attemptedExamIds = examAttempts.map((a) => a.exam_id);
    const unattemptedExams = moduleExams.filter((e) => !attemptedExamIds.includes(e.id));

    const examToStart = unattemptedExams.length > 0 ?
    unattemptedExams[Math.floor(Math.random() * unattemptedExams.length)] :
    moduleExams[Math.floor(Math.random() * moduleExams.length)];

    if (examToStart) {
      console.log('✅ Starting random exam:', examToStart.id, 'Module:', moduleId);
      handleExamClick(examToStart);
    } else {
      const currentModule = currentModules.find((m) => m.id === moduleId);
      const moduleName = currentModule ? currentModule.title : moduleId;
      alert(`אין מבחנים זמינים במודול ${moduleName}`);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 86) return "bg-green-500";
    if (score >= 56) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreIcon = (score) => {
    if (score >= 86) return { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" };
    if (score >= 56) return { icon: CheckCircle, color: "text-orange-600", bg: "bg-orange-100" };
    return { icon: X, color: "text-red-600", bg: "bg-red-100" };
  };

  const practiceSessionsCount = examAttempts.length;
  const isPremium = user?.is_premium === true;
  const remainingFreeExams = isPremium ? "∞" : Math.max(0, 50 - practiceSessionsCount);

  const handleNextExam = (moduleId, maxIndex) => {
    setCurrentExamIndex((prev) => ({
      ...prev,
      [moduleId]: Math.min((prev[moduleId] || 0) + 1, maxIndex)
    }));
  };

  const handlePrevExam = (moduleId) => {
    setCurrentExamIndex((prev) => ({
      ...prev,
      [moduleId]: Math.max((prev[moduleId] || 0) - 1, 0)
    }));
  };

  const handleSaveAccessibility = async () => {
    try {
      await base44.auth.updateMe({
        accessibility_settings: {
          extra_time: extraTime,
          font_size: fontSize,
          high_contrast: highContrast
        }
      });
      setUser((prevUser) => ({
        ...prevUser,
        accessibility_settings: {
          extra_time: extraTime,
          font_size: fontSize,
          high_contrast: highContrast
        }
      }));
      alert("ההגדרות נשמרו בהצלחה!");
      setShowAccessibilityDialog(false);
    } catch (error) {
      console.error("Error saving accessibility settings:", error);
      alert("שגיאה בשמירת ההגדרות");
    }
  };

  const handleSaveModuleOrder = async () => {
    try {
      const orderKey = `${displaySubject}_${displayUnits}`;
      const updatedModuleOrder = {
        ...(user?.module_order || {}),
        [orderKey]: moduleOrder
      };

      await base44.auth.updateMe({
        module_order: updatedModuleOrder
      });
      setUser((prevUser) => ({
        ...prevUser,
        module_order: updatedModuleOrder
      }));
      setShowModuleOrderDialog(false);
      alert("הסדר נשמר בהצלחה!");
    } catch (error) {
      console.error("Error saving order:", error);
      alert("שגיאה בשמירת הסדר");
    }
  };

  const moveModule = (index, direction) => {
    const newOrder = [...moduleOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setModuleOrder(newOrder);
  };

  const handleDeleteAllAttempts = async () => {
    if (user?.id && confirm("האם אתה בטוח שברצונך למחוק את כל המבחנים שלך עבור מקצוע זה? פעולה זו בלתי הפיכה.")) {
      try {
        await base44.entities.ExamAttempt.deleteMany({
          created_by: user.email,
          subject: displaySubject,
          unit_level: displayUnits
        });
        DataCache.invalidatePattern(`exams_data_${displaySubject}_${displayUnits}`);
        queryClient.invalidateQueries(['exam-attempts', displaySubject, displayUnits]);
        alert("כל המבחנים נמחקו בהצלחה.");
        setShowAllExams(false);
      } catch (error) {
        console.error("Error deleting attempts:", error);
        alert("שגיאה במחיקת המבחנים.");
      }
    }
  };

  if (isLoading || isExamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="sr-only">טוען...</span>
      </div>);
  }

  return (
    <div className="bg-gray-100 pb-4 min-h-screen">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] from-blue-500 to-indigo-500 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("SubjectSelection"))}
          className="text-right flex-1 hover:opacity-90 transition-opacity">

          <h1 className="text-[16px] font-bold text-white">{displaySubject}</h1>
          <p className="text-[11px] text-white/90">{displayUnits} יחידות</p>
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="bg-gray-100 pb-6 px-6 space-y-6">


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}>

          <ModuleCarousel
            modules={currentModules}
            onSelectExam={(moduleId) => setShowAllExamsModule(moduleId)}
            onRandomExam={handleRandomExam}
            onEditModule={user?.role === 'admin' ? handleEditModule : null}
            isPremium={isPremium}
            onUpgrade={() => navigate(createPageUrl("Premium"))}
            examAttempts={examAttempts} />

        </motion.div>

        {isPremium &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }} className="bg-[#ffffff] p-4 rounded-2xl">


            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-[#3B82F6]" />
              <h3 className="text-base font-bold text-[#2B2B2B]">בגרות מותאמת אישית</h3>
            </div>

            <div className="text-center">
              <p className="text-[#6E6E6E] text-[13px] mb-3">בגרות שמבוססת על הנושאים שבהן טעית בעבר, כדי לחזק בדיוק את מה שצריך.
            </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                onClick={() => navigate(createPageUrl("WeakExamSelection"))} className="bg-blue-500 text-[13px] px-4 py-2 font-bold rounded-[14px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 h-11 flex items-center justify-center gap-2">


                  <Target className="w-4 h-4" />
                  <span className="">התחל בגרות</span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        }

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden">

          <div className="flex items-center justify-between bg-blue-500 text-white p-4">
            <div className="text-right">
              <h3 className="font-bold text-lg">בגרויות אחרונות</h3>
              <p className="text-sm opacity-90">הביצועים שלך במבחנים</p>
            </div>
            <BookOpen className="w-8 h-8 text-white opacity-90" />
          </div>

          <div className="p-4">
            {examAttempts.length > 0 ?
            <>
                <div className="space-y-2">
                  {examAttempts.slice(0, 2).map((attempt, idx) => {
                  const examData = allExamsMap.get(attempt.exam_id);
                  const passed = attempt.score_percent >= 56;
                  const hasMistakes = attempt.score_percent < 56;

                  return (
                    <div key={attempt.id} className="space-y-2">
                        <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        whileHover={{ scale: 1.02, x: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (isPremium || unlockedAttempts.has(attempt.id)) {
                            setShowAttemptDetails(attempt);
                          } else {
                            setShowAdDialog(attempt);
                          }
                        }}
                        className="bg-zinc-50 p-3 text-right opacity-100 rounded-xl w-full hover:bg-white transition-colors border border-[#E9F0FF] flex items-center justify-between">

                          <div className="flex items-center gap-3 flex-1">
                            <motion.div
                            className={`p-1.5 rounded-lg ${
                            passed ?
                            'bg-green-50 border border-green-200' :
                            'bg-red-50 border border-red-200'}`
                            }
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}>

                              {passed ?
                            <CheckCircle className="w-4 h-4 text-green-600" /> :

                            <X className="w-4 h-4 text-red-600" />
                            }
                            </motion.div>
                            <div className="flex-1 text-right">
                              <div className="text-[13px] font-semibold text-[#2B2B2B]">
                                {examData?.title || 'מבחן'}
                              </div>
                              <div className="text-[11px] text-[#6E6E6E]">
                                {new Date(attempt.created_date).toLocaleDateString('he-IL', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {isPremium ?
                          <>
                                <motion.div
                              className={`text-[17px] font-bold ${
                              passed ? 'text-green-600' : 'text-red-600'}`
                              }
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 + idx * 0.1, type: 'spring' }}>

                                  {Math.round(attempt.score_percent)}
                                </motion.div>
                                <div className="text-[10px] text-gray-500">
                                  {passed ? 'עבר' : 'נכשל'}
                                </div>
                              </> :

                          <div className="flex items-center gap-1">
                                <Lock className="w-5 h-5 text-gray-400" />
                              </div>
                          }
                          </div>
                        </motion.button>

                        {hasMistakes && isPremium &&
                      <div className="bg-white rounded-xl p-3 border border-[#E9F0FF] mr-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Crown className="w-4 h-4 text-[#3B82F6]" />
                              <h4 className="font-bold text-[#2B2B2B] text-[12px]">
                                בגרות מותאמת עבורך
                              </h4>
                            </div>
                            <p className="text-[11px] text-[#6E6E6E] mb-2">
                              חזרה על השאלות שטעית בהן
                            </p>
                            <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('weakExamSource', attempt.exam_id);
                            navigate(createPageUrl("CustomWeakExam"));
                          }} className="bg-blue-500 text-[11px] px-4 py-2 font-bold rounded-[14px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-9 flex items-center justify-center gap-2">


                              בגרות אישית
                            </Button>
                          </div>
                      }
                      </div>);

                })}
                </div>

                {examAttempts.length > 2 &&
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                  onClick={() => setShowAllExams(true)}
                  variant="outline"
                  className="bg-background text-[#0c234b] mt-2 px-4 py-2 font-semibold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:text-accent-foreground w-full h-10 border-2 border-[#E9F0FF] hover:bg-[#F5F8FF]">

                      צפה בכל הבגרויות ({examAttempts.length})
                    </Button>
                  </motion.div>
              }
              </> :

            <div className="text-center py-8 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-1">אין בגרויות עדיין</h4>
                <p className="text-gray-500 text-sm">התחל לפתור בגרויות כדי לראות את ההתקדמות שלך</p>
              </div>
            }
          </div>
        </motion.div>

        {!isPremium && practiceSessionsCount >= 40 &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-indigo-50 rounded-2xl p-4">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-[#2B2B2B] text-[13px]">מתקרב למגבלה!</h4>
                <p className="text-[#6E6E6E] text-[11px]">
                  נותרו לך {remainingFreeExams} מבחנים חינם. שדרג לפרימיום כדי להמשיך ללמוד ללא הגבלה!
                </p>
              </div>
              <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="bg-[#3B82F6] hover:bg-blue-700 text-white h-9 text-[12px] font-bold rounded-[14px]">

                <Crown className="w-4 h-4 mr-1" />
                <span className="font-bold">שדרג</span>
              </Button>
            </div>
          </motion.div>
        }

        {user?.role === 'admin' &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3">

            <div className="bg-indigo-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#2B2B2B] mb-0.5">הוסף שאלון</h3>
                  <p className="text-[11px] text-[#6E6E6E]">צור שאלון חדש</p>
                </div>
                <Button
                onClick={handleAddNewModule}
                className="bg-[#3B82F6] hover:bg-blue-700 text-white h-9 text-[12px] rounded-[14px]">

                  <span>הוסף</span>
                  <BookCheck className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#2B2B2B] mb-0.5">ניהול מבחנים</h3>
                  <p className="text-[11px] text-[#6E6E6E]">הוסף וערוך מבחנים</p>
                </div>
                <Button
                onClick={() => navigate(createPageUrl("AdminExams"))}
                className="bg-[#3B82F6] hover:bg-blue-700 text-white h-9 text-[12px] rounded-[14px]">

                  <span>נהל</span>
                  <Upload className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        }
      </div>

      <Dialog open={showAccessibilityDialog} onOpenChange={setShowAccessibilityDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">הקלות לנבחנים</DialogTitle>
            <DialogDescription>
              הגדר הקלות מותאמות אישית למבחנים שלך
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                זמן נוסף (דקות)
              </label>
              <Select value={extraTime.toString()} onValueChange={(v) => setExtraTime(parseInt(v))}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="בחר זמן נוסף" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">ללא</SelectItem>
                  <SelectItem value="15">15 דקות</SelectItem>
                  <SelectItem value="30">30 דקות</SelectItem>
                  <SelectItem value="45">45 דקות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                גודל גופן
              </label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="בחר גודל גופן" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">רגיל</SelectItem>
                  <SelectItem value="large">גדול</SelectItem>
                  <SelectItem value="xlarge">גדול מאוד</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">ניגודיות גבוהה</span>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-blue-600' : 'bg-gray-300'} relative`}>

                <div
                  className={`dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-6' : ''}`} />

              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccessibilityDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveAccessibility} className="bg-blue-600 hover:bg-blue-700">
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAdDialog} onOpenChange={() => {setShowAdDialog(null);}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {showAdDialog?.isExamStart ? 'התחלת מבחן' : 'צפייה בציון המבחן'}
            </DialogTitle>
            <DialogDescription>
              {showAdDialog?.isExamStart ?
              'צפה בפרסומת קצרה כדי להתחיל את המבחן' :
              'בחר אופציה לצפייה בפרטי המבחן והציון'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200 text-center">
              <Play className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">צפה בפרסומת</h3>
              <p className="text-sm text-gray-600 mb-4">
                {showAdDialog?.isExamStart ?
                'צפה בפרסומת קצרה כדי להתחיל את המבחן' :
                'צפה בפרסומת קצרה כדי לפתוח את הציון והמשוב'}
              </p>
              <Button
                onClick={async () => {
                  alert("🎬 הפרסומת מתחילה...\n(סימולציה - בייצור יופיע וידאו אמיתי)");
                  await new Promise((resolve) => setTimeout(resolve, 2000));

                  if (showAdDialog?.isExamStart) {
                    // Start the exam after watching ad
                    const examToStart = showAdDialog;
                    setShowAdDialog(null);
                    handleExamClick(examToStart);
                  } else {
                    setUnlockedAttempts((prev) => new Set([...prev, showAdDialog.id]));
                    setShowAttemptDetails(showAdDialog);
                    setShowAdDialog(null);
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 font-bold">

                <Play className="w-5 h-5 mr-2" />
                צפה בפרסומת
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">או</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200 text-center">
              <Crown className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">שדרג לפרימיום</h3>
              <p className="text-sm text-gray-600 mb-4">
                גישה בלתי מוגבלת לכל הציונים והמשוב - ללא פרסומות!
              </p>
              <Button
                onClick={() => {
                  setShowAdDialog(null);
                  navigate(createPageUrl("Premium"));
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white h-12 font-bold">

                <Crown className="w-5 h-5 mr-2" />
                שדרג עכשיו
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdDialog(null)} className="w-full">
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAttemptDetails} onOpenChange={() => {setShowAttemptDetails(null);}}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">פרטי המבחן</DialogTitle>
            {!isPremium &&
            <DialogDescription className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                נפתח לאחר צפייה בפרסומת
              </DialogDescription>
            }
          </DialogHeader>

          {showAttemptDetails &&
          <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(showAttemptDetails.score_percent)}
                    </div>
                    <div className="text-xs text-gray-600">ציון סופי</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {showAttemptDetails.earned_points}/{showAttemptDetails.total_points}
                    </div>
                    <div className="text-xs text-gray-600">נקודות</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {new Date(showAttemptDetails.created_date).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'short'
                    })}
                    </div>
                    <div className="text-xs text-gray-600">תאריך</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  סקירת תשובות
                </h3>

                <div className="space-y-3">
                  {showAttemptDetails.answers && showAttemptDetails.answers.map((answer, idx) =>
                <div
                  key={idx}
                  className={`rounded-xl p-4 border-2 ${
                  answer.is_correct ?
                  'bg-green-50 border-green-200' :
                  'bg-red-50 border-red-200'}`
                  }>

                      <div className="font-semibold text-gray-900 mb-2">שאלה {idx + 1}</div>
                      <div className="flex gap-2 text-sm mb-2">
                        <span className={answer.is_correct ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          תשובתך: {answer.user_answer || 'לא נענה'}
                        </span>
                      </div>
                      {!answer.is_correct && answer.correct_answer &&
                  <div className="text-sm text-green-700 font-semibold mt-1">
                          תשובה נכונה: {answer.correct_answer}
                        </div>
                  }
                      {answer.explanation &&
                  <div className="mt-2 p-3 bg-white rounded-lg text-sm text-gray-700">
                          <div className="font-semibold text-blue-600 mb-1">הסבר:</div>
                          {answer.explanation}
                        </div>
                  }
                    </div>
                )}

                  {(!showAttemptDetails.answers || showAttemptDetails.answers.length === 0) &&
                <div className="text-center text-gray-500 text-sm py-4">
                      נתונים מפורטים יופיעו לאחר ביצוע המבחן
                    </div>
                }
                </div>
              </div>

              {showAttemptDetails.answers && showAttemptDetails.answers.length > 0 && (() => {
              const wrongAnswers = showAttemptDetails.answers.filter((a) => !a.is_correct);
              const weakTopicsFromExam = {};

              wrongAnswers.forEach((answer) => {
                const topicKey = answer.topic_key || 'כללי';
                if (!weakTopicsFromExam[topicKey]) {
                  weakTopicsFromExam[topicKey] = 0;
                }
                weakTopicsFromExam[topicKey]++;
              });

              const sortedWeakTopics = Object.entries(weakTopicsFromExam).
              sort((a, b) => b[1] - a[1]).
              slice(0, 3);

              return sortedWeakTopics.length > 0 &&
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-5 h-5 text-orange-600" />
                      <h4 className="font-bold text-gray-900">מבחן מותאם לטעויות שלך</h4>
                    </div>
                    <div className="space-y-2">
                      {sortedWeakTopics.map(([topic, count]) =>
                  <div key={topic} className="flex items-center justify-between bg-white rounded-lg p-2">
                          <span className="text-sm font-semibold text-gray-900">{topic}</span>
                          <span className="text-xs text-orange-600 font-bold">{count} טעויות</span>
                        </div>
                  )}
                    </div>
                    <Button
                  onClick={() => {
                    setShowAttemptDetails(null);
                    if (isPremium) {
                      navigate(createPageUrl("WeakExamSelection"));
                    } else {
                      navigate(createPageUrl("Premium"));
                    }
                  }}
                  className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-10 text-sm font-bold flex items-center justify-center gap-2">

                      <Target className="w-4 h-4" />
                      {isPremium ? 'מבחן טעויות מבגרויות' : '🔒 שדרג לפרימיום'}
                    </Button>
                  </div>;

            })()}
            </div>
          }

          <DialogFooter>
            <Button onClick={() => setShowAttemptDetails(null)} className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAllExamsModule} onOpenChange={() => setShowAllExamsModule(null)}>
        <DialogContent dir="rtl" className="w-full h-full max-w-full max-h-full rounded-none bg-gradient-to-br from-blue-50 to-blue-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-900">
              כל המבחנים ב{currentModules.find((m) => m.id === showAllExamsModule)?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-blue-700">
              בחר מבחן להתחלה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 overflow-y-auto max-h-[70vh] px-1">
            {showAllExamsModule && getModuleExams(showAllExamsModule).map((exam) =>
            <button
              key={exam.id}
              onClick={() => {
                if (!isPremium) {
                  // Show ad dialog before starting exam for free users
                  setShowAllExamsModule(null);
                  setShowAdDialog({ ...exam, isExamStart: true });
                } else {
                  setShowAllExamsModule(null);
                  handleExamClick(exam);
                }
              }}
              className="w-full text-right hover:bg-blue-100 bg-white rounded-xl p-3 transition-all border-2 border-blue-200 hover:border-blue-400 flex items-center justify-between group shadow-sm hover:shadow-md">

                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 break-words">
                    {exam.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {exam.duration_minutes || exam.duration || 90} דקות • {exam.total_points || 100} נקודות
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-blue-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </button>
            )}

            {!isPremium && showAllExamsModule &&
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-600" />
                  <h4 className="font-bold text-gray-900 text-sm">מוגבל ל-5 מבחנים</h4>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  שדרג לפרימיום כדי לקבל גישה לכל המבחנים ללא הגבלה
                </p>
                <Button
                onClick={() => {
                  setShowAllExamsModule(null);
                  navigate(createPageUrl("Premium"));
                }}
                className="w-full h-9 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-xs font-bold flex items-center justify-center gap-2">
                  <Crown className="w-3.5 h-3.5" />
                  לגישה מלאה 100+ מבחנים
                </Button>
              </div>
            }
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={() => setShowAllExamsModule(null)}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">

              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllExams} onOpenChange={setShowAllExams}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">כל המבחנים שלך</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {examAttempts.map((attempt, index) => {
              const examData = allExamsMap.get(attempt.exam_id);
              const passed = attempt.score_percent >= 56;
              const hasMistakes = attempt.score_percent < 56;
              const moduleInfo = currentModules.find((m) =>
              m.entity === (attempt.exam_type === 'module_a' ? 'ModuleAExam' : attempt.exam_type === 'module_b' ? 'ModuleBExam' : attempt.exam_type === 'module_c' ? 'ModuleCExam' : attempt.exam_type === 'generic' ? 'GenericExam' : undefined) ||
              m.id === attempt.module_id);
              const examTypeName = moduleInfo ? moduleInfo.title : 'מבחן בגרות';

              return (
                <div key={attempt.id} className="space-y-2">
                  <button
                    onClick={() => {
                      setShowAllExams(false);
                      if (isPremium || unlockedAttempts.has(attempt.id)) {
                        setShowAttemptDetails(attempt);
                      } else {
                        setShowAdDialog(attempt);
                      }
                    }}
                    className="w-full text-right hover:bg-gray-50 rounded-lg p-3 transition-colors border border-gray-100 flex items-center justify-between">

                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
                        {passed ?
                        <CheckCircle className="w-4 h-4 text-green-600" /> :

                        <X className="w-4 h-4 text-red-600" />
                        }
                      </div>
                      <div className="text-right flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {examData?.title || examTypeName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {displaySubject} • {displayUnits} יחידות • {new Date(attempt.created_date).toLocaleDateString('he-IL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isPremium ?
                      <>
                          <div className={`text-xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.round(attempt.score_percent)}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {passed ? 'עבר' : 'נכשל'}
                          </div>
                        </> :

                      <div className="flex items-center gap-1">
                          <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                      }
                    </div>
                  </button>

                  {hasMistakes &&
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border-2 border-orange-200 mr-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-orange-600" />
                        <h4 className="font-bold text-gray-900 text-sm">תרגול טעויות ממבחן זה</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        חזור על השאלות שטעית בהן במבחן זה
                      </p>
                      <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllExams(false);
                        if (isPremium) {
                          navigate(createPageUrl("CustomWeakExam"));
                        } else {
                          navigate(createPageUrl("Premium"));
                        }
                      }}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-9 text-xs font-bold flex items-center justify-center gap-2">

                        {isPremium ?
                      <>
                            <Target className="w-3 h-3" />
                            <span>מבחן טעויות</span>
                          </> :

                      <>
                            <Lock className="w-3 h-3" />
                            <span>שדרג לפרימיום</span>
                          </>
                      }
                      </Button>
                    </div>
                  }
                </div>);

            })}
          </div>

          <DialogFooter className="mt-4 flex flex-col sm:flex-row-reverse sm:space-x-2 space-y-2 sm:space-y-0">
            <Button onClick={() => setShowAllExams(false)} variant="outline" className="w-full sm:w-auto">
              סגור
            </Button>
            <Button
              onClick={handleDeleteAllAttempts}
              variant="destructive"
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2">

              <Trash2 className="w-4 h-4 mr-2" />
              מחק הכל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showModuleOrderDialog} onOpenChange={setShowModuleOrderDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">שינוי סדר מודולים</DialogTitle>
            <DialogDescription>
              שנה את הסדר שבו המודולים מוצגים בקרוסלה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {moduleOrder.map((moduleId, index) => {
              const module = currentModules.find((m) => m.id === moduleId);
              if (!module) return null;

              return (
                <div
                  key={moduleId}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 bg-gradient-to-r ${module.color} bg-opacity-10`}>

                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-gray-900 text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{module.title}</div>
                      <div className="text-xs text-gray-600">{module.description}</div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveModule(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">

                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveModule(index, 'down')}
                      disabled={index === moduleOrder.length - 1}
                      className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">

                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>);

            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleOrderDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveModuleOrder} className="bg-blue-600 hover:bg-blue-700">
              שמור סדר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddModuleDialog} onOpenChange={setShowAddModuleDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <BookCheck className="w-6 h-6 text-green-600" />
              הוסף שאלון חדש
            </DialogTitle>
            <DialogDescription>
              הוסף שאלון חדש עבור {displaySubject} - {displayUnits} יחידות
            </DialogDescription>
          </DialogHeader>

          {editingModuleData &&
          <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  מזהה שאלון (Module ID) *
                </label>
                <Input
                type="text"
                value={editingModuleData.module_id}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, module_id: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: D, E, F או 807" />

                <p className="text-xs text-gray-500 mt-1">מזהה ייחודי באותיות או מספרים</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  כותרת השאלון *
                </label>
                <Input
                type="text"
                value={editingModuleData.title}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, title: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: מודול D או שאלון 807" />

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תיאור קצר
                </label>
                <Input
                type="text"
                value={editingModuleData.description}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, description: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: כתיבה מתקדמת" />

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  פרטים מלאים
                </label>
                <Textarea
                value={editingModuleData.details}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, details: e.target.value })}
                className="w-full h-20"
                placeholder="פירוט מלא של מבנה השאלון" />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    משך זמן (דקות)
                  </label>
                  <Input
                  type="number"
                  value={editingModuleData.duration}
                  onChange={(e) => setEditingModuleData({ ...editingModuleData, duration: parseInt(e.target.value) })}
                  className="w-full" />

                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    נקודות
                  </label>
                  <Input
                  type="text"
                  value={editingModuleData.points}
                  onChange={(e) => setEditingModuleData({ ...editingModuleData, points: e.target.value })}
                  className="w-full"
                  placeholder="100 או 70 + 30" />

                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  חלקי השאלון (מופרדים בפסיקים)
                </label>
                <Input
                type="text"
                value={editingModuleData.parts}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, parts: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: Reading, Writing" />

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Entity (סוג מבחן)
                </label>
                <Select
                value={editingModuleData.entity}
                onValueChange={(value) => setEditingModuleData({ ...editingModuleData, entity: value })}>

                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GenericExam">GenericExam (כללי)</SelectItem>
                    <SelectItem value="ModuleAExam">ModuleAExam</SelectItem>
                    <SelectItem value="ModuleBExam">ModuleBExam</SelectItem>
                    <SelectItem value="ModuleCExam">ModuleCExam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  צבע רקע (Tailwind Gradient)
                </label>
                <Select
                value={editingModuleData.color}
                onValueChange={(value) => setEditingModuleData({ ...editingModuleData, color: value })}>

                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר צבע" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from-blue-500 to-indigo-600">כחול-אינדיגו</SelectItem>
                    <SelectItem value="from-purple-500 to-pink-600">סגול-ורוד</SelectItem>
                    <SelectItem value="from-green-500 to-emerald-600">ירוק-אמרלד</SelectItem>
                    <SelectItem value="from-orange-500 to-red-600">כתום-אדום</SelectItem>
                    <SelectItem value="from-cyan-500 to-blue-600">ציאן-כחול</SelectItem>
                    <SelectItem value="from-amber-500 to-yellow-600">ענבר-צהוב</SelectItem>
                    <SelectItem value="from-rose-500 to-rose-600">ורוד</SelectItem>
                    <SelectItem value="from-teal-500 to-teal-600">טורקיז</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  סדר תצוגה
                </label>
                <Input
                type="number"
                value={editingModuleData.order}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, order: parseInt(e.target.value) })}
                className="w-full" />

              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="text-sm text-gray-700">
                  <strong>💡 טיפ:</strong> לאחר שתוסיף שאלון חדש, תוכל להוסיף אליו מבחנים דרך "ניהול מבחנים"
                </div>
              </div>
            </div>
          }

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModuleDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveNewModule} className="bg-green-600 hover:bg-green-700">
              <BookCheck className="w-4 h-4 mr-2" />
              הוסף שאלון
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showModuleEditDialog} onOpenChange={setShowModuleEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-blue-600" />
              עריכת {editingModuleData?.title}
            </DialogTitle>
            <DialogDescription>
              ערוך את פרטי המודול: {displaySubject} - {displayUnits} יחידות
            </DialogDescription>
          </DialogHeader>

          {editingModuleData &&
          <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  כותרת המודול
                </label>
                <Input
                type="text"
                value={editingModuleData.title}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, title: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: מודול A" />

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  תיאור קצר
                </label>
                <Input
                type="text"
                value={editingModuleData.description}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, description: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: הבנת הנקרא + האזנה" />

              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  פרטים מלאים
                </label>
                <Textarea
                value={editingModuleData.details}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, details: e.target.value })}
                className="w-full h-20"
                placeholder="לדוגמה: 70 נק' הבנת נקרא + 30 נק' האזנה" />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    משך זמן (דקות)
                  </label>
                  <Input
                  type="number"
                  value={editingModuleData.duration}
                  onChange={(e) => setEditingModuleData({ ...editingModuleData, duration: parseInt(e.target.value) })}
                  className="w-full" />

                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    נקודות
                  </label>
                  <Input
                  type="text"
                  value={editingModuleData.points}
                  onChange={(e) => setEditingModuleData({ ...editingModuleData, points: e.target.value })}
                  className="w-full"
                  placeholder="לדוגמה: 70 + 30" />

                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  חלקי המודול (מופרדים בפסיקים)
                </label>
                <Input
                type="text"
                value={editingModuleData.parts}
                onChange={(e) => setEditingModuleData({ ...editingModuleData, parts: e.target.value })}
                className="w-full"
                placeholder="לדוגמה: Reading Comprehension, Listening" />

              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <strong>💡 טיפ:</strong> המידע שתזין כאן יעזור למערכת ליצור מבחנים מדויקים יותר בהתאם למבנה הספציפי של כל מקצוע ויחידה
                  </div>
                </div>
              </div>
            </div>
          }

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleEditDialog(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDeleteModule(editingModuleData.module_id);
                setShowModuleEditDialog(false);
              }}>

              <Trash2 className="w-4 h-4 mr-2" />
              מחק מודול
            </Button>
            <Button onClick={handleSaveModuleEdit} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}