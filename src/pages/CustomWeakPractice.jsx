import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen, Target, CheckCircle, XCircle, ChevronLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomWeakPracticePage() {
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
  const [sourceSession, setSourceSession] = useState(null);

  useEffect(() => {
    loadUserAndQuestions();
  }, []);

  const loadUserAndQuestions = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if there's a specific topic to filter by
      const specificTopicId = sessionStorage.getItem('weakPracticeTopic');
      if (specificTopicId) {
        sessionStorage.removeItem('weakPracticeTopic');
      }

      // Check if there's a specific session ID to filter by
      const specificSessionId = sessionStorage.getItem('weakPracticeSource');
      if (specificSessionId) {
        sessionStorage.removeItem('weakPracticeSource');
        
        const allSessions = await base44.entities.PracticeSessionNew.list();
        const sourceSessionData = allSessions.find(s => s.id === specificSessionId);
        if (sourceSessionData) {
          setSourceSession(sourceSessionData);
        }
      }

      // Get all WRONG practice attempts
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      console.log('📊 Total attempts found:', attempts.length);
      console.log('📊 User email:', currentUser.email);
      console.log('📊 Selected subject:', currentUser.selected_subject);
      console.log('📊 Selected units:', currentUser.selected_units);
      
      // More flexible filtering - don't require exact subject/unit match for finding mistakes
      let wrongAttempts = attempts.filter(a => 
        a.created_by === currentUser.email && 
        (a.status === "incorrect" || a.status === "unanswered" || (a.percentage !== undefined && a.percentage < 50)) &&
        (!specificSessionId || a.session_id === specificSessionId)
      );
      
      console.log('❌ All wrong attempts before subject filter:', wrongAttempts.length);

      if (specificTopicId) {
        wrongAttempts = wrongAttempts.filter(a => a.topic_id === specificTopicId);
      }
      
      // If we have selected subject, filter by it, but keep all if no subject set
      if (currentUser.selected_subject) {
        wrongAttempts = wrongAttempts.filter(a => 
          a.subject_id === currentUser.selected_subject &&
          parseInt(a.unit_level || 0) === parseInt(currentUser.selected_units || 3)
        );
      }
      
      console.log('❌ Wrong practice attempts after filters:', wrongAttempts.length);

      // ALSO get wrong answers from EXAMS
      const examAttempts = await base44.entities.ExamAttempt.list("-created_date", 100);
      const userExamAttempts = examAttempts.filter(e => 
        e.created_by === currentUser.email && 
        e.is_completed
      );
      
      // Extract wrong questions from exam answers
      const examWrongQuestions = [];
      userExamAttempts.forEach(exam => {
        if (exam.answers && Array.isArray(exam.answers)) {
          exam.answers.forEach((ans, idx) => {
            if (ans.is_correct === false || ans.score < 50) {
              examWrongQuestions.push({
                question_number: idx + 1,
                question_text: ans.question_text || `שאלה ${idx + 1}`,
                correct_answer: ans.correct_answer || '',
                user_answer: ans.user_answer || '',
                exam_id: exam.id,
                exam_title: exam.exam_title || 'מבחן',
                source: 'exam'
              });
            }
          });
        }
      });
      
      console.log('❌ Wrong exam questions:', examWrongQuestions.length);

      // Collect unique question IDs from practice
      const wrongQuestionIds = [...new Set(wrongAttempts.map(a => a.question_id).filter(Boolean))];
      console.log('📝 Wrong question IDs:', wrongQuestionIds);
      
      // Fetch the actual questions from QuestionBank
      const allQuestions = await base44.entities.QuestionBank.list();
      console.log('📚 Total questions in bank:', allQuestions.length);
      
      // More flexible filtering - just find questions that were wrong, filter active and non-listening
      const weakQuestionsFromBank = allQuestions.filter(q => 
        wrongQuestionIds.includes(q.question_id) &&
        q.is_active !== false &&
        !q.topic_id?.toLowerCase().includes('listening') &&
        !q.topic_id?.toLowerCase().includes('extended_reading')
      ).map(q => ({
        ...q,
        _metadata: {
          failures: wrongAttempts.filter(a => a.question_id === q.question_id).length,
          lastScore: wrongAttempts.find(a => a.question_id === q.question_id)?.percentage || 0,
          source: 'practice'
        }
      }));
      
      console.log('✅ Weak questions from bank:', weakQuestionsFromBank.length);

      // Convert exam wrong questions to same format
      const weakQuestionsFromExams = examWrongQuestions.map((q, idx) => ({
        question_id: `exam_${q.exam_id}_${q.question_number}`,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        _metadata: {
          failures: 1,
          lastScore: 0,
          source: 'exam',
          exam_title: q.exam_title
        }
      }));

      // Combine both sources
      const allWeakQuestions = [...weakQuestionsFromBank, ...weakQuestionsFromExams];

      // Sort by most failures
      const sortedQuestions = allWeakQuestions.sort((a, b) => 
        (b._metadata?.failures || 0) - (a._metadata?.failures || 0)
      ).slice(0, 20);

      console.log('Loaded weak questions:', sortedQuestions.length);
      setQuestions(sortedQuestions);
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
        prompt: `You are a strict teacher checking answers.

Question: ${question.question_text}
Correct Answer: ${question.correct_answer || question.options?.[0] || "Check based on question"}
Student Answer: ${userAnswer}

Evaluate if the student's answer is correct. Be fair but strict.

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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">מכין את התרגול שלך...</h3>
          <p className="text-gray-600 font-semibold">
            {sourceSession ? `מנתח טעויות מתרגול ב${sourceSession.topic_id || 'נושא'}` : 'מחפש שאלות שטעית בהן בתרגולים'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">אין שאלות זמינות</h3>
          <p className="text-gray-600 mb-6">נראה שלא טעית בשאלות עדיין, או שאתה מעולה! 🌟</p>
          <Button onClick={() => navigate(createPageUrl("Practice"))} className="w-full">
            חזרה לתרגול
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">תרגול טעויות</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 mb-6 border-2 border-red-200">
            <div className="text-center">
              <div className="text-6xl font-black text-red-600 mb-2">
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
              className="w-full h-14 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-lg font-bold shadow-lg"
            >
              <BookOpen className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
            >
              חזרה לתרגול
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 flex flex-col">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">
              {sourceSession ? `תרגול טעויות: ${sourceSession.topic_id || 'נושא'}` : 'תרגול טעויות'}
            </h1>
            <p className="text-sm opacity-90">
              שאלה {currentIndex + 1} / {questions.length}
              {sourceSession && ` • ציון מקורי: ${Math.round(sourceSession.percentage || 0)}%`}
            </p>
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
          <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-t-3xl border-b-2 border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 font-medium">
                  {question._metadata?.source === 'exam' 
                    ? `שאלה מבחינה: ${question._metadata.exam_title}` 
                    : sourceSession ? 'שאלה מהתרגול המקורי' : 'שאלה שטעית בה'}
                </div>
                {question._metadata && (
                  <div className="text-xs text-red-600">
                    {question._metadata.source === 'exam' ? '📝 טעות מבחינה' : `⚡ טעית ${question._metadata.failures} פעמים`}
                  </div>
                )}
              </div>
            </div>

            {sourceSession && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 mb-3 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-lg">📚</div>
                  <div className="text-xs font-bold text-blue-900">תרגול מקורי: {sourceSession.topic_id || 'נושא'}</div>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-lg">
                    ציון מקורי: {Math.round(sourceSession.percentage || 0)}%
                  </span>
                  <span className="bg-white text-gray-700 px-2 py-1 rounded-lg">
                    {new Date(sourceSession.created_date).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold">
                    {questions.length} טעויות בתרגול זה
                  </span>
                </div>
              </div>
            )}

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
                  className="w-full h-32 p-4 text-base border-2 border-red-200 focus:border-red-500 rounded-2xl resize-none"
                  autoFocus
                  disabled={isChecking}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim() || isChecking}
                    className="flex-1 h-14 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-lg font-bold shadow-lg disabled:opacity-50"
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