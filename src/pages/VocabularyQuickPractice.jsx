import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, RotateCcw, Check, X, Loader2, Crown, ArrowLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function VocabularyQuickPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const isMultiSet = urlParams.get('multiSet') === 'true';
  const setsParam = urlParams.get('sets');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [allWordsData, setAllWordsData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
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

      setAllWordsData(allWords);

      let wordsForPractice = [];
      if (isMultiSet) {
        const setsData = JSON.parse(sessionStorage.getItem('vocabSetsData') || '[]');
        setsData.forEach(set => {
          wordsForPractice = [...wordsForPractice, ...allWords.slice(set.startIndex, set.endIndex)];
        });
      } else {
        wordsForPractice = allWords.slice(startIndex, endIndex);
      }

      // Check if we have flashcard results - prioritize weak words
      const flashcardResults = sessionStorage.getItem('flashcardResults');
      if (flashcardResults) {
        const parsed = JSON.parse(flashcardResults);
        const unknownWords = parsed.filter(w => !w.isKnown);
        // If user didn't know many words, generate more questions for those
        if (unknownWords.length > 0) {
          // Add extra questions for unknown words
          wordsForPractice = [...wordsForPractice];
        }
        sessionStorage.removeItem('flashcardResults');
      }

      setWords(wordsForPractice);

      // Generate questions
      const generatedQuestions = generateQuestions(wordsForPractice, allWords);
      setQuestions(generatedQuestions);

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuestions = (setWords, allWords) => {
    const questionTypes = ['multiple_choice', 'fill_blank', 'write', 'translate'];
    const questions = [];

    setWords.forEach((word, idx) => {
      const type = questionTypes[idx % questionTypes.length];
      
      if (type === 'multiple_choice') {
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
        const hint = word.english_answer.charAt(0) + '_'.repeat(word.english_answer.length - 1);
        questions.push({
          type: 'fill_blank',
          word: word,
          question: `השלם: "${word.hebrew_word}"`,
          hint: hint,
          correctAnswer: word.english_answer
        });
      } else if (type === 'translate') {
        // Reverse - show English, ask for Hebrew
        const otherWords = allWords.filter(w => w.id !== word.id);
        const shuffled = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [
          word.hebrew_word,
          ...shuffled.map(w => w.hebrew_word)
        ].sort(() => Math.random() - 0.5);

        questions.push({
          type: 'translate',
          word: word,
          question: `מה המילה בעברית?`,
          englishWord: word.english_answer,
          options: options,
          correctAnswer: word.hebrew_word
        });
      } else {
        questions.push({
          type: 'write',
          word: word,
          question: `תרגם לאנגלית: "${word.hebrew_word}"`,
          correctAnswer: word.english_answer
        });
      }
    });

    return questions.sort(() => Math.random() - 0.5);
  };

  const checkAnswer = (answer) => {
    const question = questions[currentIndex];
    const correct = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    
    const acceptableAnswers = question.word.acceptable_answers || [];
    const isAcceptable = acceptableAnswers.some(a => 
      a.toLowerCase().trim() === answer.toLowerCase().trim()
    );

    return correct || isAcceptable;
  };

  const handleSubmit = async (selectedAnswer = null) => {
    const answer = selectedAnswer || userAnswer;
    const correct = checkAnswer(answer);
    const question = questions[currentIndex];
    
    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
    setAnsweredQuestions(prev => [...prev, { ...question, userAnswer: answer, isCorrect: correct }]);

    // Update progress
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
          mastery_level: Math.min(100, Math.max(0, (p.mastery_level || 0) + (correct ? 15 : -10)))
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
          mastery_level: correct ? 25 : 0
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

  const getNextSetId = () => {
    if (isMultiSet) return null;
    return parseInt(setId) + 1;
  };

  const goToNextSet = () => {
    const nextSetId = getNextSetId();
    if (nextSetId) {
      const nextStart = endIndex;
      const nextEnd = nextStart + 10;
      navigate(createPageUrl(`VocabularySetMode?setId=${nextSetId}&start=${nextStart}&end=${nextEnd}`));
    }
  };

  const practiceErrors = () => {
    const wrongQuestions = answeredQuestions.filter(q => !q.isCorrect);
    if (wrongQuestions.length === 0) return;
    
    sessionStorage.setItem('errorPracticeWords', JSON.stringify(wrongQuestions.map(q => q.word)));
    // For now, just refresh with the wrong words
    // Could create a dedicated error practice page
    navigate(createPageUrl("VocabularySets"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (showSummary) {
    const totalQuestions = questions.length || 1;
    const correctCount = results.correct || 0;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const wrongQuestions = answeredQuestions.filter(q => !q.isCorrect);
    const correctQuestions = answeredQuestions.filter(q => q.isCorrect);
    const nextSetId = getNextSetId();
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full"
        >
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-1">{accuracy}%</div>
            <p className="text-gray-500">ציון הסט</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
              <div className="text-xs text-gray-500">שאלות</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-gray-500">נכון</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{results.incorrect || 0}</div>
              <div className="text-xs text-gray-500">שגוי</div>
            </div>
          </div>

          {/* Mastered words */}
          {correctQuestions.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2 font-medium">מילים שנשלטו:</div>
              <div className="flex flex-wrap gap-1.5">
                {correctQuestions.slice(0, 6).map((q, idx) => (
                  <span key={idx} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-2xl text-xs font-medium">
                    {q.word.english_answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Words to review */}
          {wrongQuestions.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2 font-medium">מילים לחזרה:</div>
              <div className="flex flex-wrap gap-1.5">
                {wrongQuestions.map((q, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 px-3 py-1.5 rounded-2xl text-xs font-medium">
                    {q.word.english_answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Main CTA - Next set */}
            {nextSetId && (
              <Button
                onClick={goToNextSet}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl"
              >
                המשך לסט הבא
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            )}

            {/* Practice errors - Premium */}
            {wrongQuestions.length > 0 && (
              <Button
                onClick={() => {
                  if (user?.is_premium) {
                    practiceErrors();
                  } else {
                    navigate(createPageUrl("Premium"));
                  }
                }}
                variant="outline"
                className="w-full h-12 text-base font-semibold border-2 border-blue-500 text-blue-600 rounded-2xl hover:bg-blue-50"
              >
                {!user?.is_premium && <Crown className="w-4 h-4 ml-2 text-amber-500" />}
                חזרה על טעויות
              </Button>
            )}

            {/* Refresh set */}
            <button
              onClick={() => {
                setCurrentIndex(0);
                setUserAnswer('');
                setShowResult(false);
                setResults({ correct: 0, incorrect: 0 });
                setAnsweredQuestions([]);
                setShowSummary(false);
                loadData();
              }}
              className="w-full h-12 text-lg font-semibold border-2 border-blue-500 text-blue-600 rounded-2xl hover:bg-blue-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              רענן את הסט
            </button>

            <button
              onClick={() => navigate(createPageUrl("VocabularySets"))}
              className="w-full text-[#0A2540] text-lg font-medium hover:text-gray-700 py-3 mb-10"
            >
              חזרה לנושאים
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">אין שאלות זמינות</p>
          <Button onClick={() => navigate(createPageUrl("VocabularySets"))}>
            חזור לסטים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(createPageUrl("VocabularySets"))}
          className="p-2 -ml-2 text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-blue-600">
          שאלה {currentIndex + 1} מתוך {questions.length}
        </span>
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2.5">
        <div 
          className="bg-blue-600 h-2.5 transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm"
          >
            {/* Question Card */}
            <div className="bg-white rounded-[28px] border-2 border-blue-100 shadow-lg p-8 mb-6">
              <div className="text-xs text-blue-500 mb-3 font-medium text-center">
                {question.type === 'multiple_choice' ? 'בחירה מרובה' : 
                 question.type === 'fill_blank' ? 'השלמת מילה' : 
                 question.type === 'translate' ? 'תרגום לעברית' : 'כתיבה חופשית'}
              </div>
              
              {question.type === 'translate' && (
                <div className="text-3xl font-bold text-gray-900 mb-4 text-center" dir="ltr">
                  {question.englishWord}
                </div>
              )}
              
              <h2 className="text-xl font-bold text-gray-900 text-center">{question.question}</h2>
              
              {question.hint && (
                <div className="text-lg text-blue-400 font-mono mt-4 text-center" dir="ltr">{question.hint}</div>
              )}
            </div>

            {!showResult ? (
              <div className="space-y-3">
                {(question.type === 'multiple_choice' || question.type === 'translate') ? (
                  <div className="space-y-3">
                    {question.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmit(option)}
                        className="w-full bg-white rounded-2xl p-4 text-center border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                        dir={question.type === 'translate' ? 'rtl' : 'ltr'}
                      >
                        <span className="text-lg font-medium text-gray-900">{option}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="הקלד את התשובה..."
                      className="h-14 text-lg text-center rounded-2xl border-2 border-gray-200 focus:border-blue-400"
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
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl"
                    >
                      בדוק תשובה
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={`rounded-2xl p-5 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {isCorrect ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <X className="w-6 h-6 text-red-500" />
                    )}
                    <span className={`text-xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect ? 'נכון!' : 'לא נכון'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="bg-white rounded-xl p-4 mt-3">
                      <div className="text-sm text-gray-500 mb-1 text-center">התשובה הנכונה:</div>
                      <div className="text-xl font-bold text-gray-900 text-center" dir="ltr">
                        {question.correctAnswer}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl"
                >
                  {currentIndex < questions.length - 1 ? 'לשאלה הבאה' : 'סיים'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}