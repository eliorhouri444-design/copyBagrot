import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, RotateCcw, Check, X, Loader2, Trophy, Target
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function VocabularyQuickPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser?.selected_subject || 'אנגלית';
      const units = currentUser?.selected_units || 3;

      const allWords = await base44.entities.VocabularyQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'order', 500);

      const setWords = allWords.slice(startIndex, endIndex);
      setWords(setWords);

      // Generate questions
      const generatedQuestions = generateQuestions(setWords, allWords);
      setQuestions(generatedQuestions);

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuestions = (setWords, allWords) => {
    const questionTypes = ['multiple_choice', 'fill_blank', 'write'];
    const questions = [];

    setWords.forEach((word, idx) => {
      // Rotate through question types
      const type = questionTypes[idx % questionTypes.length];
      
      if (type === 'multiple_choice') {
        // Get 3 wrong options from other words
        const otherWords = allWords.filter(w => w.id !== word.id);
        const shuffled = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [
          word.english_answer,
          ...shuffled.map(w => w.english_answer)
        ].sort(() => Math.random() - 0.5);

        questions.push({
          type: 'multiple_choice',
          word: word,
          question: `מה התרגום של "${word.hebrew_word}"?`,
          options: options,
          correctAnswer: word.english_answer
        });
      } else if (type === 'fill_blank') {
        // Fill in the blank with first letter hint
        const hint = word.english_answer.charAt(0) + '_'.repeat(word.english_answer.length - 1);
        questions.push({
          type: 'fill_blank',
          word: word,
          question: `השלם את התרגום של "${word.hebrew_word}":`,
          hint: hint,
          correctAnswer: word.english_answer
        });
      } else {
        // Write the word
        questions.push({
          type: 'write',
          word: word,
          question: `כתוב את התרגום של "${word.hebrew_word}" באנגלית:`,
          correctAnswer: word.english_answer
        });
      }
    });

    return questions.sort(() => Math.random() - 0.5);
  };

  const checkAnswer = (answer) => {
    const question = questions[currentIndex];
    const correct = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    
    // Also check acceptable answers
    const acceptableAnswers = question.word.acceptable_answers || [];
    const isAcceptable = acceptableAnswers.some(a => 
      a.toLowerCase().trim() === answer.toLowerCase().trim()
    );

    return correct || isAcceptable;
  };

  const handleSubmit = async (selectedAnswer = null) => {
    const answer = selectedAnswer || userAnswer;
    const correct = checkAnswer(answer);
    
    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));

    // Update progress
    const question = questions[currentIndex];
    try {
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: question.word.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        await base44.entities.VocabularyProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (correct ? 1 : 0),
          times_incorrect: (p.times_incorrect || 0) + (correct ? 0 : 1),
          is_weak: !correct ? true : p.is_weak,
          last_practiced: new Date().toISOString(),
          mastery_level: Math.min(100, Math.max(0, (p.mastery_level || 0) + (correct ? 10 : -15)))
        });
      } else {
        await base44.entities.VocabularyProgress.create({
          word_id: question.word.id,
          user_email: user.email,
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          hebrew_word: question.word.hebrew_word,
          english_word: question.word.english_answer,
          times_seen: 1,
          times_correct: correct ? 1 : 0,
          times_incorrect: correct ? 0 : 1,
          is_weak: !correct,
          last_practiced: new Date().toISOString(),
          mastery_level: correct ? 20 : 0
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      setShowSummary(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  if (showSummary) {
    const accuracy = Math.round((results.correct / questions.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">סט {setId} - תרגול מהיר</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600">{results.correct}</div>
                <div className="text-sm text-gray-600">נכון</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-red-200">
                <div className="text-3xl font-bold text-red-600">{results.incorrect}</div>
                <div className="text-sm text-gray-600">שגוי</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-green-600">{accuracy}%</div>
              <div className="text-sm text-gray-600 mt-1">הצלחה</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setCurrentIndex(0);
                setUserAnswer('');
                setShowResult(false);
                setResults({ correct: 0, incorrect: 0 });
                setShowSummary(false);
                loadData();
              }}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-bold"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("VocabularySets"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
            >
              חזור לסטים
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col">
      {/* Header */}
      <div className="bg-green-600 px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <button
            onClick={() => navigate(createPageUrl(`VocabularySetMode?setId=${setId}&start=${startIndex}&end=${endIndex}`))}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">תרגול מהיר - סט {setId}</h1>
            <p className="text-sm opacity-90">שאלה {currentIndex + 1} מתוך {questions.length}</p>
          </div>
          <div className="w-10" />
        </div>
        <Progress value={progress} className="h-2 bg-white/20" />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600 font-semibold">
                  {question.type === 'multiple_choice' ? 'בחירה מרובה' : 
                   question.type === 'fill_blank' ? 'השלמה' : 'כתיבה'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{question.question}</h2>
              {question.hint && (
                <div className="text-lg text-gray-500 font-mono" dir="ltr">{question.hint}</div>
              )}
            </div>

            {!showResult ? (
              <div className="space-y-4">
                {question.type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    {question.options.map((option, idx) => (
                      <motion.button
                        key={idx}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubmit(option)}
                        className="w-full bg-white rounded-2xl p-4 text-left border-2 border-gray-200 hover:border-green-400 transition-all shadow-sm"
                        dir="ltr"
                      >
                        <span className="text-lg font-semibold text-gray-900">{option}</span>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="הקלד את התשובה..."
                      className="h-14 text-lg"
                      dir="ltr"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userAnswer.trim()) {
                          handleSubmit();
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!userAnswer.trim()}
                      className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-bold"
                    >
                      בדוק
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={`rounded-2xl p-6 ${isCorrect ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect ? (
                      <Check className="w-8 h-8 text-green-600" />
                    ) : (
                      <X className="w-8 h-8 text-red-600" />
                    )}
                    <span className={`text-xl font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {isCorrect ? 'נכון!' : 'לא נכון'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="bg-white rounded-xl p-4">
                      <div className="text-sm text-gray-600 mb-1">התשובה הנכונה:</div>
                      <div className="text-lg font-bold text-green-700" dir="ltr">
                        {question.correctAnswer}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold"
                >
                  {currentIndex < questions.length - 1 ? 'השאלה הבאה' : 'סיים'}
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}