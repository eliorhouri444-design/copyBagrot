import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  Calculator,
  BookOpen,
  Trophy,
  Home,
  AlertCircle,
  Pencil,
  Eye,
  EyeOff
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DrawingTools from "../components/exams/DrawingTools";

export default function ExamPhysicsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('');
  const [showDrawingTool, setShowDrawingTool] = useState(false);
  const [draftPapers, setDraftPapers] = useState({});
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('examId');
    if (id) {
      setExamId(id);
    }
  }, []);

  const { data: exam, isLoading } = useQuery({
    queryKey: ['generic-exam', examId],
    queryFn: async () => {
      const exams = await base44.entities.GenericExam.list();
      const foundExam = exams.find(e => e.id === examId);
      if (!foundExam) throw new Error('Exam not found');
      return foundExam;
    },
    enabled: !!examId
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (examStarted && !examFinished && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [examStarted, examFinished, timeRemaining]);

  const saveAttemptMutation = useMutation({
    mutationFn: async (attemptData) => {
      return await base44.entities.ExamAttempt.create(attemptData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-attempts'] });
    }
  });

  const handleStartExam = () => {
    if (!exam) return;
    setExamStarted(true);
    setTimeRemaining(exam.duration_minutes * 60);
  };

  const handleFinishExam = async () => {
    if (!exam) return;

    const correctAnswers = exam.questions.filter((questionItem, questionIndex) => {
      const userAnswer = answers[questionIndex];
      return userAnswer === questionItem.correct_answer;
    }).length;

    const score = (correctAnswers / exam.questions.length) * 100;

    const attemptData = {
      exam_id: exam.id,
      exam_title: exam.title,
      exam_subject: exam.subject,
      user_email: user?.email || 'guest',
      score: Math.round(score),
      correct_answers: correctAnswers,
      total_questions: exam.questions.length,
      time_taken_minutes: exam.duration_minutes - Math.floor(timeRemaining / 60),
      answers: answers,
      completed_at: new Date().toISOString()
    };

    await saveAttemptMutation.mutateAsync(attemptData);
    setExamFinished(true);
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleDrawingSave = (questionNumber, dataUrl) => {
    setDraftPapers(prev => ({
      ...prev,
      [questionNumber]: dataUrl
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateAnswer = (expr) => {
    try {
      const result = eval(expr);
      return result;
    } catch (e) {
      return 'Error';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">טוען מבחן...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">מבחן לא נמצא</h2>
          <p className="text-gray-600 mb-6">המבחן המבוקש לא קיים במערכת</p>
          <Button onClick={() => navigate('/Exams')} className="bg-blue-600 hover:bg-blue-700">
            <Home className="w-4 h-4 ml-2" />
            חזור לרשימת המבחנים
          </Button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-lg text-gray-600">{exam.subject} - פיזיקה</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <span className="text-gray-700 font-semibold">משך המבחן:</span>
              <span className="text-blue-600 font-bold">{exam.duration_minutes} דקות</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
              <span className="text-gray-700 font-semibold">מספר שאלות:</span>
              <span className="text-purple-600 font-bold">{exam.questions?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <span className="text-gray-700 font-semibold">נקודות למעבר:</span>
              <span className="text-green-600 font-bold">{exam.passing_score || 55}%</span>
            </div>
          </div>

          {exam.description && (
            <div className="bg-gray-50 rounded-xl p-4 mb-8">
              <p className="text-gray-700 leading-relaxed">{exam.description}</p>
            </div>
          )}

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-8">
            <h3 className="font-bold text-amber-900 mb-2">⚠️ הוראות חשובות:</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• קרא כל שאלה בעיון לפני מתן התשובה</li>
              <li>• השתמש במחשבון ובנוסחאות הפיזיקה לפי הצורך</li>
              <li>• שים לב ליחידות המידה בתשובות</li>
              <li>• ניתן להשתמש בלוח טיוטה לחישובים</li>
              <li>• לא ניתן לחזור לשאלות קודמות</li>
            </ul>
          </div>

          <Button
            onClick={handleStartExam}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          >
            התחל מבחן
            <ChevronLeft className="w-6 h-6 mr-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (examFinished) {
    const correctAnswers = exam.questions.filter((questionItem, questionIndex) => {
      const userAnswer = answers[questionIndex];
      return userAnswer === questionItem.correct_answer;
    }).length;

    const score = (correctAnswers / exam.questions.length) * 100;
    const passed = score >= (exam.passing_score || 55);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
              passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {passed ? (
                <Trophy className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {passed ? '🎉 כל הכבוד!' : '😔 לא עברת'}
            </h2>
            <p className="text-xl text-gray-600">
              {passed ? 'עברת את המבחן בהצלחה!' : 'נדרש ציון מעל 55 למעבר'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{Math.round(score)}%</div>
              <div className="text-sm text-gray-600">ציון סופי</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {correctAnswers}/{exam.questions.length}
              </div>
              <div className="text-sm text-gray-600">תשובות נכונות</div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <Button
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              variant="outline"
              className="w-full h-12 border-2"
            >
              {showAnswerKey ? (
                <>
                  <EyeOff className="w-5 h-5 ml-2" />
                  הסתר פתרון מלא
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 ml-2" />
                  הצג פתרון מלא
                </>
              )}
            </Button>

            {showAnswerKey && (
              <div className="bg-gray-50 rounded-xl p-6 max-h-96 overflow-y-auto space-y-4">
                {exam.questions.map((questionItem, questionIndex) => {
                  const userAnswer = answers[questionIndex];
                  const isCorrect = userAnswer === questionItem.correct_answer;

                  return (
                    <div key={questionIndex} className={`p-4 rounded-lg border-2 ${
                      isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="font-bold text-gray-900">שאלה {questionIndex + 1}:</span>
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{questionItem.question_text}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">התשובה שלך:</span>
                          <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {userAnswer || 'לא נענה'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">תשובה נכונה:</span>
                            <span className="font-bold text-green-600">{questionItem.correct_answer}</span>
                          </div>
                        )}
                        {questionItem.explanation && (
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <span className="text-gray-600 font-semibold">הסבר:</span>
                            <p className="text-gray-700 mt-1">{questionItem.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/Exams')}
              variant="outline"
              className="flex-1 h-12"
            >
              <Home className="w-5 h-5 ml-2" />
              חזור למבחנים
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
            >
              נסה שוב
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{exam.title}</h2>
                <p className="text-sm text-gray-600">שאלה {currentQuestion + 1} מתוך {exam.questions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-bold">{formatTime(timeRemaining)}</span>
              </div>
              <Button
                onClick={() => setShowExitDialog(true)}
                variant="outline"
                size="sm"
              >
                יציאה
              </Button>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-white h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

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
            <div className="flex items-start gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">{currentQuestion + 1}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-4 leading-relaxed">
                  {question.question_text}
                </h3>

                {question.question_image && (
                  <div className="mb-6">
                    <img 
                      src={question.question_image} 
                      alt="Question" 
                      className="max-w-full h-auto rounded-xl border-2 border-gray-200"
                    />
                  </div>
                )}

                {question.question_type === 'multiple_choice' && question.options ? (
                  <div className="space-y-3">
                    {question.options.map((optionValue, optionIndex) => (
                      <motion.button
                        key={optionIndex}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswerChange(currentQuestion, optionValue)}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion] === optionValue
                            ? 'bg-blue-50 border-blue-500 text-blue-900'
                            : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            answers[currentQuestion] === optionValue
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {answers[currentQuestion] === optionValue && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <span className="font-medium">{optionValue}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <Textarea
                      value={answers[currentQuestion] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      placeholder="הקלד את תשובתך כאן..."
                      className="min-h-32 text-lg"
                    />
                  </div>
                )}

                <div className="mt-6">
                  <Button
                    onClick={() => setShowDrawingTool(!showDrawingTool)}
                    variant="outline"
                    className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Pencil className="w-4 h-4 ml-2" />
                    {showDrawingTool ? 'הסתר לוח טיוטה' : 'פתח לוח טיוטה לחישובים'}
                  </Button>

                  {showDrawingTool && (
                    <div className="mt-4">
                      <DrawingTools
                        questionNumber={question.question_number}
                        onSave={(data) => handleDrawingSave(question.question_number, data)}
                        initialDrawing={draftPapers[question.question_number]}
                        onClose={() => setShowDrawingTool(false)}
                        questionText={question.question_text}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCalculator(!showCalculator)}
              variant="outline"
              size="sm"
              className={showCalculator ? 'bg-blue-50 border-blue-500' : ''}
            >
              <Calculator className="w-4 h-4 ml-2" />
              מחשבון
            </Button>
            <Button
              onClick={() => setShowFormulas(!showFormulas)}
              variant="outline"
              size="sm"
              className={showFormulas ? 'bg-purple-50 border-purple-500' : ''}
            >
              <BookOpen className="w-4 h-4 ml-2" />
              נוסחאות
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              disabled={currentQuestion === 0}
              variant="outline"
            >
              <ChevronRight className="w-5 h-5" />
              הקודם
            </Button>

            {currentQuestion === exam.questions.length - 1 ? (
              <Button
                onClick={handleFinishExam}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                סיים מבחן
                <Trophy className="w-5 h-5 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                הבא
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showCalculator && (
        <div className="fixed bottom-24 left-4 bg-white rounded-2xl shadow-2xl p-4 border-2 border-gray-200 z-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">מחשבון</h3>
            <button
              onClick={() => setShowCalculator(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={calculatorValue}
            onChange={(e) => setCalculatorValue(e.target.value)}
            className="w-full mb-2 p-2 border rounded text-right"
            placeholder="הקלד חישוב..."
          />
          <div className="grid grid-cols-4 gap-2">
            {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(btn => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === '=') {
                    setCalculatorValue(String(calculateAnswer(calculatorValue)));
                  } else {
                    setCalculatorValue(calculatorValue + btn);
                  }
                }}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold"
              >
                {btn}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCalculatorValue('')}
            className="w-full mt-2 p-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-600 font-bold"
          >
            נקה
          </button>
        </div>
      )}

      {showFormulas && (
        <div className="fixed bottom-24 right-4 bg-white rounded-2xl shadow-2xl p-6 border-2 border-gray-200 z-20 max-w-md max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-lg">נוסחאות פיזיקה</h3>
            <button
              onClick={() => setShowFormulas(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-bold text-blue-900 mb-2">קינמטיקה</h4>
              <p className="text-sm text-gray-700">v = v₀ + at</p>
              <p className="text-sm text-gray-700">s = v₀t + ½at²</p>
              <p className="text-sm text-gray-700">v² = v₀² + 2as</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <h4 className="font-bold text-green-900 mb-2">דינמיקה</h4>
              <p className="text-sm text-gray-700">F = ma</p>
              <p className="text-sm text-gray-700">W = mg</p>
              <p className="text-sm text-gray-700">f = μN</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <h4 className="font-bold text-purple-900 mb-2">אנרגיה</h4>
              <p className="text-sm text-gray-700">E = ½mv²</p>
              <p className="text-sm text-gray-700">E = mgh</p>
              <p className="text-sm text-gray-700">W = Fd</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <h4 className="font-bold text-orange-900 mb-2">חשמל</h4>
              <p className="text-sm text-gray-700">V = IR</p>
              <p className="text-sm text-gray-700">P = IV</p>
              <p className="text-sm text-gray-700">Q = It</p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>יציאה מהמבחן?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">אם תצא עכשיו, כל התשובות שלך לא יישמרו.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              המשך במבחן
            </Button>
            <Button
              onClick={() => navigate('/Exams')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              צא מהמבחן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}