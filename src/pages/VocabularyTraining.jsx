import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Layers, Target, AlertTriangle, 
  RotateCcw, Loader2, Filter, Plus, Save, X, Trash2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import VocabularyDashboard from "@/components/vocabulary/VocabularyDashboard";
import Flashcards from "@/components/vocabulary/Flashcards";
import QuickPractice from "@/components/vocabulary/QuickPractice";
import PracticeSummary from "@/components/vocabulary/PracticeSummary";

const PRACTICE_MODES = {
  DASHBOARD: 'dashboard',
  FLASHCARDS: 'flashcards',
  QUICK_PRACTICE: 'quick_practice',
  WEAK_WORDS: 'weak_words',
  ERROR_PRACTICE: 'error_practice',
  SUMMARY: 'summary'
};

export default function VocabularyTrainingPage() {
  const navigate = useNavigate();
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
  const [bulkText, setBulkText] = useState('');
  const [newWord, setNewWord] = useState({
    hebrew_word: '',
    english_answer: '',
    acceptable_answers: '',
    example_sentence: '',
    category: '',
    difficulty: 'medium'
  });
  const [isSaving, setIsSaving] = useState(false);

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

      // Load vocabulary words
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

      // Calculate stats
      const learnedWords = userProgress.filter(p => p.is_known).length;
      const weakWords = userProgress.filter(p => p.is_weak).length;
      const totalCorrect = userProgress.reduce((sum, p) => sum + (p.times_correct || 0), 0);
      const totalAttempts = userProgress.reduce((sum, p) => sum + (p.times_seen || 0), 0);
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      const activeErrors = userProgress.filter(p => p.times_incorrect > p.times_correct).length;

      // Calculate readiness score
      const totalWords = allWords.length;
      const masterySum = userProgress.reduce((sum, p) => sum + (p.mastery_level || 0), 0);
      const readiness = totalWords > 0 ? Math.round((masterySum / (totalWords * 100)) * 100) : 0;

      setStats({
        totalWords,
        learnedWords,
        weakWords,
        accuracy,
        activeErrors,
        readiness: Math.min(100, Math.max(0, readiness))
      });

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
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

            {/* Admin Add Buttons */}
            {user?.role === 'admin' && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  הוסף מילה
                </Button>
                <Button
                  onClick={() => setShowBulkAddDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  הוסף הרבה
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

              <button
                onClick={() => setMode(PRACTICE_MODES.FLASHCARDS)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-300 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900">כרטיסיות</div>
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
    </div>
  );
}