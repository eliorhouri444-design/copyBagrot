import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, Brain, Calendar, Filter, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function AdminCorrectionsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterReason, setFilterReason] = useState("all");
  const [selectedCorrection, setSelectedCorrection] = useState(null);

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

  const { data: corrections = [], isLoading } = useQuery({
    queryKey: ['corrections'],
    queryFn: () => base44.entities.TeacherCorrection.list("-created_date", 100),
    enabled: !!user
  });

  const filteredCorrections = corrections.filter(c => {
    if (filterSubject !== "all" && c.subject !== filterSubject) return false;
    if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
    if (filterReason !== "all" && c.correction_reason !== filterReason) return false;
    return true;
  });

  const stats = {
    total: corrections.length,
    critical: corrections.filter(c => c.severity === 'critical').length,
    major: corrections.filter(c => c.severity === 'major').length,
    minor: corrections.filter(c => c.severity === 'minor').length,
    applied: corrections.filter(c => c.was_applied).length
  };

  const subjects = [...new Set(corrections.map(c => c.subject))];
  const reasons = [
    { value: "wrong_calculation", label: "חישוב שגוי" },
    { value: "wrong_explanation", label: "הסבר שגוי" },
    { value: "missing_info", label: "מידע חסר" },
    { value: "wrong_diagram", label: "איור שגוי" },
    { value: "wrong_graph", label: "גרף שגוי" },
    { value: "language_issue", label: "בעיית שפה" },
    { value: "formatting_issue", label: "בעיית עיצוב" },
    { value: "other", label: "אחר" }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'major': return 'from-orange-500 to-orange-600';
      case 'minor': return 'from-yellow-500 to-yellow-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5" />;
      case 'major': return <AlertTriangle className="w-5 h-5" />;
      case 'minor': return <CheckCircle className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500 to-red-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
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
              <Brain className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-3xl font-bold text-white mb-2">תיקוני אדמין</h1>
            <p className="text-white/90">המורה החכם לומד מהתיקונים שלך</p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* סטטיסטיקות */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">סה"כ תיקונים</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow-md text-center border-2 border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-red-700">קריטי</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 shadow-md text-center border-2 border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{stats.major}</div>
            <div className="text-xs text-orange-700">בינוני</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 shadow-md text-center border-2 border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.minor}</div>
            <div className="text-xs text-yellow-700">קל</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 shadow-md text-center border-2 border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
            <div className="text-xs text-green-700">הוחלו</div>
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

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="כל החומרות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל החומרות</SelectItem>
                <SelectItem value="critical">קריטי</SelectItem>
                <SelectItem value="major">בינוני</SelectItem>
                <SelectItem value="minor">קל</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterReason} onValueChange={setFilterReason}>
              <SelectTrigger>
                <SelectValue placeholder="כל הסיבות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל הסיבות</SelectItem>
                {reasons.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* רשימת תיקונים */}
        <div className="space-y-3">
          {filteredCorrections.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-600">אין תיקונים להצגה</div>
            </div>
          ) : (
            filteredCorrections.map((correction, idx) => (
              <motion.div
                key={correction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedCorrection(correction)}
              >
                <div className={`bg-gradient-to-r ${getSeverityColor(correction.severity)} p-3 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSeverityIcon(correction.severity)}
                      <div>
                        <div className="font-bold">{correction.subject}</div>
                        <div className="text-xs opacity-90">{correction.topic || 'כללי'}</div>
                      </div>
                    </div>
                    <div className="text-xs">
                      <Calendar className="w-4 h-4 inline ml-1" />
                      {new Date(correction.created_date).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                    <strong>שאלה:</strong> {correction.original_question}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {reasons.find(r => r.value === correction.correction_reason)?.label || correction.correction_reason}
                    </span>
                    {correction.was_applied && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                        ✅ הוחל
                      </span>
                    )}
                    {correction.learning_impact?.knowledge_added && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        📚 ידע נוסף
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* דיאלוג פרטי תיקון */}
      <Dialog open={!!selectedCorrection} onOpenChange={() => setSelectedCorrection(null)}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-orange-600" />
              פרטי תיקון
            </DialogTitle>
          </DialogHeader>

          {selectedCorrection && (
            <div className="space-y-4 py-4">
              {/* מידע כללי */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">מקצוע</div>
                  <div className="font-bold text-blue-900">{selectedCorrection.subject}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">נושא</div>
                  <div className="font-bold text-purple-900">{selectedCorrection.topic || 'כללי'}</div>
                </div>
                <div className={`bg-gradient-to-r ${getSeverityColor(selectedCorrection.severity)} rounded-lg p-3 text-white`}>
                  <div className="text-xs opacity-90 mb-1">חומרה</div>
                  <div className="font-bold flex items-center gap-2">
                    {getSeverityIcon(selectedCorrection.severity)}
                    {selectedCorrection.severity}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="text-xs text-amber-700 mb-1">סוג טעות</div>
                  <div className="font-bold text-amber-900 text-sm">
                    {reasons.find(r => r.value === selectedCorrection.correction_reason)?.label}
                  </div>
                </div>
              </div>

              {/* השאלה */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="text-sm font-bold text-blue-900 mb-2">📝 השאלה:</div>
                <div className="text-sm text-gray-800">{selectedCorrection.original_question}</div>
              </div>

              {/* התשובה השגויה */}
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <div className="text-sm font-bold text-red-900 mb-2">❌ תשובה שגויה:</div>
                <div className="text-sm text-gray-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedCorrection.original_answer}
                </div>
              </div>

              {/* התשובה המתוקנת */}
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-300">
                <div className="text-sm font-bold text-green-900 mb-2">✅ תשובה מתוקנת:</div>
                <div className="text-sm text-gray-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedCorrection.corrected_answer}
                </div>
              </div>

              {/* הערות אדמין */}
              {selectedCorrection.admin_notes && (
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-sm font-bold text-purple-900 mb-2">💬 הערות:</div>
                  <div className="text-sm text-gray-800">{selectedCorrection.admin_notes}</div>
                </div>
              )}

              {/* השפעת הלמידה */}
              {selectedCorrection.learning_impact && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-300">
                  <div className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    השפעת הלמידה:
                  </div>
                  <div className="space-y-2 text-sm">
                    {selectedCorrection.learning_impact.prompt_updated && (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        הפרומפט עודכן
                      </div>
                    )}
                    {selectedCorrection.learning_impact.knowledge_added && (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        ידע חדש נוסף למאגר
                      </div>
                    )}
                    {selectedCorrection.learning_impact.similar_corrections > 0 && (
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="w-4 h-4" />
                        נמצאו {selectedCorrection.learning_impact.similar_corrections} תיקונים דומים
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* תאריך */}
              <div className="text-xs text-gray-500 text-center">
                נוצר ב-{new Date(selectedCorrection.created_date).toLocaleString('he-IL')}
                {selectedCorrection.created_by && ` • על ידי ${selectedCorrection.created_by}`}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}