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
    const accuracy = questions.length > 0 ? Math.round((results.correct / questions.length) * 100) : 0;
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
              <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
              <div className="text-xs text-gray-500">שאלות</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{results.correct}</div>
              <div className="text-xs text-gray-500">נכון</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{results.incorrect}</div>
              <div className="text-xs text-gray-500">שגוי</div>
            </div>
          </div>

          {/* Mastered words */}
          {correctQuestions.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">מילים שנשלטו:</div>
              <div className="flex flex-wrap gap-1">
                {correctQuestions.slice(0, 6).map((q, idx) => (
                  <span key={idx} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                    {q.word.english_answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Words to review */}
          {wrongQuestions.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">מילים לחזרה:</div>
              <div className="flex flex-wrap gap-1">
                {wrongQuestions.map((q, idx) => (
                  <span key={idx} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                    {q.word.english_answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {/* Main CTA - Next set */}
            {nextSetId && (
              <Button
                onClick={goToNextSet}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold"
              >
                המשך לסט הבא
                <ArrowLeft className="w-4 h-4 mr-2" />
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
                className="w-full h-11 text-sm font-semibold border-2"
              >
                {!user?.is_premium && <Crown className="w-4 h-4 ml-2 text-amber-500" />}
                חזרה על טעויות
              </Button>
            )}

            {/* Refresh set */}
            <Button
              onClick={() => {
                setCurrentIndex(0);
                setUserAnswer('');
                setShowResult(false);
                setResults({ correct: 0, incorrect: 0 });
                setAnsweredQuestions([]);
                setShowSummary(false);
                loadData();
              }}
              variant="ghost"
              className="w-full h-10 text-sm"
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              רענן את הסט
            </Button>

            <button
              onClick={() => navigate(createPageUrl("VocabularySets"))}
              className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
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
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {questions.length}
        </span>
        <div className="w-9" />
      </div>
      
      <Progress value={progress} className="h-1 rounded-none" />

      {/* Question */}
      <div className="flex-1 flex flex-col p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
              <div className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
                {question.type === 'multiple_choice' ? 'בחירה' : 
                 question.type === 'fill_blank' ? 'השלמה' : 
                 question.type === 'translate' ? 'תרגום' : 'כתיבה'}
              </div>
              
              {question.type === 'translate' && (
                <div className="text-2xl font-bold text-gray-900 mb-3" dir="ltr">
                  {question.englishWord}
                </div>
              )}
              
              <h2 className="text-lg font-semibold text-gray-900">{question.question}</h2>
              
              {question.hint && (
                <div className="text-base text-gray-400 font-mono mt-2" dir="ltr">{question.hint}</div>
              )}
            </div>

            {!showResult ? (
              <div className="space-y-3">
                {(question.type === 'multiple_choice' || question.type === 'translate') ? (
                  <div className="space-y-2">
                    {question.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmit(option)}
                        className="w-full bg-white rounded-xl p-4 text-right border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                        dir={question.type === 'translate' ? 'rtl' : 'ltr'}
                      >
                        <span className="text-base font-medium text-gray-900">{option}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="הקלד את התשובה..."
                      className="h-12 text-base"
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
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-semibold"
                    >
                      בדוק
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className={`rounded-xl p-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect ? 'נכון!' : 'לא נכון'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div className="bg-white rounded-lg p-3 mt-2">
                      <div className="text-xs text-gray-500 mb-1">התשובה הנכונה:</div>
                      <div className="font-semibold text-gray-900" dir="ltr">
                        {question.correctAnswer}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-base font-semibold"
                >
                  {currentIndex < questions.length - 1 ? 'הבא' : 'סיים'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}