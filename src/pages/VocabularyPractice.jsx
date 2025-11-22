import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Check, X, ChevronLeft, Trophy, BookOpen, Sparkles, Volume2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

export default function VocabularyPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category");

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [similarityScore, setSimilarityScore] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [results, setResults] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const [cachedData] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        subject: localStorage.getItem('selected_subject') || 'אנגלית',
        units: localStorage.getItem('selected_units') || '4'
      };
    }
    return { subject: 'אנגלית', units: '4' };
  });

  const displaySubject = user?.selected_subject || cachedData.subject;
  const displayUnits = parseInt(user?.selected_units || cachedData.units);

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
    if (!category) return;
    loadQuestions();
  }, [category]);

  const loadQuestions = async () => {
    try {
      const allQuestions = await base44.entities.VocabularyQuestion.list();
      const filtered = allQuestions.filter(q => 
        q.category === category && 
        q.subject_id === displaySubject && 
        q.unit_level === displayUnits &&
        q.is_active
      );

      // Shuffle questions
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);

      // Create practice session
      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "topic_practice",
        subject_id: displaySubject,
        unit_level: displayUnits,
        topic_id: `vocabulary_${category}`,
        questions: shuffled.map(q => q.id),
        started_at: new Date().toISOString(),
        is_completed: false
      });
      setSessionId(session.id);
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const checkAnswer = async () => {
    if (!userAnswer.trim() || isChecking) return;
    
    setIsChecking(true);
    const question = questions[currentIndex];

    try {
      // Check exact match first
      const normalized = userAnswer.trim().toLowerCase();
      const exactMatch = normalized === question.english_answer.toLowerCase() ||
                        question.acceptable_answers?.some(a => a.toLowerCase() === normalized);

      if (exactMatch) {
        setIsCorrect(true);
        setSimilarityScore(100);
        setFeedback("מעולה! תשובה מדויקת 🎯");
        setShowResult(true);
        
        await base44.entities.AttemptNew.create({
          question_id: question.id,
          subject_id: question.subject_id,
          session_id: sessionId,
          user_answer_text: userAnswer,
          score: 100,
          max_score: 100,
          percentage: 100,
          status: "correct"
        });

        setResults(prev => [...prev, { correct: true, score: 100 }]);
        setIsChecking(false);
        return;
      }

      // Smart AI check
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `INSTRUCTIONS FOR CHECKING VOCABULARY ANSWERS:

1. Check semantic meaning, not exact spelling.
2. Compare student answer to the correct answer and accepted variations.
3. Allow synonyms and close meanings.
4. Minor spelling errors are OK if the word is recognizable.
5. Score on a scale:
   - similarity_score 100 = perfect match
   - similarity_score 80-95 = correct synonym
   - similarity_score 60-75 = close but not exact
   - similarity_score 0-50 = wrong
6. Provide feedback in Hebrew.

Hebrew Word: ${question.hebrew_word}
Correct Answer: ${question.english_answer}
Acceptable Answers: ${question.acceptable_answers?.join(', ') || 'none'}
Student Answer: ${userAnswer}

Focus on meaning - if the student wrote a valid synonym, accept it.

Return JSON:`,
        response_json_schema: {
          type: "object",
          properties: {
            is_correct: { type: "boolean" },
            similarity_score: { type: "number" },
            feedback_hebrew: { type: "string" },
            correct_answer_to_show: { type: "string" }
          },
          required: ["is_correct", "similarity_score", "feedback_hebrew"]
        }
      });

      const correct = aiResponse.similarity_score >= 70;
      setIsCorrect(correct);
      setSimilarityScore(aiResponse.similarity_score);
      setFeedback(aiResponse.feedback_hebrew);
      setShowResult(true);

      await base44.entities.AttemptNew.create({
        question_id: question.id,
        subject_id: question.subject_id,
        session_id: sessionId,
        user_answer_text: userAnswer,
        score: aiResponse.similarity_score,
        max_score: 100,
        percentage: aiResponse.similarity_score,
        status: correct ? "correct" : aiResponse.similarity_score >= 50 ? "partial" : "incorrect"
      });

      setResults(prev => [...prev, { correct, score: aiResponse.similarity_score }]);
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
      setSimilarityScore(0);
    } else {
      finishSession();
    }
  };

  const handleSkip = () => {
    setResults(prev => [...prev, { correct: false, score: 0 }]);
    handleNext();
  };

  const finishSession = async () => {
    if (sessionId) {
      const correctCount = results.filter(r => r.correct).length;
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

      await base44.entities.PracticeSessionNew.update(sessionId, {
        completed_at: new Date().toISOString(),
        is_completed: true,
        total_score: avgScore,
        max_score: 100,
        percentage: avgScore
      });
    }
    setShowSummary(true);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">אין שאלות</h3>
          <p className="text-gray-600 mb-6">לא נמצאו שאלות לקטגוריה זו</p>
          <Button onClick={() => navigate(createPageUrl("Vocabulary"))} className="w-full">
            חזרה לאוצר מילים
          </Button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const correctCount = results.filter(r => r.correct).length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">הנה התוצאות שלך</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border-2 border-purple-200">
            <div className="text-center">
              <div className="text-6xl font-black text-purple-600 mb-2">
                {correctCount} / {questions.length}
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
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold shadow-lg"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              תרגל שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Vocabulary"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
            >
              בחר קטגוריה אחרת
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Vocabulary"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">{category}</h1>
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
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-t-3xl border-b-2 border-purple-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600 font-medium">תרגם לאנגלית</div>
                <div className="text-xs text-gray-500">{question.difficulty === 'hard' ? '🔥 קשה' : question.difficulty === 'medium' ? '⭐ בינוני' : '✨ קל'}</div>
              </div>
            </div>

            <h2 className="text-4xl font-black text-center text-gray-900 mb-2">
              {question.hebrew_word}
            </h2>
          </div>

          <div className="p-6">
            {!showResult ? (
              <div className="space-y-4">
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                  placeholder="Type your answer..."
                  className="w-full h-16 text-xl text-center font-semibold border-2 border-purple-200 focus:border-purple-500 rounded-2xl"
                  dir="ltr"
                  autoFocus
                  disabled={isChecking}
                />

                <div className="flex gap-3">
                  <Button
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim() || isChecking}
                    className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold shadow-lg disabled:opacity-50"
                  >
                    {isChecking ? 'בודק...' : 'בדוק'}
                    <Check className="w-5 h-5 mr-2" />
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
                  isCorrect ? 'bg-green-50 border-green-300' : 
                  similarityScore >= 60 ? 'bg-yellow-50 border-yellow-300' :
                  'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect ? (
                      <Check className="w-10 h-10 text-green-600" />
                    ) : similarityScore >= 60 ? (
                      <Lightbulb className="w-10 h-10 text-yellow-600" />
                    ) : (
                      <X className="w-10 h-10 text-red-600" />
                    )}
                    <div className="flex-1">
                      <div className={`text-xl font-bold ${
                        isCorrect ? 'text-green-800' : 
                        similarityScore >= 60 ? 'text-yellow-800' :
                        'text-red-800'
                      }`}>
                        {isCorrect ? 'נכון מאוד!' : similarityScore >= 60 ? 'קרוב!' : 'לא נכון'}
                      </div>
                      <div className="text-sm text-gray-600">ציון: {Math.round(similarityScore)}/100</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 mb-3">
                    <div className="text-xs text-gray-600 mb-1">התשובה שלך:</div>
                    <div className="text-lg font-bold text-gray-900" dir="ltr">{userAnswer}</div>
                  </div>

                  {!isCorrect && (
                    <div className="bg-white rounded-xl p-4 mb-3">
                      <div className="text-xs text-gray-600 mb-1">התשובה הנכונה:</div>
                      <div className="text-lg font-bold text-green-700" dir="ltr">{question.english_answer}</div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl p-4">
                    <div className="text-sm text-gray-700 leading-relaxed">{feedback}</div>
                  </div>
                </div>

                {question.example_sentence && (
                  <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-bold text-blue-900">משפט לדוגמה:</span>
                    </div>
                    <p className="text-base text-gray-800" dir="ltr">{question.example_sentence}</p>
                  </div>
                )}

                <Button
                  onClick={handleNext}
                  className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xl font-bold shadow-lg"
                >
                  {currentIndex < questions.length - 1 ? 'המשך' : 'סיים'}
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