import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Search, Trash2, Eye, Filter, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import QuestionViewer from "../components/questionbank/QuestionViewer";

export default function AdminQuestionListPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [unitsFilter, setUnitsFilter] = useState('all');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const subjects = ["מתמטיקה", "פיזיקה", "כימיה", "ביולוגיה", "אנגלית", "ספרות"];
  const unitsOptions = ["0", "2", "3", "4", "5"];

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

  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user]);

  useEffect(() => {
    filterQuestions();
  }, [searchTerm, subjectFilter, unitsFilter, questions]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      toast.loading('טוען שאלות...', { id: 'load' });
      const allQuestions = await base44.entities.QuestionBank.list('-created_date', 1000);
      setQuestions(allQuestions || []);
      toast.success(`${(allQuestions || []).length} שאלות נטענו`, { id: 'load' });
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('שגיאה בטעינה', { id: 'load' });
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(q => q.subject_id === subjectFilter);
    }

    if (unitsFilter !== 'all') {
      filtered = filtered.filter(q => q.unit_level === parseInt(unitsFilter));
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(q => {
        const questionText = q.question_text || '';
        const questionId = q.question_id || '';
        return questionText.toLowerCase().includes(term) || 
               questionId.toLowerCase().includes(term);
      });
    }

    setFilteredQuestions(filtered);
  };

  const handleDelete = async (questionId, questionDbId) => {
    if (!confirm('האם למחוק את השאלה והפתרון שלה?')) return;

    try {
      toast.loading('מוחק...', { id: 'delete' });
      
      // מחיקת פתרונות
      const solutions = await base44.entities.SolutionBank.filter({ question_id: questionId });
      for (const sol of solutions) {
        await base44.entities.SolutionBank.delete(sol.id);
      }
      
      // מחיקת השאלה
      await base44.entities.QuestionBank.delete(questionDbId);
      
      setQuestions(prev => prev.filter(q => q.id !== questionDbId));
      toast.success('נמחק בהצלחה!', { id: 'delete' });
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('שגיאה במחיקה', { id: 'delete' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('לא נבחרו שאלות למחיקה');
      return;
    }

    if (!confirm(`האם למחוק ${selectedQuestions.length} שאלות ואת הפתרונות שלהן?`)) return;

    try {
      toast.loading(`מוחק ${selectedQuestions.length} שאלות...`, { id: 'bulk-delete' });
      
      let deletedCount = 0;
      for (const qId of selectedQuestions) {
        const question = questions.find(q => q.id === qId);
        if (!question) continue;

        // מחיקת פתרונות
        const solutions = await base44.entities.SolutionBank.filter({ question_id: question.question_id });
        for (const sol of solutions) {
          await base44.entities.SolutionBank.delete(sol.id);
        }
        
        // מחיקת השאלה
        await base44.entities.QuestionBank.delete(qId);
        deletedCount++;
      }
      
      setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      toast.success(`${deletedCount} שאלות נמחקו בהצלחה!`, { id: 'bulk-delete' });
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('שגיאה במחיקה המרובה', { id: 'bulk-delete' });
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleViewDetails = async (question) => {
    try {
      toast.loading('טוען פרטים...', { id: 'details' });
      const solutions = await base44.entities.SolutionBank.filter({ 
        question_id: question.question_id 
      });
      setSelectedQuestion(question);
      setSelectedSolution(solutions.length > 0 ? solutions[0] : null);
      setShowDetailsDialog(true);
      toast.dismiss('details');
    } catch (error) {
      console.error('Error loading details:', error);
      toast.error('שגיאה בטעינת פרטים', { id: 'details' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-3xl p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center text-white">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">מאגר שאלות</h1>
          <p className="text-sm opacity-90">{questions.length} שאלות במערכת</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold">סינון וחיפוש</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש טקסט או מזהה..."
                  className="pr-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">מקצוע</label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger><SelectValue placeholder="כל המקצועות" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">כל המקצועות</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">יחידות</label>
              <Select value={unitsFilter} onValueChange={setUnitsFilter}>
                <SelectTrigger><SelectValue placeholder="כל היחידות" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">כל היחידות</SelectItem>
                  {unitsOptions.map(u => (
                    <SelectItem key={u} value={u}>{u === "0" ? "ללא" : u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              מציג {filteredQuestions.length} מתוך {questions.length} שאלות
            </div>
            
            {selectedQuestions.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-purple-600">
                  {selectedQuestions.length} נבחרו
                </span>
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק נבחרות ({selectedQuestions.length})
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Questions List */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3" />
            <p className="text-gray-600">טוען שאלות...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">לא נמצאו שאלות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="border-purple-400"
                />
                <span className="text-sm font-semibold text-purple-900">
                  בחר הכל ({filteredQuestions.length} שאלות)
                </span>
              </div>
            </div>

            {filteredQuestions.map((question, idx) => (
              <motion.div
                key={question.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all ${
                  selectedQuestions.includes(question.id) ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedQuestions.includes(question.id)}
                      onCheckedChange={() => toggleQuestionSelection(question.id)}
                      className="mt-1 border-gray-400"
                    />
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        {question.subject_id || 'לא צוין'}
                      </span>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        {question.unit_level || 0} יח׳
                      </span>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        {question.max_score || 0} נק׳
                      </span>
                      {question.difficulty_level && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                          {question.difficulty_level}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {(question.question_text || 'אין טקסט').substring(0, 150)}
                      {(question.question_text || '').length > 150 ? '...' : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {question.question_id || 'לא צוין'}
                    </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(question)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(question.question_id, question.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>פרטי שאלה ופתרון</DialogTitle>
          </DialogHeader>

          {selectedQuestion && (
            <div className="py-4">
              <QuestionViewer 
                question={selectedQuestion}
                solution={selectedSolution}
                showSolution={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}