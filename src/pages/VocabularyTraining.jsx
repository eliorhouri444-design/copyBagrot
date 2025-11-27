import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Layers, Target, AlertTriangle, 
  RotateCcw, Loader2, Filter, Plus, Save, X, Trash2, List, Upload, Check, ArrowLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

import VocabularyDashboard from "@/components/vocabulary/VocabularyDashboard";
import Flashcards from "@/components/vocabulary/Flashcards";
import QuickPractice from "@/components/vocabulary/QuickPractice";
import PracticeSummary from "@/components/vocabulary/PracticeSummary";

const PRACTICE_MODES = {
  DASHBOARD: 'dashboard',
  SET_PRACTICE: 'set_practice', // New mode for set-based practice
  FLASHCARDS: 'flashcards',
  QUICK_PRACTICE: 'quick_practice',
  WEAK_WORDS: 'weak_words',
  ERROR_PRACTICE: 'error_practice',
  SUMMARY: 'summary'
};

export default function VocabularyTrainingPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const requestedSetNumber = urlParams.get('set');
  const showSelectorOnLoad = urlParams.get('selectSet') === 'true';
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState(PRACTICE_MODES.DASHBOARD);
  const [words, setWords] = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [progress, setProgress] = useState({});
  const [stats, setStats] = useState({});
  const [sessionResults, setSessionResults] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [showBulkJsonDialog, setShowBulkJsonDialog] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [newWord, setNewWord] = useState({
    hebrew_word: '',
    english_answer: '',
    acceptable_answers: '',
    example_sentence: '',
    category: '',
    difficulty: 'medium'
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // NEW: Vocabulary Sets state
  const [vocabularySets, setVocabularySets] = useState([]);
  const [currentSet, setCurrentSet] = useState(null);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [showSetSelector, setShowSetSelector] = useState(false);
  
  // Set practice state
  const [setPhase, setSetPhase] = useState('flashcards'); // 'flashcards' | 'quiz' | 'summary'
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardResults, setFlashcardResults] = useState({ known: 0, unknown: 0 });
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [quizResults, setQuizResults] = useState({ correct: 0, incorrect: 0 });

  const displaySubject = user?.selected_subject || 'אנגלית';
  const displayUnits = user?.selected_units || 3;

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

      // Load vocabulary sets (NEW)
      const sets = await base44.entities.VocabularySet.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'set_number', 100);
      setVocabularySets(sets);

      // Load vocabulary words (old system - for backwards compatibility)
      const allWords = await base44.entities.VocabularyQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, null, 500);
      setWords(allWords);
      setFilteredWords(allWords);

      // Extract categories
      const uniqueCategories = [...new Set(allWords.map(w => w.category).filter(Boolean))];
      setCategories(uniqueCategories);

      // Load user progress
      const userProgress = await base44.entities.VocabularyProgress.filter({
        user_email: currentUser.email,
        subject_id: subject
      }, null, 1000);

      const progressMap = {};
      userProgress.forEach(p => {
        progressMap[p.word_id] = p;
      });
      setProgress(progressMap);

      // Calculate stats - include both old words and new sets
      const totalSetWords = sets.reduce((sum, s) => sum + (s.words?.length || 0), 0);
      const learnedWords = userProgress.filter(p => p.is_known).length;
      const weakWords = userProgress.filter(p => p.is_weak).length;
      const totalCorrect = userProgress.reduce((sum, p) => sum + (p.times_correct || 0), 0);
      const totalAttempts = userProgress.reduce((sum, p) => sum + (p.times_seen || 0), 0);
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      const activeErrors = userProgress.filter(p => p.times_incorrect > p.times_correct).length;

      const totalWords = Math.max(allWords.length, totalSetWords);
      const masterySum = userProgress.reduce((sum, p) => sum + (p.mastery_level || 0), 0);
      const readiness = totalWords > 0 ? Math.round((masterySum / (totalWords * 100)) * 100) : 0;

      setStats({
        totalWords,
        totalSets: sets.length,
        learnedWords,
        weakWords,
        accuracy,
        activeErrors,
        readiness: Math.min(100, Math.max(0, readiness))
      });

      // If requested specific set, load it
      if (requestedSetNumber) {
        const set = sets.find(s => s.set_number === parseInt(requestedSetNumber));
        if (set) {
          startSetPractice(set);
        }
      } else if (showSelectorOnLoad) {
        setShowSetSelector(true);
      }

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Start practice with a specific set
  const startSetPractice = (set) => {
    setCurrentSet(set);
    setCurrentSetNumber(set.set_number);
    setMode(PRACTICE_MODES.SET_PRACTICE);
    setSetPhase('flashcards');
    setFlashcardIndex(0);
    setFlashcardResults({ known: 0, unknown: 0 });
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizResults({ correct: 0, incorrect: 0 });
    setQuizAnswer('');
    setShowQuizResult(false);
  };

  // NEW: Handle flashcard answer
  const handleSetFlashcardAnswer = async (isKnown) => {
    const currentWord = currentSet.words[flashcardIndex];
    
    setFlashcardResults(prev => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Save progress
    try {
      const wordId = `set_${currentSet.id}_${flashcardIndex}`;
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
          is_weak: !isKnown,
          last_practiced: new Date().toISOString(),
          mastery_level: Math.min(100, Math.max(0, (p.mastery_level || 0) + (isKnown ? 10 : -15)))
        });
      } else {
        await base44.entities.VocabularyProgress.create({
          word_id: wordId,
          user_email: user.email,
          subject_id: displaySubject,
          unit_level: displayUnits,
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
      // Generate quiz questions from set
      const questions = generateQuizFromSet(currentSet);
      setQuizQuestions(questions);
      setTimeout(() => setSetPhase('quiz'), 500);
    }
  };

  // NEW: Generate quiz questions from set's predefined questions
  const generateQuizFromSet = (set) => {
    const questions = [];
    
    set.words.forEach((word, wordIdx) => {
      if (word.questions && word.questions.length > 0) {
        word.questions.forEach((q, qIdx) => {
          questions.push({
            id: `${wordIdx}_${qIdx}`,
            type: q.type,
            word: word,
            question: q.q,
            correctAnswer: q.a,
            options: q.options || null
          });
        });
      } else {
        // Default question if none provided
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

    return questions.sort(() => Math.random() - 0.5).slice(0, 10);
  };

  // NEW: Check quiz answer
  const handleQuizSubmit = (selectedAnswer = null) => {
    const answer = selectedAnswer || quizAnswer;
    const question = quizQuestions[quizIndex];
    const correct = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    
    setIsQuizCorrect(correct);
    setShowQuizResult(true);
    setQuizResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
  };

  // NEW: Go to next quiz question
  const handleQuizNext = () => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(prev => prev + 1);
      setQuizAnswer('');
      setShowQuizResult(false);
    } else {
      setSetPhase('summary');
    }
  };

  // NEW: Go to next set
  const goToNextSet = () => {
    const nextSet = vocabularySets.find(s => s.set_number === currentSetNumber + 1);
    if (nextSet) {
      startSetPractice(nextSet);
    }
  };

  // NEW: Bulk import JSON
  const handleBulkJsonImport = async () => {
    if (!bulkJsonText.trim()) {
      alert('יש להזין JSON');
      return;
    }

    setIsSaving(true);
    try {
      const data = JSON.parse(bulkJsonText);
      
      // Support multiple formats:
      // 1. { vocabularySets: [...] }
      // 2. [ { setNumber: 1, words: [...] }, ... ]
      // 3. { setNumber: 1, words: [...] } (single set)
      let setsToAdd;
      if (data.vocabularySets) {
        setsToAdd = data.vocabularySets;
      } else if (Array.isArray(data)) {
        setsToAdd = data;
      } else if (data.setNumber || data.set_number || data.words) {
        // Single set object
        setsToAdd = [data];
      } else {
        throw new Error('פורמט לא מזוהה');
      }

      let addedCount = 0;
      for (const setData of setsToAdd) {
        const setNumber = setData.setNumber || setData.set_number || (addedCount + 1);
        
        await base44.entities.VocabularySet.create({
          set_number: setNumber,
          subject_id: displaySubject,
          unit_level: displayUnits,
          title: setData.title || `סט ${setNumber}`,
          words: setData.words.map(w => ({
            english: w.english,
            hebrew: w.hebrew,
            difficulty: w.difficulty || 'medium',
            questions: w.questions || []
          })),
          is_active: true,
          order: setNumber
        });
        addedCount++;
      }

      setShowBulkJsonDialog(false);
      setBulkJsonText('');
      loadData();
      alert(`${addedCount} סטים נוספו בהצלחה! ✅`);
    } catch (error) {
      console.error("Error importing JSON:", error);
      alert('שגיאה בייבוא - ודא שה-JSON תקין\n' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (category === 'all') {
      setFilteredWords(words);
    } else {
      setFilteredWords(words.filter(w => w.category === category));
    }
  };

  const handleUpdateWord = async (wordId, updates) => {
    try {
      const existingProgress = progress[wordId];
      const word = words.find(w => w.id === wordId || w.question_id === wordId);

      if (existingProgress) {
        await base44.entities.VocabularyProgress.update(existingProgress.id, {
          ...updates,
          times_seen: (existingProgress.times_seen || 0) + 1,
          times_correct: (existingProgress.times_correct || 0) + (updates.times_correct || 0),
          times_incorrect: (existingProgress.times_incorrect || 0) + (updates.times_incorrect || 0),
          is_weak: updates.is_weak !== undefined ? updates.is_weak : existingProgress.is_weak,
          is_known: updates.is_known !== undefined ? updates.is_known : existingProgress.is_known,
          last_practiced: new Date().toISOString(),
          mastery_level: calculateMastery(existingProgress, updates)
        });
      } else {
        await base44.entities.VocabularyProgress.create({
          word_id: wordId,
          user_email: user.email,
          subject_id: displaySubject,
          unit_level: displayUnits,
          hebrew_word: word?.hebrew_word || '',
          english_word: word?.english_answer || '',
          times_seen: 1,
          times_correct: updates.times_correct || 0,
          times_incorrect: updates.times_incorrect || 0,
          is_weak: updates.is_weak || false,
          is_known: updates.is_known || false,
          last_practiced: new Date().toISOString(),
          mastery_level: updates.times_correct ? 20 : 0
        });
      }
    } catch (error) {
      console.error("Error updating word progress:", error);
    }
  };

  const calculateMastery = (existing, updates) => {
    const currentMastery = existing.mastery_level || 0;
    if (updates.times_correct) {
      return Math.min(100, currentMastery + 10);
    }
    if (updates.times_incorrect) {
      return Math.max(0, currentMastery - 15);
    }
    return currentMastery;
  };

  const handleAddWord = async () => {
    if (!newWord.hebrew_word || !newWord.english_answer) {
      alert('יש למלא מילה בעברית ותרגום באנגלית');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.VocabularyQuestion.create({
        subject_id: displaySubject,
        unit_level: displayUnits,
        hebrew_word: newWord.hebrew_word,
        english_answer: newWord.english_answer,
        acceptable_answers: newWord.acceptable_answers ? newWord.acceptable_answers.split(',').map(a => a.trim()) : [],
        example_sentence: newWord.example_sentence,
        category: newWord.category || 'כללי',
        difficulty: newWord.difficulty,
        is_active: true
      });

      setShowAddDialog(false);
      setNewWord({
        hebrew_word: '',
        english_answer: '',
        acceptable_answers: '',
        example_sentence: '',
        category: '',
        difficulty: 'medium'
      });
      loadData();
      alert('המילה נוספה בהצלחה! ✅');
    } catch (error) {
      console.error("Error adding word:", error);
      alert('שגיאה בהוספת המילה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      alert('יש להזין מילים');
      return;
    }

    setIsSaving(true);
    try {
      const lines = bulkText.trim().split('\n').filter(line => line.trim());
      const wordsToAdd = [];

      for (const line of lines) {
        // פורמט: מילה בעברית | תרגום באנגלית | קטגוריה (אופציונלי)
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          wordsToAdd.push({
            subject_id: displaySubject,
            unit_level: displayUnits,
            hebrew_word: parts[0],
            english_answer: parts[1],
            category: parts[2] || 'כללי',
            difficulty: 'medium',
            is_active: true
          });
        }
      }

      if (wordsToAdd.length === 0) {
        alert('לא נמצאו מילים בפורמט הנכון.\nפורמט: מילה בעברית | תרגום באנגלית | קטגוריה');
        setIsSaving(false);
        return;
      }

      await base44.entities.VocabularyQuestion.bulkCreate(wordsToAdd);

      setShowBulkAddDialog(false);
      setBulkText('');
      loadData();
      alert(`${wordsToAdd.length} מילים נוספו בהצלחה! ✅`);
    } catch (error) {
      console.error("Error bulk adding words:", error);
      alert('שגיאה בהוספת המילים');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSessionComplete = async (results) => {
    setSessionResults(results);
    setMode(PRACTICE_MODES.SUMMARY);

    // Save session
    try {
      await base44.entities.VocabularySession.create({
        session_type: mode,
        user_email: user.email,
        subject_id: displaySubject,
        unit_level: displayUnits,
        words_practiced: results.total,
        correct_answers: results.correct || results.known || 0,
        incorrect_answers: results.incorrect || results.unknown || 0,
        accuracy: results.accuracy || Math.round(((results.correct || results.known || 0) / results.total) * 100),
        weak_words_found: results.weakWords?.map(w => w.id) || [],
        is_completed: true,
        completed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error saving session:", error);
    }

    // Reload stats
    loadData();
  };

  const getWordsForMode = () => {
    switch (mode) {
      case PRACTICE_MODES.WEAK_WORDS:
        return filteredWords.filter(w => {
          const p = progress[w.id];
          return p?.is_weak || (p?.times_incorrect > p?.times_correct);
        });
      case PRACTICE_MODES.ERROR_PRACTICE:
        return filteredWords.filter(w => {
          const p = progress[w.id];
          return p?.times_incorrect > 0;
        });
      default:
        return filteredWords;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // SET PRACTICE MODE RENDER
  if (mode === PRACTICE_MODES.SET_PRACTICE && currentSet) {
    // Summary phase
    if (setPhase === 'summary') {
      const accuracy = quizQuestions.length > 0 ? Math.round((quizResults.correct / quizQuestions.length) * 100) : 0;
      const hasNextSet = vocabularySets.some(s => s.set_number === currentSetNumber + 1);

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full"
          >
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-gray-900 mb-1">{accuracy}%</div>
              <p className="text-gray-500">ציון סט {currentSetNumber}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{currentSet.words.length}</div>
                <div className="text-xs text-gray-500">מילים</div>
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

            <div className="space-y-2">
              {hasNextSet && (
                <Button onClick={goToNextSet} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold">
                  המשך לסט הבא
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              )}
              <Button onClick={() => startSetPractice(currentSet)} variant="outline" className="w-full h-11">
                <RotateCcw className="w-4 h-4 ml-2" />
                רענן את הסט
              </Button>
              <button onClick={() => setMode(PRACTICE_MODES.DASHBOARD)} className="w-full text-gray-500 text-sm hover:text-gray-700 py-2">
                חזרה לדשבורד
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Quiz phase
    if (setPhase === 'quiz') {
      const question = quizQuestions[quizIndex];
      const quizProgress = quizQuestions.length > 0 ? ((quizIndex + 1) / quizQuestions.length) * 100 : 0;

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
            <button onClick={() => setShowSetSelector(true)} className="p-2 -ml-2 text-gray-500">
              <List className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-900">בוחן - סט {currentSetNumber}</span>
              <span className="text-xs text-gray-500 block">{quizIndex + 1} / {quizQuestions.length}</span>
            </div>
            <div className="w-9" />
          </div>
          
          <Progress value={quizProgress} className="h-1 rounded-none" />

          <div className="flex-1 flex flex-col p-4">
            <AnimatePresence mode="wait">
              <motion.div key={quizIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1 flex flex-col">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
                  <div className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
                    {question.type === 'choose' ? 'בחירה' : question.type === 'fill' ? 'השלמה' : 'תרגום'}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{question.question}</h2>
                </div>

                {!showQuizResult ? (
                  <div className="space-y-3">
                    {question.options && question.options.length > 0 ? (
                      <div className="space-y-2">
                        {question.options.map((option, idx) => (
                          <button key={idx} onClick={() => handleQuizSubmit(option)} className="w-full bg-white rounded-xl p-4 text-right border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                            <span className="text-base font-medium text-gray-900">{option}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input 
                          value={quizAnswer} 
                          onChange={(e) => setQuizAnswer(e.target.value)} 
                          placeholder="הקלד את התשובה..." 
                          className="h-12 text-base" 
                          dir="auto" 
                          autoFocus 
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter' && quizAnswer.trim()) {
                              e.preventDefault();
                              handleQuizSubmit(quizAnswer); 
                            }
                          }} 
                        />
                        <Button 
                          onClick={() => handleQuizSubmit(quizAnswer)} 
                          disabled={!quizAnswer.trim()} 
                          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-semibold"
                        >
                          בדוק
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className={`rounded-xl p-4 ${isQuizCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {isQuizCorrect ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                        <span className={`font-semibold ${isQuizCorrect ? 'text-green-700' : 'text-red-700'}`}>{isQuizCorrect ? 'נכון!' : 'לא נכון'}</span>
                      </div>
                      {!isQuizCorrect && (
                        <div className="bg-white rounded-lg p-3 mt-2">
                          <div className="text-xs text-gray-500 mb-1">התשובה הנכונה:</div>
                          <div className="font-semibold text-gray-900">{question.correctAnswer}</div>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleQuizNext} className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-base font-semibold">{quizIndex < quizQuestions.length - 1 ? 'הבא' : 'סיים'}</Button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <SetSelectorDialog open={showSetSelector} onOpenChange={setShowSetSelector} sets={vocabularySets} currentSetNumber={currentSetNumber} onSelectSet={(setNum) => { setShowSetSelector(false); const set = vocabularySets.find(s => s.set_number === setNum); if (set) startSetPractice(set); }} />
        </div>
      );
    }

    // Flashcards phase
    const currentWord = currentSet?.words?.[flashcardIndex];
    if (!currentWord) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">אין מילים בסט זה</p>
            <Button onClick={() => setMode(PRACTICE_MODES.DASHBOARD)}>חזרה</Button>
          </div>
        </div>
      );
    }
    const flashcardProgress = ((flashcardIndex + 1) / currentSet.words.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
          <button onClick={() => setShowSetSelector(true)} className="p-2 -ml-2 text-gray-500">
            <List className="w-5 h-5" />
          </button>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-900">סט {currentSetNumber}</span>
            <span className="text-xs text-gray-500 block">{flashcardIndex + 1} / {currentSet.words.length}</span>
          </div>
          <div className="w-9" />
        </div>
        
        <Progress value={flashcardProgress} className="h-1 rounded-none" />

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div key={flashcardIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-3xl font-bold text-gray-900 mb-4" dir="ltr">{currentWord.english}</div>
              <div className="text-lg text-gray-600 pt-4 border-t border-gray-100">{currentWord.hebrew}</div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => handleSetFlashcardAnswer(false)} className="flex-1 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-red-300 hover:bg-red-50 transition-colors">
                <X className="w-5 h-5 text-red-500" />
                <span className="font-medium">לא ידעתי</span>
              </button>
              <button onClick={() => handleSetFlashcardAnswer(true)} className="flex-1 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-green-300 hover:bg-green-50 transition-colors">
                <Check className="w-5 h-5 text-green-500" />
                <span className="font-medium">ידעתי</span>
              </button>
            </div>
          </motion.div>
        </div>

        <SetSelectorDialog open={showSetSelector} onOpenChange={setShowSetSelector} sets={vocabularySets} currentSetNumber={currentSetNumber} onSelectSet={(setNum) => { setShowSetSelector(false); const set = vocabularySets.find(s => s.set_number === setNum); if (set) startSetPractice(set); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => mode === PRACTICE_MODES.DASHBOARD ? navigate(createPageUrl("Practice")) : setMode(PRACTICE_MODES.DASHBOARD)}
            className="text-white p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-white">אוצר מילים</h1>
            <p className="text-sm text-white/80">{displaySubject} • {displayUnits} יחידות</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {mode === PRACTICE_MODES.DASHBOARD && (
          <div className="space-y-4">
            <VocabularyDashboard stats={stats} />

            {/* Vocabulary Sets Section - NEW */}
            {vocabularySets.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">סטים ({vocabularySets.length})</h3>
                  <button onClick={() => setShowSetSelector(true)} className="text-blue-600 text-sm font-medium">הצג הכל</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {vocabularySets.slice(0, 5).map(set => (
                    <button
                      key={set.id}
                      onClick={() => startSetPractice(set)}
                      className="flex-shrink-0 w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-xl flex flex-col items-center justify-center hover:border-blue-400 transition-colors"
                    >
                      <span className="text-lg font-bold text-blue-600">{set.set_number}</span>
                      <span className="text-xs text-gray-500">{set.words?.length || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Add Buttons */}
            {user?.role === 'admin' && (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  מילה
                </Button>
                <Button
                  onClick={() => setShowBulkAddDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  הרבה
                </Button>
                <Button
                  onClick={() => setShowBulkJsonDialog(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-1 text-xs"
                >
                  <Upload className="w-4 h-4" />
                  JSON
                </Button>
              </div>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">סנן לפי קטגוריה</span>
                </div>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל ({words.length} מילים)</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat} ({words.filter(w => w.category === cat).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Practice Options */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">בחר סוג תרגול</h3>

              {/* Start from Set 1 - NEW */}
              {vocabularySets.length > 0 && (
                <button
                  onClick={() => {
                    const firstSet = vocabularySets.find(s => s.set_number === 1) || vocabularySets[0];
                    if (firstSet) startSetPractice(firstSet);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl border border-blue-600 p-4 flex items-center gap-4 hover:from-blue-700 hover:to-blue-800 transition-colors text-white"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-bold">התחל מסט 1</div>
                    <div className="text-sm text-white/80">כרטיסיות + מבחן על 10 מילים</div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-white/80" />
                </button>
              )}

              <button
                onClick={() => setMode(PRACTICE_MODES.FLASHCARDS)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-300 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900">כרטיסיות (כל המילים)</div>
                  <div className="text-sm text-gray-600">למידת מילים חדשות</div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => setMode(PRACTICE_MODES.QUICK_PRACTICE)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-300 transition-colors"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900">תרגול מהיר</div>
                  <div className="text-sm text-gray-600">10 שאלות מגוונות</div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => setMode(PRACTICE_MODES.WEAK_WORDS)}
                disabled={stats.weakWords === 0}
                className={`w-full bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  stats.weakWords === 0 ? 'border-gray-100 opacity-50' : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900">מילים חלשות</div>
                  <div className="text-sm text-gray-600">
                    {stats.weakWords > 0 ? `${stats.weakWords} מילים לחיזוק` : 'אין מילים חלשות'}
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => setMode(PRACTICE_MODES.ERROR_PRACTICE)}
                disabled={stats.activeErrors === 0}
                className={`w-full bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  stats.activeErrors === 0 ? 'border-gray-100 opacity-50' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900">תרגול טעויות</div>
                  <div className="text-sm text-gray-600">
                    {stats.activeErrors > 0 ? `${stats.activeErrors} טעויות לתיקון` : 'אין טעויות'}
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {mode === PRACTICE_MODES.FLASHCARDS && (
          <Flashcards
            words={getWordsForMode()}
            onComplete={handleSessionComplete}
            onUpdateWord={handleUpdateWord}
          />
        )}

        {(mode === PRACTICE_MODES.QUICK_PRACTICE || 
          mode === PRACTICE_MODES.WEAK_WORDS || 
          mode === PRACTICE_MODES.ERROR_PRACTICE) && mode !== PRACTICE_MODES.SUMMARY && (
          <QuickPractice
            words={getWordsForMode()}
            questionsCount={mode === PRACTICE_MODES.QUICK_PRACTICE ? 10 : 8}
            onComplete={handleSessionComplete}
            onUpdateWord={handleUpdateWord}
          />
        )}

        {mode === PRACTICE_MODES.SUMMARY && sessionResults && (
          <PracticeSummary
            results={sessionResults}
            onRetry={() => {
              setSessionResults(null);
              setMode(PRACTICE_MODES.QUICK_PRACTICE);
            }}
            onHome={() => {
              setSessionResults(null);
              setMode(PRACTICE_MODES.DASHBOARD);
            }}
            onPracticeWeak={sessionResults.weakWords?.length > 0 ? () => {
              setSessionResults(null);
              setMode(PRACTICE_MODES.WEAK_WORDS);
            } : null}
          />
        )}
      </div>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              הוסף מילים רבות
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
              <div className="text-sm font-bold text-purple-900 mb-1">📋 פורמט:</div>
              <div className="text-xs text-purple-700">מילה בעברית | תרגום באנגלית | קטגוריה</div>
              <div className="text-xs text-purple-600 mt-1">לדוגמה:</div>
              <div className="text-xs text-purple-800 font-mono bg-white rounded p-2 mt-1">
                לרוץ | run | פעלים{'\n'}
                בית | house | שמות עצם{'\n'}
                מהר | fast | תארים
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                הזן מילים (כל שורה = מילה אחת)
              </label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="מילה בעברית | תרגום באנגלית | קטגוריה"
                className="h-48 font-mono text-sm"
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAddDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleBulkAdd}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              הוסף הכל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Word Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              הוסף מילה חדשה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                מילה בעברית *
              </label>
              <Input
                value={newWord.hebrew_word}
                onChange={(e) => setNewWord({ ...newWord, hebrew_word: e.target.value })}
                placeholder="לדוגמה: לרוץ"
                className="text-right"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                תרגום לאנגלית *
              </label>
              <Input
                value={newWord.english_answer}
                onChange={(e) => setNewWord({ ...newWord, english_answer: e.target.value })}
                placeholder="לדוגמה: run"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                תשובות מקובלות נוספות (מופרדות בפסיקים)
              </label>
              <Input
                value={newWord.acceptable_answers}
                onChange={(e) => setNewWord({ ...newWord, acceptable_answers: e.target.value })}
                placeholder="לדוגמה: jog, sprint"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                משפט לדוגמה באנגלית
              </label>
              <Textarea
                value={newWord.example_sentence}
                onChange={(e) => setNewWord({ ...newWord, example_sentence: e.target.value })}
                placeholder="לדוגמה: I like to run in the park."
                dir="ltr"
                className="h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  קטגוריה
                </label>
                <Input
                  value={newWord.category}
                  onChange={(e) => setNewWord({ ...newWord, category: e.target.value })}
                  placeholder="לדוגמה: פעלים"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  רמת קושי
                </label>
                <Select
                  value={newWord.difficulty}
                  onValueChange={(value) => setNewWord({ ...newWord, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">קל</SelectItem>
                    <SelectItem value="medium">בינוני</SelectItem>
                    <SelectItem value="hard">קשה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAddWord}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk JSON Import Dialog - NEW */}
      <Dialog open={showBulkJsonDialog} onOpenChange={setShowBulkJsonDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-600" />
              ייבוא סטים מ-JSON
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
              <div className="text-sm font-bold text-orange-900 mb-2">📋 פורמט JSON:</div>
              <pre className="text-xs text-orange-800 bg-white rounded p-2 overflow-x-auto" dir="ltr">{`{
  "vocabularySets": [
    {
      "setNumber": 1,
      "words": [
        {
          "english": "run",
          "hebrew": "לרוץ",
          "difficulty": "easy",
          "questions": [
            { "type": "translate", "q": "מה פירוש run?", "a": "לרוץ" },
            { "type": "fill", "q": "I like to ___ every morning.", "a": "run" },
            { "type": "choose", "q": "Choose meaning of 'run'", "options": ["לרוץ","לישון","לשבת"], "a": "לרוץ" }
          ]
        }
      ]
    }
  ]
}`}</pre>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                הדבק JSON כאן
              </label>
              <Textarea
                value={bulkJsonText}
                onChange={(e) => setBulkJsonText(e.target.value)}
                placeholder='{"vocabularySets": [...]}'
                className="h-64 font-mono text-sm"
                dir="ltr"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkJsonDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleBulkJsonImport}
              disabled={isSaving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              ייבא סטים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Selector Dialog */}
      <SetSelectorDialog 
        open={showSetSelector} 
        onOpenChange={setShowSetSelector}
        sets={vocabularySets}
        currentSetNumber={currentSetNumber}
        onSelectSet={(setNum) => {
          setShowSetSelector(false);
          const set = vocabularySets.find(s => s.set_number === setNum);
          if (set) startSetPractice(set);
        }}
      />
    </div>
  );
}

// Set Selector Dialog Component
function SetSelectorDialog({ open, onOpenChange, sets, currentSetNumber, onSelectSet }) {
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
                  set.set_number === currentSetNumber 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-100 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                    set.set_number === currentSetNumber ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {set.set_number}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">סט {set.set_number}</div>
                    <div className="text-sm text-blue-600">{set.words?.length || 0} מילים</div>
                  </div>
                </div>
                {set.set_number === currentSetNumber && (
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