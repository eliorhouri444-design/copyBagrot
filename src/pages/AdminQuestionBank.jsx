import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Edit2, Trash2, FileText, Search, Save, FolderOpen, PlusCircle, MoveRight, CheckSquare, Wand2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const questionTypes = [
  { value: "open", label: "פתוחה", icon: "✍️" },
  { value: "multi_choice", label: "בחירה מרובה", icon: "📝" },
  { value: "fill_in_blank", label: "השלמה", icon: "📋" },
  { value: "writing", label: "כתיבה", icon: "✒️" },
  { value: "calculation", label: "חישוב", icon: "🔢" },
  { value: "proof", label: "הוכחה", icon: "∑" }
];

export default function AdminQuestionBankPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterUnits, setFilterUnits] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetTopicId, setTargetTopicId] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);

  const [newQuestion, setNewQuestion] = useState({
    question_id: "",
    subject_id: "אנגלית",
    unit_level: 3,
    topic_id: "",
    question_text: "",
    question_type: "open",
    max_score: 10,
    difficulty_level: "medium",
    options: [],
    is_active: true
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsUserLoaded(true);
        
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setIsUserLoaded(true);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['question-bank', filterSubject, filterUnits, filterTopic],
    queryFn: async () => {
      const filter = { is_active: true };
      
      if (filterSubject !== "all") filter.subject_id = filterSubject;
      if (filterUnits !== "all") filter.unit_level = parseInt(filterUnits);
      if (filterTopic !== "all") filter.topic_id = filterTopic;

      return await base44.entities.QuestionBank.filter(filter, "-created_date", 500);
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics-new', filterSubject, filterUnits],
    queryFn: async () => {
      const filter = { is_active: true };
      if (filterSubject !== "all") filter.subject_id = filterSubject;
      if (filterUnits !== "all") filter.unit_level = parseInt(filterUnits);
      
      return await base44.entities.TopicNew.filter(filter);
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  const { data: solutions = [] } = useQuery({
    queryKey: ['solutions-bank'],
    queryFn: async () => {
      return await base44.entities.SolutionBank.list("-created_date", 500);
    },
    enabled: isUserLoaded,
    retry: 1,
    staleTime: 30000
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuestionBank.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['question-bank']);
      toast.success('השאלה עודכנה בהצלחה!');
      setEditingQuestion(null);
      setShowCreateDialog(false);
    }
  });

  const createQuestionMutation = useMutation({
    mutationFn: (questionData) => base44.entities.QuestionBank.create(questionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['question-bank']);
      setShowCreateDialog(false);
      resetNewQuestion();
      toast.success('השאלה נוצרה בהצלחה!');
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId) => base44.entities.QuestionBank.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['question-bank']);
      toast.success('השאלה נמחקה!');
    }
  });

  const handleCleanOrphanSolutions = async () => {
    if (!confirm('האם למחוק את כל הפתרונות ללא שאלות תואמות?')) return;

    setIsCleaningOrphans(true);
    try {
      const allQuestions = await base44.entities.QuestionBank.list();
      const questionIds = new Set(allQuestions.map(q => q.question_id));
      
      const orphanSolutions = solutions.filter(s => !questionIds.has(s.question_id));
      
      if (orphanSolutions.length === 0) {
        toast.info('לא נמצאו פתרונות מיותרים');
        setIsCleaningOrphans(false);
        return;
      }

      await Promise.all(orphanSolutions.map(s => base44.entities.SolutionBank.delete(s.id)));
      
      queryClient.invalidateQueries(['solutions-bank']);
      toast.success(`נמחקו ${orphanSolutions.length} פתרונות מיותרים!`);
    } catch (error) {
      toast.error('שגיאה במחיקת פתרונות: ' + error.message);
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  const handleGenerateMissingAnswers = async () => {
    if (!confirm('האם ליצור תשובות אוטומטיות לכל השאלות ללא תשובות?')) return;

    setIsGeneratingAnswers(true);
    try {
      const { data } = await base44.functions.invoke('generateMissingAnswers', {
        subject_id: filterSubject !== 'all' ? filterSubject : null,
        unit_level: filterUnits !== 'all' ? parseInt(filterUnits) : null,
        topic_id: filterTopic !== 'all' ? filterTopic : null
      });

      queryClient.invalidateQueries(['solutions-bank']);
      
      if (data.created > 0) {
        toast.success(`נוצרו ${data.created} תשובות חדשות!`);
      } else {
        toast.info(data.message || 'לא נדרשו תשובות חדשות');
      }
      
      if (data.failed > 0) {
        toast.warning(`${data.failed} שאלות נכשלו`);
      }
    } catch (error) {
      toast.error('שגיאה ביצירת תשובות: ' + error.message);
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  const handleAssignToTopic = async () => {
    if (!targetTopicId) {
      toast.error('בחר נושא יעד');
      return;
    }

    try {
      await Promise.all(
        selectedQuestions.map(qId => {
          return base44.entities.QuestionBank.update(qId, {
            topic_id: targetTopicId
          });
        })
      );

      queryClient.invalidateQueries(['question-bank']);
      toast.success(`${selectedQuestions.length} שאלות שוייכו לנושא!`);
      setShowAssignDialog(false);
      setSelectedQuestions([]);
      setTargetTopicId("");
    } catch (error) {
      toast.error('שגיאה בשיוך שאלות');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !searchQuery || 
      q.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const questionsByTopic = React.useMemo(() => {
    const grouped = {};
    
    filteredQuestions.forEach(q => {
      const topicId = q.topic_id || 'no_topic';
      if (!grouped[topicId]) {
        grouped[topicId] = [];
      }
      grouped[topicId].push(q);
    });

    return grouped;
  }, [filteredQuestions]);

  const questionsWithoutAnswers = filteredQuestions.filter(q => 
    !solutions.some(s => s.question_id === q.question_id)
  ).length;

  const orphanSolutionsCount = React.useMemo(() => {
    const questionIds = new Set(questions.map(q => q.question_id));
    return solutions.filter(s => !questionIds.has(s.question_id)).length;
  }, [questions, solutions]);

  const resetNewQuestion = () => {
    setNewQuestion({
      question_id: `Q_${Date.now()}`,
      subject_id: filterSubject !== "all" ? filterSubject : "אנגלית",
      unit_level: filterUnits !== "all" ? parseInt(filterUnits) : 3,
      topic_id: filterTopic !== "all" ? filterTopic : "",
      question_text: "",
      question_type: "open",
      max_score: 10,
      difficulty_level: "medium",
      options: [],
      is_active: true
    });
  };

  const handleSaveQuestion = () => {
    if (editingQuestion) {
      updateQuestionMutation.mutate({
        id: editingQuestion.id,
        data: {
          question_text: newQuestion.question_text,
          question_type: newQuestion.question_type,
          max_score: newQuestion.max_score,
          difficulty_level: newQuestion.difficulty_level,
          topic_id: newQuestion.topic_id,
          options: newQuestion.options
        }
      });
    } else {
      createQuestionMutation.mutate(newQuestion);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setNewQuestion({
      question_id: question.question_id,
      subject_id: question.subject_id,
      unit_level: question.unit_level,
      topic_id: question.topic_id || "",
      question_text: question.question_text,
      question_type: question.question_type,
      max_score: question.max_score,
      difficulty_level: question.difficulty_level,
      options: question.options || [],
      is_active: question.is_active
    });
    setShowCreateDialog(true);
  };

  const handleToggleSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleMoveQuestions = async () => {
    if (!targetTopicId) {
      toast.error('בחר נושא יעד');
      return;
    }

    try {
      await Promise.all(
        selectedQuestions.map(qId => {
          return base44.entities.QuestionBank.update(qId, {
            topic_id: targetTopicId
          });
        })
      );

      queryClient.invalidateQueries(['question-bank']);
      toast.success(`${selectedQuestions.length} שאלות הועברו בהצלחה!`);
      setShowMoveDialog(false);
      setSelectedQuestions([]);
      setTargetTopicId("");
    } catch (error) {
      toast.error('שגיאה בהעברת שאלות');
    }
  };

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <h1 className="text-3xl font-bold text-white mb-2">מאגר שאלות</h1>
        <p className="text-white/80">ניהול וארגון השאלות לפי נושאים</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
            <div className="text-sm text-gray-600">סה"כ שאלות</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <div className="text-3xl font-bold text-green-600">{topics.length}</div>
            <div className="text-sm text-gray-600">נושאים</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <div className="text-3xl font-bold text-purple-600">{solutions.length}</div>
            <div className="text-sm text-gray-600">פתרונות</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <div className="text-3xl font-bold text-red-600">{questionsWithoutAnswers}</div>
            <div className="text-sm text-gray-600">ללא תשובות</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חפש שאלה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="מקצוע" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל המקצועות</SelectItem>
                <SelectItem value="אנגלית">אנגלית</SelectItem>
                <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                <SelectItem value="פיזיקה">פיזיקה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUnits} onValueChange={setFilterUnits}>
              <SelectTrigger>
                <SelectValue placeholder="יחידות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל היחידות</SelectItem>
                <SelectItem value="3">3 יח'</SelectItem>
                <SelectItem value="4">4 יח'</SelectItem>
                <SelectItem value="5">5 יח'</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger>
                <SelectValue placeholder="נושא" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל הנושאים</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic.topic_id} value={topic.topic_id}>
                    {topic.icon} {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {orphanSolutionsCount > 0 && (
            <div className="bg-red-50 rounded-lg p-3 mb-3 border-2 border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-bold text-red-900">
                      נמצאו {orphanSolutionsCount} פתרונות מיותרים
                    </p>
                    <p className="text-xs text-red-700">פתרונות לשאלות שלא קיימות במערכת</p>
                  </div>
                </div>
                <Button
                  onClick={handleCleanOrphanSolutions}
                  disabled={isCleaningOrphans}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isCleaningOrphans ? 'מוחק...' : 'מחק פתרונות מיותרים'}
                </Button>
              </div>
            </div>
          )}

          {questionsWithoutAnswers > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 mb-3 border-2 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    {filteredQuestions.filter(q => q.question_type !== 'writing' && !solutions.some(s => s.question_id === q.question_id)).length > 0 ? (
                      <>נמצאו {filteredQuestions.filter(q => q.question_type !== 'writing' && !solutions.some(s => s.question_id === q.question_id)).length} שאלות רגילות ללא תשובות</>
                    ) : (
                      <>שאלות כתיבה לא דורשות תשובות מוכנות</>
                    )}
                  </p>
                  {filteredQuestions.filter(q => q.question_type !== 'writing' && !solutions.some(s => s.question_id === q.question_id)).length > 0 && (
                    <p className="text-xs text-amber-700">לחץ כאן ליצירת תשובות אוטומטית</p>
                  )}
                  {filteredQuestions.filter(q => q.question_type === 'writing').length > 0 && (
                    <p className="text-xs text-blue-700">📝 {filteredQuestions.filter(q => q.question_type === 'writing').length} שאלות כתיבה (AI בודק אותן)</p>
                  )}
                </div>
                <Button
                  onClick={handleGenerateMissingAnswers}
                  disabled={isGeneratingAnswers}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isGeneratingAnswers ? 'מייצר...' : 'צור תשובות'}
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedQuestions.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3 border-2 border-blue-300">
              <span className="text-sm font-bold text-blue-900">
                {selectedQuestions.length} שאלות נבחרו
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  שייך לנושא
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowMoveDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <MoveRight className="w-4 h-4 mr-1" />
                  העבר לנושא אחר
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedQuestions([])}
                >
                  נקה בחירה
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              {selectedQuestions.length === filteredQuestions.length ? 'בטל הכל' : 'בחר הכל'}
            </Button>
          </div>
        </div>

        {/* Topics with Questions */}
        <div className="space-y-6">
          {Object.entries(questionsByTopic).map(([topicId, topicQuestions]) => {
            const topic = topics.find(t => t.topic_id === topicId);
            const topicName = topic ? `${topic.icon} ${topic.name}` : '📂 ללא נושא';

            return (
              <div key={topicId} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-6 h-6 text-orange-600" />
                    <h2 className="text-2xl font-bold text-gray-900">{topicName}</h2>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                      {topicQuestions.length} שאלות
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => {
                      resetNewQuestion();
                      setNewQuestion(prev => ({ ...prev, topic_id: topicId }));
                      setShowCreateDialog(true);
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    הוסף שאלה
                  </Button>
                </div>

                <div className="space-y-3">
                  {topicQuestions.map((question) => {
                    const questionType = questionTypes.find(t => t.value === question.question_type);
                    const hasSolution = solutions.some(s => s.question_id === question.question_id);
                    const isSelected = selectedQuestions.includes(question.id);

                    return (
                      <div 
                        key={question.id} 
                        className={`rounded-xl p-4 border-2 transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-500' 
                            : 'bg-gray-50 border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelection(question.id)}
                            className="w-5 h-5 mt-1"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{questionType?.icon}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono font-bold">
                                {question.question_id}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                question.difficulty_level === 'easy' ? 'bg-green-100 text-green-700' :
                                question.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {question.difficulty_level}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                {question.max_score} נק'
                              </span>
                              {hasSolution ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  ✓ יש פתרון
                                </span>
                              ) : (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                  ✗ אין פתרון
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-800 mb-2 line-clamp-2">
                              {question.question_text}
                            </div>

                            {question.options && question.options.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {question.options.length} אפשרויות תשובה
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditQuestion(question)}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <Edit2 className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`למחוק את השאלה ${question.question_id}?`)) {
                                  deleteQuestionMutation.mutate(question.id);
                                }
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {Object.keys(questionsByTopic).length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין שאלות במאגר</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs remain the same */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingQuestion ? 'ערוך שאלה' : 'צור שאלה חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">מזהה שאלה</label>
                <Input
                  value={newQuestion.question_id}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_id: e.target.value })}
                  placeholder="Q_12345"
                  disabled={!!editingQuestion}
                  className={editingQuestion ? "bg-gray-100" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">סוג שאלה</label>
                <Select
                  value={newQuestion.question_type}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, question_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {questionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">מקצוע</label>
                <Select
                  value={newQuestion.subject_id}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, subject_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="אנגלית">אנגלית</SelectItem>
                    <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                    <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">יחידות</label>
                <Select
                  value={newQuestion.unit_level?.toString()}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, unit_level: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="3">3 יח'</SelectItem>
                    <SelectItem value="4">4 יח'</SelectItem>
                    <SelectItem value="5">5 יח'</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">נושא</label>
                <Select
                  value={newQuestion.topic_id}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, topic_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר נושא" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {topics.map(topic => (
                      <SelectItem key={topic.topic_id} value={topic.topic_id}>
                        {topic.icon} {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">טקסט השאלה</label>
              <Textarea
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                placeholder="הזן את טקסט השאלה..."
                className="h-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">רמת קושי</label>
                <Select
                  value={newQuestion.difficulty_level}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, difficulty_level: value })}
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">נקודות מקסימום</label>
                <Input
                  type="number"
                  value={newQuestion.max_score}
                  onChange={(e) => setNewQuestion({ ...newQuestion, max_score: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingQuestion(null);
            }}>
              ביטול
            </Button>
            <Button
              onClick={handleSaveQuestion}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingQuestion ? 'עדכן' : 'צור'} שאלה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">שייך שאלות לנושא</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                <strong>{selectedQuestions.length} שאלות</strong> ישוייכו לנושא שתבחר
              </p>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">נושא יעד</label>
            <Select value={targetTopicId} onValueChange={setTargetTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר נושא" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {topics.map(topic => (
                  <SelectItem key={topic.topic_id} value={topic.topic_id}>
                    {topic.icon} {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleAssignToTopic} className="bg-green-600 hover:bg-green-700">
              <PlusCircle className="w-4 h-4 mr-2" />
              שייך לנושא
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">העבר שאלות לנושא אחר</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                <strong>{selectedQuestions.length} שאלות</strong> נבחרו להעברה
              </p>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">נושא יעד</label>
            <Select value={targetTopicId} onValueChange={setTargetTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר נושא יעד" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {topics.map(topic => (
                  <SelectItem key={topic.topic_id} value={topic.topic_id}>
                    {topic.icon} {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleMoveQuestions} className="bg-purple-600 hover:bg-purple-700">
              <MoveRight className="w-4 h-4 mr-2" />
              העבר שאלות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}