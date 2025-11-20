import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, ChevronLeft, BookOpen, X, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ExamQuestion from "@/components/exam/ExamQuestion";
import ExamResults from "@/components/exam/ExamResults";
import ReadingTextPanel from "@/components/exam/ReadingTextPanel";

export default function TakeExamPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get("examid");
  const module = urlParams.get("module"); // A, B, C, or Generic

  const [user, setUser] = useState(null);
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showReadingPanel, setShowReadingPanel] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    loadUserAndExam();
  }, [examId, module]);

  const loadUserAndExam = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      let examData = null;
      
      if (module === "A") {
        const exams = await base44.entities.ModuleAExam.filter({ id: examId });
        examData = exams[0];
      } else if (module === "B") {
        const exams = await base44.entities.ModuleBExam.filter({ id: examId });
        examData = exams[0];
      } else if (module === "C") {
        const exams = await base44.entities.ModuleCExam.filter({ id: examId });
        examData = exams[0];
      } else {
        const exams = await base44.entities.GenericExam.filter({ id: examId });
        examData = exams[0];
      }

      setExam(examData);
      
      if (examData?.duration_minutes) {
        setTimeLeft(examData.duration_minutes * 60);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading exam:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!examStarted || !timeLeft || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, timeLeft, showResults]);

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleFinishExam = async () => {
    const questions = getQuestions();
    const totalQuestions = questions.length;
    let correctCount = 0;

    const detailedResults = await Promise.all(questions.map(async (q, idx) => {
      const userAnswer = answers[`q_${idx}`] || "";
      const questionId = q.question_id || `q_${idx}`;
      
      let isCorrect = false;
      let correctAnswer = "";

      // Get correct answer
      if (q.correct_answer) {
        correctAnswer = String(q.correct_answer);
      } else if (q.acceptable_answers?.length > 0) {
        correctAnswer = String(q.acceptable_answers[0]);
      }

      // Check answer
      const normalizedUser = String(userAnswer).trim().toLowerCase().replace(/[.,!?;]/g, '');
      const normalizedCorrect = String(correctAnswer).trim().toLowerCase().replace(/[.,!?;]/g, '');

      if (q.question_type === "multiple_choice" || q.question_type === "multi_choice") {
        isCorrect = normalizedUser === normalizedCorrect;
      } else {
        // For open questions - fuzzy match
        if (q.acceptable_answers?.length > 0) {
          isCorrect = q.acceptable_answers.some(ans => {
            const normalized = String(ans).toLowerCase().replace(/[.,!?;]/g, '');
            return normalized === normalizedUser ||
                   normalizedUser.includes(normalized) ||
                   normalized.includes(normalizedUser);
          });
        } else {
          isCorrect = normalizedUser === normalizedCorrect ||
                     normalizedUser.includes(normalizedCorrect) ||
                     normalizedCorrect.includes(normalizedUser);
        }
      }

      if (isCorrect) correctCount++;

      return {
        questionNumber: idx + 1,
        questionText: q.question_text,
        userAnswer,
        correctAnswer,
        isCorrect,
        explanation: q.explanation || ""
      };
    }));

    const percentage = Math.round((correctCount / totalQuestions) * 100);

    setResults({
      totalQuestions,
      correctCount,
      percentage,
      detailedResults
    });

    setShowResults(true);
  };

  const getQuestions = () => {
    if (!exam) return [];

    if (module === "A") {
      return [...(exam.reading_questions || []), ...(exam.listening_questions || [])];
    } else if (module === "B") {
      return exam.grammar_questions || [];
    } else if (module === "C") {
      return exam.questions || [];
    } else {
      return exam.questions || [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מבחן...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-md">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-600 mb-4">לא נמצא מבחן</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))} className="w-full">
            חזור למבחנים
          </Button>
        </div>
      </div>
    );
  }

  if (showResults) {
    return <ExamResults results={results} exam={exam} onExit={() => navigate(createPageUrl("Exams"))} />;
  }

  const questions = getQuestions();
  const currentQuestion = questions[currentQuestionIndex];
  const readingText = exam.reading_text || "";

  // Pre-exam intro
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600">{exam.subject} • {exam.unit_level} יחידות</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-semibold">משך המבחן</span>
                <span className="text-blue-600 font-bold">{exam.duration_minutes} דקות</span>
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-semibold">מספר שאלות</span>
                <span className="text-purple-600 font-bold">{questions.length}</span>
              </div>
            </div>
          </div>

          <Button onClick={handleStartExam} className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-bold">
            התחל מבחן
            <ChevronLeft className="w-5 h-5 mr-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-3xl p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("האם אתה בטוח שברצונך לצאת מהמבחן?")) {
                navigate(createPageUrl("Exams"));
              }
            }}
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-lg">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {readingText && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowReadingPanel(true)}
              className="text-white hover:bg-white/20"
            >
              <BookOpen className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold text-center mb-2">{exam.title}</h1>
          <div className="bg-white/20 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              className="h-full bg-white rounded-full"
            />
          </div>
          <p className="text-center text-sm mt-2 text-white/90">
            שאלה {currentQuestionIndex + 1} מתוך {questions.length}
          </p>
        </div>
      </div>

      {/* Question */}
      <div className="px-4 max-w-2xl mx-auto">
        <ExamQuestion
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          userAnswer={answers[`q_${currentQuestionIndex}`]}
          onAnswerChange={(answer) => handleAnswerChange(`q_${currentQuestionIndex}`, answer)}
        />

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-2xl">
          <div className="max-w-2xl mx-auto flex gap-3">
            {currentQuestionIndex > 0 && (
              <Button
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                variant="outline"
                className="flex-1"
              >
                <ChevronRight className="w-5 h-5 ml-2" />
                שאלה קודמת
              </Button>
            )}
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                שאלה הבאה
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinishExam}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-5 h-5 ml-2" />
                סיים מבחן
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reading Text Panel */}
      {readingText && (
        <ReadingTextPanel
          text={readingText}
          open={showReadingPanel}
          onClose={() => setShowReadingPanel(false)}
        />
      )}
    </div>
  );
}