import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, ChevronLeft, Check, X, Loader2, Trophy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

export default function CustomPracticeSessionPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("sessionId");

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Try to get questions from sessionStorage first
      const storedQuestions = sessionStorage.getItem('customPracticeQuestions');
      
      if (storedQuestions) {
        const parsedQuestions = JSON.parse(storedQuestions);
        if (parsedQuestions.length > 0) {
          setQuestions(parsedQuestions);
          sessionStorage.removeItem('customPracticeQuestions');
          setIsLoading(false);
          return;
        }
      }

      // If no stored questions, try to load from session
      if (sessionId) {
        const sessions = await base44.entities.PracticeSessionNew.filter({ id: sessionId });
        if (sessions.length > 0 && sessions[0].questions?.length > 0) {
          const questionIds = sessions[0].questions;
          const allQuestions = await base44.entities.QuestionBank.list();
          const sessionQuestions = allQuestions.filter(q => questionIds.includes(q.question_id));
          
          if (sessionQuestions.length > 0) {
            setQuestions(sessionQuestions);
            setIsLoading(false);
            return;
          }
        }
      }

      setLoadError("לא נמצאו שאלות לתרגול. חזור ובנה תרגול חדש.");
    } catch (error) {
      console.error("Error loading questions:", error);
      setLoadError("שגיאה בטעינת השאלות");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = answers[currentQuestion.question_id] || "";

    try {
      let isCorrect = false;
      let correctAnswer = currentQuestion.correct_answer || "";

      // Check multiple choice
      if ((currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0) {
        const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
        const normalizedCorrect = correctAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
        
        isCorrect = normalizedUserAnswer === normalizedCorrect;
        
        if (!isCorrect) {
          const noSpaceUser = normalizedUserAnswer.replace(/\s/g, '');
          const noSpaceCorrect = normalizedCorrect.replace(/\s/g, '');
          isCorrect = noSpaceUser === noSpaceCorrect;
        }
      } else {
        // For open questions, use simple comparison or AI
        const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s/g, '');
        const normalizedCorrect = correctAnswer.trim().toLowerCase().replace(/\s/g, '');
        
        isCorrect = normalizedUserAnswer === normalizedCorrect;
        
        if (!isCorrect && userAnswer.length > 3) {
          try {
            const aiCheck = await base44.integrations.Core.InvokeLLM({
              prompt: `בדוק אם תשובת התלמיד נכונה. היה סלחני עם מילים נרדפות.
שאלה: ${currentQuestion.question_text}
תשובה נכונה: ${correctAnswer}
תשובת התלמיד: ${userAnswer}
החזר JSON עם is_correct בלבד`,
              response_json_schema: {
                type: "object",
                properties: {
                  is_correct: { type: "boolean" }
                }
              }
            });
            isCorrect = aiCheck.is_correct;
          } catch (error) {
            console.error("AI check error:", error);
          }
        }
      }

      // Save attempt
      await base44.entities.AttemptNew.create({
        question_id: currentQuestion.question_id,
        subject_id: currentQuestion.subject_id,
        topic_id: currentQuestion.topic_id,
        session_id: sessionId,
        user_answer_text: userAnswer,
        score: isCorrect ? (currentQuestion.max_score || 100) : 0,
        max_score: currentQuestion.max_score || 100,
        percentage: isCorrect ? 100 : 0,
        status: isCorrect ? "correct" : "incorrect",
        time_spent_seconds: 0
      });

      setResults(prev => ({
        ...prev,
        [currentQuestion.question_id]: { 
          isCorrect, 
          correctAnswer, 
          userAnswer 
        }
      }));

      setIsSubmitting(false);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setShowSummary(true);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setIsSubmitting(false);
    }
  };

  const finishPractice = async () => {
    if (sessionId) {
      const correctCount = Object.values(results).filter(r => r.isCorrect).length;
      const totalQuestions = Object.keys(results).length;
      const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

      await base44.entities.PracticeSessionNew.update(sessionId, {
        completed_at: new Date().toISOString(),
        is_completed: true,
        total_score: correctCount,
        max_score: totalQuestions,
        percentage: percentage
      });
    }
    navigate(createPageUrl("Practice"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="animate-spin h-16 w-16 text-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-700 mb-6">{loadError}</p>
          <Button
            onClick={() => navigate(createPageUrl("CustomPracticeBuilder"))}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            בנה תרגול חדש
          </Button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const correctCount = Object.values(results).filter(r => r.isCorrect).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת את התרגול!</h2>
            <p className="text-gray-600">הנה התוצאות שלך</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600">
                {correctCount} / {questions.length}
              </div>
              <div className="text-sm text-gray-600 mt-2">תשובות נכונות</div>
              <div className="text-3xl font-bold text-gray-900 mt-3">{percentage}%</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
            {questions.map((q, idx) => {
              const result = results[q.question_id];
              return (
                <div
                  key={idx}
                  className={`rounded-xl p-4 border-2 ${
                    result?.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result?.isCorrect ? (
                      <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-1">שאלה {idx + 1}</div>
                      <div className="text-sm text-gray-700 mb-2">{q.question_text}</div>
                      
                      <div className="bg-white rounded-lg p-3 border mb-2">
                        <div className="text-xs text-gray-600 mb-1">התשובה שלך:</div>
                        <div className={`text-sm font-semibold ${result?.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {result?.userAnswer || "לא נענה"}
                        </div>
                      </div>

                      {!result?.isCorrect && result?.correctAnswer && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="text-xs text-gray-600 mb-1">התשובה הנכונה:</div>
                          <div className="text-sm font-semibold text-green-700">{result?.correctAnswer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={finishPractice} className="w-full bg-blue-600 hover:bg-blue-700 h-12">
            סיים וחזור לתרגול
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const hasAnswered = !!answers[currentQuestion.question_id];

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="bg-[#3B82F6] p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20 h-10 w-10"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">תרגול מותאם אישית</h1>
            <p className="text-sm opacity-90">שאלה {currentQuestionIndex + 1} מתוך {questions.length}</p>
          </div>

          <div className="w-10" />
        </div>

        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-white"
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div
          key={currentQuestion.question_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto"
        >
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-500 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-white text-lg">{currentQuestionIndex + 1}</span>
              </div>
              <p
                className="flex-1 text-lg text-gray-900 leading-relaxed"
                dir={currentQuestion.question_text.match(/[א-ת]/) ? "rtl" : "ltr"}
              >
                {currentQuestion.question_text}
              </p>
            </div>

            {currentQuestion.question_image_url && (
              <img
                src={currentQuestion.question_image_url}
                alt="Question"
                className="mt-4 rounded-xl max-w-full shadow-md"
              />
            )}
          </div>

          {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const optionText = typeof option === 'object' ? (option.text || option.value || JSON.stringify(option)) : String(option || '');
                const isSelected = answers[currentQuestion.question_id] === optionText;

                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: optionText }))}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    dir="ltr"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400'
                      }`}>
                        {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                      </div>
                      <span className="text-base font-medium text-gray-900 flex-1 text-left">{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Textarea
              value={answers[currentQuestion.question_id] || ""}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: e.target.value }))}
              placeholder="הקלד את תשובתך כאן..."
              className="w-full h-32 text-base resize-none border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              dir="ltr"
            />
          )}
        </motion.div>
      </div>

      <div className="bg-white border-t-2 border-gray-200 p-4 flex-shrink-0">
        <Button
          onClick={handleSubmitAnswer}
          disabled={!hasAnswered || isSubmitting}
          className="w-full h-14 bg-[#3B82F6] hover:bg-blue-700 text-white text-lg font-bold rounded-xl disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <>
              {currentQuestionIndex < questions.length - 1 ? 'שאלה הבאה' : 'סיים וראה תוצאות'}
              <ChevronLeft className="w-5 h-5 mr-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}