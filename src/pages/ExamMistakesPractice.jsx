import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Zap, BookOpen, CheckCircle, XCircle, ChevronLeft, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function ExamMistakesPracticePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [examInfo, setExamInfo] = useState(null);
  const [originalAttempt, setOriginalAttempt] = useState(null);

  useEffect(() => {
    loadMistakesFromExam();
  }, []);

  const loadMistakesFromExam = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // קבל את פרטי הניסיון מ-sessionStorage
      const attemptId = sessionStorage.getItem('mistakesExamAttemptId');
      const examId = sessionStorage.getItem('mistakesExamId');

      // נקה את ה-sessionStorage
      sessionStorage.removeItem('mistakesExamAttemptId');
      sessionStorage.removeItem('mistakesExamId');

      if (!attemptId || !examId) {
        console.log('No attempt specified, redirecting to Exams');
        navigate(createPageUrl("Exams"));
        return;
      }

      // טען את הניסיון המקורי
      const attempts = await base44.entities.ExamAttempt.list("-created_date", 500);
      const attempt = attempts.find((a) => a.id === attemptId);

      if (!attempt) {
        console.log('Attempt not found, redirecting to Exams');
        navigate(createPageUrl("Exams"));
        return;
      }

      setOriginalAttempt(attempt);

      // טען את המבחן המקורי כדי לקבל את השאלות המלאות
      const [genericExams, moduleAExams, moduleBExams, moduleCExams] = await Promise.all([
      base44.entities.GenericExam.list(),
      base44.entities.ModuleAExam.list(),
      base44.entities.ModuleBExam.list(),
      base44.entities.ModuleCExam.list()]
      );

      const allExams = [...genericExams, ...moduleAExams, ...moduleBExams, ...moduleCExams];
      const exam = allExams.find((e) => e.id === examId);

      if (!exam) {
        console.log('Exam not found, redirecting to Exams');
        navigate(createPageUrl("Exams"));
        return;
      }

      setExamInfo({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        unit_level: exam.unit_level
      });

      // מצא את השאלות שהמשתמש טעה בהן
      const wrongAnswers = attempt.answers?.filter((a) => !a.is_correct) || [];

      // בנה את רשימת השאלות מהטעויות
      const mistakeQuestions = wrongAnswers.map((wrongAnswer, idx) => {
        // מצא את השאלה המקורית מהמבחן
        const questionIndex = wrongAnswer.question_index ?? wrongAnswer.item_id ?? idx;
        const originalQuestion = exam.questions?.[questionIndex] || {};

        return {
          ...originalQuestion,
          question_text: wrongAnswer.question_text || originalQuestion.question_text || `שאלה ${questionIndex + 1}`,
          correct_answer: wrongAnswer.correct_answer || originalQuestion.correct_answer,
          reading_text: originalQuestion.reading_text || exam.reading_text,
          question_number: questionIndex + 1,
          original_user_answer: wrongAnswer.user_answer,
          _metadata: {
            question_index: questionIndex,
            original_score: wrongAnswer.points_earned || 0,
            max_score: wrongAnswer.max_points || originalQuestion.points || 10
          }
        };
      });

      console.log(`📝 Found ${mistakeQuestions.length} mistakes from exam "${exam.title}"`);
      setQuestions(mistakeQuestions);
    } catch (error) {
      console.error("Error loading mistakes:", error);
      navigate(createPageUrl("Exams"));
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnswer = async () => {
    if (!userAnswer.trim() || isChecking) return;

    setIsChecking(true);
    const question = questions[currentIndex];

    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strict exam checker.

Question: ${question.question_text}
Correct Answer: ${question.correct_answer || "Check based on question"}
Answer Given: ${userAnswer}

Evaluate if the answer is correct. Be strict but fair.
IMPORTANT: In your Hebrew feedback, do NOT refer to "the student" or any person. Focus only on the answer itself.

Return JSON:`,
        response_json_schema: {
          type: "object",
          properties: {
            is_correct: { type: "boolean" },
            score: { type: "number" },
            feedback_hebrew: { type: "string" }
          }
        }
      });

      setIsCorrect(aiResponse.is_correct);
      setFeedback(aiResponse.feedback_hebrew);
      setShowResult(true);

      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: {
          correct: aiResponse.is_correct,
          score: aiResponse.score,
          userAnswer
        }
      }));
    } catch (error) {
      console.error("Error checking answer:", error);
      setFeedback("שגיאה בבדיקת התשובה");
      setShowResult(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
      setFeedback("");
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = () => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: { correct: false, score: 0, userAnswer: "" }
    }));
    handleNext();
  };

  // מסך טעינה
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center">

          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">טוען את הטעויות שלך...</h3>
          <p className="text-gray-600 font-semibold">מכין תרגול ממוקד</p>
        </motion.div>
      </div>);

  }

  // אין שאלות
  if (!user || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md">

          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">אין טעויות במבחן זה!</h3>
          <p className="text-gray-600 mb-6">
            כל הכבוד! לא נמצאו טעויות במבחן הזה.
          </p>
          <Button
            onClick={() => navigate(createPageUrl("Exams"))}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">

            חזרה לבגרויות
          </Button>
        </motion.div>
      </div>);

  }

  // מסך סיכום
  if (showSummary) {
    const correctCount = Object.values(answers).filter((a) => a.correct).length;
    const totalAnswered = Object.keys(answers).length;
    const avgScore = totalAnswered > 0 ?
    Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0) / totalAnswered :
    0;
    const improvement = correctCount > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">

          <div className="text-center mb-6">
            <div className={`w-24 h-24 ${improvement ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-orange-400 to-red-500'} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {improvement ? 'כל הכבוד!' : 'סיימת!'}
            </h2>
            <p className="text-gray-600">
              תרגול טעויות מ{examInfo?.title || 'המבחן'}
            </p>
          </div>

          <div className={`${improvement ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-orange-50 to-red-50 border-blue-500'} rounded-2xl p-6 mb-6 border-2`}>
            <div className="text-center">
              <div className={`text-6xl font-black ${improvement ? 'text-green-600' : 'text-orange-600'} mb-2`}>
                {correctCount} / {totalAnswered}
              </div>
              <div className="text-sm text-gray-600 mb-4">תשובות נכונות הפעם</div>
              
              {improvement &&
              <div className="bg-white rounded-xl p-3 border border-green-200">
                  <div className="text-sm text-green-700 font-bold">
                    🎉 שיפרת {correctCount} תשובות מהמבחן המקורי!
                  </div>
                </div>
              }
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg font-bold shadow-lg">

              <Zap className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2">

              חזרה לבגרויות
            </Button>
          </div>
        </motion.div>
      </div>);

  }

  const question = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex flex-col">
      <div className="bg-blue-500 p-4 from-blue-500 to-blue-600 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Exams"))}
            className="text-white hover:bg-white/20">

            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold">תרגול טעויות</h1>
              <Target className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">
              {examInfo?.title} • שאלה {currentIndex + 1} / {questions.length}
            </p>
          </div>

          <div className="w-10" />
        </div>

        <Progress value={progress} className="h-2 bg-white/20" />
      </div>

      <div className="bg-gray-100 p-4 flex-1 flex items-center justify-center">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">

          <div className="bg-[#ffffff] p-6 rounded-t-3xl from-orange-50 to-red-50 border-b-2 border-blue-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500 rounded-xl w-12 h-12 from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[#000000] text-sm font-medium">
                  שאלה {question.question_number} - טעית בה במבחן
                </div>
                <div className="text-[#000000] text-xs font-bold">
                  הזדמנות לתקן!
                </div>
              </div>
            </div>

            {/* הצגת התשובה המקורית השגויה */}
            {question.original_user_answer &&
            <div className="bg-red-50 rounded-xl p-3 mb-3 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <div className="text-xs font-bold text-red-800">התשובה שלך במבחן:</div>
                </div>
                <p className="text-sm text-red-700">{question.original_user_answer}</p>
              </div>
            }

            {question.reading_text &&
            <div className="bg-white rounded-xl p-4 mb-4 border-2 border-blue-500">
                <div className="text-[#000000] mb-2 text-xs font-bold">📖 טקסט הקריאה:</div>
                <div className="text-sm text-gray-800 leading-relaxed max-h-48 overflow-y-auto">
                  {question.reading_text}
                </div>
              </div>
            }

            <div className="bg-white rounded-xl p-4">
              <p className="text-[#000000] text-base leading-relaxed whitespace-pre-wrap">
                {question.question_text}
              </p>
            </div>
          </div>

          <div className="bg-[#ffffff] p-6">
            {!showResult ?
            <div className="space-y-4">
                <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="נסה שוב - הקלד את תשובתך..."
                className="w-full h-32 p-4 text-base border-2 border-blue-500 focus:border-blue-500 rounded-2xl resize-none"
                autoFocus
                disabled={isChecking} />


                <div className="flex gap-3">
                  <Button
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim() || isChecking}
                  className="flex-1 h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg font-bold shadow-lg disabled:opacity-50">

                    {isChecking ? 'בודק...' : 'בדוק'}
                    <CheckCircle className="w-5 h-5 mr-2" />
                  </Button>
                  <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="px-6 h-14 text-lg font-semibold border-2">

                    דלג
                  </Button>
                </div>
              </div> :

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4">

                <div className={`rounded-2xl p-6 border-2 ${
              isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`
              }>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect ?
                  <CheckCircle className="w-10 h-10 text-green-600" /> :

                  <XCircle className="w-10 h-10 text-red-600" />
                  }
                    <div className="flex-1">
                      <div className={`text-xl font-bold ${
                    isCorrect ? 'text-green-800' : 'text-red-800'}`
                    }>
                        {isCorrect ? '🎉 מצוין! תיקנת את הטעות!' : 'עדיין לא נכון'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4">
                    <div className="text-sm text-gray-700 leading-relaxed">{feedback}</div>
                  </div>
                </div>

                <Button
                onClick={handleNext}
                className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xl font-bold shadow-lg">

                  {currentIndex < questions.length - 1 ? 'השאלה הבאה' : 'סיים'}
                  <ChevronLeft className="w-6 h-6 mr-2" />
                </Button>
              </motion.div>
            }
          </div>
        </motion.div>
      </div>
    </div>);

}