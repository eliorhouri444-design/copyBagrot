import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Save, Loader2, BookOpen, Trash2, AlertCircle, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import QuestionListDnD from "../components/admin/QuestionListDnD";
import QuestionEditor from "../components/admin/QuestionEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

export default function AdminExamEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [filterSubject, setFilterSubject] = useState("אנגלית");
  const [filterUnits, setFilterUnits] = useState("3");
  const [filterModule, setFilterModule] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingExam, setEditingExam] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkReadingText, setBulkReadingText] = useState("");
  const [selectedExams, setSelectedExams] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // New state
  const [examToDelete, setExamToDelete] = useState(null); // New state

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

  const { data: allGenericExams = [], refetch: refetchGeneric } = useQuery({
    queryKey: ['admin-generic-exams'],
    queryFn: () => base44.entities.GenericExam.list("-created_date", 500),
    enabled: !!user
  });

  const { data: allModuleAExams = [], refetch: refetchA } = useQuery({
    queryKey: ['admin-module-a'],
    queryFn: () => base44.entities.ModuleAExam.list("-created_date", 500),
    enabled: !!user
  });

  const { data: allModuleBExams = [], refetch: refetchB } = useQuery({
    queryKey: ['admin-module-b'],
    queryFn: () => base44.entities.ModuleBExam.list("-created_date", 500),
    enabled: !!user
  });

  const { data: allModuleCExams = [], refetch: refetchC } = useQuery({
    queryKey: ['admin-module-c'],
    queryFn: () => base44.entities.ModuleCExam.list("-created_date", 500),
    enabled: !!user
  });

  const allExams = React.useMemo(() => {
    const combined = [
      ...allGenericExams.map(e => ({ ...e, entity: 'GenericExam', exam_type: 'generic' })),
      ...allModuleAExams.map(e => ({ ...e, entity: 'ModuleAExam', exam_type: 'module_a' })),
      ...allModuleBExams.map(e => ({ ...e, entity: 'ModuleBExam', exam_type: 'module_b' })),
      ...allModuleCExams.map(e => ({ ...e, entity: 'ModuleCExam', exam_type: 'module_c' }))
    ];

    return combined.filter(exam => {
      const matchSubject = !filterSubject || filterSubject === "all" || exam.subject === filterSubject;
      const examUnits = exam.unit_level || exam.units || 0;
      const matchUnits = !filterUnits || filterUnits === "all" || examUnits.toString() === filterUnits;
      const matchModule = !filterModule || filterModule === "all" || exam.module_id === filterModule;
      const matchSearch = !searchTerm || exam.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchSubject && matchUnits && matchModule && matchSearch;
    });
  }, [allGenericExams, allModuleAExams, allModuleBExams, allModuleCExams, filterSubject, filterUnits, filterModule, searchTerm]);

  const availableModules = React.useMemo(() => {
    const modules = new Set();
    allExams.forEach(exam => {
      if (exam.module_id) modules.add(exam.module_id);
    });
    return Array.from(modules).sort();
  }, [allExams]);

  const handleEditExam = (exam) => {
    setEditingExam({
      ...exam,
      reading_text: exam.reading_text || "",
      questions: exam.questions || []
    });
  };

  const handleEditQuestion = (question, questionIndex) => {
    setEditingQuestion({
      ...question,
      index: questionIndex
    });
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion || !editingExam) return;

    const updatedQuestions = [...editingExam.questions];
    updatedQuestions[editingQuestion.index] = {
      ...editingQuestion,
      index: undefined
    };

    setEditingExam({
      ...editingExam,
      questions: updatedQuestions
    });
    setEditingQuestion(null);
    toast.success('השאלה עודכנה');
  };

  const handleDeleteQuestion = (questionIndex) => {
    if (!confirm('למחוק את השאלה?')) return;

    const updatedQuestions = editingExam.questions.filter((_, idx) => idx !== questionIndex);
    setEditingExam({
      ...editingExam,
      questions: updatedQuestions
    });
    toast.success('השאלה נמחקה');
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      question_number: editingExam.questions.length + 1,
      question_text: "",
      question_type: "multiple_choice",
      options: ["", "", "", ""],
      correct_answer: "",
      explanation: "",
      points: 10
    };

    setEditingExam({
      ...editingExam,
      questions: [...editingExam.questions, newQuestion]
    });
  };

  const handleSaveExam = async () => {
    if (!editingExam) return;
    setIsSaving(true);

    try {
      const entityName = editingExam.entity;
      const updateData = {
        reading_text: editingExam.reading_text || "",
        title: editingExam.title,
        description: editingExam.description || "",
        module_id: editingExam.module_id, // Added module_id
        questions: editingExam.questions
      };

      await base44.entities[entityName].update(editingExam.id, updateData);

      await Promise.all([
        refetchGeneric(),
        refetchA(),
        refetchB(),
        refetchC()
      ]);

      toast.success('המבחן עודכן בהצלחה!');
      setEditingExam(null);
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error('שגיאה בשמירת המבחן');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAddReadingText = async () => {
    if (!bulkReadingText.trim()) {
      toast.error('נא להזין טקסט קריאה');
      return;
    }

    if (selectedExams.length === 0) {
      toast.error('נא לבחור לפחות מבחן אחד');
      return;
    }

    setIsSaving(true);

    try {
      const updatePromises = selectedExams.map(examId => {
        const exam = allExams.find(e => e.id === examId);
        if (!exam) return null;

        return base44.entities[exam.entity].update(exam.id, {
          reading_text: bulkReadingText
        });
      });

      await Promise.all(updatePromises.filter(p => p !== null));

      await Promise.all([
        refetchGeneric(),
        refetchA(),
        refetchB(),
        refetchC()
      ]);

      toast.success(`טקסט הקריאה נוסף ל-${selectedExams.length} מבחנים!`);
      setShowBulkEditDialog(false);
      setBulkReadingText("");
      setSelectedExams([]);
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('שגיאה בעדכון המבחנים');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleExamSelection = (examId) => {
    setSelectedExams(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  // Modified handleDeleteExam to open confirmation dialog
  const handleDeleteExam = async (exam) => {
    setExamToDelete(exam);
    setShowDeleteDialog(true);
  };

  // New function for confirming and performing deletion
  const confirmDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      await base44.entities[examToDelete.entity].delete(examToDelete.id);
      await Promise.all([refetchGeneric(), refetchA(), refetchB(), refetchC()]);
      toast.success('המבחן נמחק בהצלחה!');
      setShowDeleteDialog(false);
      setExamToDelete(null);
      setEditingExam(null); // Close the edit dialog if an exam was deleted from it
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('שגיאה במחיקת המבחן');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
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
          <h1 className="text-3xl font-bold mb-2">עריכת מבחנים</h1>
          <p className="text-sm opacity-90">הוסף טקסטי קריאה ועדכן שאלות</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{allExams.length}</div>
              <div className="text-sm text-gray-600">סה"כ מבחנים</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {allExams.filter(e => e.reading_text).length}
              </div>
              <div className="text-sm text-gray-600">עם טקסט קריאה</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {allExams.filter(e => !e.reading_text).length}
              </div>
              <div className="text-sm text-gray-600">ללא טקסט</div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל המקצועות</SelectItem>
                <SelectItem value="אנגלית">אנגלית</SelectItem>
                <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                <SelectItem value="פיזיקה">פיזיקה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUnits} onValueChange={setFilterUnits}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל היחידות</SelectItem>
                <SelectItem value="3">3 יח'</SelectItem>
                <SelectItem value="4">4 יח'</SelectItem>
                <SelectItem value="5">5 יח'</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="מודול" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל המודולים</SelectItem>
                {availableModules.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="חפש מבחן..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowBulkEditDialog(true);
                setSelectedExams([]);
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={allExams.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              הוספה קבוצתית של טקסט
            </Button>
            
            {selectedExams.length > 0 && (
              <div className="flex-1 bg-blue-50 rounded-lg px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900">
                  {selectedExams.length} מבחנים נבחרו
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedExams([])}
                >
                  נקה
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Exams List */}
        <div className="space-y-3">
          {allExams.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">לא נמצאו מבחנים</p>
            </div>
          ) : (
            allExams.map((exam, idx) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`bg-white rounded-xl shadow-md p-5 border-2 ${
                  selectedExams.includes(exam.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedExams.includes(exam.id)}
                    onChange={() => handleToggleExamSelection(exam.id)}
                    className="w-5 h-5 mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">{exam.title}</h3>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-blue-100 px-2 py-1 rounded">{exam.subject}</span>
                          <span className="bg-purple-100 px-2 py-1 rounded">
                            {exam.unit_level || exam.units}יח'
                          </span>
                          <span className="bg-green-100 px-2 py-1 rounded">מודול {exam.module_id}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{exam.questions?.length || 0} שאלות</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditExam(exam)}
                          className="border-blue-500 text-blue-600"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          ערוך
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteExam(exam)}
                          className="border-red-500 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">טקסט קריאה:</span>
                      </div>
                      {exam.reading_text ? (
                        <div className="text-xs text-gray-600 max-h-20 overflow-y-auto" dir="ltr">
                          {exam.reading_text.substring(0, 200)}...
                        </div>
                      ) : (
                        <div className="text-xs text-orange-600 font-semibold">❌ חסר טקסט קריאה</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit Exam Dialog */}
      <Dialog open={!!editingExam} onOpenChange={() => setEditingExam(null)}>
        <DialogContent dir="rtl" className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">עריכת מבחן</DialogTitle>
            {editingExam?.exam_file_url && (
              <div className="text-xs mt-1">
                <a href={editingExam.exam_file_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">קובץ בחינה (PDF)</a>
                {editingExam.solution_file_url && (
                  <>
                    <span className="mx-2">•</span>
                    <a href={editingExam.solution_file_url} target="_blank" rel="noreferrer" className="text-green-600 underline">קובץ פתרון (PDF)</a>
                  </>
                )}
              </div>
            )}
            <DialogDescription>
              {editingExam?.entity} - {editingExam?.subject} - {editingExam?.unit_level || editingExam?.units}יח'
            </DialogDescription>
          </DialogHeader>

          {editingExam && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">כותרת המבחן</label>
                  <Input
                    value={editingExam.title || ""}
                    onChange={(e) => setEditingExam({...editingExam, title: e.target.value})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מודול (שייך למודול אחר)</label>
                  <Select
                    value={editingExam.module_id || ""}
                    onValueChange={(value) => setEditingExam({...editingExam, module_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מודול" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {editingExam.subject === 'אנגלית' && (
                        <>
                          <SelectItem value="A">מודול A</SelectItem>
                          <SelectItem value="B">מודול B</SelectItem>
                          <SelectItem value="C">מודול C</SelectItem>
                          <SelectItem value="D">מודול D</SelectItem>
                          <SelectItem value="E">מודול E</SelectItem>
                          <SelectItem value="F">מודול F</SelectItem>
                          <SelectItem value="G">מודול G</SelectItem>
                        </>
                      )}
                      {editingExam.subject === 'מתמטיקה' && (
                        <>
                          <SelectItem value="801">שאלון 801</SelectItem>
                          <SelectItem value="802">שאלון 802</SelectItem>
                          <SelectItem value="803">שאלון 803</SelectItem>
                          <SelectItem value="804">שאלון 804</SelectItem>
                          <SelectItem value="805">שאלון 805</SelectItem>
                          <SelectItem value="806">שאלון 806</SelectItem>
                          <SelectItem value="807">שאלון 807</SelectItem>
                        </>
                      )}
                      {editingExam.subject === 'פיזיקה' && (
                        <>
                          <SelectItem value="035201">שאלון 035201</SelectItem>
                          <SelectItem value="035202">שאלון 035202</SelectItem>
                          <SelectItem value="035203">שאלון 035203</SelectItem>
                          <SelectItem value="035204">שאלון 035204</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
                <Input
                  value={editingExam.description || ""}
                  onChange={(e) => setEditingExam({...editingExam, description: e.target.value})}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">העלה קובץ בחינה (PDF)</label>
                  <input type="file" accept="application/pdf" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      setEditingExam({ ...editingExam, exam_file_url: file_url });
                      toast.success('קובץ בחינה הועלה');
                    } catch (err) {
                      toast.error('שגיאה בהעלאת קובץ בחינה');
                    }
                  }} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">העלה קובץ פתרון (PDF)</label>
                  <input type="file" accept="application/pdf" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      setEditingExam({ ...editingExam, solution_file_url: file_url });
                      toast.success('קובץ פתרון הועלה');
                    } catch (err) {
                      toast.error('שגיאה בהעלאת קובץ פתרון');
                    }
                  }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  טקסט קריאה (Reading Text)
                </label>
                <Textarea
                  value={editingExam.reading_text || ""}
                  onChange={(e) => setEditingExam({...editingExam, reading_text: e.target.value})}
                  className="w-full h-32 font-mono text-sm"
                  placeholder="Paste the reading text here..."
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-lg font-bold text-gray-900">שאלות המבחן</label>
                  <Button
                    onClick={handleAddQuestion}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    הוסף שאלה
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <QuestionListDnD
                    questions={editingExam.questions || []}
                    onReorder={(renumbered) => setEditingExam({ ...editingExam, questions: renumbered })}
                    onEdit={(q, idx) => handleEditQuestion(q, idx)}
                    onDelete={(idx) => handleDeleteQuestion(idx)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingExam(null)}>
              ביטול
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setExamToDelete(editingExam);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              מחק מבחן
            </Button>
            <Button onClick={handleSaveExam} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">אישור מחיקה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק את המבחן "{examToDelete?.title}"?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800">
              <strong>⚠️ אזהרה:</strong> פעולה זו בלתי הפיכה ותמחק את המבחן לצמיתות מהמערכת.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              ביטול
            </Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                await confirmDeleteExam();
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              מחק לצמיתות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>עריכת שאלה {editingQuestion?.index !== undefined ? editingQuestion.index + 1 : ''}</DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4 py-2">
              <QuestionEditor
                question={editingQuestion}
                onChange={(q) => setEditingQuestion({ ...q, index: editingQuestion.index })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>ביטול</Button>
            <Button onClick={handleSaveQuestion} className="bg-blue-600">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">הוספה קבוצתית של טקסט קריאה</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              value={bulkReadingText}
              onChange={(e) => setBulkReadingText(e.target.value)}
              className="w-full h-48 font-mono text-sm"
              placeholder="Paste the reading text here..."
              dir="ltr"
            />

            <div className="max-h-96 overflow-y-auto space-y-2 border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold">בחר מבחנים ({selectedExams.length})</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedExams(selectedExams.length === allExams.length ? [] : allExams.map(e => e.id));
                  }}
                >
                  {selectedExams.length === allExams.length ? 'בטל הכל' : 'בחר הכל'}
                </Button>
              </div>

              {allExams.map(exam => (
                <div
                  key={exam.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer ${
                    selectedExams.includes(exam.id) ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => handleToggleExamSelection(exam.id)}
                >
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedExams.includes(exam.id)} onChange={() => {}} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{exam.title}</div>
                      <div className="text-xs text-gray-600">{exam.subject} • {exam.unit_level || exam.units}יח'</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>ביטול</Button>
            <Button 
              onClick={handleBulkAddReadingText}
              disabled={isSaving || selectedExams.length === 0}
              className="bg-purple-600"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : `הוסף ל-${selectedExams.length} מבחנים`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}