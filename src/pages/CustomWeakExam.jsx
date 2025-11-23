import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Zap, Brain, CheckCircle, XCircle, ChevronLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomWeakExamPage() {
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
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);

  useEffect(() => {
    loadUserAndQuestions();
  }, []);

  const loadUserAndQuestions = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get all practice attempts
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const userAttempts = attempts.filter(a => 
        a.created_by === currentUser.email && 
        a.subject_id === currentUser.selected_subject
      );

      // Build question stats with priority scoring
      const questionStats = {};
      userAttempts.forEach(attempt => {
        const qid = attempt.question_id;
        if (!qid) return;

        if (!questionStats[qid]) {
          questionStats[qid] = {
            question_id: qid,
            topic: attempt.topic_id,
            attempts: 0,
            successes: 0,
            lastAttempt: attempt.created_date,
            difficulty: 3 // default
          };
        }

        questionStats[qid].attempts++;
        if (attempt.status === "correct" || attempt.percentage >= 70) {
          questionStats[qid].successes++;
        }
      });

      // Calculate priority score for each question
      const now = new Date();
      const scoredQuestions = Object.values(questionStats).map(stat => {
        const failures = stat.attempts - stat.successes;
        const lastDate = new Date(stat.lastAttempt);
        const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        const recencyFactor = Math.min(2, 1 + (daysSince / 30)); // Max 2x after 30 days
        
        const score = failures * stat.difficulty * recencyFactor;
        
        return {
          ...stat,
          score,
          failures
        };
      })
      .filter(q => q.failures > 0) // Only questions with failures
      .sort((a, b) => b.score - a.score); // Highest priority first

      // Get top question IDs
      const topQuestionIds = scoredQuestions.slice(0, 30).map(q => q.question_id);
      
      // Load questions from bank
      const allQuestions = await base44.entities.QuestionBank.list();
      const weakQuestions = allQuestions.filter(q => 
        topQuestionIds.includes(q.question_id) && 
        q.is_active === true &&
        q.subject_id === currentUser.selected_subject
      );

      // Sort by priority score
      const sortedQuestions = weakQuestions.sort((a, b) => {
        const scoreA = scoredQuestions.find(s => s.question_id === a.question_id)?.score || 0;
        const scoreB = scoredQuestions.find(s => s.question_id === b.question_id)?.score || 0;
        return scoreB - scoreA;
      }).slice(0, 20);

      // Enrich with metadata
      const enrichedQuestions = sortedQuestions.map(q => {
        const stat = scoredQuestions.find(s => s.question_id === q.question_id);
        return {
          ...q,
          _metadata: {
            failures: stat?.failures || 0,
            attempts: stat?.attempts || 0,
            lastScore: stat ? Math.round((stat.successes / stat.attempts) * 100) : 0
          }
        };
      });

      setQuestions(enrichedQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
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
        [question.id]: {
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
      setAudioPlayed(false);
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = () => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentIndex].id]: { correct: false, score: 0, userAnswer: "" }
    }));
    handleNext();
  };

  const handleAudioPlay = () => {
    if (question.audio_url) {
      const audio = new Audio(question.audio_url);
      audio.play();
      audio.onended = () => {
        setAudioPlayed(true);
      };
      setCurrentAudio(audio);
    }
  };

  useEffect(() => {
    // Reset audio state when question changes
    setAudioPlayed(false);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
  }, [currentIndex]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">אין שאלות זמינות</h3>
          <p className="text-gray-600 mb-6">נראה שלא נכשלת בשאלות עדיין, או שאתה מעולה! 🌟</p>
          <Button onClick={() => navigate(createPageUrl("Statistics"))} className="w-full">
            חזרה לסטטיסטיקה
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">בגרות מותאמת אישית</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 mb-6 border-2 border-orange-200">
            <div className="text-center">
              <div className="text-6xl font-black text-orange-600 mb-2">
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
              className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-lg font-bold shadow-lg"
            >
              <Zap className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Statistics"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
            >
              חזרה לסטטיסטיקה
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const hasAudio = question.audio_url || question.topic_id?.includes('listening');
  const canAnswer = !hasAudio || audioPlayed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex flex-col">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Statistics"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">בגרות מותאמת אישית</h1>
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
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-t-3xl border-b-2 border-orange-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 font-medium">שאלה שטעית בה בעבר</div>
                <div className="text-xs text-orange-600">⚡ חזק את הידע שלך</div>
              </div>
            </div>

            {question._metadata && (
              <div className="bg-white rounded-xl p-3 mb-3">
                <div className="text-xs text-gray-600 font-semibold mb-2">📊 למה השאלה הזו:</div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold">
                    {question._metadata.failures} טעויות
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                    {question._metadata.attempts} ניסיונות
                  </span>
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">
                    ציון אחרון: {question._metadata.lastScore}%
                  </span>
                </div>
              </div>
            )}

            {question.reading_text && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 border-2 border-blue-200">
                <div className="text-xs font-bold text-blue-900 mb-2">📖 טקסט הקריאה:</div>
                <div className="text-sm text-gray-800 leading-relaxed max-h-48 overflow-y-auto">
                  {question.reading_text}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-4">
              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {question.question_text}
              </p>
            </div>

            {hasAudio && (
              <div className="mt-4 bg-white rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🎧</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">קטע האזנה</div>
                    <div className="text-xs text-gray-600">
                      {audioPlayed ? '✅ הושמע' : 'השמע את הקטע לפני המענה'}
                    </div>
                  </div>
                  <Button
                    onClick={handleAudioPlay}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={audioPlayed}
                  >
                    {audioPlayed ? 'הושמע' : 'השמע'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 pt-0">
            {!showResult ? (
              <div className="space-y-4">
                {!canAnswer && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 mb-4 text-center">
                    <div className="text-blue-800 font-bold mb-1">🎧 השמע את הקטע תחילה</div>
                    <div className="text-sm text-blue-600">לפני שתענה על השאלה, עליך להאזין לקטע</div>
                  </div>
                )}
                
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder={canAnswer ? "הקלד את תשובתך..." : "האזן לקטע תחילה..."}
                  className="w-full h-32 p-4 text-base border-2 border-orange-200 focus:border-orange-500 rounded-2xl resize-none"
                  autoFocus={canAnswer}
                  disabled={isChecking || !canAnswer}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim() || isChecking || !canAnswer}
                    className="flex-1 h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-lg font-bold shadow-lg disabled:opacity-50"
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