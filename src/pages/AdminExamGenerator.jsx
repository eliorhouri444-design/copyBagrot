import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Wand2, ChevronLeft, Loader2, CheckCircle, AlertCircle, TrendingUp, Eye, Sparkles, Award, FileCheck, BookOpen, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminExamGeneratorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [showExamDetails, setShowExamDetails] = useState(null);
  const [generationProgress, setGenerationProgress] = useState("");
  
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterUnits, setFilterUnits] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  const { data: examStructures = [], refetch: refetchStructures } = useQuery({
    queryKey: ['exam-structures-for-gen'],
    queryFn: async () => {
      try {
        return await base44.entities.ExamStructure.list("-created_date", 500);
      } catch (error) {
        console.error('Error loading exam structures:', error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const { data: generatedExams = [], refetch: refetchGenerated } = useQuery({
    queryKey: ['generated-exams'],
    queryFn: async () => {
      try {
        return await base44.entities.GenericExam.filter({ is_generated: true }, "-created_date", 500);
      } catch (error) {
        console.error('Error loading generated exams:', error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const { data: moduleAExams = [] } = useQuery({
    queryKey: ['module-a-all'],
    queryFn: () => base44.entities.ModuleAExam.list(),
    enabled: !!user
  });

  const { data: moduleBExams = [] } = useQuery({
    queryKey: ['module-b-all'],
    queryFn: () => base44.entities.ModuleBExam.list(),
    enabled: !!user
  });

  const { data: moduleCExams = [] } = useQuery({
    queryKey: ['module-c-all'],
    queryFn: () => base44.entities.ModuleCExam.list(),
    enabled: !!user
  });

  const organizedData = React.useMemo(() => {
    const organized = {};
    
    examStructures.forEach(structure => {
      const subject = structure.subject;
      const unitLevel = structure.unit_level;
      const moduleId = structure.module_id;
      
      if (!organized[subject]) organized[subject] = {};
      if (!organized[subject][unitLevel]) organized[subject][unitLevel] = {};
      if (!organized[subject][unitLevel][moduleId]) {
        organized[subject][unitLevel][moduleId] = {
          subject,
          unit_level: unitLevel,
          module_id: moduleId,
          structures: [],
          generated_count: 0
        };
      }
      
      organized[subject][unitLevel][moduleId].structures.push(structure);
    });

    // הוספת ModuleA/B/C
    [...moduleAExams.map(e => ({...e, moduleId: 'A'})), 
     ...moduleBExams.map(e => ({...e, moduleId: 'B'})), 
     ...moduleCExams.map(e => ({...e, moduleId: 'C'}))
    ].forEach(exam => {
      const subject = exam.subject;
      const unitLevel = exam.unit_level || exam.units;
      const moduleId = exam.moduleId;
      
      if (!organized[subject]) organized[subject] = {};
      if (!organized[subject][unitLevel]) organized[subject][unitLevel] = {};
      if (!organized[subject][unitLevel][moduleId]) {
        organized[subject][unitLevel][moduleId] = {
          subject,
          unit_level: unitLevel,
          module_id: moduleId,
          structures: [],
          generated_count: 0
        };
      }
      
      organized[subject][unitLevel][moduleId].structures.push(exam);
    });

    generatedExams.forEach(exam => {
      const subject = exam.subject;
      const unitLevel = exam.unit_level;
      const moduleId = exam.module_id;
      
      if (organized[subject]?.[unitLevel]?.[moduleId]) {
        organized[subject][unitLevel][moduleId].generated_count++;
      }
    });

    return organized;
  }, [examStructures, generatedExams, moduleAExams, moduleBExams, moduleCExams]);

  const filteredData = React.useMemo(() => {
    const filtered = {};
    
    Object.keys(organizedData).forEach(subject => {
      if (filterSubject !== "all" && subject !== filterSubject) return;
      
      filtered[subject] = {};
      
      Object.keys(organizedData[subject]).forEach(unitLevel => {
        if (filterUnits !== "all" && unitLevel !== filterUnits) return;
        
        filtered[subject][unitLevel] = organizedData[subject][unitLevel];
      });
      
      if (Object.keys(filtered[subject]).length === 0) {
        delete filtered[subject];
      }
    });
    
    return filtered;
  }, [organizedData, filterSubject, filterUnits]);

  const filteredGeneratedExams = React.useMemo(() => {
    return generatedExams.filter(exam => {
      const matchSearch = !searchTerm || 
        exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subject?.includes(searchTerm) ||
        exam.module_id?.includes(searchTerm);
      
      const matchSubject = filterSubject === "all" || exam.subject === filterSubject;
      const matchUnits = filterUnits === "all" || exam.unit_level?.toString() === filterUnits;
      
      return matchSearch && matchSubject && matchUnits;
    });
  }, [generatedExams, searchTerm, filterSubject, filterUnits]);

  const handleGenerate = async (group) => {
    if (group.structures.length < 3) {
      toast.error(`נדרשים לפחות 3 מבחנים. יש רק ${group.structures.length}.`);
      return;
    }

    const key = `${group.subject}|${group.unit_level}|${group.module_id}`;
    setIsGenerating(true);
    setGeneratingKey(key);
    setGenerationProgress("🚀 מתחיל יצירה...");
    
    try {
      toast.loading('🎯 יוצר מבחן מקורי...', { id: 'gen' });
      setGenerationProgress("📚 לומד מהמבחנים שנסרקו...");

      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationProgress("🧠 יוצר שאלות חדשות...");

      const result = await base44.functions.invoke('generateExamFromStructure', {
        subject: group.subject,
        unitLevel: group.unit_level,
        moduleId: group.module_id,
        includeDiagrams: false
      });

      console.log('Response:', result);
      console.log('Response data:', result.data);
      console.log('Response status:', result.status);

      if (result.data?.success) {
        setGenerationProgress("💾 שומר...");
        
        toast.success(result.data.message || 'המבחן נוצר!', { id: 'gen' });
        
        // רענון מלא של הנתונים
        await queryClient.invalidateQueries(['generated-exams']);
        await queryClient.invalidateQueries(['exam-structures-for-gen']);
        await queryClient.invalidateQueries(['module-a-exams-admin']);
        await queryClient.invalidateQueries(['module-b-exams-admin']);
        await queryClient.invalidateQueries(['module-c-exams-admin']);
        await queryClient.invalidateQueries(['generic-exams-admin']);
        
        // חכה רגע ואז רענן
        await new Promise(resolve => setTimeout(resolve, 800));
        await refetchGenerated();
        await refetchStructures();

        setGenerationProgress("✅ מוכן!");
      } else {
        console.error('❌ Generation failed:', result.data);
        const errorMsg = result.data?.error || result.data?.details || 'שגיאה לא ידועה';
        toast.error(errorMsg, { id: 'gen' });
      }
    } catch (error) {
      console.error('❌ Catch block error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.message || 'שגיאה בחיבור לשרת';
      toast.error(errorMsg, { id: 'gen' });
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGeneratingKey(null);
        setGenerationProgress("");
      }, 1500);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('למחוק מבחן זה?')) return;
    
    try {
      await base44.entities.GenericExam.delete(examId);
      await queryClient.invalidateQueries(['generated-exams']);
      await refetchGenerated();
      toast.success('נמחק!');
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalScanned = examStructures.length;
  const totalGenerated = generatedExams.length;
  
  let readyModules = 0;
  Object.values(filteredData).forEach(subjects => {
    Object.values(subjects).forEach(units => {
      Object.values(units).forEach(module => {
        if (module.structures.length >= 3) readyModules++;
      });
    });
  });

  const allSubjects = Object.keys(organizedData);
  const allUnits = [...new Set(Object.values(organizedData).flatMap(s => Object.keys(s)))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wand2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">יוצר מבחנים AI</h1>
            <Sparkles className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90">מבחנים מקוריים ללא זכויות יוצרים</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold">מצב המערכת</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await Promise.all([
                  queryClient.invalidateQueries(['exam-structures-for-gen']),
                  queryClient.invalidateQueries(['generated-exams']),
                  refetchStructures(),
                  refetchGenerated()
                ]);
                toast.success('רענון הושלם!');
              }}
            >
              🔄 רענן
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center border-2 border-blue-200">
              <div className="text-3xl font-black text-blue-600">{totalScanned}</div>
              <div className="text-xs text-gray-600">מבחנים נסרקו</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
              <div className="text-3xl font-black text-green-600">{readyModules}</div>
              <div className="text-xs text-gray-600">מודולים מוכנים</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border-2 border-purple-200">
              <div className="text-3xl font-black text-purple-600">{totalGenerated}</div>
              <div className="text-xs text-gray-600">מבחנים נוצרו</div>
            </div>
          </div>
        </motion.div>

        {/* סינונים */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-4"
        >
          <div className="flex gap-3">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="כל המקצועות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל המקצועות</SelectItem>
                {allSubjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterUnits} onValueChange={setFilterUnits}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="כל היחידות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל היחידות</SelectItem>
                {allUnits.map(u => (
                  <SelectItem key={u} value={u}>{u === "0" ? "ללא" : u + " יח'"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* מודולים */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {Object.keys(filteredData).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 text-lg mb-4">עדיין לא נסרקו מבחנים</p>
              <Button
                onClick={() => navigate(createPageUrl("AdminExamStructure"))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                לך לסריקת מבחנים
              </Button>
            </div>
          ) : (
            Object.keys(filteredData).sort().map((subject) => (
              <div key={subject} className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 border-b-2 border-purple-200 pb-3">
                  📚 {subject}
                </h2>

                {Object.keys(filteredData[subject]).sort((a, b) => parseInt(a) - parseInt(b)).map((unitLevel) => (
                  <div key={unitLevel} className="mb-6 last:mb-0">
                    <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      {unitLevel === "0" ? "ללא רמות" : `${unitLevel} יחידות`}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.keys(filteredData[subject][unitLevel]).sort().map((moduleId) => {
                        const group = filteredData[subject][unitLevel][moduleId];
                        const key = `${group.subject}|${group.unit_level}|${group.module_id}`;
                        const canGenerate = group.structures.length >= 3;
                        const isGeneratingThis = isGenerating && generatingKey === key;

                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-xl p-5 border-2 shadow-md ${
                              canGenerate
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                                : 'bg-gray-50 border-gray-300'
                            }`}
                          >
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                                  שאלון {group.module_id}
                                </div>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <FileCheck className="w-4 h-4 text-blue-600" />
                                  <span className="font-semibold">{group.structures.length} מבחנים נסרקו</span>
                                </div>
                                {group.generated_count > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <span className="font-semibold text-purple-600">{group.generated_count} נוצרו</span>
                                  </div>
                                )}
                              </div>

                              {canGenerate ? (
                                <div className="mt-3 bg-green-100 rounded-lg p-2 border border-green-300">
                                  <div className="text-xs text-green-900 font-semibold flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    ✅ מוכן! נלמדו {group.structures.length} דוגמאות
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 bg-amber-100 rounded-lg p-2 border border-amber-300">
                                  <div className="text-xs text-amber-900 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    ⚠️ נדרשים עוד {3 - group.structures.length} מבחנים
                                  </div>
                                </div>
                              )}

                              {isGeneratingThis && generationProgress && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="mt-3 bg-blue-50 rounded-lg p-3 border-2 border-blue-300"
                                >
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    <span className="text-sm font-semibold text-blue-900">
                                      {generationProgress}
                                    </span>
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            <Button
                              onClick={() => handleGenerate(group)}
                              disabled={!canGenerate || isGenerating}
                              className={`w-full h-12 font-bold ${
                                canGenerate
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                  : 'bg-gray-300 text-gray-500'
                              }`}
                            >
                              {isGeneratingThis ? (
                                <>
                                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  יוצר...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-5 h-5 mr-2" />
                                  צור מבחן מקורי
                                </>
                              )}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </motion.div>

        {/* מבחנים שנוצרו */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold">מבחנים שנוצרו ({filteredGeneratedExams.length})</h2>
            </div>
          </div>

          <Input
            placeholder="חפש מבחן..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          {filteredGeneratedExams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>עדיין לא נוצרו מבחנים</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGeneratedExams.map((exam, idx) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200"
                >
                  <div className="mb-3">
                    <div className="font-bold text-gray-900 mb-1">{exam.title}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-3 flex-wrap">
                      <span>📝 {exam.questions?.length || 0} שאלות</span>
                      <span>💯 {exam.total_points} נק'</span>
                      <span>⏱️ {exam.duration_minutes}′</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 flex gap-2">
                      <span className="bg-blue-100 px-2 py-1 rounded">{exam.subject}</span>
                      <span className="bg-purple-100 px-2 py-1 rounded">{exam.unit_level}יח'</span>
                      <span className="bg-green-100 px-2 py-1 rounded">מודול {exam.module_id}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowExamDetails(exam)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      צפה
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(createPageUrl("AdminExamEditor") + `?examId=${exam.id}`)}
                      className="flex-1 border-green-500 text-green-600"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      ערוך
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteExam(exam.id)}
                      className="border-red-500 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Exam Details */}
      <Dialog open={!!showExamDetails} onOpenChange={() => setShowExamDetails(null)}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{showExamDetails?.title}</DialogTitle>
          </DialogHeader>

          {showExamDetails && (
            <div className="space-y-4 py-4">
              <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-200">
                <div className="text-sm font-bold text-indigo-900 mb-2">📋 הוראות:</div>
                <div className="text-sm text-gray-700">{showExamDetails.instructions}</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600">שאלות</div>
                  <div className="text-xl font-bold">{showExamDetails.questions?.length || 0}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600">נקודות</div>
                  <div className="text-xl font-bold">{showExamDetails.total_points}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-600">זמן</div>
                  <div className="text-xl font-bold">{showExamDetails.duration_minutes}′</div>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {showExamDetails.questions?.map((q, qIdx) => (
                  <div key={qIdx} className="bg-white rounded-lg p-4 border border-gray-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900">שאלה {q.question_number}</div>
                      <div className="text-sm font-bold text-purple-600">{q.points} נקודות</div>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                      {q.question_text}
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-semibold text-blue-600">👁️ תשובה והסבר</summary>
                      <div className="mt-2 bg-blue-50 rounded-lg p-3">
                        <div className="font-semibold text-green-700 mb-1">✅ תשובה: {q.correct_answer}</div>
                        <div className="text-gray-700 whitespace-pre-wrap">{q.explanation}</div>
                      </div>
                    </details>
                    <div className="flex gap-2 text-xs mt-2">
                      <span className="bg-blue-100 px-2 py-1 rounded text-blue-900">{q.topic}</span>
                      <span className="bg-purple-100 px-2 py-1 rounded text-purple-900">{q.question_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={() => {
                navigate(createPageUrl("AdminExamEditor") + `?examId=${showExamDetails.id}`);
                setShowExamDetails(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              ערוך מבחן
            </Button>
            <Button onClick={() => setShowExamDetails(null)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}