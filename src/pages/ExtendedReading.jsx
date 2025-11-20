import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Check, X, ChevronRight, Trophy, AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import AdManager from "../components/ads/AdManager";

const QUESTIONS_PER_SET = 10;

export default function ExtendedReadingPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get("topicid");
  const setNumber = parseInt(urlParams.get("set") || "1");

  const [user, setUser] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [currentSetQuestions, setCurrentSetQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [topicName, setTopicName] = useState("");
  const [readingText, setReadingText] = useState("");
  const [showReadingText, setShowReadingText] = useState(true);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [showAdConfirmDialog, setShowAdConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!topicId) {
      setLoadError("חסר מזהה נושא");
      setIsLoading(false);
      return;
    }
    loadQuestions();
  }, [topicId, setNumber]);

  const loadQuestions = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const allQuestionsRaw = await base44.entities.QuestionBank.list();

      const questionsForTopic = allQuestionsRaw.filter(q => 
        q.topic_id === topicId && q.is_active !== false
      );

      if (questionsForTopic.length === 0) {
        setLoadError(`לא נמצאו שאלות פעילות עבור נושא זה`);
        setIsLoading(false);
        return;
      }

      const parts = topicId.split('_');
      const name = parts.length >= 3 ? parts.slice(2).join(' ') : topicId;
      setTopicName(name);

      // Ensure minimum questions per set by duplicating if needed
      let expandedQuestions = [...questionsForTopic];
      while (expandedQuestions.length < QUESTIONS_PER_SET && questionsForTopic.length > 0) {
        const needed = QUESTIONS_PER_SET - expandedQuestions.length;
        expandedQuestions = [...expandedQuestions, ...questionsForTopic.slice(0, Math.min(needed, questionsForTopic.length))];
      }

      // Now get all sets
      const totalSets = Math.ceil(expandedQuestions.length / QUESTIONS_PER_SET);
      let allSetsQuestions = [];
      
      for (let i = 0; i < totalSets; i++) {
        const start = i * QUESTIONS_PER_SET;
        const end = start + QUESTIONS_PER_SET;
        allSetsQuestions.push(...expandedQuestions.slice(start, end));
      }

      setAllQuestions(allSetsQuestions);

      const startIndex = (setNumber - 1) * QUESTIONS_PER_SET;
      const endIndex = startIndex + QUESTIONS_PER_SET;
      const setQuestions = allSetsQuestions.slice(startIndex, endIndex);
      
      if (setQuestions.length === 0) {
        setLoadError(`לא נמצאו שאלות לסט ${setNumber}`);
        setIsLoading(false);
        return;
      }

      setCurrentSetQuestions(setQuestions);

      // Get reading text
      if (setQuestions[0]?.reading_text) {
        setReadingText(setQuestions[0].reading_text);
        setShowReadingText(true);
      } else {
        setReadingText("");
        setShowReadingText(false);
      }

      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "topic_practice",
        subject_id: questionsForTopic[0].subject_id,
        unit_level: questionsForTopic[0].unit_level,
        topic_id: topicId,
        questions: setQuestions.map(q => q.question_id),
        started_at: new Date().toISOString(),
        is_completed: false
      });
      
      setSessionId(session.id);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading questions:", error);
      setLoadError("שגיאה בטעינת התרגול");
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const currentQuestion = currentSetQuestions[currentQuestionIndex];
    const userAnswer = String(answers[currentQuestion.question_id] || "");

    try {
      const solutions = await base44.entities.SolutionBank.filter({
        question_id: currentQuestion.question_id
      });

      let isCorrect = false;
      let status = "incorrect";
      let correctAnswer = "";

      if (solutions.length > 0) {
        const solution = solutions[0];
        const correctAnswers = solution.final_answers || [];
        const acceptableVariants = solution.acceptable_variants || [];

        if (correctAnswers.length > 0) {
          correctAnswer = correctAnswers[0].value || "";
        }

        const normalizedUserAnswer = userAnswer.trim().toLowerCase();
        
        isCorrect = correctAnswers.some(ans => 
          ans.value?.toLowerCase() === normalizedUserAnswer
        ) || acceptableVariants.some(variant => 
          variant.toLowerCase() === normalizedUserAnswer
        );

        status = isCorrect ? "correct" : "incorrect";
      }

      await base44.entities.AttemptNew.create({
        question_id: currentQuestion.question_id,
        subject_id: currentQuestion.subject_id,
        topic_id: topicId,
        session_id: sessionId,
        user_answer_text: userAnswer,
        score: isCorrect ? currentQuestion.max_score : 0,
        max_score: currentQuestion.max_score,
        percentage: isCorrect ? 100 : 0,
        status: status,
        time_spent_seconds: 0
      });

      setResults(prev => ({
        ...prev,
        [currentQuestion.question_id]: { isCorrect, status, correctAnswer, userAnswer }
      }));

      // Move to next question or summary
      if (currentQuestionIndex < currentSetQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setShowSummary(true);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert(`שגיאה בבדיקת התשובה: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToNextSet = () => {
    const nextSet = setNumber + 1;
    const nextSetStartIndex = (nextSet - 1) * QUESTIONS_PER_SET;
    
    if (nextSetStartIndex >= allQuestions.length) {
      finishPractice();
      return;
    }

    const isPremium = user?.is_premium;
    
    if (isPremium) {
      // Premium users go directly to next set
      setShowSummary(false);
      setAnswers({});
      setResults({});
      setCurrentQuestionIndex(0);
      setShowReadingText(true);
      navigate(createPageUrl(`ExtendedReading?topicid=${encodeURIComponent(topicId)}&set=${nextSet}`));
    } else {
      // Free users see ad confirmation
      setShowAdConfirmDialog(true);
    }
  };

  const handleConfirmWatchAd = () => {
    setShowAdConfirmDialog(false);
    setShowAdDialog(true);
  };

  const handleAdComplete = () => {
    setShowAdDialog(false);
    const nextSet = setNumber + 1;
    setAnswers({});
    setResults({});
    setCurrentQuestionIndex(0);
    setShowReadingText(true);
    navigate(createPageUrl(`ExtendedReading?topicid=${encodeURIComponent(topicId)}&set=${nextSet}`));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">טוען שאלות...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-700 mb-6">{loadError}</p>
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            חזור לתרגול
          </Button>
        </div>
      </div>
    );
  }

  if (currentSetQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין שאלות</h2>
          <p className="text-gray-600 mb-6">לא נמצאו שאלות עבור נושא זה</p>
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            חזור לתרגול
          </Button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת את הסט!</h2>
              <p className="text-gray-600">הנה התוצאות שלך</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-blue-600">
                  {Object.values(results).filter(r => r.isCorrect).length} / {currentSetQuestions.length}
                </div>
                <div className="text-sm text-gray-600 mt-2">תשובות נכונות</div>
                <div className="text-3xl font-bold text-gray-900 mt-3">
                  {Math.round((Object.values(results).filter(r => r.isCorrect).length / currentSetQuestions.length) * 100)}%
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
              {currentSetQuestions.map((q, idx) => {
                const result = results[q.question_id];
                return (
                  <div key={idx} className={`rounded-xl p-4 border-2 ${
                    result?.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      {result?.isCorrect ? (
                        <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">שאלה {idx + 1}</div>
                        <div className="text-sm text-gray-700 mb-2" dir="ltr">{q.question_text.substring(0, 80)}...</div>

                        {!result?.isCorrect && (
                          <div className="space-y-2 mt-3">
                            <div className="bg-white rounded-lg p-3 border border-red-200">
                              <div className="text-xs text-gray-600 mb-1">התשובה שלך:</div>
                              <div className="text-sm font-semibold text-red-700">{result?.userAnswer || "לא נענה"}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="text-xs text-gray-600 mb-1">התשובה הנכונה:</div>
                              <div className="text-sm font-semibold text-green-700">{result?.correctAnswer}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={finishPractice} className="w-full bg-blue-600 hover:bg-blue-700">
                חזור לתרגול
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentSetQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / currentSetQuestions.length) * 100;
  const hasAnswered = !!answers[currentQuestion.question_id];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-blue-600 p-3 sm:p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3 sm:mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-base sm:text-xl font-bold">{topicName}</h1>
            <p className="text-xs sm:text-sm opacity-90">שאלה {currentQuestionIndex + 1} מתוך {currentSetQuestions.length}</p>
          </div>

          {readingText && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowStoryDialog(true)}
              className="text-white hover:bg-white/20"
            >
              <BookOpen className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="bg-white/20 rounded-full h-1.5 sm:h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-white"
          />
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-3">
        {/* Story Dialog */}
        <Dialog open={showStoryDialog} onOpenChange={setShowStoryDialog}>
          <DialogContent dir="ltr" className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold" dir="rtl">📖 Reading Text</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] p-4">
              <div 
                className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap"
                style={{ 
                  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
                }}
              >
                {readingText}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowStoryDialog(false)} className="w-full bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Top Half - Reading Text */}
        {readingText && (
          <div className="h-[45%] border-b-4 border-blue-300 bg-white rounded-t-xl sm:rounded-t-2xl overflow-hidden flex flex-col shadow-lg mb-2">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 flex items-center justify-center gap-2 flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-sm">Reading Text</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div 
                className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap text-left"
                style={{ 
                  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                  direction: 'ltr'
                }}
              >
                {readingText}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Half - Question */}
        <motion.div
          key={currentQuestion.question_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-3 sm:pb-4 pt-6 sm:pt-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-600">{currentQuestionIndex + 1}</span>
              </div>
              <div className="flex-1">
                <p
                  className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap text-left"
                  dir="ltr"
                  style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  {currentQuestion.question_text}
                </p>
                
                {currentQuestion.question_image_url && (
                  <img
                    src={currentQuestion.question_image_url}
                    alt="Question"
                    className="mt-4 rounded-lg max-w-full"
                  />
                )}
              </div>
            </div>

            {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: option }))}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      answers[currentQuestion.question_id] === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    } cursor-pointer`}
                    dir="ltr"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        answers[currentQuestion.question_id] === option
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion.question_id] === option && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Answer input area - fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-3 sm:p-4 z-20">
            <div className="max-w-md mx-auto space-y-2 sm:space-y-3">
              {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 ? (
                <div className="text-center text-sm text-gray-600">
                  בחר תשובה למעלה ↑
                </div>
              ) : (
                <Textarea
                  value={answers[currentQuestion.question_id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: e.target.value }))}
                  placeholder="הקלד את תשובתך כאן..."
                  className="w-full h-28 text-base resize-none"
                  dir="ltr"
                />
              )}

              <Button
                onClick={handleSubmitAnswer}
                disabled={!hasAnswered || isSubmitting}
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    בודק...
                  </>
                ) : (
                  <>
                    {currentQuestionIndex < currentSetQuestions.length - 1 ? 'שאלה הבאה' : 'סיים וראה תוצאות'}
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}