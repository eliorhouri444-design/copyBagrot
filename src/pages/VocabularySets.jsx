import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Loader2, Check, Lock, Plus, Save, Crown, CheckSquare, Square
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function VocabularySetsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [sets, setSets] = useState([]);
  const [progress, setProgress] = useState({});
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSets, setSelectedSets] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

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
      }, 'order', 500);
      setWords(allWords);

      // Chunk into sets of 10
      const chunkedSets = [];
      for (let i = 0; i < allWords.length; i += 10) {
        chunkedSets.push({
          id: Math.floor(i / 10) + 1,
          words: allWords.slice(i, i + 10),
          startIndex: i,
          endIndex: Math.min(i + 10, allWords.length)
        });
      }
      setSets(chunkedSets);

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

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSetProgress = (set) => {
    const knownWords = set.words.filter(w => progress[w.id]?.is_known).length;
    return Math.round((knownWords / set.words.length) * 100);
  };

  const getSetStatus = (set) => {
    const prog = getSetProgress(set);
    if (prog === 100) return 'completed';
    if (prog > 0) return 'in_progress';
    return 'not_started';
  };

  const toggleSetSelection = (setId) => {
    setSelectedSets(prev => 
      prev.includes(setId) 
        ? prev.filter(id => id !== setId)
        : [...prev, setId]
    );
  };

  const selectAllSets = () => {
    const availableSets = sets.filter((_, idx) => user?.is_premium || idx < 3);
    setSelectedSets(availableSets.map(s => s.id));
  };

  const startSelectedSetsPractice = () => {
    if (selectedSets.length === 0) return;
    
    // Get all words from selected sets
    const selectedSetObjects = sets.filter(s => selectedSets.includes(s.id));
    const allStartIndices = selectedSetObjects.map(s => s.startIndex);
    const allEndIndices = selectedSetObjects.map(s => s.endIndex);
    
    const minStart = Math.min(...allStartIndices);
    const maxEnd = Math.max(...allEndIndices);
    
    // Store selected sets in session for multi-set practice
    sessionStorage.setItem('selectedVocabSets', JSON.stringify(selectedSets));
    sessionStorage.setItem('vocabSetsData', JSON.stringify(selectedSetObjects));
    
    navigate(createPageUrl(`VocabularyFlashcards?multiSet=true&sets=${selectedSets.join(',')}`));
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      alert('יש להזין מילים');
      return;
    }

    setIsSaving(true);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(bulkText.trim());
      } catch (e) {
        alert('שגיאה בפורמט JSON. וודא שהפורמט תקין.');
        setIsSaving(false);
        return;
      }

      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }

      const wordsToAdd = parsedData.map((item, idx) => ({
        subject_id: displaySubject,
        unit_level: displayUnits,
        hebrew_word: item.hebrew_word || item.hebrew || item.heb,
        english_answer: item.english_answer || item.english || item.eng || item.answer,
        category: item.category || 'כללי',
        example_sentence: item.example_sentence || item.example || '',
        acceptable_answers: item.acceptable_answers || [],
        difficulty: item.difficulty || 'medium',
        is_active: true,
        order: words.length + idx
      })).filter(w => w.hebrew_word && w.english_answer);

      if (wordsToAdd.length === 0) {
        alert('לא נמצאו מילים תקינות. וודא שכל אובייקט מכיל hebrew_word ו-english_answer');
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
      alert('שגיאה בהוספת המילים: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("Practice"))}
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

      <div className="px-5 py-4 space-y-4">
        {/* Stats Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">סך הכל</h3>
            <span className="text-sm text-blue-600 font-semibold">{words.length} מילים</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(progress).filter(p => p.is_known).length}
              </div>
              <div className="text-xs text-green-700">נלמדו</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(progress).filter(p => p.is_weak).length}
              </div>
              <div className="text-xs text-orange-700">לחיזוק</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sets.length}
              </div>
              <div className="text-xs text-blue-700">סטים</div>
            </div>
          </div>
        </div>

        {/* Admin Add Button */}
        {user?.role === 'admin' && (
          <Button
            onClick={() => setShowBulkAddDialog(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            הוסף מילים חדשות
          </Button>
        )}

        {/* Sets List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">בחר סט לתרגול</h3>
            <div className="flex gap-2">
              {selectionMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSets}
                    className="text-blue-600 text-xs"
                  >
                    בחר הכל
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedSets([]);
                    }}
                    className="text-gray-600 text-xs"
                  >
                    ביטול
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  className="text-blue-600 text-xs"
                >
                  בחר מספר סטים
                </Button>
              )}
            </div>
          </div>
          
          {/* Selected sets action bar */}
          {selectionMode && selectedSets.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-800">
                {selectedSets.length} סטים נבחרו ({selectedSets.length * 10} מילים)
              </span>
              <Button
                onClick={startSelectedSetsPractice}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                התחל תרגול
              </Button>
            </div>
          )}
          
          {sets.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h4 className="font-bold text-gray-900 mb-1">אין מילים עדיין</h4>
              <p className="text-sm text-gray-600">הוסף מילים כדי להתחיל לתרגל</p>
            </div>
          ) : (
            sets.map((set, index) => {
              const setProgress = getSetProgress(set);
              const status = getSetStatus(set);
              const isLocked = !user?.is_premium && index >= 3;

              const isSelected = selectedSets.includes(set.id);
              
              return (
                <motion.button
                  key={set.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    if (selectionMode && !isLocked) {
                      toggleSetSelection(set.id);
                    } else if (isLocked) {
                      navigate(createPageUrl("Premium"));
                    } else {
                      navigate(createPageUrl(`VocabularyFlashcards?setId=${set.id}&start=${set.startIndex}&end=${set.endIndex}`));
                    }
                  }}
                  className={`w-full bg-white rounded-2xl p-4 flex items-center gap-4 border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isLocked 
                        ? 'border-gray-200 opacity-70' 
                        : status === 'completed' 
                          ? 'border-green-300 bg-green-50' 
                          : status === 'in_progress'
                            ? 'border-blue-300'
                            : 'border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {/* Selection checkbox or Set Number */}
                  {selectionMode && !isLocked ? (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-blue-600' : 'bg-gray-100'
                    }`}>
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-white" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isLocked 
                        ? 'bg-gray-100' 
                        : status === 'completed' 
                          ? 'bg-green-500' 
                          : 'bg-blue-600'
                    }`}>
                      {isLocked ? (
                        <Lock className="w-6 h-6 text-gray-400" />
                      ) : status === 'completed' ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-xl font-bold text-white">{set.id}</span>
                      )}
                    </div>
                  )}

                  {/* Set Info */}
                  <div className="flex-1 text-right">
                    <div className="font-bold text-gray-900 mb-1">
                      סט {set.id}
                      {isLocked && <Crown className="w-4 h-4 text-amber-500 inline mr-2" />}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {set.words.length} מילים
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${setProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{setProgress}% הושלם</div>
                  </div>

                  <ChevronLeft className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </motion.button>
              );
            })
          )}
        </div>

        {/* Premium Banner */}
        {!user?.is_premium && sets.length > 3 && (
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8" />
              <div className="flex-1">
                <h4 className="font-bold">שדרג לפרימיום</h4>
                <p className="text-sm opacity-90">גישה לכל {sets.length} הסטים</p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl("Premium"))}
                className="bg-white text-amber-600 hover:bg-gray-100"
              >
                שדרג
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              הוסף מילים חדשות (JSON)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
              <div className="text-sm font-bold text-purple-900 mb-1">📋 פורמט JSON:</div>
              <div className="text-xs text-purple-700 mb-2">העתק מערך JSON עם המילים</div>
              <pre className="text-xs text-purple-800 font-mono bg-white rounded p-2 overflow-x-auto" dir="ltr">
{`[
  {
    "hebrew_word": "לרוץ",
    "english_answer": "run",
    "category": "פעלים",
    "example_sentence": "I run every morning"
  },
  {
    "hebrew_word": "בית",
    "english_answer": "house",
    "category": "שמות עצם"
  }
]`}
              </pre>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                הדבק JSON כאן:
              </label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder='[{"hebrew_word": "...", "english_answer": "...", "category": "..."}]'
                className="h-64 font-mono text-sm"
                dir="ltr"
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
    </div>
  );
}