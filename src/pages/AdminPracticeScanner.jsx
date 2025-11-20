
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Upload, CheckCircle, Loader2, AlertCircle, BookOpen, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const detectTopicFromText = (text) => {
  // בדיקת תקינות קפדנית
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return 'general'; // ברירת מחדל
  }

  try {
    const lower = text.toLowerCase();
    
    if (lower.includes('vocabulary') || lower.includes('מילים') || lower.includes('אוצר מילים')) {
      return 'vocabulary';
    }
    if (lower.includes('grammar') || lower.includes('דקדוק')) {
      return 'grammar';
    }
    if (lower.includes('reading') || lower.includes('הבנת הנקרא')) {
      return 'reading_comprehension';
    }
    if (lower.includes('listening') || lower.includes('האזנה')) {
      return 'listening';
    }
    if (lower.includes('writing') || lower.includes('כתיבה')) {
      return 'writing';
    }
    
    return 'general';
  } catch (error) {
    console.error('Error in detectTopicFromText:', error);
    return 'general';
  }
};

const detectQuestionType = (questionText, hasOptions) => {
  // בדיקת תקינות
  if (!questionText || typeof questionText !== 'string') {
    return 'short_answer';
  }

  try {
    const lower = questionText.toLowerCase();
    
    if (hasOptions) {
      if (lower.includes('true or false') || lower.includes('נכון או לא נכון')) {
        return 'true_false';
      }
      return 'multiple_choice';
    }
    
    if (lower.includes('complete') || lower.includes('השלם') || lower.includes('fill in')) {
      return 'fill_in_blank';
    }
    
    if (lower.includes('write') || lower.includes('כתוב') || lower.includes('explain')) {
      return 'open_question';
    }
    
    if (lower.includes('match') || lower.includes('התאם')) {
      return 'matching';
    }
    
    return 'short_answer';
  } catch (error) {
    console.error('Error in detectQuestionType:', error);
    return 'short_answer';
  }
};

export default function AdminPracticeScannerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('אנגלית');
  const [selectedUnits, setSelectedUnits] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (u?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('יש להעלות קובץ PDF בלבד');
      setSelectedFile(null); // Clear selected file if type is wrong
      return;
    }

    // בדיקת גודל - מגבלה של 20MB (הוכפל!)
    if (file.size > 20 * 1024 * 1024) {
      setError(`הקובץ גדול מדי! (${(file.size / 1024 / 1024).toFixed(1)}MB)\n\nמקסימום: 20MB\n\n💡 טיפ: דחוס את ה-PDF או פצל אותו למספר קבצים קטנים יותר.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleScanQuestions = async () => {
    if (!selectedFile) {
      setError('יש לבחור קובץ');
      return;
    }

    // בדיקה כפולה של גודל הקובץ
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError(`⚠️ הקובץ גדול מדי!\n\nגודל הקובץ: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB\nמקסימום: 20MB\n\n💡 פתרונות:\n1. דחוס את ה-PDF (באתרים כמו ilovepdf.com)\n2. פצל למספר קבצים קטנים יותר\n3. צלם תמונות של הדפים והעלה במקום PDF`);
      setSelectedFile(null);
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setStatusMessage('מעלה קובץ...');
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setProgress(30);
      setStatusMessage('מנתח את הקובץ...');

      const extractionSchema = {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                topic: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      };

      setProgress(50);
      setStatusMessage('חולץ שאלות...');

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: extractionSchema
      });

      if (extractionResult.status === 'error') {
        // בדיקה אם השגיאה קשורה לגודל קובץ
        if (extractionResult.details?.includes('20MB') || extractionResult.details?.includes('10MB') || extractionResult.details?.includes('size') || extractionResult.details?.includes('large')) {
          throw new Error(`הקובץ גדול מדי לעיבוד!\n\nגודל: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB\nמקסימום: 20MB\n\n💡 דחוס את ה-PDF או פצל אותו לקבצים קטנים יותר.`);
        }
        throw new Error(extractionResult.details || 'שגיאה בחילוץ הנתונים');
      }

      let questionsData = extractionResult.output;

      if (questionsData.questions && Array.isArray(questionsData.questions)) {
        questionsData = questionsData.questions;
      }

      if (!Array.isArray(questionsData)) {
        questionsData = [questionsData];
      }

      setProgress(70);
      setStatusMessage('מעבד שאלות...');

      const processedQuestions = questionsData.map((q, idx) => {
        // בדיקת תקינות השאלה
        if (!q || typeof q !== 'object') {
          console.warn(`Question ${idx} is invalid`);
          return null;
        }

        // בדיקת question_text
        if (!q.question_text || typeof q.question_text !== 'string') {
          console.warn(`Question ${idx} has invalid question_text`);
          return null;
        }

        const hasOptions = Array.isArray(q.options) && q.options.length > 0;
        const questionType = detectQuestionType(q.question_text, hasOptions);
        const topic = q.topic || detectTopicFromText(q.question_text);
        
        return {
          question_text: q.question_text,
          question_type: questionType,
          category: topic === 'listening' ? 'listening' : 
                    topic === 'writing' ? 'writing' :
                    topic === 'grammar' ? 'grammar' :
                    topic === 'vocabulary' ? 'vocabulary' : 'reading',
          options: hasOptions ? q.options : [],
          correct_answers: q.correct_answer ? [q.correct_answer] : [],
          explanation: q.explanation || '',
          points: 10,
          topic: topic,
          difficulty: q.difficulty || 'intermediate',
          subject: selectedSubject,
          units: selectedUnits
        };
      }).filter(q => q !== null); // סנן שאלות לא תקינות

      setProgress(90);
      setStatusMessage('שומר שאלות...');

      let savedCount = 0;
      for (const question of processedQuestions) {
        try {
          await base44.entities.PracticeQuestion.create(question);
          savedCount++;
        } catch (err) {
          console.error('Error saving question:', err);
        }
      }

      setProgress(100);
      setStatusMessage('הושלם בהצלחה! ✅');
      
      setResult({
        questionsCount: savedCount,
        subject: selectedSubject,
        units: selectedUnits
      });

      setTimeout(() => {
        navigate(createPageUrl("AdminPractice"));
      }, 2000);

    } catch (err) {
      console.error("Scan error:", err);
      let errorMessage = 'שגיאה בסריקת השאלות';
      
      if (err.message) {
        if (err.message.includes('20MB') || err.message.includes('10MB') || err.message.includes('size') || err.message.includes('גדול') || err.message.includes('too large')) {
          errorMessage = `⚠️ הקובץ גדול מדי!\n\nמקסימום: 20MB\nהקובץ שלך: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB\n\n💡 פתרונות:\n• דחוס את ה-PDF באתר ilovepdf.com\n• פצל לקבצים קטנים יותר\n• צלם תמונות של הדפים`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsProcessing(false);
      setProgress(0);
      setSelectedFile(null); // נקה את הקובץ כשיש שגיאה
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl("AdminPractice"))}
          className="mb-6"
        >
          <ChevronLeft className="w-5 h-5 ml-2" />
          חזרה
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">סורק שאלות תרגול</h1>
              <p className="text-slate-600">העלה PDF עם שאלות תרגול</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">מקצוע</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                  <SelectItem value="ספרות">ספרות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">יחידות</label>
              <Select value={selectedUnits.toString()} onValueChange={(v) => setSelectedUnits(parseInt(v))}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-3">העלה קובץ PDF</label>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-1">
                  {selectedFile ? selectedFile.name : 'לחץ להעלאת קובץ'}
                </p>
                <p className="text-xs text-slate-500">PDF עד 20MB</p>
                {selectedFile && (
                  <div className="mt-2 text-xs text-green-600 font-semibold">
                    ✓ {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                )}
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 mb-6 whitespace-pre-wrap">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-600" />
                <div className="text-sm text-rose-700">{error}</div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">{statusMessage}</span>
                <span className="text-sm font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-xl">שאלות נוספו בהצלחה!</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">{result.questionsCount}</div>
                  <div className="text-slate-600">שאלות</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-lg font-bold text-emerald-600">{result.subject}</div>
                  <div className="text-slate-600">מקצוע</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-600">{result.units}</div>
                  <div className="text-slate-600">יחידות</div>
                </div>
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleScanQuestions}
            disabled={!selectedFile || isProcessing}
            className="w-full h-16 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-lg font-semibold rounded-2xl shadow-xl disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>מעבד...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <span>סרוק שאלות</span>
              </div>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
