import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Check, X, Loader2, RotateCcw, Crown, ArrowLeft, List
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WORDS_PER_SET = 10;

export default function VocabularyPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const requestedSetId = urlParams.get('set');
  const showSelectorOnLoad = urlParams.get('selectSet') === 'true';

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allWords, setAllWords] = useState([]);
  const [currentSetWords, setCurrentSetWords] = useState([]);
  const [currentSetId, setCurrentSetId] = useState(1);
  const [totalSets, setTotalSets] = useState(0);
  
  // Flashcards phase
  const [phase, setPhase] = useState('flashcards'); // 'flashcards' | 'quiz' | 'summary'
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardResults, setFlashcardResults] = useState({ known: 0, unknown: 0 });
  const [answeredFlashcards, setAnsweredFlashcards] = useState([]);
  
  // Quiz phase
  const [questions, setQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizResults, setQuizResults] = useState({ correct: 0, incorrect: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  // Set selector dialog
  const [showSetSelector, setShowSetSelector] = useState(false);

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

      const words = await base44.entities.VocabularyQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'order', 500);

      setAllWords(words);
      const numSets = Math.ceil(words.length / WORDS_PER_SET);
      setTotalSets(numSets);

      // Determine which set to start with
      let startSet = 1;
      if (requestedSetId) {
        startSet = parseInt(requestedSetId);
      }
      
      loadSet(startSet, words);
      
      // Show set selector if requested
      if (showSelectorOnLoad) {
        setShowSetSelector(true);
      }

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSet = (setId, words = allWords) => {
    const startIdx = (setId - 1) * WORDS_PER_SET;
    const endIdx = startIdx + WORDS_PER_SET;
    const setWords = words.slice(startIdx, endIdx);
    
    setCurrentSetId(setId);
    setCurrentSetWords(setWords);
    setPhase('flashcards');
    setFlashcardIndex(0);
    setFlashcardResults({ known: 0, unknown: 0 });
    setAnsweredFlashcards([]);
    setQuestions([]);
    setQuizIndex(0);
    setQuizResults({ correct: 0, incorrect: 0 });
    setAnsweredQuestions([]);
    setUserAnswer('');
    setShowResult(false);
  };

  // Flashcard handlers
  const handleFlashcardAnswer = async (isKnown) => {
    const currentWord = currentSetWords[flashcardIndex];
    
    setAnsweredFlashcards(prev => [...prev, { ...currentWord, isKnown }]);
    setFlashcardResults(prev => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Save progress
    try {
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: currentWord.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        await base44.entities.VocabularyProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (isKnown ? 1 : 0),
          times_incorrect: (p.times_incorrect || 0) + (isKnown ? 0 : 1),
          is_known: isKnown ? true : p.is_known,
          is_weak: !isKnown ? true : false,
          last_practiced: new Date().toISOString(),
          mastery_level: Math.min(100, Math.max(0, (p.mastery_level || 0) + (isKnown ? 10 : -15)))
        });
      } else {
        await base44.entities.VocabularyProgress.create({
          word_id: currentWord.id,
          user_email: user.email,
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          hebrew_word: currentWord.hebrew_word,
          english_word: currentWord.english_answer,
          times_seen: 1,
          times_correct: isKnown ? 1 : 0,
          times_incorrect: isKnown ? 0 : 1,
          is_known: isKnown,
          is_weak: !isKnown,
          last_practiced: new Date().toISOString(),
          mastery_level: isKnown ? 20 : 0
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    // Move to next or transition to quiz
    if (flashcardIndex < currentSetWords.length - 1) {
      setTimeout(() => setFlashcardIndex(prev => prev + 1), 200);
    } else {
      // Generate quiz questions and move to quiz phase
      const generatedQuestions = generateQuestions(currentSetWords);
      setQuestions(generatedQuestions);
      setTimeout(() => setPhase('quiz'), 500);
    }
  };

  const generateQuestions = (words) => {
    const questionTypes = ['multiple_choice', 'fill_blank', 'write', 'translate'];
    const questions = [];

    words.forEach((word, idx) => {
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
    const question = questions[quizIndex];
    const correct = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    
    const acceptableAnswers = question.word.acceptable_answers || [];
    const isAcceptable = acceptableAnswers.some(a => 
      a.toLowerCase().trim() === answer.toLowerCase().trim()
    );

    return correct || isAcceptable;
  };

  const handleQuizSubmit = async (selectedAnswer = null) => {
    const answer = selectedAnswer || userAnswer;
    const correct = checkAnswer(answer);
    const question = questions[quizIndex];
    
    setIsCorrect(correct);
    setShowResult(true);
    setQuizResults(prev => ({
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
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleQuizNext = () => {
    if (quizIndex < questions.length - 1) {
      setQuizIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      setPhase('summary');
    }
  };

  const goToNextSet = () => {
    if (currentSetId < totalSets) {
      loadSet(currentSetId + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (currentSetWords.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">אין מילים זמינות</p>
          <Button onClick={() => navigate(createPageUrl("Practice"))}>
            חזור
          </Button>
        </div>
      </div>
    );
  }

  // SUMMARY PHASE
  if (phase === 'summary') {
    const accuracy = questions.length > 0 ? Math.round((quizResults.correct / questions.length) * 100) : 0;
    const wrongQuestions = answeredQuestions.filter(q => !q.isCorrect);
    const correctQuestions = answeredQuestions.filter(q => q.isCorrect);
    const hasNextSet = currentSetId < totalSets;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full"
        >
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-1">{accuracy}%</div>
            <p className="text-gray-500">ציון סט {currentSetId}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
              <div className="text-xs text-gray-500">שאלות</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{quizResults.correct}</div>
              <div className="text-xs text-gray-500">נכון</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{quizResults.incorrect}</div>
              <div className="text-xs text-gray-500">שגוי</div>
            </div>
          </div>

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
            {hasNextSet && (
              <Button
                onClick={goToNextSet}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold"
              >
                המשך לסט הבא
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            )}

            {wrongQuestions.length > 0 && (
              <Button
                onClick={() => {
                  if (!user?.is_premium) {
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

            <Button
              onClick={() => loadSet(currentSetId)}
              variant="ghost"
              className="w-full h-10 text-sm"
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              רענן את הסט
            </Button>

            <button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
            >
              חזרה לנושאים
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // QUIZ PHASE
  if (phase === 'quiz') {
    const question = questions[quizIndex];
    const progress = questions.length > 0 ? ((quizIndex + 1) / questions.length) * 100 : 0;

    if (!question) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
          <button
            onClick={() => setShowSetSelector(true)}
            className="p-2 -ml-2 text-gray-500"
          >
            <List className="w-5 h-5" />
          </button>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-900">בוחן - סט {currentSetId}</span>
            <span className="text-xs text-gray-500 block">{quizIndex + 1} / {questions.length}</span>
          </div>
          <div className="w-9" />
        </div>
        
        <Progress value={progress} className="h-1 rounded-none" />

        <div className="flex-1 flex flex-col p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={quizIndex}
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
                          onClick={() => handleQuizSubmit(option)}
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
                            handleQuizSubmit();
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleQuizSubmit()}
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
                    onClick={handleQuizNext}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-base font-semibold"
                  >
                    {quizIndex < questions.length - 1 ? 'הבא' : 'סיים'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <SetSelectorDialog 
          open={showSetSelector} 
          onOpenChange={setShowSetSelector}
          totalSets={totalSets}
          currentSetId={currentSetId}
          onSelectSet={(setId) => {
            setShowSetSelector(false);
            loadSet(setId);
          }}
        />
      </div>
    );
  }

  // FLASHCARDS PHASE
  const currentWord = currentSetWords[flashcardIndex];
  const flashcardProgress = ((flashcardIndex + 1) / currentSetWords.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <button
          onClick={() => setShowSetSelector(true)}
          className="p-2 -ml-2 text-gray-500"
        >
          <List className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="text-sm font-medium text-gray-900">סט {currentSetId}</span>
          <span className="text-xs text-gray-500 block">{flashcardIndex + 1} / {currentSetWords.length}</span>
        </div>
        <div className="w-9" />
      </div>
      
      <Progress value={flashcardProgress} className="h-1 rounded-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          key={flashcardIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-4" dir="ltr">
              {currentWord.english_answer}
            </div>
            
            {currentWord.example_sentence && (
              <div className="text-sm text-gray-500 italic mb-6" dir="ltr">
                "{currentWord.example_sentence}"
              </div>
            )}

            <div className="text-lg text-gray-600 pt-4 border-t border-gray-100">
              {currentWord.hebrew_word}
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => handleFlashcardAnswer(false)}
              className="flex-1 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <X className="w-5 h-5 text-red-500" />
              <span className="font-medium">לא ידעתי</span>
            </button>
            
            <button
              onClick={() => handleFlashcardAnswer(true)}
              className="flex-1 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium">ידעתי</span>
            </button>
          </div>
        </motion.div>
      </div>

      <SetSelectorDialog 
        open={showSetSelector} 
        onOpenChange={setShowSetSelector}
        totalSets={totalSets}
        currentSetId={currentSetId}
        onSelectSet={(setId) => {
          setShowSetSelector(false);
          loadSet(setId);
        }}
      />
    </div>
  );
}

function SetSelectorDialog({ open, onOpenChange, totalSets, currentSetId, onSelectSet }) {
  const sets = Array.from({ length: totalSets }, (_, i) => i + 1);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-center">בחר סט</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          <div className="space-y-2">
            {sets.map(setId => (
              <button
                key={setId}
                onClick={() => onSelectSet(setId)}
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                  setId === currentSetId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                    setId === currentSetId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {setId}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">סט {setId}</div>
                    <div className="text-xs text-gray-500">מילים {(setId - 1) * 10 + 1} - {setId * 10}</div>
                  </div>
                </div>
                {setId === currentSetId && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}