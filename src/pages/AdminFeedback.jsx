import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Flag, CheckCircle, XCircle, Clock, TrendingUp, Filter, ChevronLeft, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");

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

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => base44.entities.UserFeedback.list("-created_date", 200),
    enabled: !!user
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, response }) => 
      base44.entities.UserFeedback.update(id, { 
        status, 
        admin_response: response 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbacks']);
      setSelectedFeedback(null);
      setAdminResponse("");
    }
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id) => base44.entities.UserFeedback.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbacks']);
      setSelectedFeedback(null);
    }
  });

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterSubject !== "all" && f.subject !== filterSubject) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (filterType !== "all" && f.feedback_type !== filterType) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    reviewed: feedbacks.filter(f => f.status === 'reviewed').length,
    fixed: feedbacks.filter(f => f.status === 'fixed').length,
    critical: feedbacks.filter(f => f.severity === 'critical').length
  };

  const subjects = [...new Set(feedbacks.map(f => f.subject))];
  
  const feedbackTypes = [
    { value: "missing_line", label: "שכח קו/נקודה" },
    { value: "wrong_interpretation", label: "הבנה שגויה" },
    { value: "wrong_diagram", label: "איור שגוי" },
    { value: "wrong_calculation", label: "חישוב שגוי" },
    { value: "missing_info", label: "מידע חסר" },
    { value: "irrelevant_explanation", label: "הסבר לא רלוונטי" },
    { value: "wrong_graph", label: "גרף שגוי" },
    { value: "language_issue", label: "בעיית שפה" },
    { value: "other", label: "אחר" }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'moderate': return 'from-orange-500 to-orange-600';
      case 'minor': return 'from-yellow-500 to-yellow-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'reviewed': return <Eye className="w-5 h-5" />;
      case 'fixed': return <CheckCircle className="w-5 h-5" />;
      case 'dismissed': return <XCircle className="w-5 h-5" />;
      default: return <Flag className="w-5 h-5" />;
    }
  };

  const handleUpdateStatus = (status) => {
    updateStatusMutation.mutate({
      id: selectedFeedback.id,
      status,
      response: adminResponse
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Flag className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-3xl font-bold text-white mb-2">פידבק משתמשים</h1>
            <p className="text-white/90">דיווחים ובעיות שהתלמידים מצאו</p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* סטטיסטיקות */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">סה"כ דיווחים</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 shadow-md text-center border-2 border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-yellow-700">ממתין</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 shadow-md text-center border-2 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{stats.reviewed}</div>
            <div className="text-xs text-blue-700">נבדק</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 shadow-md text-center border-2 border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.fixed}</div>
            <div className="text-xs text-green-700">תוקן</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow-md text-center border-2 border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-red-700">קריטי</div>
          </div>
        </div>

        {/* פילטרים */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-bold text-gray-900">סינון</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
                <SelectValue placeholder="כל המקצועות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל המקצועות</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="reviewed">נבדק</SelectItem>
                <SelectItem value="fixed">תוקן</SelectItem>
                <SelectItem value="dismissed">נדחה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסוגים" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל הסוגים</SelectItem>
                {feedbackTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* רשימת פידבקים */}
        <div className="space-y-3">
          {filteredFeedbacks.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-600">אין דיווחים להצגה</div>
            </div>
          ) : (
            filteredFeedbacks.map((feedback, idx) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedFeedback(feedback)}
              >
                <div className={`bg-gradient-to-r ${getSeverityColor(feedback.severity)} p-3 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(feedback.status)}
                      <div>
                        <div className="font-bold">{feedback.subject}</div>
                        <div className="text-xs opacity-90">{feedback.topic || 'כללי'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {feedback.was_applied && (
                        <span className="bg-white/20 px-2 py-1 rounded text-xs">✅ הוחל</span>
                      )}
                      <span className="text-xs">
                        {new Date(feedback.created_date).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                    <strong>שאלה:</strong> {feedback.original_question}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {feedbackTypes.find(t => t.value === feedback.feedback_type)?.label || feedback.feedback_type}
                    </span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {feedback.severity}
                    </span>
                    {feedback.learning_impact?.similar_feedbacks_count > 0 && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">
                        📊 {feedback.learning_impact.similar_feedbacks_count} דומים
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* דיאלוג פרטי פידבק */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-6 h-6 text-blue-600" />
              פרטי דיווח
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4 py-4">
              {/* מידע כללי */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">מקצוע</div>
                  <div className="font-bold text-blue-900">{selectedFeedback.subject}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">נושא</div>
                  <div className="font-bold text-purple-900">{selectedFeedback.topic || 'כללי'}</div>
                </div>
                <div className={`bg-gradient-to-r ${getSeverityColor(selectedFeedback.severity)} rounded-lg p-3 text-white`}>
                  <div className="text-xs opacity-90 mb-1">חומרה</div>
                  <div className="font-bold">{selectedFeedback.severity}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="text-xs text-amber-700 mb-1">סוג בעיה</div>
                  <div className="font-bold text-amber-900 text-sm">
                    {feedbackTypes.find(t => t.value === selectedFeedback.feedback_type)?.label}
                  </div>
                </div>
              </div>

              {/* השאלה */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="text-sm font-bold text-blue-900 mb-2">📝 השאלה:</div>
                <div className="text-sm text-gray-800">{selectedFeedback.original_question}</div>
                {selectedFeedback.image_url && (
                  <img 
                    src={selectedFeedback.image_url} 
                    alt="question" 
                    className="mt-2 max-w-full rounded-lg border-2 border-blue-300"
                    style={{ maxHeight: '300px' }}
                  />
                )}
              </div>

              {/* תשובת AI */}
              <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                <div className="text-sm font-bold text-amber-900 mb-2">🤖 תשובת המורה החכם:</div>
                <div className="text-sm text-gray-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedFeedback.ai_answer}
                </div>
              </div>

              {/* הסבר המשתמש */}
              {selectedFeedback.user_description && (
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-sm font-bold text-purple-900 mb-2">💬 הסבר התלמיד:</div>
                  <div className="text-sm text-gray-800">{selectedFeedback.user_description}</div>
                </div>
              )}

              {/* השפעת הלמידה */}
              {selectedFeedback.learning_impact && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-300">
                  <div className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    השפעת הלמידה:
                  </div>
                  <div className="space-y-2 text-sm">
                    {selectedFeedback.learning_impact.prompt_updated && (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        הפרומפט עודכן אוטומטית
                      </div>
                    )}
                    {selectedFeedback.learning_impact.similar_feedbacks_count > 0 && (
                      <div className="flex items-center gap-2 text-amber-700">
                        <Flag className="w-4 h-4" />
                        נמצאו {selectedFeedback.learning_impact.similar_feedbacks_count} דיווחים דומים
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-purple-700">
                      <TrendingUp className="w-4 h-4" />
                      ציון עדיפות: {selectedFeedback.learning_impact.priority_score}/10
                    </div>
                  </div>
                </div>
              )}

              {/* תגובת אדמין */}
              <div>
                <label className="text-sm font-bold text-gray-900 mb-2 block">תגובת אדמין:</label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  className="h-24"
                  placeholder="הסבר מה עשית עם הדיווח..."
                />
              </div>

              {/* פעולות */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleUpdateStatus('reviewed')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  סמן כנבדק
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('fixed')}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  סמן כתוקן
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('dismissed')}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  דחה
                </Button>
                <Button
                  onClick={() => {
                    if (confirm("למחוק דיווח זה?")) {
                      deleteFeedbackMutation.mutate(selectedFeedback.id);
                    }
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  מחק
                </Button>
              </div>

              {/* פרטים נוספים */}
              <div className="text-xs text-gray-500 text-center pt-3 border-t">
                דווח ב-{new Date(selectedFeedback.created_date).toLocaleString('he-IL')}
                {selectedFeedback.created_by && ` • על ידי ${selectedFeedback.created_by}`}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}