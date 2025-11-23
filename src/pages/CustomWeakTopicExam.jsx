import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, TrendingDown, CheckCircle, XCircle, ChevronLeft, Trophy, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function CustomWeakTopicExamPage() {
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

  useEffect(() => {
    loadUserAndQuestions();
  }, []);

  const loadUserAndQuestions = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get all practice attempts to identify weak topics
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const userAttempts = attempts.filter(a => 
        a.created_by === currentUser.email &&
        a.subject_id === currentUser.selected_subject &&
        parseInt(a.unit_level) === parseInt(currentUser.selected_units)
      );

      // Calculate topic accuracy
      const topicStats = {};
      userAttempts.forEach(attempt => {
        const topic = attempt.topic_id || 'unknown';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total++;
        if (attempt.status === "correct" || attempt.percentage >= 70) {
          topicStats[topic].correct++;
        }
      });

      // Find weak topics (accuracy < 70% with at least 3 attempts)
      const weakTopicIds = Object.entries(topicStats)
        .filter(([topic, stats]) => stats.total >= 3 && ((stats.correct / stats.total * 100) < 70))
        .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
        .slice(0, 5)
        .map(([topic]) => topic);

      console.log('Found weak topics:', weakTopicIds);

      // Fetch questions from weak topics
      const allQuestions = await base44.entities.QuestionBank.list();
      const weakQuestions = allQuestions.filter(q => 
        weakTopicIds.includes(q.topic_id) &&
        q.subject_id === currentUser.selected_subject &&
        parseInt(q.unit_level) === parseInt(currentUser.selected_units) &&
        q.is_active &&
        !q.topic_id?.includes('listening') &&
        !q.topic_id?.includes('extended_reading')
      ).map(q => {
        const topicStat = topicStats[q.topic_id];
        return {
          ...q,
          _metadata: {
            topic_accuracy: topicStat ? Math.round((topicStat.correct / topicStat.total) * 100) : 0,
            topic_attempts: topicStat?.total || 0
          }
        };
      });

      // Shuffle and limit
      const shuffled = weakQuestions.sort(() => Math.random() - 0.5).slice(0, 20);

      console.log('Loaded weak topic questions:', shuffled.length);
      setQuestions(shuffled);
    } catch (error) {
      console.error("Error loading questions:", error);
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
Student Answer: ${userAnswer}

Evaluate if the student's answer is correct. Be strict but fair.

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
      
      setAnswers(prev => ({
        ...prev,
        [question.question_id]: {
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
      setCurrentIndex(prev => prev + 1);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
      setFeedback("");
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = () => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentIndex].question_id]: { correct: false, score: 0, userAnswer: "" }
    }));
    handleNext();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">בונה מבחן מותאם אישית...</h3>
          <p className="text-gray-600 font-semibold">מנתח נושאים חלשים ובוחר שאלות</p>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <TrendingDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">אין נושאים חלשים</h3>
          <p className="text-gray-600 mb-6">נראה שאתה חזק בכל הנושאים! 🌟</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))} className="w-full">
            חזרה לבגרויות
          </Button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const correctCount = Object.values(answers).filter(a => a.correct).length;
    const totalAnswered = Object.keys(answers).length;
    const avgScore = totalAnswered > 0 
      ? Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0) / totalAnswered 
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">מבחן נושאים חלשים</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
            <div className="text-center">
              <div className="text-6xl font-black text-blue-600 mb-2">
                {correctCount} / {totalAnswered}
              </div>
              <div className="text-sm text-gray-600 mb-4">תשובות נכונות</div>
              <div className="text-4xl font-bold text-gray-900">
                {Math.round(avgScore)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">ציון ממוצע</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-bold shadow-lg"
            >
              <TrendingDown className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
            >
              חזרה לבגרויות
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Exams"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold">מבחן נושאים חלשים</h1>
              <Crown className="w-5 h-5 text-yellow-300" />
            </div>
            <p className="text-sm opacity-90">שאלה {currentIndex + 1} / {questions.length}</p>
          </div>

          <div className="w-10" />
        </div>

        <Progress value={progress} className="h-2 bg-white/20" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
        >
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-t-3xl border-b-2 border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 font-medium">נושא שאתה חלש בו</div>
                {question._metadata && (
                  <div className="text-xs text-blue-600">📊 דיוק בנושא: {question._metadata.topic_accuracy}%</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4">
              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {question.question_text}
              </p>
            </div>
          </div>

          <div className="p-6 pt-0">
            {!showResult ? (
              <div className="space-y-4">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="הקלד את תשובתך..."
                  className="w-full h-32 p-4 text-base border-2 border-blue-200 focus:border-blue-500 rounded-2xl resize-none"
                  autoFocus
                  disabled={isChecking}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim() || isChecking}
                    className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-bold shadow-lg disabled:opacity-50"
                  >
                    {isChecking ? 'בודק...' : 'בדוק'}
                    <CheckCircle className="w-5 h-5 mr-2" />
                  </Button>
                  <Button
                    onClick={handleSkip}
                    variant="outline"
                    className="px-6 h-14 text-lg font-semibold border-2"
                  >
                    דלג
                  </Button>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={`rounded-2xl p-6 border-2 ${
                  isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect ? (
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-600" />
                    )}
                    <div className="flex-1">
                      <div className={`text-xl font-bold ${
                        isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {isCorrect ? 'מצוין! תשובה נכונה' : 'לא נכון'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4">
                    <div className="text-sm text-gray-700 leading-relaxed">{feedback}</div>
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xl font-bold shadow-lg"
                >
                  {currentIndex < questions.length - 1 ? 'השאלה הבאה' : 'סיים'}
                  <ChevronLeft className="w-6 h-6 mr-2" />
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}