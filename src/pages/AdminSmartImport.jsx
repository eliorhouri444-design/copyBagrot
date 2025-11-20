import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Copy, Eye, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminSmartImportPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rawInput, setRawInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [results, setResults] = useState(null);
  
  const [subject, setSubject] = useState("");
  const [units, setUnits] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
        setSubject(currentUser.selected_subject || "אנגלית");
        setUnits(currentUser.selected_units?.toString() || "3");
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (subject && units) {
      loadTopics();
    }
  }, [subject, units]);

  const loadTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const topics = await base44.entities.TopicNew.filter({
        subject_id: subject,
        unit_level: parseInt(units),
        is_active: true
      });
      const sorted = topics.sort((a, b) => (a.order || 0) - (b.order || 0));
      setAvailableTopics(sorted);
    } catch (error) {
      console.error("Error loading topics:", error);
      setAvailableTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleProcess = async () => {
    if (!rawInput.trim()) {
      toast.error("אנא הזן נתונים לעיבוד");
      return;
    }

    if (!subject || !units || !selectedTopicId) {
      toast.error("אנא בחר מקצוע, יחידות ונושא");
      return;
    }

    setIsProcessing(true);
    toast.loading("מעבד...", { duration: Infinity });

    try {
      const response = await base44.functions.invoke('smartImport', {
        raw_input: rawInput,
        subject: subject,
        units: parseInt(units),
        topic_id: selectedTopicId
      });

      toast.dismiss();

      if (response?.data?.success) {
        setPreviewQuestions(response.data.questions || []);
        toast.success(`✅ עיבוד הושלם! נמצאו ${response.data.questions.length} שאלות`);
      } else {
        toast.error("שגיאה בעיבוד: " + (response?.data?.error || "לא ידוע"));
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast.dismiss();
      toast.error("שגיאה: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (previewQuestions.length === 0) {
      toast.error("אין שאלות לייבוא");
      return;
    }

    setIsProcessing(true);
    toast.loading("מייבא שאלות...", { duration: Infinity });

    try {
      console.log('🚀 Starting import for', previewQuestions.length, 'questions');
      console.log('Sample question:', previewQuestions[0]);
      
      const response = await base44.functions.invoke('bulkImportQuestions', {
        questions: previewQuestions,
        solutions: previewQuestions.map(q => ({
          question_id: q.question_id,
          solution_text: q.answer || "",
          final_answers: [{ part_id: "main", value: q.answer || "" }]
        }))
      });

      console.log('📦 Import response:', response);

      toast.dismiss();

      if (response?.data?.success) {
        setResults({
          questionsAdded: response.data.questions_added,
          solutionsAdded: response.data.solutions_added,
          errors: response.data.errors || []
        });
        toast.success(`✅ יובאו ${response.data.questions_added} שאלות בהצלחה!`);
        setPreviewQuestions([]);
        setRawInput("");
      } else {
        console.error('❌ Import failed:', response?.data);
        toast.error("שגיאה בייבוא: " + (response?.data?.error || "לא ידוע"));
      }
    } catch (error) {
      console.error("❌ Import error:", error);
      toast.dismiss();
      toast.error("שגיאה: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleFormats = [
    {
      title: "פורמט פשוט - שורה אחת",
      example: `What is 2+2? = 4
The capital of France? = Paris
תרגם: שלום = Hello`
    },
    {
      title: "פורמט JSON מינימלי",
      example: `[
  {"q": "What is 2+2?", "a": "4"},
  {"q": "Capital of France?", "a": "Paris"}
]`
    },
    {
      title: "פורמט עם סיפור",
      example: `Story: Tom went to the park.
Q: Where did Tom go?
A: To the park

Q: What did Tom do?
A: He went to the park`
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">ייבוא חכם</h1>
            <p className="text-white/80">העלה שאלות בכל פורמט שתרצה</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* הגדרות בסיסיות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">הגדרות יעד</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">מקצוע *</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                  <SelectItem value="כימיה">כימיה</SelectItem>
                  <SelectItem value="ביולוגיה">ביולוגיה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">יחידות *</label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="0">ללא</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">נושא *</label>
              <Select 
                value={selectedTopicId} 
                onValueChange={setSelectedTopicId}
                disabled={isLoadingTopics}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTopics ? "טוען..." : "בחר נושא"} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {availableTopics.map(t => (
                    <SelectItem key={t.topic_id} value={t.topic_id}>
                      {t.icon} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* דוגמאות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-green-600" />
            פורמטים נתמכים
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exampleFormats.map((format, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-sm">{format.title}</h3>
                  <Button
                    onClick={() => {
                      setRawInput(format.example);
                      toast.success("הדוגמה הועתקה!");
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                  {format.example}
                </pre>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-green-100 rounded-lg p-3 text-sm">
            <strong>💡 המערכת תזהה אוטומטית:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>סוג השאלה (רב-בריירה / פתוחה)</li>
              <li>מבנה השאלה והתשובה</li>
              <li>טקסטים ארוכים (סיפורים)</li>
              <li>תייצר ID ייחודי לכל שאלה</li>
            </ul>
          </div>
        </motion.div>

        {/* קלט */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4">הדבק את השאלות כאן</h2>
          
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="הדבק כאן שאלות בכל פורמט:&#10;&#10;• שורה אחת: What is 2+2? = 4&#10;• JSON: [{&quot;q&quot;: &quot;...&quot;, &quot;a&quot;: &quot;...&quot;}]&#10;• טקסט חופשי עם שאלות ותשובות&#10;&#10;המערכת תזהה אוטומטי! ✨"
            className="min-h-[400px] font-mono text-sm"
          />

          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !rawInput.trim() || !selectedTopicId}
              className="flex-1 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2" />
                  מעבד...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 ml-2" />
                  עבד והצג Preview
                </>
              )}
            </Button>
            
            <Button
              onClick={() => setRawInput("")}
              variant="outline"
              className="h-12"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Preview */}
        {previewQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Preview - {previewQuestions.length} שאלות</h2>
              <Button
                onClick={handleImport}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 h-12 text-lg font-bold"
              >
                <Upload className="w-5 h-5 ml-2" />
                ייבא הכל למערכת
              </Button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {previewQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-2">{q.question_text}</div>
                      
                      {q.reading_text && (
                        <div className="bg-amber-50 rounded-lg p-3 mb-2 border border-amber-200">
                          <div className="text-xs font-bold text-amber-800 mb-1">📖 טקסט מלווה:</div>
                          <div className="text-sm text-gray-700">{q.reading_text.substring(0, 150)}...</div>
                        </div>
                      )}

                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className="text-sm text-gray-700">
                              {i + 1}. {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-green-100 rounded-lg p-2 border border-green-200">
                        <span className="text-xs font-bold text-green-800">✓ תשובה: </span>
                        <span className="text-sm text-gray-900">{q.answer}</span>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {q.question_type === "multi_choice" ? "רב-בריירה" : "פתוחה"}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {q.max_score} נק׳
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {q.difficulty_level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* תוצאות */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              תוצאות הייבוא
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
                <div className="text-3xl font-bold text-green-600">{results.questionsAdded}</div>
                <div className="text-sm text-gray-700">שאלות נוספו</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{results.solutionsAdded}</div>
                <div className="text-sm text-gray-700">פתרונות נוספו</div>
              </div>
            </div>

            {results.errors?.length > 0 && (
              <div className="mt-4 bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-900">שגיאות:</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {results.errors.map((err, idx) => (
                    <div key={idx} className="text-sm text-red-800">• {err}</div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}