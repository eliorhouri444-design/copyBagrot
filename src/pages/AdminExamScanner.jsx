import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Upload, CheckCircle, Loader2, AlertCircle, Brain, Sparkles, BookOpen, Calculator, Atom, BookText, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminExamScannerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('מתמטיקה');
  const [selectedUnits, setSelectedUnits] = useState(5);
  const [selectedModule, setSelectedModule] = useState('1');
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

  const examStructures = {
    "מתמטיקה": {
      3: {
        name: "שאלון 803",
        sections: ["אלגברה", "גאומטריה", "משוואות"],
        questionTypes: ["multiple_choice", "short_answer", "calculation"],
        hasGeometry: true,
        hasCalculus: false,
        pointsPerQuestion: 8,
        totalQuestions: 12,
        passingGrade: 56
      },
      4: {
        name: "שאלון 804",
        sections: ["אלגברה מתקדמת", "גאומטריה אנליטית", "טריגונומטריה"],
        questionTypes: ["multiple_choice", "short_answer", "calculation", "proof"],
        hasGeometry: true,
        hasCalculus: false,
        pointsPerQuestion: 10,
        totalQuestions: 10,
        passingGrade: 56
      },
      5: {
        name: "שאלון 581 (806)",
        sections: ["אלגברה ליניארית", "חדו״א", "גאומטריה אנליטית"],
        questionTypes: ["multiple_choice", "short_answer", "calculation", "proof", "open_question"],
        hasGeometry: true,
        hasCalculus: true,
        pointsPerQuestion: 12,
        totalQuestions: 8,
        passingGrade: 56
      }
    },
    "פיזיקה": {
      3: {
        name: "מכניקה + חשמל",
        sections: ["מכניקה", "חשמל"],
        questionTypes: ["calculation", "short_answer", "explanation"],
        hasGeometry: false,
        hasCalculus: false,
        pointsPerQuestion: 10,
        totalQuestions: 10,
        passingGrade: 56
      },
      5: {
        name: "מכניקה + חשמל + קרינה",
        sections: ["מכניקה מתקדמת", "חשמל ומגנטיות", "קרינה וחומר"],
        questionTypes: ["calculation", "short_answer", "explanation", "proof"],
        hasGeometry: false,
        hasCalculus: true,
        pointsPerQuestion: 12,
        totalQuestions: 8,
        passingGrade: 56
      }
    },
    "אנגלית": {
      3: {
        name: "Module A/B/C",
        sections: ["Reading", "Grammar", "Writing"],
        questionTypes: ["multiple_choice", "short_answer", "writing"],
        hasGeometry: false,
        hasCalculus: false,
        pointsPerQuestion: 10,
        totalQuestions: 15,
        passingGrade: 56
      }
    }
  };

  // פונקציה מתקדמת לזיהוי גאומטריה וויזואליזציות
  const detectVisualizationFromText = (text) => {
    // בדיקת תקינות מלאה
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return null;
    }

    try {
      const lowerText = text.toLowerCase();
      const result = {
        visualization_type: null,
        geometry_shape: null,
        geometry_dimensions: null,
        geometry_labels: null,
        has_graph: false,
        graph_points: null
      };

      // 1. זיהוי משולשים
      if (lowerText.includes('משולש') || lowerText.includes('triangle')) {
        // משולש ישר זווית
        if (lowerText.includes('ישר זווית') || lowerText.includes('ישרת זווית') || lowerText.includes('פיתגורס') || lowerText.includes('ניצב')) {
          result.geometry_shape = 'right_triangle';
          result.visualization_type = 'geometry';
          
          // חילוץ מידות
          const numbersMatch = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
          const numbers = numbersMatch || [];
          if (numbers.length >= 2) {
            result.geometry_dimensions = {
              base: numbers[0],
              height: numbers[1],
              hypotenuse: numbers[2] || '?'
            };
          }
          
          result.geometry_labels = { top: 'B', left: 'A', right: 'C' };
          return result;
        }
        
        // משולש רגיל
        result.geometry_shape = 'triangle';
        result.visualization_type = 'geometry';
        
        const baseMatch = text.match(/בסיס[וה]?\s+(\d+\.?\d*)\s*ס["']?מ/i);
        const heightMatch = text.match(/גובה[וה]?\s+(\d+\.?\d*)\s*ס["']?מ/i);
        
        if (baseMatch || heightMatch) {
          result.geometry_dimensions = {
            base: baseMatch ? `${baseMatch[1]} ס"מ` : '10 ס"מ',
            height: heightMatch ? `${heightMatch[1]} ס"מ` : '8 ס"מ'
          };
        } else {
          const numbersMatch = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
          const numbers = numbersMatch || [];
          if (numbers.length >= 2) {
            result.geometry_dimensions = {
              base: numbers[0],
              height: numbers[1]
            };
          }
        }
        
        result.geometry_labels = { top: 'A', left: 'B', right: 'C' };
        return result;
      }

      // 2. זיהוי מלבנים
      if (lowerText.includes('מלבן') || lowerText.includes('rectangle')) {
        result.geometry_shape = 'rectangle';
        result.visualization_type = 'geometry';
        
        const widthMatch = text.match(/אורכו?\s+(\d+\.?\d*)\s*ס["']?מ/i);
        const heightMatch = text.match(/רוחבו?\s+(\d+\.?\d*)\s*ס["']?מ/i);
        
        if (widthMatch || heightMatch) {
          result.geometry_dimensions = {
            width: widthMatch ? `${widthMatch[1]} ס"מ` : '12 ס"מ',
            height: heightMatch ? `${heightMatch[1]} ס"מ` : '8 ס"מ'
          };
        }
        
        result.geometry_labels = { top: 'D', bottom: 'A', left: 'B', right: 'C' };
        return result;
      }

      // 3. זיהוי ריבועים
      if (lowerText.includes('ריבוע') || lowerText.includes('square')) {
        result.geometry_shape = 'square';
        result.visualization_type = 'geometry';
        
        const sideMatch = text.match(/צלעו?\s+(\d+\.?\d*)\s*ס["']?מ/i);
        if (sideMatch) {
          result.geometry_dimensions = {
            side: `${sideMatch[1]} ס"מ`
          };
        }
        
        result.geometry_labels = {
          topLeft: 'D',
          topRight: 'C',
          bottomLeft: 'A',
          bottomRight: 'B'
        };
        return result;
      }

      // 4. זיהוי מעגלים
      if (lowerText.includes('מעגל') || lowerText.includes('circle')) {
        result.geometry_shape = 'circle';
        result.visualization_type = 'geometry';
        
        const radiusMatch = text.match(/רדיוסו?\s+(\d+\.?\d*)\s*ס["']?מ/i) || 
                            text.match(/r\s*=\s*(\d+\.?\d*)/i);
        
        if (radiusMatch) {
          result.geometry_dimensions = {
            radius: `${radiusMatch[1]} ס"מ`
          };
        }
        
        return result;
      }

      // 5. זיהוי גרפים עם נקודות
      const pointsPattern = /[A-Z]\s*\(\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)/g;
      const pointsMatches = [...text.matchAll(pointsPattern)];
      
      if (pointsMatches.length >= 2) {
        result.has_graph = true;
        result.graph_type = 'interactive';
        result.visualization_type = 'graph';
        result.graph_points = pointsMatches.map(match => ({
          x: parseFloat(match[1]),
          y: parseFloat(match[2])
        }));
        
        // הגדרת גבולות הגרף
        const xValues = result.graph_points.map(p => p.x);
        const yValues = result.graph_points.map(p => p.y);
        result.graph_x_min = Math.min(...xValues) - 2;
        result.graph_x_max = Math.max(...xValues) + 2;
        result.graph_y_min = Math.min(...yValues) - 2;
        result.graph_y_max = Math.max(...yValues) + 2;
        
        return result;
      }

      // 6. זיהוי פרבולות/פונקציות
      if (lowerText.includes('פרבולה') || lowerText.includes('y=') || lowerText.includes('f(x)')) {
        result.visualization_type = 'parabola';
        result.interactive_viz = true;
        
        // ניסיון לחלץ משוואה
        const equationMatch = text.match(/y\s*=\s*([x\d\s+\-*^²³]+)/i);
        if (equationMatch) {
          result.parabola_a = 1;
          result.parabola_b = 0;
          result.parabola_c = 0;
        }
        
        return result;
      }

      // 7. זיהוי טרפזים/מקביליות
      if (lowerText.includes('טרפז') || lowerText.includes('מקבילית')) {
        result.geometry_shape = lowerText.includes('טרפז') ? 'trapezoid' : 'parallelogram';
        result.visualization_type = 'geometry';
        
        const numbersMatch = text.match(/(\d+\.?\d*)\s*ס["']?מ/ig);
        const numbers = numbersMatch || [];
        if (numbers.length >= 2) {
          if (result.geometry_shape === 'trapezoid') {
            result.geometry_dimensions = {
              top: numbers[0],
              bottom: numbers[1],
              height: numbers[2] || numbers[0]
            };
          } else {
            result.geometry_dimensions = {
              base: numbers[0],
              height: numbers[1]
            };
          }
        }
        
        return result;
      }

      return null;
    } catch (error) {
      console.error('Error in detectVisualizationFromText:', error);
      return null;
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('יש להעלות קובץ PDF בלבד');
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

  const handleScanExam = async () => {
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
      // 1. Upload PDF file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setProgress(20);
      setStatusMessage('מנתח מבנה מבחן...');

      const structure = examStructures[selectedSubject]?.[selectedUnits] || examStructures["מתמטיקה"][5];
      
      setProgress(30);
      setStatusMessage('חולץ נתונים מה-PDF...');

      // 2. Extract data using ExtractDataFromUploadedFile
      const extractionSchema = {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_number: { type: "integer" },
                question_text: { type: "string" },
                question_type: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                points: { type: "integer" },
                topic: { type: "string" }
              }
            }
          }
        }
      };

      setProgress(50);
      setStatusMessage('מעבד עם AI...');

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: extractionSchema
      });

      if (extractionResult.status === 'error') {
        // בדיקה אם השגיאה קשורה לגודל קובץ
        if (extractionResult.details?.includes('20MB') || extractionResult.details?.includes('10MB') || extractionResult.details?.includes('size') || extractionResult.details?.includes('גדול')) {
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
      setStatusMessage('מזהה איורים גאומטריים ומוסיף ויזואליזציות...');

      // 3. Process each question - detect geometry and add visualizations
      const processedQuestions = await Promise.all(
        questionsData.map(async (q, idx) => {
          // בדיקת תקינות השאלה
          if (!q || !q.question_text || typeof q.question_text !== 'string') {
            console.warn(`Question ${idx} has invalid question_text`);
            return q; // החזר את השאלה כמו שהיא
          }

          // זיהוי אוטומטי של ויזואליזציות
          const vizData = detectVisualizationFromText(q.question_text);
          
          if (vizData) {
            Object.assign(q, vizData);
          }
          
          // Set default points
          if (!q.points) {
            q.points = structure.pointsPerQuestion;
          }

          // Generate solution steps using AI
          try {
            const solutionPrompt = `
שאלה: ${q.question_text}
תשובה נכונה: ${q.correct_answer || 'לא זמין'}

תן את שלבי הפתרון המפורטים בעברית (3-5 שלבים):
`;

            const solutionResponse = await base44.integrations.Core.InvokeLLM({
              prompt: solutionPrompt,
              response_json_schema: {
                type: "object",
                properties: {
                  steps: { type: "array", items: { type: "string" } }
                }
              }
            });

            q.solution_steps = solutionResponse.steps || [];
          } catch (err) {
            console.log("Could not generate solution steps for question " + (idx + 1));
            q.solution_steps = [];
          }

          return q;
        })
      );

      setProgress(90);
      setStatusMessage('שומר מבחן...');

      // 4. Create exam
      const newExam = await base44.entities.GenericExam.create({
        title: `${selectedSubject} ${structure.name} - ${new Date().toLocaleDateString('he-IL')}`,
        subject: selectedSubject,
        unit_level: selectedUnits,
        module_id: selectedModule,
        description: `שאלון ${structure.name} - ${selectedUnits} יחידות`,
        duration_minutes: selectedUnits === 5 ? 120 : selectedUnits === 4 ? 90 : 75,
        total_points: processedQuestions.reduce((sum, q) => sum + (q?.points || 10), 0),
        passing_grade: structure.passingGrade,
        instructions: `ענה על כל השאלות. מותר להשתמש במחשבון ${selectedSubject === 'מתמטיקה' ? 'ובדף נוסחאות' : ''}.`,
        questions: processedQuestions
      });

      setProgress(100);
      setStatusMessage('הושלם בהצלחה! ✅');
      
      const geometryCount = processedQuestions.filter(q => q.geometry_shape).length;
      const graphCount = processedQuestions.filter(q => q.has_graph).length;
      const visualizationCount = processedQuestions.filter(q => q.visualization_type).length;
      
      setResult({
        examId: newExam.id,
        questionsCount: processedQuestions.length,
        totalPoints: processedQuestions.reduce((sum, q) => sum + (q?.points || 10), 0),
        geometryQuestions: geometryCount,
        graphQuestions: graphCount,
        visualizationQuestions: visualizationCount
      });

      setTimeout(() => {
        navigate(createPageUrl("AdminExams"));
      }, 3000);

    } catch (err) {
      console.error("Scan error:", err);
      let errorMessage = 'שגיאה בסריקת המבחן';
      
      if (err.message) {
        if (err.message.includes('20MB') || err.message.includes('10MB') || err.message.includes('size') || err.message.includes('גדול')) {
          errorMessage = `⚠️ הקובץ גדול מדי!\n\nמקסימום: 20MB\nהקובץ שלך: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB\n\n💡 פתרונות:\n• דחוס את ה-PDF באתר ilovepdf.com\n• פצל לקבצים קטנים יותר\n• צלם תמונות של הדפים`;
        } else if (err.message.includes('PDF')) {
          errorMessage = 'הקובץ לא נתמך. נסה להעלות תמונות של דפי המבחן במקום PDF.';
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

  const subjectIcons = {
    "מתמטיקה": Calculator,
    "פיזיקה": Atom,
    "אנגלית": BookText,
    "ספרות": BookOpen
  };

  const SubjectIcon = subjectIcons[selectedSubject] || Calculator;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl("AdminExams"))}
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
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">סורק מבחנים חכם</h1>
              <p className="text-slate-600">זיהוי אוטומטי של איורים וויזואליזציות!</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">מקצוע</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                  <SelectItem value="כימיה">כימיה</SelectItem>
                  <SelectItem value="ביולוגיה">ביולוגיה</SelectItem>
                  <SelectItem value="היסטוריה">היסטוריה</SelectItem>
                  <SelectItem value="ספרות">ספרות</SelectItem>
                  <SelectItem value="גאוגרפיה">גאוגרפיה</SelectItem>
                  <SelectItem value="אזרחות">אזרחות</SelectItem>
                  <SelectItem value='תנ"ך'>תנ"ך</SelectItem>
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

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">מודול</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">מודול 1</SelectItem>
                  <SelectItem value="2">מודול 2</SelectItem>
                  <SelectItem value="3">מודול 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {examStructures[selectedSubject]?.[selectedUnits] && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <SubjectIcon className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  {examStructures[selectedSubject][selectedUnits].name}
                </h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">חלקים:</div>
                  <ul className="text-slate-600 space-y-1">
                    {examStructures[selectedSubject][selectedUnits].sections.map((section, idx) => (
                      <li key={idx}>• {section}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="font-semibold text-slate-700 mb-1">תכונות:</div>
                  <ul className="text-slate-600 space-y-1">
                    <li>✓ {examStructures[selectedSubject][selectedUnits].totalQuestions} שאלות</li>
                    <li>✓ {examStructures[selectedSubject][selectedUnits].pointsPerQuestion} נק' לשאלה</li>
                    {examStructures[selectedSubject][selectedUnits].hasGeometry && <li>✓ זיהוי איורים אוטומטי</li>}
                    {examStructures[selectedSubject][selectedUnits].hasCalculus && <li>✓ חדו״א</li>}
                  </ul>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 mb-1">סוגי שאלות:</div>
                  <ul className="text-slate-600 space-y-1">
                    {examStructures[selectedSubject][selectedUnits].questionTypes.slice(0, 3).map((type, idx) => (
                      <li key={idx}>• {type}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

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

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h3 className="font-bold text-slate-900">זיהוי אוטומטי מתקדם!</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">משולשים (רגיל + ישר זווית)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">מלבנים, ריבועים, מעגלים</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">גרפים עם נקודות (x,y)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">פרבולות ופונקציות</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">טרפזים ומקביליות</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">חילוץ מידות אוטומטי</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-600" />
                <div className="text-sm text-rose-700 whitespace-pre-wrap">{error}</div>
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
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
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
                <h3 className="font-bold text-slate-900 text-xl">מבחן נוצר בהצלחה!</h3>
              </div>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">{result.questionsCount}</div>
                  <div className="text-slate-600">שאלות</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">{result.totalPoints}</div>
                  <div className="text-slate-600">נקודות</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-600">{result.geometryQuestions}</div>
                  <div className="text-slate-600">איורי גאומטריה</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-amber-600">{result.visualizationQuestions}</div>
                  <div className="text-slate-600">ויזואליזציות</div>
                </div>
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleScanExam}
            disabled={!selectedFile || isProcessing}
            className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg font-semibold rounded-2xl shadow-xl disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>מעבד...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6" />
                <span>סרוק מבחן עם זיהוי אוטומטי</span>
              </div>
            )}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6"
        >
          <h3 className="font-bold text-slate-900 mb-3">💡 איך זה עובד?</h3>
          <ol className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>המערכת מזהה את מבנה המבחן לפי המקצוע והיחידות</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>AI חכם סורק את כל השאלות והתשובות</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>זיהוי אוטומטי של צורות גאומטריות במשולשים, מעגלים וכו', וכן גרפים ופונקציות</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>יצירת הסברים מפורטים בעברית לכל שאלה</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">5.</span>
              <span>המבחן מוכן לשימוש עם כל הכלים: מחשבון, נוסחאות, טיוטה</span>
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}