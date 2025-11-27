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

export default function VocabularyPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const requestedSetId = urlParams.get('set');
  const showSelectorOnLoad = urlParams.get('selectSet') === 'true';

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vocabularySets, setVocabularySets] = useState([]);
  const [currentSet, setCurrentSet] = useState(null);
  const [currentSetId, setCurrentSetId] = useState(1);
  
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

      // Load vocabulary sets
      const sets = await base44.entities.VocabularySet.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'set_number', 100);

      setVocabularySets(sets);

      // Determine which set to start with
      let startSet = 1;
      if (requestedSetId) {
        startSet = parseInt(requestedSetId);
      }
      
      const selectedSet = sets.find(s => s.set_number === startSet) || sets[0];
      if (selectedSet) {
        loadSet(selectedSet);
      }
      
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

  const loadSet = (set) => {
    setCurrentSet(set);
    setCurrentSetId(set.set_number);
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

  const selectSetById = (setNumber) => {
    const selectedSet = vocabularySets.find(s => s.set_number === setNumber);
    if (selectedSet) {
      loadSet(selectedSet);
    }
  };

  // Flashcard handlers
  const handleFlashcardAnswer = async (isKnown) => {
    const currentWord = currentSet.words[flashcardIndex];
    
    setAnsweredFlashcards(prev => [...prev, { ...currentWord, isKnown }]);
    setFlashcardResults(prev => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Save progress
    try {
      const wordId = `${currentSet.id}_${flashcardIndex}`;
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: wordId
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
          word_id: wordId,
          user_email: user.email,
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          hebrew_word: currentWord.hebrew,
          english_word: currentWord.english,
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
    if (flashcardIndex < currentSet.words.length - 1) {
      setTimeout(() => setFlashcardIndex(prev => prev + 1), 200);
    } else {
      // Generate quiz questions from the set's predefined questions
      const generatedQuestions = generateQuestionsFromSet(currentSet);
      setQuestions(generatedQuestions);
      setTimeout(() => setPhase('quiz'), 500);
    }
  };

  const generateQuestionsFromSet = (set) => {
    const questions = [];
    
    set.words.forEach((word, wordIdx) => {
      if (word.questions && word.questions.length > 0) {
        // Use predefined questions from the set
        word.questions.forEach((q, qIdx) => {
          questions.push({
            id: `${wordIdx}_${qIdx}`,
            type: q.type,
            word: word,
            question: q.q,
            correctAnswer: q.a,
            options: q.options || null,
            hint: q.type === 'fill' ? q.a.charAt(0) + '_'.repeat(q.a.length - 1) : null
          });
        });
      } else {
        // Generate default questions if none provided
        questions.push({
          id: `${wordIdx}_default`,
          type: 'translate',
          word: word,
          question: `מה פירוש ${word.english}?`,
          correctAnswer: word.hebrew,
          options: null
        });
      }
    });

    return questions.sort(() => Math.random() - 0.5).slice(0, 10); // Max 10 questions
  };

  const checkAnswer = (answer) => {
    const question = questions[quizIndex];
    return answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
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
      const wordId = `${currentSet.id}_${currentSet.words.indexOf(question.word)}`;
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: wordId
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
    const nextSet = vocabularySets.find(s => s.set_number === currentSetId + 1);
    if (nextSet) {
      loadSet(nextSet);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!currentSet || currentSet.words.length === 0) {
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
    const hasNextSet = vocabularySets.some(s => s.set_number === currentSetId + 1);
    
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
                    {q.word.english}
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
                    {q.word.english}
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
              onClick={() => loadSet(currentSet)}
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
                  {question.type === 'choose' ? 'בחירה' : 
                   question.type === 'fill' ? 'השלמה' : 
                   question.type === 'translate' ? 'תרגום' : 'כתיבה'}
                </div>
                
                <h2 className="text-lg font-semibold text-gray-900">{question.question}</h2>
                
                {question.hint && (
                  <div className="text-base text-gray-400 font-mono mt-2" dir="ltr">{question.hint}</div>
                )}
              </div>

              {!showResult ? (
                <div className="space-y-3">
                  {question.options ? (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizSubmit(option)}
                          className="w-full bg-white rounded-xl p-4 text-right border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
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
                        dir="auto"
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
                        <div className="font-semibold text-gray-900">
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
          sets={vocabularySets}
          currentSetId={currentSetId}
          onSelectSet={(setNumber) => {
            setShowSetSelector(false);
            selectSetById(setNumber);
          }}
        />
      </div>
    );
  }

  // FLASHCARDS PHASE
  const currentWord = currentSet.words[flashcardIndex];
  const flashcardProgress = ((flashcardIndex + 1) / currentSet.words.length) * 100;

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
          <span className="text-xs text-gray-500 block">{flashcardIndex + 1} / {currentSet.words.length}</span>
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
              {currentWord.english}
            </div>
            
            {currentWord.example_sentence && (
              <div className="text-sm text-gray-500 italic mb-6" dir="ltr">
                "{currentWord.example_sentence}"
              </div>
            )}

            <div className="text-lg text-gray-600 pt-4 border-t border-gray-100">
              {currentWord.hebrew}
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
        sets={vocabularySets}
        currentSetId={currentSetId}
        onSelectSet={(setNumber) => {
          setShowSetSelector(false);
          selectSetById(setNumber);
        }}
      />
    </div>
  );
}

function SetSelectorDialog({ open, onOpenChange, sets, currentSetId, onSelectSet }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">בחר סט</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] py-2">
          <div className="space-y-3">
            {sets.map(set => (
              <button
                key={set.id}
                onClick={() => onSelectSet(set.set_number)}
                className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${
                  set.set_number === currentSetId 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-100 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                    set.set_number === currentSetId ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {set.set_number}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">סט {set.set_number}</div>
                    <div className="text-sm text-blue-600">מילים {(set.set_number - 1) * 10 + 1} - {set.set_number * 10}</div>
                  </div>
                </div>
                {set.set_number === currentSetId && (
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