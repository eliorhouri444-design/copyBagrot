import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Clock, Calculator, ChevronRight, ChevronLeft,
  CheckCircle, X, AlertCircle, Loader2, Flag, Lightbulb,
  Grid3x3, BookOpen, Pencil, Eraser, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SmartGeometryDetector from "@/components/exams/SmartGeometryDetector";
import LatexRenderer from "@/components/exams/LatexRenderer";
import InteractiveGraph from "@/components/exams/InteractiveGraph";
import PieChart from "@/components/exams/PieChart";
import UnitCircle from "@/components/exams/UnitCircle";
import ParabolaGraph from "@/components/exams/ParabolaGraph";
import IntegralGraph from "@/components/exams/IntegralGraph";
import VectorGraph from "@/components/exams/VectorGraph";
import DrawingTools from "@/components/exams/DrawingTools";

export default function ExamMathPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);

  // Tools
  const [showCalculator, setShowCalculator] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');

  // Draft paper for EACH question - NEW STATE
  const [draftPapers, setDraftPapers] = useState({});
  const [showDraftForQuestion, setShowDraftForQuestion] = useState({});

  const [score, setScore] = useState(null);
  const [markedForReview, setMarkedForReview] = useState({});
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const [examMode, setExamMode] = useState('practice');
  const [showHint, setShowHint] = useState({});
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Add report dialog state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportingQuestion, setReportingQuestion] = useState(null);

  // Camera check state
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraImage, setCameraImage] = useState(null);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [cameraFeedback, setCameraFeedback] = useState(null);
  const cameraInputRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  const mode = urlParams.get('mode') || 'practice';

  useEffect(() => {
    setExamMode(mode);
  }, [mode]);

  // Smart Grading System - partial credit for correct process
  const calculatePartialCredit = (question, userAnswer, solutionSteps) => {
    if (!userAnswer || !solutionSteps || solutionSteps.length === 0) {
      return 0;
    }

    const cleanUserAnswer = userAnswer.toString().trim().toLowerCase();
    const cleanCorrectAnswer = question.correct_answer.toString().trim().toLowerCase();

    // Full credit if answer is correct
    if (cleanUserAnswer === cleanCorrectAnswer) {
      return question.points;
    }

    // Partial credit calculation
    let partialPoints = 0;
    const maxPartialCredit = Math.floor(question.points * 0.7); // Up to 70% for correct process

    // This is a basic heuristic; a more advanced system would need natural language processing or specific intermediate answer checks.
    // Check if user answer contains key steps
    solutionSteps.forEach((step) => {
      const stepWeight = maxPartialCredit / solutionSteps.length; // Distribute partial credit evenly across steps

      // Extract numbers from step - this needs to be more robust
      const stepNumbers = (step.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      const userNumbers = (userAnswer.match(/\d+(?:\.\d+)?/g) || []).map(Number);

      const hasIntermediateResult = stepNumbers.some(num =>
        userNumbers.includes(num) || userAnswer.includes(num.toString())
      );

      if (hasIntermediateResult) {
        partialPoints += stepWeight;
      }
    });

    return Math.round(partialPoints);
  };

  // Simple localStorage save - NO network calls
  useEffect(() => {
    if (examStarted && !examFinished && examId) {
      const saveData = {
        userAnswers,
        markedForReview,
        currentQuestion,
        timeLeft,
        draftPapers, // ADDED: Save draft papers
        timestamp: new Date().toISOString()
      };
      try {
        localStorage.setItem(`exam_${examId}_progress`, JSON.stringify(saveData));
      } catch (err) {
        console.log("localStorage save failed:", err);
      }
    }
  }, [userAnswers, markedForReview, currentQuestion, timeLeft, draftPapers, examStarted, examFinished, examId]); // ADDED draftPapers to dependency array

  useEffect(() => {
    const loadData = async () => {
      if (!examId) {
        setIsLoading(false);
        return;
      }

      try {
        const u = await base44.auth.me();
        setUser(u);
      } catch (error) {
        console.error("Error loading user:", error);
        setUser({ id: 'guest', is_premium: false });
      }

      try {
        const exams = await base44.entities.GenericExam.list();
        const e = exams.find(ex => ex.id === examId);

        if (e) {
          setExam(e);

          // Load saved progress
          const saved = localStorage.getItem(`exam_${examId}_progress`);
          if (saved) {
            try {
              const data = JSON.parse(saved);
              if (confirm('נמצא תרגול שמור. האם להמשיך?')) {
                setUserAnswers(data.userAnswers || {});
                setMarkedForReview(data.markedForReview || {});
                setCurrentQuestion(data.currentQuestion || 0);
                if (data.timeLeft) {
                  setTimeLeft(data.timeLeft);
                }
                setDraftPapers(data.draftPapers || {}); // ADDED: Load draft papers
              }
            } catch (err) {
              console.log("Error parsing saved data:", err);
            }
          }
        }
      } catch (error) {
        console.error("Error loading exam:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [examId]);

  useEffect(() => {
    if (exam && examStarted && !examFinished && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [exam, examStarted, examFinished, timeLeft]);


  // NEW: Functions for per-question draft paper
  const toggleDraftForQuestion = (questionNumber) => {
    setShowDraftForQuestion(prev => ({
      ...prev,
      [questionNumber]: !prev[questionNumber]
    }));
  };

  const saveDraftForQuestion = (questionNumber, dataUrl) => {
    setDraftPapers(prev => ({
      ...prev,
      [questionNumber]: dataUrl
    }));
  };

  const closeDraftForQuestion = (questionNumber) => {
    setShowDraftForQuestion(prev => ({
      ...prev,
      [questionNumber]: false
    }));
  };

  const handleStartExam = () => {
    setExamStarted(true);
    setTimeLeft(exam.duration_minutes * 60);
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionNumber]: answer
    }));
  };

  const toggleMarkForReview = (questionNumber) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionNumber]: !prev[questionNumber]
    }));
  };

  const getQuestionStatus = (questionNumber) => {
    if (markedForReview[questionNumber]) return 'marked';
    if (userAnswers[questionNumber]) return 'answered';
    return 'unanswered';
  };

  const handleExitExam = () => {
    if (examStarted && !examFinished) {
      setShowExitDialog(true);
    } else {
      navigate(createPageUrl("Exams"));
    }
  };

  const confirmExit = () => {
    if (examId) {
      localStorage.removeItem(`exam_${examId}_progress`);
    }
    navigate(createPageUrl("Exams"));
  };

  const [calcMode, setCalcMode] = useState('basic'); // 'basic' or 'scientific'
  const [calcMemory, setCalcMemory] = useState(0);
  const [isDegrees, setIsDegrees] = useState(true); // true = degrees, false = radians

  const basicButtons = [
    ['C', '←', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['±', '0', '.', '=']
  ];

  const scientificButtons = [
    ['sin', 'cos', 'tan', 'π'],
    ['sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'e'],
    ['ln', 'log', '10ˣ', 'eˣ'],
    ['x²', 'x³', 'xʸ', '√'],
    ['³√', '1/x', 'n!', '|x|'],
    ['(', ')', 'MC', 'MR'],
    ['M+', 'M-', 'DEG', 'RAD']
  ];

  const handleCalculator = (value) => {
    // Clear
    if (value === 'C') {
      setCalculatorDisplay('0');
      return;
    }
    
    // Backspace
    if (value === '←') {
      setCalculatorDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }

    // Toggle sign
    if (value === '±') {
      setCalculatorDisplay(prev => {
        if (prev.startsWith('-')) return prev.slice(1);
        if (prev !== '0') return '-' + prev;
        return prev;
      });
      return;
    }

    // Memory operations
    if (value === 'MC') { setCalcMemory(0); return; }
    if (value === 'MR') { setCalculatorDisplay(calcMemory.toString()); return; }
    if (value === 'M+') { 
      try { setCalcMemory(prev => prev + parseFloat(calculatorDisplay)); } catch {}
      return;
    }
    if (value === 'M-') { 
      try { setCalcMemory(prev => prev - parseFloat(calculatorDisplay)); } catch {}
      return;
    }

    // Angle mode toggle
    if (value === 'DEG') { setIsDegrees(true); return; }
    if (value === 'RAD') { setIsDegrees(false); return; }

    // Constants
    if (value === 'π') {
      setCalculatorDisplay(prev => prev === '0' ? Math.PI.toString() : prev + '*' + Math.PI.toString());
      return;
    }
    if (value === 'e') {
      setCalculatorDisplay(prev => prev === '0' ? Math.E.toString() : prev + '*' + Math.E.toString());
      return;
    }

    // Equals - calculate result
    if (value === '=') {
      try {
        let expr = calculatorDisplay
          .replace(/÷/g, '/')
          .replace(/×/g, '*')
          .replace(/\^/g, '**');
        const result = eval(expr);
        setCalculatorDisplay(isNaN(result) || !isFinite(result) ? 'Error' : result.toString());
      } catch {
        setCalculatorDisplay('Error');
      }
      return;
    }

    // Scientific functions
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;
    const num = parseFloat(calculatorDisplay);

    try {
      switch (value) {
        case 'sin':
          setCalculatorDisplay(Math.sin(isDegrees ? toRad(num) : num).toString());
          return;
        case 'cos':
          setCalculatorDisplay(Math.cos(isDegrees ? toRad(num) : num).toString());
          return;
        case 'tan':
          setCalculatorDisplay(Math.tan(isDegrees ? toRad(num) : num).toString());
          return;
        case 'sin⁻¹':
          const asinResult = Math.asin(num);
          setCalculatorDisplay((isDegrees ? toDeg(asinResult) : asinResult).toString());
          return;
        case 'cos⁻¹':
          const acosResult = Math.acos(num);
          setCalculatorDisplay((isDegrees ? toDeg(acosResult) : acosResult).toString());
          return;
        case 'tan⁻¹':
          const atanResult = Math.atan(num);
          setCalculatorDisplay((isDegrees ? toDeg(atanResult) : atanResult).toString());
          return;
        case 'ln':
          setCalculatorDisplay(Math.log(num).toString());
          return;
        case 'log':
          setCalculatorDisplay(Math.log10(num).toString());
          return;
        case '10ˣ':
          setCalculatorDisplay(Math.pow(10, num).toString());
          return;
        case 'eˣ':
          setCalculatorDisplay(Math.exp(num).toString());
          return;
        case 'x²':
          setCalculatorDisplay((num * num).toString());
          return;
        case 'x³':
          setCalculatorDisplay((num * num * num).toString());
          return;
        case 'xʸ':
          setCalculatorDisplay(prev => prev + '^');
          return;
        case '√':
          setCalculatorDisplay(Math.sqrt(num).toString());
          return;
        case '³√':
          setCalculatorDisplay(Math.cbrt(num).toString());
          return;
        case '1/x':
          setCalculatorDisplay((1 / num).toString());
          return;
        case 'n!':
          const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);
          setCalculatorDisplay(factorial(Math.round(num)).toString());
          return;
        case '|x|':
          setCalculatorDisplay(Math.abs(num).toString());
          return;
        case '%':
          setCalculatorDisplay((num / 100).toString());
          return;
        default:
          break;
      }
    } catch {
      setCalculatorDisplay('Error');
      return;
    }

    // Regular input (numbers, operators, parentheses)
    setCalculatorDisplay(prev => {
      if (prev === '0' && !['.', '+', '-', '×', '÷', '(', ')'].includes(value)) {
        return value;
      }
      return prev + value;
    });
  };

  const formulas = [
    { category: "אלגברה", items: [
      { name: "נוסחת השורשים", formula: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" },
      { name: "הפרש ריבועים", formula: "a^2 - b^2 = (a+b)(a-b)" },
      { name: "ריבוע סכום", formula: "(a+b)^2 = a^2 + 2ab + b^2" }
    ]},
    { category: "גאומטריה", items: [
      { name: "פיתגורס", formula: "a^2 + b^2 = c^2" },
      { name: "שטח משולש", formula: "S = \\frac{1}{2}bh" },
      { name: "שטח מעגל", formula: "S = \\pi r^2" }
    ]},
    { category: "טריגונומטריה", items: [
      { name: "זהות בסיסית", formula: "\\sin^2\\alpha + \\cos^2\\alpha = 1" },
      { name: "חוק הסינוסים", formula: "\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)}" }
    ]},
    { category: "חדו״א", items: [
      { name: "נגזרת חזקה", formula: "(x^n)' = n \\cdot x^{n-1}" },
      { name: "אינטגרל חזקה", formula: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C" }
    ]}
  ];

  const handleSubmit = async () => {
    if (!exam) return;

    try {
      let totalScore = 0;
      let earnedScore = 0;
      const resultsByTopic = {};
      const results = [];

      exam.questions.forEach(examQuestion => {
        const userAnswer = userAnswers[examQuestion.question_number];
        let isCorrect = false;
        let pointsAwarded = 0;

        if (userAnswer) {
          const cleanUserAnswer = userAnswer.toString().trim().toLowerCase();
          const cleanCorrectAnswer = examQuestion.correct_answer.toString().trim().toLowerCase();
          isCorrect = cleanUserAnswer === cleanCorrectAnswer;

          if (isCorrect) {
            pointsAwarded = examQuestion.points;
          } else if (examQuestion.solution_steps && examQuestion.solution_steps.length > 0) {
            pointsAwarded = calculatePartialCredit(examQuestion, userAnswer, examQuestion.solution_steps);
          }
        }

        totalScore += examQuestion.points;
        earnedScore += pointsAwarded;

        const topic = examQuestion.topic || 'כללי';
        if (!resultsByTopic[topic]) {
          resultsByTopic[topic] = { total: 0, earned: 0 };
        }
        resultsByTopic[topic].total += examQuestion.points;
        resultsByTopic[topic].earned += pointsAwarded;

        results.push({
          question_number: examQuestion.question_number,
          user_answer: userAnswer || '',
          correct_answer: examQuestion.correct_answer,
          is_correct: isCorrect,
          points_awarded: pointsAwarded,
          partial_credit: pointsAwarded > 0 && !isCorrect,
          explanation: examQuestion.explanation,
          solution_steps: examQuestion.solution_steps,
          topic: topic
        });
      });

      const scorePercent = (earnedScore / totalScore) * 100;

      await base44.entities.ExamAttempt.create({
        exam_id: examId,
        subject: exam.subject,
        unit_level: exam.unit_level,
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        answers: results,
        score_percent: scorePercent,
        passed: scorePercent >= (exam.passing_grade || 56),
        total_points: totalScore,
        earned_points: earnedScore
      });

      setScore({
        total: totalScore,
        earned: earnedScore,
        percent: scorePercent,
        results: results,
        byTopic: resultsByTopic
      });

      setExamFinished(true);

      if (examId) {
        localStorage.removeItem(`exam_${examId}_progress`);
      }
    } catch (error) {
      console.error("Error submitting exam:", error);

      let totalScore = 0;
      let earnedScore = 0;
      const resultsByTopic = {};
      const results = [];

      exam.questions.forEach(examQuestion => {
        const userAnswer = userAnswers[examQuestion.question_number];
        let isCorrect = false;
        let pointsAwarded = 0;

        if (userAnswer) {
          const cleanUserAnswer = userAnswer.toString().trim().toLowerCase();
          const cleanCorrectAnswer = examQuestion.correct_answer.toString().trim().toLowerCase();
          isCorrect = cleanUserAnswer === cleanCorrectAnswer;

          if (isCorrect) {
            pointsAwarded = examQuestion.points;
          } else if (examQuestion.solution_steps && examQuestion.solution_steps.length > 0) {
            pointsAwarded = calculatePartialCredit(examQuestion, userAnswer, examQuestion.solution_steps);
          }
        }

        totalScore += examQuestion.points;
        earnedScore += pointsAwarded;

        const topic = examQuestion.topic || 'כללי';
        if (!resultsByTopic[topic]) {
          resultsByTopic[topic] = { total: 0, earned: 0 };
        }
        resultsByTopic[topic].total += examQuestion.points;
        resultsByTopic[topic].earned += pointsAwarded;

        results.push({
          question_number: examQuestion.question_number,
          user_answer: userAnswer || '',
          correct_answer: examQuestion.correct_answer,
          is_correct: isCorrect,
          points_awarded: pointsAwarded,
          partial_credit: pointsAwarded > 0 && !isCorrect,
          explanation: examQuestion.explanation,
          solution_steps: examQuestion.solution_steps,
          topic: topic
        });
      });

      const scorePercent = (earnedScore / totalScore) * 100;

      setScore({
        total: totalScore,
        earned: earnedScore,
        percent: scorePercent,
        results: results,
        byTopic: resultsByTopic
      });

      setExamFinished(true);
    }
  };

  // Camera check handler
  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCameraImage(file_url);
      setShowCameraDialog(true);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("שגיאה בהעלאת התמונה");
    }
  };

  const handleCheckCameraAnswer = async () => {
    if (!cameraImage) return;

    setIsCheckingAnswer(true);
    setCameraFeedback(null);

    try {
      const question = exam.questions[currentQuestion];
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מורה למתמטיקה. בדוק את הפתרון הכתוב בתמונה.

השאלה: ${question.question_text}
התשובה הנכונה: ${question.correct_answer}

נתח את הפתרון בתמונה ובדוק:
1. האם התשובה הסופית נכונה?
2. האם דרך הפתרון נכונה?
3. אם יש טעויות - הסבר איפה הטעות והראה את הפתרון הנכון

השב בעברית בלבד.`,
        file_urls: [cameraImage],
        response_json_schema: {
          type: "object",
          properties: {
            is_correct: { type: "boolean", description: "האם התשובה נכונה" },
            partial_credit: { type: "boolean", description: "האם יש ניקוד חלקי על הדרך" },
            detected_answer: { type: "string", description: "התשובה שזוהתה בתמונה" },
            feedback: { type: "string", description: "משוב מפורט בעברית" },
            errors: { type: "array", items: { type: "string" }, description: "רשימת טעויות שנמצאו" },
            correct_steps: { type: "array", items: { type: "string" }, description: "צעדים נכונים שבוצעו" }
          },
          required: ["is_correct", "feedback"]
        }
      });

      setCameraFeedback(response);

      // Auto-fill answer if detected
      if (response.detected_answer) {
        handleAnswerChange(question.question_number, response.detected_answer);
      }

    } catch (error) {
      console.error("Error checking answer:", error);
      setCameraFeedback({ 
        is_correct: false, 
        feedback: "שגיאה בבדיקת התשובה. נסה שוב." 
      });
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  const closeCameraDialog = () => {
    setShowCameraDialog(false);
    setCameraImage(null);
    setCameraFeedback(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // Add report handler
  const handleReportQuestion = async () => {
    if (!reportText.trim()) {
      alert('נא להזין את פרטי הדיווח');
      return;
    }

    try {
      await base44.entities.ExamReport.create({
        exam_id: examId,
        question_number: reportingQuestion,
        report_text: reportText,
        subject: exam.subject,
        unit_level: exam.unit_level,
        user_email: user?.email || 'guest'
      });

      alert('✅ הדיווח נשלח בהצלחה! תודה על העזרה');
      setShowReportDialog(false);
      setReportText("");
      setReportingQuestion(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert('שגיאה בשליחת הדיווח. אנא נסה שוב.');
    }
  };

  const getTimerColor = () => {
    const minutes = Math.floor(timeLeft / 60);
    if (minutes > 10) return 'text-emerald-600 bg-emerald-50/50';
    if (minutes >= 5) return 'text-amber-600 bg-amber-50/50';
    return 'text-rose-600 bg-rose-50/50 animate-pulse';
  };

  const canUseHints = user?.is_premium || examMode === 'practice';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">טוען מבחן...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl p-12 shadow-xl shadow-slate-200/50">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">מבחן לא נמצא</h1>
          <p className="text-slate-600 mb-6">המבחן שחיפשת לא קיים</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))} className="bg-blue-500 hover:bg-blue-600">
            חזרה למבחנים
          </Button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Exams"))} className="mb-6 hover:bg-white/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{exam.title}</h1>
                <p className="text-slate-600">{exam.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-5 text-center">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{exam.duration_minutes}</div>
                <div className="text-xs text-slate-600 font-medium">דקות</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-5 text-center">
                <BookOpen className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{exam.questions.length}</div>
                <div className="text-xs text-slate-600 font-medium">שאלות</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-5 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{exam.total_points}</div>
                <div className="text-xs text-slate-600 font-medium">נקודות</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-4">בחר מצב:</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExamMode('practice')}
                  className={`p-5 rounded-xl transition-all ${
                    examMode === 'practice'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Lightbulb className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">אימון</div>
                  <div className="text-xs opacity-80">רמזים זמינים</div>
                </button>

                <button
                  onClick={() => setExamMode('real')}
                  className={`p-5 rounded-xl transition-all ${
                    examMode === 'real'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">בחינה</div>
                  <div className="text-xs opacity-80">ללא רמזים</div>
                </button>
              </div>
            </div>

            <Button
              onClick={handleStartExam}
              className="w-full h-16 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-blue-500/30"
            >
              התחל מבחן
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (examFinished && score) {
    const passed = score.percent >= (exam.passing_grade || 56);
    const topicsSorted = Object.entries(score.byTopic).sort((topicA, topicB) => {
      const percentA = (topicA[1].earned / topicA[1].total) * 100;
      const percentB = (topicB[1].earned / topicB[1].total) * 100;
      return percentA - percentB;
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-3xl shadow-2xl p-12 ${
              passed
                ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                : 'bg-gradient-to-br from-amber-500 to-orange-500'
            }`}
          >
            <div className="text-center text-white">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                {passed ? <CheckCircle className="w-20 h-20 mx-auto mb-4" /> : <AlertCircle className="w-20 h-20 mx-auto mb-4" />}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-7xl font-black mb-3"
              >
                {Math.round(score.percent)}
              </motion.h1>
              <p className="text-2xl font-semibold mb-2">{passed ? '🎉 מצוין!' : '💪 המשך להתאמן'}</p>
              <p className="text-lg opacity-90">{score.earned} מתוך {score.total} נקודות</p>
            </div>
          </motion.div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">התקדמות לפי נושאים</h2>
            <div className="space-y-4">
              {topicsSorted.map(([topic, data], topicIndex) => {
                const percent = (data.earned / data.total) * 100;
                return (
                  <motion.div
                    key={topic}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: topicIndex * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">{topic}</span>
                      <span className={`text-2xl font-bold ${
                        percent >= 80 ? 'text-emerald-600' :
                        percent >= 60 ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {Math.round(percent)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1, delay: 0.5 + topicIndex * 0.1 }}
                        className={`h-full rounded-full ${
                          percent >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                          percent >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          'bg-gradient-to-r from-rose-500 to-pink-500'
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">פתרונות מפורטים</h2>
            <div className="space-y-6">
              {score.results.map((result, resultIndex) => {
                const question = exam.questions[resultIndex];

                return (
                  <motion.div
                    key={resultIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: resultIndex * 0.05 }}
                    className={`rounded-2xl p-6 ${
                      result.is_correct
                        ? 'bg-emerald-50/50 border-2 border-emerald-200/50'
                        : result.partial_credit
                        ? 'bg-amber-50/50 border-2 border-blue-500/50'
                        : 'bg-rose-50/50 border-2 border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          result.is_correct ? 'bg-emerald-500' : result.partial_credit ? 'bg-amber-500' : 'bg-rose-500'
                        }`}>
                          {result.is_correct ? (
                            <CheckCircle className="w-6 h-6 text-white" />
                          ) : result.partial_credit ? (
                            <span className="text-white text-2xl font-bold">~</span> // Placeholder for partial credit
                          ) : (
                            <X className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">שאלה {result.question_number}</div>
                          <div className="text-sm text-slate-600">{result.topic}</div>
                          {result.partial_credit && (
                            <div className="text-xs text-amber-600 font-semibold mt-1">
                              ✓ קיבלת ניקוד חלקי על הדרך!
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${
                        result.is_correct ? 'text-emerald-600' :
                        result.partial_credit ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {result.points_awarded}/{question.points}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                      <div className="text-slate-800"><LatexRenderer content={question.question_text} /></div>
                    </div>

                    {/* Original GeometryCanvas was here - now handled by SmartGeometryDetector if appropriate */}
                    {question.geometry_shape && (
                      <div className="mb-4 flex justify-center">
                        <SmartGeometryDetector
                          question={{
                            ...question,
                            geometry_shape: question.geometry_shape,
                            geometry_labels: question.geometry_labels,
                            geometry_dimensions: question.geometry_dimensions
                          }}
                        />
                      </div>
                    )}

                    <div className="grid md::grid-cols-2 gap-3 mb-3">
                      <div className={`p-4 rounded-xl ${
                        result.is_correct ? 'bg-emerald-100/50' :
                        result.partial_credit ? 'bg-amber-100/50' :
                        'bg-rose-100/50'
                      }`}>
                        <div className="text-sm font-semibold mb-1 text-slate-700">תשובתך:</div>
                        <div className="text-xl font-bold text-slate-900"><LatexRenderer content={result.user_answer || 'לא נענה'} /></div>
                      </div>

                      {!result.is_correct && (
                        <div className="bg-emerald-100/50 p-4 rounded-xl">
                          <div className="text-sm font-semibold mb-1 text-slate-700">תשובה נכונה:</div>
                          <div className="text-xl font-bold text-emerald-700"><LatexRenderer content={result.correct_answer} /></div>
                        </div>
                      )}
                    </div>

                    {result.explanation && (
                      <div className="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-500">
                        <div className="text-sm font-semibold mb-2 text-blue-900">💡 הסבר מלא:</div>
                        <div className="text-slate-700 leading-relaxed">{result.explanation}</div>
                      </div>
                    )}

                    {result.solution_steps && result.solution_steps.length > 0 && (
                      <div className="mt-3 bg-indigo-50/50 p-4 rounded-xl border-l-4 border-indigo-500">
                        <div className="text-sm font-semibold mb-2 text-indigo-900">📝 שלבי פתרון:</div>
                        <ol className="space-y-1 text-sm text-slate-700 list-decimal list-inside">
                          {result.solution_steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex">
                              <span className="font-bold text-indigo-600 mr-1">{stepIndex + 1}.</span>
                              <span><LatexRenderer content={step} /></span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Display saved draft if available for review */}
                    {draftPapers[question.question_number] && (
                        <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-blue-500">
                            <h4 className="text-sm font-semibold mb-2 text-slate-900">הטיוטה שלך:</h4>
                            <img src={draftPapers[question.question_number]} alt="Draft" className="w-full h-auto rounded-lg border border-blue-500" />
                        </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              variant="outline"
              className="flex-1 h-14 border-2 hover:bg-slate-50"
            >
              חזרה
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              נסה שוב
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;

  // Render appropriate visualization based on question type
  const renderQuestionVisualization = () => {
    // First check for special visualizations
    if (question.visualization_type === 'pie_chart' && question.pie_data) {
      return (
        <div className="mb-6">
          <PieChart
            data={question.pie_data}
            title={question.pie_title}
            interactive={question.interactive_viz}
            onSelect={(slice) => {
              if (question.select_on_chart) {
                handleAnswerChange(question.question_number, slice.label);
              }
            }}
          />
        </div>
      );
    }

    if (question.visualization_type === 'unit_circle') {
      return (
        <div className="mb-6">
          <UnitCircle
            initialAngle={question.initial_angle || 45}
            interactive={question.interactive_viz}
            showValues={true}
            onAngleChange={(angle) => {
              if (question.answer_is_angle) {
                handleAnswerChange(question.question_number, angle.toString());
              }
            }}
          />
        </div>
      );
    }

    if (question.visualization_type === 'parabola') {
      return (
        <div className="mb-6">
          <ParabolaGraph
            a={question.parabola_a || 1}
            b={question.parabola_b || 0}
            c={question.parabola_c || 0}
            interactive={question.interactive_viz}
            showVertex={true}
            showRoots={true}
            onParametersChange={(params) => {
              if (question.answer_is_params) {
                handleAnswerChange(question.question_number, JSON.stringify(params));
              }
            }}
          />
        </div>
      );
    }

    if (question.visualization_type === 'integral') {
      return (
        <div className="mb-6">
          <IntegralGraph
            functionType={question.function_type || 'quadratic'}
            a={question.function_a || 1}
            b={question.function_b || 0}
            c={question.function_c || 0}
            lowerBound={question.lower_bound || -2}
            upperBound={question.upper_bound || 2}
            interactive={question.interactive_viz}
            onBoundsChange={(bounds) => {
              if (question.answer_is_bounds) {
                handleAnswerChange(question.question_number, JSON.stringify(bounds));
              }
            }}
          />
        </div>
      );
    }

    if (question.visualization_type === 'vector' && question.vector_data) {
      return (
        <div className="mb-6">
          <VectorGraph
            vectors={question.vector_data}
            interactive={question.interactive_viz}
            showSum={true}
            onVectorsChange={(vectors) => {
              if (question.answer_is_vectors) {
                handleAnswerChange(question.question_number, JSON.stringify(vectors));
              }
            }}
          />
        </div>
      );
    }

    if (question.has_graph && question.graph_type === 'interactive') {
      return (
        <div className="mb-6">
          <InteractiveGraph
            xMin={question.graph_x_min || -10}
            xMax={question.graph_x_max || 10}
            yMin={question.graph_y_min || -10}
            yMax={question.graph_y_max || 10}
            initialPoints={question.graph_points || []}
            onPointsChange={(points) => handleAnswerChange(question.question_number, JSON.stringify(points))}
          />
        </div>
      );
    }

    if (question.question_image_url) {
      return (
        <div className="mb-6">
          <img
            src={question.question_image_url}
            alt="שאלה"
            className="w-full rounded-xl"
          />
        </div>
      );
    }

    // Smart geometry detection - automatic
    return <SmartGeometryDetector question={question} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-blue-500 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleExitExam} className="hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="font-bold text-slate-900">{exam.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${getTimerColor()}`}>
                <Clock className="w-5 h-5" />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuestionMap(!showQuestionMap)}
                className="hover:bg-slate-100"
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={progress} className="h-1.5 bg-slate-200 [&>div]:bg-white" />
            </div>
            <span className="text-sm font-semibold text-slate-600 min-w-[60px] text-center">
              {currentQuestion + 1} / {exam.questions.length}
            </span>
          </div>
        </div>

        {/* Question Map */}
        <AnimatePresence>
          {showQuestionMap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-blue-500 bg-slate-50"
            >
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {exam.questions.map((q, idx) => {
                    const status = getQuestionStatus(q.question_number);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentQuestion(idx);
                          setShowQuestionMap(false);
                        }}
                        className={`w-11 h-11 rounded-xl font-bold transition-all ${
                          idx === currentQuestion ? 'ring-2 ring-blue-500 scale-110' : ''
                        } ${
                          status === 'answered' ? 'bg-emerald-500 text-white' :
                          status === 'marked' ? 'bg-amber-500 text-white' :
                          'bg-white text-slate-700 border border-blue-500'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content with padding for fixed header */}
      <div className="pt-28 pb-24 max-w-4xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-8 mb-6"
          >
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {question.question_number}
                </div>
                <div>
                  <div className="text-sm font-semibold text-blue-600">{question.topic || 'גאומטריה'}</div>
                  <div className="text-xs text-slate-500">{question.points} נק'</div>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setReportingQuestion(question.question_number);
                  setShowReportDialog(true);
                }}
                className="border-2 border-amber-300 text-amber-700 hover:bg-amber-50 w-10 h-10"
                title="דווח על שגיאה"
              >
                <Flag className="w-5 h-5" />
              </Button>
            </div>

            {/* Question Text */}
            <div className="text-xl font-medium text-slate-900 mb-6 leading-relaxed">
              <LatexRenderer content={question.question_text} />
            </div>

            {/* SMART Dynamic Visualization - shows geometry automatically! */}
            {renderQuestionVisualization()}

            {/* Hint */}
            {examMode === 'practice' && canUseHints && question.explanation && (
              <div className="mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint(prev => ({ ...prev, [question.question_number]: !prev[question.question_number] }))}
                  className="text-blue-600"
                >
                  <Lightbulb className="w-4 h-4 ml-2" />
                  {showHint[question.question_number] ? 'הסתר רמז' : 'פתח רמז'}
                </Button>
                {showHint[question.question_number] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg"
                  >
                    <p className="text-sm text-slate-700">{question.explanation.substring(0, 100)}...</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Answer Area */}
            <div className="space-y-3">
              {question.question_type === 'multiple_choice' && question.options ? (
                <div className="space-y-2">
                  {question.options.map((optionValue, optionIndex) => (
                    <button
                      key={optionIndex}
                      onClick={() => handleAnswerChange(question.question_number, optionValue)}
                      className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                        userAnswers[question.question_number] === optionValue
                          ? 'bg-blue-50 border-blue-500 shadow-md'
                          : 'bg-white border-blue-500 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          userAnswers[question.question_number] === optionValue
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-blue-500'
                        }`}>
                          {userAnswers[question.question_number] === optionValue && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-base"><LatexRenderer content={optionValue} /></span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">התשובה שלך:</label>
                  <Input
                    type="text"
                    value={userAnswers[question.question_number] || ''}
                    onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                    placeholder="הקלד תשובה..."
                    className="h-14 text-lg"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Camera Check Button */}
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                ref={cameraInputRef}
                className="hidden"
                id="camera-input"
              />
              <Button
                onClick={() => cameraInputRef.current?.click()}
                variant="outline"
                className="w-full border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
              >
                <Camera className="w-5 h-5 ml-2" />
                צלם פתרון לבדיקה
              </Button>
            </div>

            {/* Draft Paper Toggle Button - NEW UI ELEMENT */}
            <div className="mt-4">
              <Button
                onClick={() => toggleDraftForQuestion(question.question_number)}
                variant="outline"
                className="w-full border-2 border-dashed border-blue-500 hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Pencil className="w-4 h-4 ml-2" />
                {showDraftForQuestion[question.question_number] ? 'הסתר לוח טיוטה' : 'פתח לוח טיוטה לחישובים'}
                {showDraftForQuestion[question.question_number] ? (
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 180 }}
                    className="mr-2"
                  >
                    ▲
                  </motion.div>
                ) : (
                  <span className="mr-2">▼</span>
                )}
              </Button>

              {/* Collapsible Draft Paper - NEW UI ELEMENT */}
              <AnimatePresence>
                {showDraftForQuestion[question.question_number] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mt-4"
                  >
                    <DrawingTools
                      questionNumber={question.question_number}
                      initialDrawing={draftPapers[question.question_number]} // Pass existing draft if any
                      onSave={(dataUrl) => saveDraftForQuestion(question.question_number, dataUrl)}
                      onClose={() => closeDraftForQuestion(question.question_number)}
                      questionText={question.question_text}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Bar with Calculator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-500 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              variant="outline"
              className="flex-1 h-12 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5 ml-2" />
              הקודם
            </Button>

            <Button
              onClick={() => setShowCalculator(true)}
              className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl shadow-lg"
            >
              <Calculator className="w-7 h-7 text-white" />
            </Button>

            <Button
              onClick={() => setShowFormulas(true)}
              variant="outline"
              size="icon"
              className="w-12 h-12"
            >
              <BookOpen className="w-5 h-5" />
            </Button>

            {currentQuestion === exam.questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                סיים
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(exam.questions.length - 1, prev + 1))}
                className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                הבא
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-6 h-6 text-blue-600" />
                מחשבון מדעי
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={calcMode === 'basic' ? 'default' : 'outline'}
                  onClick={() => setCalcMode('basic')}
                  className="text-xs h-7"
                >
                  בסיסי
                </Button>
                <Button
                  size="sm"
                  variant={calcMode === 'scientific' ? 'default' : 'outline'}
                  onClick={() => setCalcMode('scientific')}
                  className="text-xs h-7"
                >
                  מדעי
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Display */}
          <div className="bg-slate-900 rounded-xl p-4 mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500">
                {calcMemory !== 0 && <span className="text-amber-400 mr-2">M</span>}
                {isDegrees ? 'DEG' : 'RAD'}
              </span>
            </div>
            <div className="text-right text-3xl font-mono text-emerald-400 overflow-x-auto whitespace-nowrap" dir="ltr">
              {calculatorDisplay}
            </div>
          </div>

          {/* Scientific buttons (when in scientific mode) */}
          {calcMode === 'scientific' && (
            <div className="grid gap-1.5 mb-2">
              {scientificButtons.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-1.5">
                  {row.map((buttonValue) => (
                    <Button
                      key={buttonValue}
                      onClick={() => handleCalculator(buttonValue)}
                      className={`h-10 text-xs font-bold ${
                        buttonValue === 'DEG' && isDegrees ? 'bg-blue-600 text-white' :
                        buttonValue === 'RAD' && !isDegrees ? 'bg-blue-600 text-white' :
                        ['sin', 'cos', 'tan', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹'].includes(buttonValue)
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                        : ['ln', 'log', '10ˣ', 'eˣ'].includes(buttonValue)
                          ? 'bg-teal-100 hover:bg-teal-200 text-teal-800'
                        : ['x²', 'x³', 'xʸ', '√', '³√', '1/x', 'n!', '|x|'].includes(buttonValue)
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                        : ['MC', 'MR', 'M+', 'M-'].includes(buttonValue)
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      {buttonValue}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Basic buttons */}
          <div className="grid gap-1.5">
            {basicButtons.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-4 gap-1.5">
                {row.map((buttonValue) => (
                  <Button
                    key={buttonValue}
                    onClick={() => handleCalculator(buttonValue)}
                    className={`h-12 text-xl font-bold ${
                      buttonValue === '=' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : buttonValue === 'C'
                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : buttonValue === '←'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : ['+', '-', '×', '÷', '%'].includes(buttonValue)
                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                    }`}
                  >
                    {buttonValue}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulas Dialog */}
      <Dialog open={showFormulas} onOpenChange={setShowFormulas}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              דף נוסחאות
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formulas.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-blue-500 pb-2">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((formula, formulaIndex) => (
                    <div key={formulaIndex} className="bg-blue-50 p-4 rounded-xl">
                      <div className="font-semibold text-slate-900 mb-2">{formula.name}</div>
                      <div className="text-2xl font-mono text-blue-700 dir-ltr text-left">
                        <LatexRenderer content={formula.formula} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-600" />
              דווח על שגיאה בשאלה {reportingQuestion}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              אנא תאר את הבעיה שמצאת בשאלה זו (תשובה שגויה, טעות בנוסח, וכו')
            </p>

            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="לדוגמה: התשובה הנכונה צריכה להיות 42 ולא 24..."
              className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none"
            />

            <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                💡 הדיווח שלך יישלח למנהלי המערכת ויטופל בהקדם
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowReportDialog(false);
                setReportText("");
                setReportingQuestion(null);
              }}
              variant="outline"
              className="flex-1"
            >
              ביטול
            </Button>
            <Button
              onClick={handleReportQuestion}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              שלח דיווח
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Check Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={closeCameraDialog}>
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              בדיקת פתרון - שאלה {exam?.questions[currentQuestion]?.question_number}
            </DialogTitle>
          </DialogHeader>

          {cameraImage && (
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 mb-4">
              <img src={cameraImage} alt="פתרון" className="w-full h-auto" />
            </div>
          )}

          {!cameraFeedback && !isCheckingAnswer && (
            <Button
              onClick={handleCheckCameraAnswer}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
            >
              בדוק את הפתרון
            </Button>
          )}

          {isCheckingAnswer && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-slate-600">בודק את הפתרון שלך...</p>
            </div>
          )}

          {cameraFeedback && (
            <div className="space-y-4">
              {/* Result Header */}
              <div className={`rounded-xl p-4 ${
                cameraFeedback.is_correct 
                  ? 'bg-emerald-50 border-2 border-emerald-300'
                  : cameraFeedback.partial_credit
                    ? 'bg-amber-50 border-2 border-amber-300'
                    : 'bg-rose-50 border-2 border-rose-300'
              }`}>
                <div className="flex items-center gap-3">
                  {cameraFeedback.is_correct ? (
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  ) : cameraFeedback.partial_credit ? (
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  ) : (
                    <X className="w-8 h-8 text-rose-600" />
                  )}
                  <div>
                    <div className={`text-xl font-bold ${
                      cameraFeedback.is_correct ? 'text-emerald-700' :
                      cameraFeedback.partial_credit ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {cameraFeedback.is_correct ? 'תשובה נכונה! 🎉' :
                       cameraFeedback.partial_credit ? 'חלקית נכון' : 'לא נכון'}
                    </div>
                    {cameraFeedback.detected_answer && (
                      <div className="text-sm text-slate-600">
                        זיהינו: {cameraFeedback.detected_answer}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
                <div className="font-semibold text-blue-900 mb-2">💡 משוב:</div>
                <p className="text-slate-700 leading-relaxed">{cameraFeedback.feedback}</p>
              </div>

              {/* Correct Steps */}
              {cameraFeedback.correct_steps?.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="font-semibold text-emerald-900 mb-2">✓ צעדים נכונים:</div>
                  <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
                    {cameraFeedback.correct_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {cameraFeedback.errors?.length > 0 && (
                <div className="bg-rose-50 rounded-xl p-4">
                  <div className="font-semibold text-rose-900 mb-2">✗ טעויות:</div>
                  <ul className="list-disc list-inside text-sm text-rose-800 space-y-1">
                    {cameraFeedback.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={closeCameraDialog}
                  variant="outline"
                  className="flex-1"
                >
                  סגור
                </Button>
                <Button
                  onClick={() => {
                    closeCameraDialog();
                    cameraInputRef.current?.click();
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  צלם שוב
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>יציאה מהמבחן?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-700">התקדמותך תישמר. האם להמשיך?</p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setShowExitDialog(false)} variant="outline" className="flex-1">
              המשך
            </Button>
            <Button onClick={confirmExit} className="flex-1 bg-rose-600">
              צא
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}