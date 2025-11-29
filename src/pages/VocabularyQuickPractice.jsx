import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, RotateCcw, Check, X, Loader2, Crown, ArrowLeft, Volume2, BookOpen, Target, Trophy, AlertTriangle } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

// מצב 2 - מבחן אוצר מילים - בחירה מרובה, השלמה, כתיבה חופשית

export default function VocabularyQuickPracticePage() {
  const navigate = useNavigate();
  
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
  const [showExitDialog, setShowExitDialog] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const isMultiSet = urlParams.get('multiSet') === 'true';
  const setsParam = urlParams.get('sets');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');
  const resumeIndex = parseInt(urlParams.get('resumeIndex') || '0');

  useEffect(() => {
    loadData();
  }, []);

  // Update bookmark when current question changes
  useEffect(() => {
    if (user && !isMultiSet && setId && questions.length > 0) {
       // Don't update if we are just reviewing
       if (!showResult && !showSummary) {
          const currentQIndex = currentIndex;
          // Update user bookmark
          base44.auth.updateMe({
            last_vocabulary_position: {
              set_id: parseInt(setId),
              question_index: currentQIndex,
              word_id: questions[currentQIndex]?.word?.id,
              timestamp: new Date().toISOString()
            }
          }).catch(e => console.error("Error saving bookmark:", e));
       }
    }
  }, [currentIndex, user, isMultiSet, setId, questions.length, showResult, showSummary]);

  const handleExit = () => {
    const targetPage = user?.role === 'admin' ? "VocabularySets" : "VocabularyTraining";
    if (showSummary || questions.length === 0) {
      navigate(createPageUrl(targetPage));
      return;
    }
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    const targetPage = user?.role === 'admin' ? "VocabularySets" : "VocabularyTraining";
    navigate(createPageUrl(targetPage));
  };

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
      }, 'order', 2000);

      setAllWordsData(allWords);

      let wordsForPractice = [];
      if (isMultiSet) {
        const setsData = JSON.parse(sessionStorage.getItem('vocabSetsData') || '[]');
        setsData.forEach((set) => {
          wordsForPractice = [...wordsForPractice, ...allWords.slice(set.startIndex, set.endIndex)];
        });
      } else {
        wordsForPractice = allWords.slice(startIndex, endIndex);
      }

      // Check if we have flashcard results - prioritize weak words
      const flashcardResults = sessionStorage.getItem('flashcardResults');
      if (flashcardResults) {
        const parsed = JSON.parse(flashcardResults);
        const unknownWords = parsed.filter((w) => !w.isKnown);
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
      
      // If resuming, set current index
      if (resumeIndex > 0 && resumeIndex < generatedQuestions.length) {
        setCurrentIndex(resumeIndex);
      }

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuestions = (setWords, allWords) => {
    const questions = [];

    // Default fallback distractors - common English words
    const defaultEnglishDistractors = [
    'walk', 'jump', 'swim', 'read', 'write', 'speak', 'listen', 'think', 'make', 'take',
    'go', 'come', 'see', 'know', 'get', 'give', 'find', 'tell', 'ask', 'work',
    'big', 'small', 'good', 'bad', 'new', 'old', 'high', 'low', 'long', 'short',
    'house', 'school', 'book', 'water', 'food', 'time', 'day', 'night', 'year', 'place'];


    const defaultHebrewDistractors = [
    'ללכת', 'לקפוץ', 'לשחות', 'לקרוא', 'לכתוב', 'לדבר', 'להקשיב', 'לחשוב', 'לעשות', 'לקחת',
    'לבוא', 'לראות', 'לדעת', 'לתת', 'למצוא', 'לספר', 'לשאול', 'לעבוד', 'לאכול', 'לשתות',
    'גדול', 'קטן', 'טוב', 'רע', 'חדש', 'ישן', 'גבוה', 'נמוך', 'ארוך', 'קצר',
    'בית', 'ספר', 'מים', 'אוכל', 'זמן', 'יום', 'לילה', 'שנה', 'מקום', 'עבודה'];


    // Helper function to get good distractors
    const getDistractors = (currentWord, count = 3) => {
      const correctAnswer = currentWord.english_answer.toLowerCase().trim();
      const distractors = [];
      const usedAnswers = new Set([correctAnswer]);

      // First try custom distractors if available
      if (currentWord.advanced_quiz?.custom_distractors?.length > 0) {
        for (const d of currentWord.advanced_quiz.custom_distractors) {
          if (!usedAnswers.has(d.toLowerCase().trim())) {
            usedAnswers.add(d.toLowerCase().trim());
            distractors.push(d);
            if (distractors.length >= count) return distractors;
          }
        }
      }

      // Try to get from other words in the set/database
      const candidates = allWords.filter((w) =>
      w.id !== currentWord.id &&
      !usedAnswers.has(w.english_answer.toLowerCase().trim())
      );

      // Prefer same category
      const sameCategory = candidates.filter((w) => w.category === currentWord.category);
      const sortedCandidates = [...sameCategory, ...candidates.filter((w) => w.category !== currentWord.category)];

      for (const w of sortedCandidates.sort(() => Math.random() - 0.5)) {
        const answer = w.english_answer.toLowerCase().trim();
        if (!usedAnswers.has(answer)) {
          usedAnswers.add(answer);
          distractors.push(w.english_answer);
          if (distractors.length >= count) return distractors;
        }
      }

      // Fill remaining with fallback options
      const shuffledFallbacks = [...defaultEnglishDistractors].sort(() => Math.random() - 0.5);
      for (const fallback of shuffledFallbacks) {
        if (!usedAnswers.has(fallback.toLowerCase())) {
          usedAnswers.add(fallback.toLowerCase());
          distractors.push(fallback);
          if (distractors.length >= count) return distractors;
        }
      }

      return distractors;
    };

    const getHebrewDistractors = (currentWord, count = 3) => {
      const correctAnswer = currentWord.hebrew_word.trim();
      const distractors = [];
      const usedAnswers = new Set([correctAnswer]);

      // Try to get from other words
      const candidates = allWords.filter((w) =>
      w.id !== currentWord.id &&
      !usedAnswers.has(w.hebrew_word.trim())
      );

      for (const w of candidates.sort(() => Math.random() - 0.5)) {
        if (!usedAnswers.has(w.hebrew_word.trim())) {
          usedAnswers.add(w.hebrew_word.trim());
          distractors.push(w.hebrew_word);
          if (distractors.length >= count) return distractors;
        }
      }

      // Fill with fallback Hebrew words
      const shuffledFallbacks = [...defaultHebrewDistractors].sort(() => Math.random() - 0.5);
      for (const fallback of shuffledFallbacks) {
        if (!usedAnswers.has(fallback)) {
          usedAnswers.add(fallback);
          distractors.push(fallback);
          if (distractors.length >= count) return distractors;
        }
      }

      return distractors;
    };

    const usedWordIds = new Set();
    
    setWords.forEach((word, idx) => {
      // Skip if word already used
      if (usedWordIds.has(word.id)) return;
      usedWordIds.add(word.id);
      
      // Rotate between question types: 
      // 0-2: multiple choice (30%)
      // 3: fill blank (10%)
      // 4-5: translate reverse - English to Hebrew multiple choice (20%)
      // 6-7: open recall - free text Hebrew to English (20%)
      // 8-9: reverse open - English to Hebrew free text (20%)
      const rand = idx % 10;

      if (rand < 3) {
        // Multiple choice - Hebrew to English
        const distractors = getDistractors(word, 3);
        const options = [word.english_answer, ...distractors].sort(() => Math.random() - 0.5);

        questions.push({
          type: 'multiple_choice',
          word: word,
          question: `מה התרגום של "${word.hebrew_word}"?`,
          options: options,
          correctAnswer: word.english_answer
        });
      } else if (rand === 3) {
        // Fill in the blank
        const hint = word.english_answer.charAt(0) + '_'.repeat(word.english_answer.length - 1);
        questions.push({
          type: 'fill_blank',
          word: word,
          question: `השלם: "${word.hebrew_word}"`,
          hint: hint,
          correctAnswer: word.english_answer
        });
      } else if (rand >= 4 && rand <= 5) {
        // Translate reverse - English to Hebrew (multiple choice)
        const distractors = getHebrewDistractors(word, 3);
        const options = [word.hebrew_word, ...distractors].sort(() => Math.random() - 0.5);

        questions.push({
          type: 'translate',
          word: word,
          question: `מה המילה בעברית?`,
          englishWord: word.english_answer,
          options: options,
          correctAnswer: word.hebrew_word
        });
      } else if (rand >= 6 && rand <= 7) {
        // Open recall - free text Hebrew to English
        questions.push({
          type: 'open_recall',
          word: word,
          question: `תרגם לאנגלית:`,
          hebrewWord: word.hebrew_word,
          correctAnswer: word.english_answer
        });
      } else {
        // Reverse open - English to Hebrew free text
        questions.push({
          type: 'reverse_open',
          word: word,
          question: `מה התרגום לעברית של:`,
          englishWord: word.english_answer,
          correctAnswer: word.hebrew_word
        });
      }
    });

    return questions.sort(() => Math.random() - 0.5);
  };

  const checkAnswer = (answer) => {
    const question = questions[currentIndex];
    const correct = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

    const acceptableAnswers = question.word.acceptable_answers || [];
    const isAcceptable = acceptableAnswers.some((a) =>
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
    setResults((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
    setAnsweredQuestions((prev) => [...prev, { ...question, userAnswer: answer, isCorrect: correct }]);

    // Update progress
    try {
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: question.word.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        const newStreak = correct ? (p.streak || 0) + 1 : 0;
        // Remove from weak if answered correctly twice in a row
        const shouldRemoveWeak = correct && newStreak >= 2;
        
        await base44.entities.VocabularyProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (correct ? 1 : 0),
          times_incorrect: (p.times_incorrect || 0) + (correct ? 0 : 1),
          streak: newStreak,
          is_weak: !correct ? true : (shouldRemoveWeak ? false : p.is_weak),
          is_known: newStreak >= 4 ? true : p.is_known,
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
          streak: correct ? 1 : 0,
          is_weak: !correct,
          is_known: false,
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
      setCurrentIndex((prev) => prev + 1);
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

  const goToNextSet = async () => {
    const nextSetId = getNextSetId();
    
    // Check if we reached the end of all words
    if (endIndex >= allWordsData.length) {
       alert("🎉 מזל טוב! סיימת את כל המילים במאגר!");
       // Reset bookmark?
       await base44.auth.updateMe({ last_vocabulary_position: null });
       navigate(createPageUrl("VocabularySets"));
       return;
    }

    if (nextSetId) {
      const nextStart = endIndex;
      const nextEnd = nextStart + 10;
      
      // Reset bookmark to start of next set
      await base44.auth.updateMe({
        last_vocabulary_position: {
          set_id: nextSetId,
          question_index: 0,
          timestamp: new Date().toISOString()
        }
      });
      
      navigate(createPageUrl(`VocabularyFlashcards?setId=${nextSetId}&start=${nextStart}&end=${nextEnd}`));
    }
  };

  const practiceErrors = () => {
    const wrongQuestions = answeredQuestions.filter((q) => !q.isCorrect);
    if (wrongQuestions.length === 0) return;

    sessionStorage.setItem('errorPracticeWords', JSON.stringify(wrongQuestions.map((q) => q.word)));
    // For now, just refresh with the wrong words
    // Could create a dedicated error practice page
    navigate(createPageUrl("VocabularySets"));
  };

  // Text-to-Speech function
  const speakWord = (text, lang = 'en-US') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">טוען שאלות...</p>
        </div>
      </div>
    );
  }

  if (showSummary) {
    const totalQuestions = questions.length || 1;
    const correctCount = results.correct || 0;
    const accuracy = Math.round(correctCount / totalQuestions * 100);
    const wrongQuestions = answeredQuestions.filter((q) => !q.isCorrect);
    const correctQuestions = answeredQuestions.filter((q) => q.isCorrect);
    const nextSetId = getNextSetId();

    const getEvaluation = () => {
      if (accuracy >= 90) return { text: "מצוין! שליטה מושלמת!", icon: Trophy, color: "text-green-600", bg: "bg-green-50" };
      if (accuracy >= 70) return { text: "יפה מאוד! כמעט שם!", icon: Target, color: "text-blue-600", bg: "bg-blue-50" };
      if (accuracy >= 50) return { text: "בסדר, המשך לתרגל", icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50" };
      return { text: "צריך לחזור על החומר", icon: RotateCcw, color: "text-red-600", bg: "bg-red-50" };
    };
    const evaluation = getEvaluation();
    const EvalIcon = evaluation.icon;

    return (
      <div className="min-h-screen bg-blue-50 pb-8">
        {/* Header */}
        <div className="bg-blue-600 px-5 py-6 rounded-b-3xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <EvalIcon className="w-10 h-10 text-white" />
            </div>
            <div className="text-5xl font-bold text-white mb-2">{accuracy}%</div>
            <p className="text-white/90 text-lg font-medium">{evaluation.text}</p>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-blue-100">
              <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
              <div className="text-xs text-gray-500 font-medium">שאלות</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-gray-500 font-medium">נכון</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-red-200">
              <div className="text-2xl font-bold text-red-600">{results.incorrect || 0}</div>
              <div className="text-xs text-gray-500 font-medium">שגוי</div>
            </div>
          </div>

          {/* Mastered words */}
          {correctQuestions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
              <div className="text-sm text-gray-700 mb-3 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                מילים שנשלטו:
              </div>
              <div className="flex flex-wrap gap-2">
                {correctQuestions.slice(0, 8).map((q, idx) => (
                  <span key={idx} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-xl text-sm font-medium" dir="ltr">
                    {q.word.english_answer}
                  </span>
                ))}
                {correctQuestions.length > 8 && (
                  <span className="text-sm text-gray-500">+{correctQuestions.length - 8}</span>
                )}
              </div>
            </div>
          )}

          {/* Words to review */}
          {wrongQuestions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-200">
              <div className="text-sm text-gray-700 mb-3 font-bold flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                מילים לחיזוק:
              </div>
              <div className="flex flex-wrap gap-2">
                {wrongQuestions.map((q, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 px-3 py-1.5 rounded-xl text-sm font-medium" dir="ltr">
                    {q.word.english_answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {nextSetId && (
              <Button
                onClick={goToNextSet}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
              >
                המשך לסט הבא
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            )}

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
                className="w-full h-12 text-base font-bold border-2 border-blue-500 text-blue-600 rounded-2xl hover:bg-blue-50"
                disabled={!user?.is_premium}
              >
                {!user?.is_premium && <Crown className="w-4 h-4 ml-2 text-amber-500" />}
                תרגול טעויות
              </Button>
            )}

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
              variant="outline"
              className="w-full h-12 text-base font-bold border-2 border-blue-300 text-blue-600 rounded-2xl hover:bg-blue-50"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              תרגל שוב
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full text-gray-500 font-medium"
            >
              חזרה לתרגול
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length * 100 : 0;

  if (!question) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 font-medium">אין שאלות זמינות</p>
          <Button 
            onClick={() => navigate(createPageUrl("Practice"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            חזרה לתרגול
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleExit}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white">
            בוחן אוצר מילים
          </span>
          <div className="text-xs text-white/80">
            שאלה {currentIndex + 1} מתוך {questions.length}
          </div>
        </div>
        <div className="w-10" />
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-blue-400 h-2">
        <div
          className="bg-white h-2 transition-all duration-300 rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-sm"
          >
            {/* Question Card */}
            <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-6 mb-5 border border-blue-100">
              {/* Question Type Badge */}
              <div className="flex justify-center mb-4">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full">
                  {question.type === 'multiple_choice' ? 'בחירה מרובה' :
                  question.type === 'fill_blank' ? 'השלמת מילה' :
                  question.type === 'translate' ? 'תרגום לעברית' : 
                  question.type === 'open_recall' ? 'כתיבה חופשית' :
                  question.type === 'reverse_open' ? 'תרגום הפוך' : 'כתיבה חופשית'}
                </span>
              </div>
              
              {/* Word Display with Audio */}
              {(question.type === 'translate' || question.type === 'reverse_open') && (
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-2" dir="ltr">
                    {question.englishWord}
                  </div>
                  <button
                    onClick={() => speakWord(question.englishWord, 'en-US')}
                    className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              )}

              {question.type === 'open_recall' && (
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {question.hebrewWord}
                  </div>
                  <button
                    onClick={() => speakWord(question.hebrewWord, 'he-IL')}
                    className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              )}

              {question.type === 'multiple_choice' && (
                <div className="text-center mb-2">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {question.word.hebrew_word}
                  </div>
                  <button
                    onClick={() => speakWord(question.word.hebrew_word, 'he-IL')}
                    className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Volume2 className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              )}
              
              <h2 className="text-lg font-bold text-gray-700 text-center">{question.question}</h2>
            </div>

            {!showResult ? (
              <div className="space-y-3">
                {question.type === 'multiple_choice' || question.type === 'translate' ? (
                  <div className="space-y-3">
                    {question.options.map((option, idx) => {
                      const isSelected = userAnswer === option;
                      return (
                        <button
                          key={idx}
                          onClick={() => setUserAnswer(option)}
                          className={`w-full bg-white rounded-2xl p-4 text-center border-2 transition-all shadow-sm ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                              : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                          dir={question.type === 'translate' ? 'rtl' : 'ltr'}
                        >
                          <span className="text-lg font-semibold text-gray-900">{option}</span>
                        </button>
                      );
                    })}
                    {userAnswer && (
                      <Button
                        onClick={() => handleSubmit(userAnswer)}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl mt-4 shadow-lg"
                      >
                        אשר תשובה
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={question.type === 'reverse_open' ? "הקלד בעברית..." : "הקלד באנגלית..."}
                      className="h-14 text-lg text-center rounded-2xl border-2 border-gray-200 focus:border-blue-500 bg-white shadow-sm"
                      dir={question.type === 'reverse_open' ? 'rtl' : 'ltr'}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userAnswer.trim()) {
                          handleSubmit();
                        }
                      }}
                    />

                    {question.type === 'fill_blank' && question.hint && (
                      <div className="text-center text-gray-400 text-sm bg-white rounded-xl py-2">
                        רמז: <span dir="ltr" className="font-mono">{question.hint}</span>
                      </div>
                    )}

                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!userAnswer.trim()}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg disabled:opacity-50"
                    >
                      בדוק תשובה
                    </Button>
                  </div>
                )}
              </div>
            ) : (

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className={`rounded-2xl p-5 shadow-lg ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isCorrect ? (
                        <Check className="w-7 h-7 text-white" />
                      ) : (
                        <X className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <span className={`text-2xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect ? 'נכון!' : 'לא נכון'}
                    </span>
                  </div>

                  {/* Word details */}
                  <div className="bg-white rounded-xl p-4 space-y-3">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">
                        {!isCorrect ? 'התשובה הנכונה:' : 'המילה:'}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2" dir="ltr">
                        {question.correctAnswer}
                        <button
                          onClick={() => {
                            if (question.word.audio?.english_audio_url || question.word.audio_url) {
                              const audio = new Audio(question.word.audio?.english_audio_url || question.word.audio_url);
                              audio.play();
                            } else {
                              speakWord(question.correctAnswer, 'en-US');
                            }
                          }}
                          className="p-2 rounded-full bg-blue-50 hover:bg-blue-100"
                        >
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        </button>
                      </div>
                    </div>

                    {/* Example sentence for wrong answers */}
                    {!isCorrect && question.word.example_sentence && (
                      <div className="text-sm text-gray-600 text-center border-t pt-3" dir="ltr">
                        <span className="text-gray-400">דוגמה: </span>
                        "{question.word.example_sentence}"
                      </div>
                    )}

                    {/* Synonyms hint for wrong answers */}
                    {!isCorrect && question.word.synonyms && question.word.synonyms.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center border-t pt-3">
                        <span className="text-xs text-gray-400">נרדפות:</span>
                        {question.word.synonyms.slice(0, 2).map((syn, i) => (
                          <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full" dir="ltr">{syn}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
                >
                  {currentIndex < questions.length - 1 ? 'לשאלה הבאה' : 'סיום'}
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              האם אתה בטוח שברצונך לצאת?
            </DialogTitle>
            <DialogDescription>
              המיקום שלך יישמר ותוכל להמשיך בדיוק מאותה נקודה בפעם הבאה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-row-reverse">
            <Button onClick={() => setShowExitDialog(false)} variant="outline" className="flex-1">
              המשך במבחן
            </Button>
            <Button onClick={confirmExit} className="flex-1 bg-red-600 hover:bg-red-700">
              שמור וצא
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}