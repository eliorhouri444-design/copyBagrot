import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Loader2, Check, Lock, Plus, Save, Crown, CheckSquare, Square,
  ArrowUp, ArrowDown, Trash2, Edit, GripVertical, AlertTriangle
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
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [managingWords, setManagingWords] = useState([]);
  const [editingWord, setEditingWord] = useState(null);
  const [deletingSet, setDeletingSet] = useState(null);
  const [maxWordsLimit, setMaxWordsLimit] = useState(50);
  const [existingDuplicates, setExistingDuplicates] = useState([]);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);

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

      // Check for existing duplicates in the database
      const duplicatesFound = [];
      const seenEnglish = new Map();
      const seenHebrew = new Map();
      
      allWords.forEach((word, idx) => {
        const englishLower = word.english_answer.toLowerCase().trim();
        const hebrewTrim = word.hebrew_word.trim();
        
        if (seenEnglish.has(englishLower)) {
          duplicatesFound.push({
            type: 'english',
            word: word,
            originalIndex: seenEnglish.get(englishLower),
            duplicateIndex: idx
          });
        } else {
          seenEnglish.set(englishLower, idx);
        }
        
        if (seenHebrew.has(hebrewTrim)) {
          duplicatesFound.push({
            type: 'hebrew',
            word: word,
            originalIndex: seenHebrew.get(hebrewTrim),
            duplicateIndex: idx
          });
        } else {
          seenHebrew.set(hebrewTrim, idx);
        }
      });
      
      setExistingDuplicates(duplicatesFound);

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

  const openManageDialog = () => {
    setManagingWords([...words].sort((a, b) => (a.order || 0) - (b.order || 0)));
    setShowManageDialog(true);
  };

  const moveWord = (index, direction) => {
    const newWords = [...managingWords];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newWords.length) return;
    
    [newWords[index], newWords[targetIndex]] = [newWords[targetIndex], newWords[index]];
    setManagingWords(newWords);
  };

  const deleteWord = async (wordId) => {
    if (!confirm('האם למחוק את המילה?')) return;
    try {
      await base44.entities.VocabularyQuestion.delete(wordId);
      setManagingWords(prev => prev.filter(w => w.id !== wordId));
      setWords(prev => prev.filter(w => w.id !== wordId));
    } catch (error) {
      console.error("Error deleting word:", error);
      alert('שגיאה במחיקת המילה');
    }
  };

  const saveWordOrder = async () => {
    setIsSaving(true);
    try {
      for (let i = 0; i < managingWords.length; i++) {
        if (managingWords[i].order !== i) {
          await base44.entities.VocabularyQuestion.update(managingWords[i].id, { order: i });
        }
      }
      setShowManageDialog(false);
      loadData();
      alert('הסדר נשמר בהצלחה!');
    } catch (error) {
      console.error("Error saving order:", error);
      alert('שגיאה בשמירת הסדר');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSet = async (set) => {
    if (!confirm(`האם למחוק את סט ${set.id}? (${set.words.length} מילים)`)) return;
    
    setIsSaving(true);
    try {
      // Delete all words in this set
      for (const word of set.words) {
        await base44.entities.VocabularyQuestion.delete(word.id);
      }
      loadData();
      alert(`סט ${set.id} נמחק בהצלחה!`);
    } catch (error) {
      console.error("Error deleting set:", error);
      alert('שגיאה במחיקת הסט');
    } finally {
      setIsSaving(false);
    }
  };

  const updateWord = async (wordId, updates) => {
    try {
      await base44.entities.VocabularyQuestion.update(wordId, updates);
      setManagingWords(prev => prev.map(w => w.id === wordId ? { ...w, ...updates } : w));
      setEditingWord(null);
      loadData();
    } catch (error) {
      console.error("Error updating word:", error);
      alert('שגיאה בעדכון המילה');
    }
  };

  // Export all words as clean JSON
  const exportWordsAsJSON = () => {
    const cleanWords = words.map(w => ({
      hebrew_word: w.hebrew_word,
      english_answer: w.english_answer,
      example_sentence: w.example_sentence || '',
      example_sentence_he: w.example_sentence_he || '',
      part_of_speech: w.part_of_speech || '',
      image_url: w.image_url || '',
      audio: {
        english_audio_url: w.audio?.english_audio_url || '',
        hebrew_audio_url: w.audio?.hebrew_audio_url || ''
      }
    }));
    
    const jsonString = JSON.stringify(cleanWords, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_${displaySubject}_${displayUnits}_units.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      // Build existing words lookup for duplicate detection
      const existingEnglish = new Set(words.map(w => w.english_answer.toLowerCase().trim()));
      const existingHebrew = new Set(words.map(w => w.hebrew_word.trim()));

      let duplicatesSkipped = 0;
      let currentOrder = words.length;

      const wordsToAdd = parsedData.map((item) => {
        // Support multiple key formats
        const hebrewWord = (item.hebrew_word || item.hebrew || item.heb || '').trim();
        const englishAnswer = (item.english_answer || item.english || item.eng || item.word || item.answer || '').trim();

        if (!hebrewWord || !englishAnswer) return null;

        // Check for duplicates
        const englishLower = englishAnswer.toLowerCase();
        if (existingEnglish.has(englishLower) || existingHebrew.has(hebrewWord)) {
          duplicatesSkipped++;
          return null;
        }

        // Add to lookup to prevent duplicates within the same upload
        existingEnglish.add(englishLower);
        existingHebrew.add(hebrewWord);

        const newWord = {
          subject_id: displaySubject,
          unit_level: displayUnits,
          hebrew_word: hebrewWord,
          english_answer: englishAnswer,
          category: item.category || 'כללי',
          example_sentence: item.example_sentence || item.example || item.sentence || '',
          example_sentence_he: item.example_sentence_he || '',
          acceptable_answers: item.acceptable_answers || [],
          synonyms: item.synonyms || [],
          antonyms: item.antonyms || [],
          part_of_speech: item.part_of_speech || item.pos || item.type || '',
          difficulty: typeof item.difficulty === 'number' ? item.difficulty : (item.level || 1),
          cefr_level: item.cefr_level || item.cefr || '',
          phonetic: item.phonetic || '',
          audio: item.audio || (item.audio_url ? { english_audio_url: item.audio_url } : { english_audio_url: '', hebrew_audio_url: '' }),
          image_url: item.image_url || '',
          collocations: item.collocations || [],
          context_sentences: item.context_sentences || [],
          tags: item.tags || [],
          is_active: true,
          order: currentOrder++
        };

        return newWord;
      }).filter(w => w !== null);

      if (wordsToAdd.length === 0) {
        if (duplicatesSkipped > 0) {
          alert(`❌ כל ${duplicatesSkipped} המילים כבר קיימות במאגר.`);
        } else {
          alert('לא נמצאו מילים תקינות. וודא שכל אובייקט מכיל hebrew_word ו-english_answer');
        }
        setIsSaving(false);
        return;
      }

      // Split into batches for bulk creation (API limit)
      const batchSize = 50;
      const limitedWords = wordsToAdd.slice(0, maxWordsLimit);
      let totalAdded = 0;

      for (let i = 0; i < limitedWords.length; i += batchSize) {
        const batch = limitedWords.slice(i, i + batchSize);
        await base44.entities.VocabularyQuestion.bulkCreate(batch);
        totalAdded += batch.length;
      }

      // Calculate how many sets were created
      const newSetsCount = Math.ceil(totalAdded / 10);

      setShowBulkAddDialog(false);
      setBulkText('');
      loadData();
      
      let message = `✅ ${totalAdded} מילים נוספו בהצלחה!\n\n📚 נוצרו ${newSetsCount} סטים חדשים (כל סט = 10 מילים)`;
      if (duplicatesSkipped > 0) {
        message += `\n\n⚠️ ${duplicatesSkipped} מילים כפולות לא נוספו`;
      }
      alert(message);
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
        {/* Duplicates Warning */}
        {existingDuplicates.length > 0 && user?.role === 'admin' && (
          <div 
            onClick={() => setShowDuplicatesDialog(true)}
            className="bg-amber-50 rounded-2xl p-4 shadow-sm border-2 border-amber-300 cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div className="flex-1">
                <h4 className="font-bold text-amber-900">נמצאו {existingDuplicates.length} כפילויות!</h4>
                <p className="text-sm text-amber-700">לחץ כאן לצפייה ומחיקה</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        )}

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

        {/* Admin Buttons */}
        {user?.role === 'admin' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBulkAddDialog(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                הוסף מילים
              </Button>
              <Button
                onClick={openManageDialog}
                variant="outline"
                className="flex-1 border-2 border-purple-300 text-purple-600 h-12 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Edit className="w-5 h-5" />
                סדר מילים
              </Button>
            </div>
            <Button
              onClick={exportWordsAsJSON}
              variant="outline"
              className="w-full border-2 border-green-300 text-green-600 h-10 font-bold rounded-xl flex items-center justify-center gap-2"
            >
              📥 ייצא רשימת מילים (JSON)
            </Button>
          </div>
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

                  {user?.role === 'admin' && !selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSet(set);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  <ChevronLeft className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </motion.button>
              );
            })
          )}
        </div>

        {/* Strengthen Weak Words Button */}
        {Object.values(progress).filter(p => p.is_weak).length > 0 && (
          <Button
            onClick={() => navigate(createPageUrl("VocabularyStrengthen"))}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            חזק {Object.values(progress).filter(p => p.is_weak).length} מילים חלשות
          </Button>
        )}

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

      {/* Manage Words Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-600" />
              ניהול וסידור מילים
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-4 max-h-[60vh] overflow-y-auto">
            {managingWords.map((word, index) => (
              <div
                key={word.id}
                className="bg-white rounded-xl p-3 border border-gray-200 flex items-center gap-3"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveWord(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveWord(index, 'down')}
                    disabled={index === managingWords.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600">
                  {index + 1}
                </div>

                <div className="flex-1">
                  {editingWord === word.id ? (
                    <div className="flex gap-2">
                      <Input
                        defaultValue={word.hebrew_word}
                        id={`heb-${word.id}`}
                        placeholder="עברית"
                        className="flex-1 text-sm"
                      />
                      <Input
                        defaultValue={word.english_answer}
                        id={`eng-${word.id}`}
                        placeholder="English"
                        className="flex-1 text-sm"
                        dir="ltr"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const heb = document.getElementById(`heb-${word.id}`).value;
                          const eng = document.getElementById(`eng-${word.id}`).value;
                          updateWord(word.id, { hebrew_word: heb, english_answer: eng });
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{word.hebrew_word}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-blue-600" dir="ltr">{word.english_answer}</span>
                      {word.part_of_speech && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {word.part_of_speech}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingWord(editingWord === word.id ? null : word.id)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWord(word.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={saveWordOrder}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              שמור סדר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {/* Max Words Limit Selector */}
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-200">
                <span className="text-sm font-semibold text-blue-900">מקסימום מילים:</span>
                <Select value={maxWordsLimit.toString()} onValueChange={(val) => setMaxWordsLimit(parseInt(val))}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-blue-600">(יותר מילים = יותר זמן)</span>
              </div>

              {/* Format Examples Tabs */}
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                <div className="text-sm font-bold text-purple-900 mb-2">📋 פורמטים נתמכים:</div>

                {/* Basic Format */}
                <details className="mb-2">
                  <summary className="text-xs font-semibold text-purple-700 cursor-pointer hover:text-purple-900">
                    🟢 פורמט בסיסי (3 יח')
                  </summary>
                  <pre className="text-xs text-purple-800 font-mono bg-white rounded p-2 mt-1 overflow-x-auto" dir="ltr">
        {`[
        {
        "hebrew_word": "לרוץ",
        "english_answer": "run",
        "example_sentence": "I run every morning."
        }
        ]`}
                  </pre>
                </details>

                {/* Intermediate Format */}
                <details className="mb-2">
                  <summary className="text-xs font-semibold text-purple-700 cursor-pointer hover:text-purple-900">
                    🟡 פורמט בינוני (4 יח')
                  </summary>
                  <pre className="text-xs text-purple-800 font-mono bg-white rounded p-2 mt-1 overflow-x-auto" dir="ltr">
        {`[
        {
        "hebrew_word": "להעדיף",
        "english_answer": "prefer",
        "example_sentence": "I prefer to study at night.",
        "synonyms": ["like more"],
        "part_of_speech": "verb",
        "difficulty": 3
        }
        ]`}
                  </pre>
                </details>

                {/* Advanced Format */}
                <details className="mb-2">
                  <summary className="text-xs font-semibold text-purple-700 cursor-pointer hover:text-purple-900">
                    🟠 פורמט מתקדם (5 יח')
                  </summary>
                  <pre className="text-xs text-purple-800 font-mono bg-white rounded p-2 mt-1 overflow-x-auto" dir="ltr">
        {`[
        {
        "hebrew_word": "להעריך",
        "english_answer": "evaluate",
        "example_sentence": "We need to evaluate the results.",
        "example_sentence_he": "אנחנו צריכים להעריך את התוצאות.",
        "synonyms": ["assess", "judge"],
        "antonyms": ["ignore"],
        "part_of_speech": "verb",
        "difficulty": 5,
        "cefr_level": "B2"
        }
        ]`}
                  </pre>
                </details>

                {/* Full Format */}
                <details className="mb-2">
                  <summary className="text-xs font-semibold text-purple-700 cursor-pointer hover:text-purple-900">
                    🔴 פורמט מלא (עם אודיו ותמונה)
                  </summary>
                  <pre className="text-xs text-purple-800 font-mono bg-white rounded p-2 mt-1 overflow-x-auto" dir="ltr">
        {`[
        {
        "hebrew_word": "להעריך",
        "english_answer": "evaluate",
        "example_sentence": "Evaluate the results carefully.",
        "synonyms": ["assess"],
        "antonyms": ["ignore"],
        "part_of_speech": "verb",
        "difficulty": 5,
        "cefr_level": "C1",
        "phonetic": "ɪˈvæljueɪt",
        "audio": {
        "english_audio_url": "https://...",
        "hebrew_audio_url": "https://..."
        },
        "image_url": "https://...",
        "collocations": ["evaluate results", "evaluate performance"],
        "context_sentences": ["The teacher evaluated the project."],
        "tags": ["academic", "bagrut"]
        }
        ]`}
                  </pre>
                </details>

                {/* Alternative Keys */}
                <details>
                  <summary className="text-xs font-semibold text-purple-700 cursor-pointer hover:text-purple-900">
                    🔄 מפתחות חלופיים נתמכים
                  </summary>
                  <div className="text-xs text-purple-800 bg-white rounded p-2 mt-1" dir="ltr">
                    <div><code>english</code> / <code>eng</code> / <code>word</code> → english_answer</div>
                    <div><code>hebrew</code> / <code>heb</code> → hebrew_word</div>
                    <div><code>example</code> / <code>sentence</code> → example_sentence</div>
                    <div><code>pos</code> / <code>type</code> → part_of_speech</div>
                    <div><code>level</code> → difficulty</div>
                    <div><code>audio_url</code> → audio.english_audio_url</div>
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  הדבק JSON כאן:
                </label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder='[{"hebrew_word": "...", "english_answer": "...", ...}]'
                  className="h-48 font-mono text-sm"
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