
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Save, Loader2, Trash2, AlertCircle, Edit2, Search, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function AdminPracticeEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [filterSubject, setFilterSubject] = useState("אנגלית");
  const [filterUnits, setFilterUnits] = useState("3");
  const [filterTopic, setFilterTopic] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

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

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', filterSubject, filterUnits],
    queryFn: async () => {
      const all = await base44.entities.TopicNew.filter({
        subject_id: filterSubject,
        unit_level: parseInt(filterUnits),
        is_active: true
      });
      return all.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!user
  });

  const { data: allQuestions = [], refetch: refetchQuestions } = useQuery({
    queryKey: ['questions', filterSubject, filterUnits, filterTopic],
    queryFn: async () => {
      const filter = {
        subject_id: filterSubject,
        unit_level: parseInt(filterUnits),
        is_active: true
      };
      
      if (filterTopic !== "all") {
        filter.topic_id = filterTopic;
      }

      return await base44.entities.QuestionBank.filter(filter, "question_id", 1000);
    },
    enabled: !!user
  });

  const filteredQuestions = React.useMemo(() => {
    return allQuestions.filter(q => {
      const matchSearch = !searchTerm || 
        q.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.question_id?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [allQuestions, searchTerm]);

  const duplicateQuestions = React.useMemo(() => {
    const questionTextMap = new Map(); // normalizedText -> ID of the first question with this text
    const duplicates = []; // Array of IDs of questions that are duplicates (including the first one in a set if it has partners)

    filteredQuestions.forEach(q => {
      const normalizedText = q.question_text?.trim().toLowerCase();
      if (!normalizedText) return;

      if (questionTextMap.has(normalizedText)) {
        // This question is a duplicate. Add its ID.
        duplicates.push(q.id);
        // Also, the original question with this text is also a duplicate. Add its ID if not already added.
        const originalId = questionTextMap.get(normalizedText);
        if (!duplicates.includes(originalId)) { 
          duplicates.push(originalId);
        }
      } else {
        questionTextMap.set(normalizedText, q.id);
      }
    });

    return duplicates;
  }, [filteredQuestions]);

  const handleSelectDuplicates = () => {
    setSelectedQuestions(duplicateQuestions);
    toast.success(`${duplicateQuestions.length} שאלות כפולות נבחרו`);
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion({ ...question });
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    setIsSaving(true);

    try {
      await base44.entities.QuestionBank.update(editingQuestion.id, {
        question_text: editingQuestion.question_text,
        question_image_url: editingQuestion.question_image_url,
        question_type: editingQuestion.question_type,
        max_score: editingQuestion.max_score,
        difficulty_level: editingQuestion.difficulty_level,
        options: editingQuestion.options
      });

      await refetchQuestions();
      toast.success('השאלה עודכנה בהצלחה!');
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('שגיאה בשמירת השאלה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (question) => {
    if (!confirm(`למחוק את השאלה "${question.question_id}"?`)) return;

    try {
      await base44.entities.QuestionBank.delete(question.id);
      await refetchQuestions();
      toast.success('השאלה נמחקה');
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('נא לבחור שאלות למחיקה');
      return;
    }

    if (!confirm(`למחוק ${selectedQuestions.length} שאלות?`)) return;

    setIsSaving(true);
    try {
      await Promise.all(
        selectedQuestions.map(qId => {
          const question = allQuestions.find(q => q.id === qId);
          return question ? base44.entities.QuestionBank.delete(question.id) : null;
        })
      );

      await refetchQuestions();
      toast.success(`${selectedQuestions.length} שאלות נמחקו`);
      setSelectedQuestions([]);
    } catch (error) {
      toast.error('שגיאה במחיקה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
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
        className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-b-[2rem] p-6 shadow-xl mb-6"
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
          <h1 className="text-3xl font-bold mb-2">עריכת שאלות תרגול</h1>
          <p className="text-sm opacity-90">ערוך ומחק שאלות לפי נושא</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{filteredQuestions.length}</div>
              <div className="text-sm text-gray-600">סה"כ שאלות</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {filteredQuestions.filter(q => q.difficulty_level === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">בינוניות</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {filteredQuestions.filter(q => q.difficulty_level === 'easy').length}
              </div>
              <div className="text-sm text-gray-600">קלות</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600">
                {duplicateQuestions.length}
              </div>
              <div className="text-sm text-gray-600">כפולות</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
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
                <SelectItem value="3">3 יח'</SelectItem>
                <SelectItem value="4">4 יח'</SelectItem>
                <SelectItem value="5">5 יח'</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="נושא" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל הנושאים</SelectItem>
                {topics.map(t => (
                  <SelectItem key={t.topic_id} value={t.topic_id}>
                    {t.icon} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חפש שאלה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
            >
              {selectedQuestions.length === filteredQuestions.length ? 'בטל הכל' : 'בחר הכל'}
            </Button>

            {duplicateQuestions.length > 0 && (
              <Button
                onClick={handleSelectDuplicates}
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Copy className="w-4 h-4 mr-1" />
                בחר כפולים ({duplicateQuestions.length})
              </Button>
            )}
          </div>

          {selectedQuestions.length > 0 && (
            <div className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-2 border-2 border-red-200 mt-3">
              <span className="text-sm font-semibold text-red-900">
                {selectedQuestions.length} שאלות נבחרו
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedQuestions([])}
                >
                  נקה
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  מחק
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">לא נמצאו שאלות</p>
            </div>
          ) : (
            filteredQuestions.map((question, idx) => {
              const isDuplicate = duplicateQuestions.includes(question.id);
              
              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`bg-white rounded-xl shadow-md p-5 border-2 ${
                    selectedQuestions.includes(question.id) ? 'border-red-500 bg-red-50' : 
                    isDuplicate ? 'border-orange-400 bg-orange-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => handleToggleSelection(question.id)}
                      className="w-5 h-5 mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex gap-2 mb-2">
                            <span className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">
                              {question.question_id}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              question.difficulty_level === 'easy' ? 'bg-green-100 text-green-700' :
                              question.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {question.difficulty_level}
                            </span>
                            <span className="bg-purple-100 px-2 py-1 rounded text-xs">
                              {question.max_score} נק'
                            </span>
                            {isDuplicate && (
                              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                                ⚠️ כפול
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800 text-sm mb-2">{question.question_text}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditQuestion(question)}
                            className="border-blue-500 text-blue-600"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            ערוך
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteQuestion(question)}
                            className="border-red-500 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">עריכת שאלה</DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-semibold mb-2">מזהה שאלה</label>
                <Input
                  value={editingQuestion.question_id || ""}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">טקסט השאלה</label>
                <Textarea
                  value={editingQuestion.question_text || ""}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                  className="w-full h-32"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">קישור לתמונה</label>
                <Input
                  value={editingQuestion.question_image_url || ""}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question_image_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">סוג שאלה</label>
                  <Select 
                    value={editingQuestion.question_type || "open"}
                    onValueChange={(val) => setEditingQuestion({...editingQuestion, question_type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="open">פתוחה</SelectItem>
                      <SelectItem value="multi_choice">רב ברירה</SelectItem>
                      <SelectItem value="fill_in_blank">השלמה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">רמת קושי</label>
                  <Select 
                    value={editingQuestion.difficulty_level || "medium"}
                    onValueChange={(val) => setEditingQuestion({...editingQuestion, difficulty_level: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="easy">קל</SelectItem>
                      <SelectItem value="medium">בינוני</SelectItem>
                      <SelectItem value="hard">קשה</SelectItem>
                      <SelectItem value="expert">מומחה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">נקודות מקסימום</label>
                <Input
                  type="number"
                  value={editingQuestion.max_score || 0}
                  onChange={(e) => setEditingQuestion({...editingQuestion, max_score: parseFloat(e.target.value)})}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              ביטול
            </Button>
            <Button onClick={handleSaveQuestion} disabled={isSaving} className="bg-blue-600">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  שמור
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
