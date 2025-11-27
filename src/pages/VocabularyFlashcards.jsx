import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, RotateCcw, Check, X, Loader2, Trophy, ArrowLeft, ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function VocabularyFlashcardsPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({ known: 0, unknown: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [answeredWords, setAnsweredWords] = useState([]);

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
      // Shuffle words
      const shuffled = [...setWords].sort(() => Math.random() - 0.5);
      setWords(shuffled);

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (isKnown) => {
    const currentWord = words[currentIndex];
    
    setAnsweredWords(prev => [...prev, { ...currentWord, isKnown }]);
    setResults(prev => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Update progress in database
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

    // Move to next word or show summary
    if (currentIndex < words.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    } else {
      setShowSummary(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showSummary) {
    const accuracy = Math.round((results.known / words.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">סט {setId} - כרטיסיות</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600">{results.known}</div>
                <div className="text-sm text-gray-600">ידעתי</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-red-200">
                <div className="text-3xl font-bold text-red-600">{results.unknown}</div>
                <div className="text-sm text-gray-600">לא ידעתי</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600">{accuracy}%</div>
              <div className="text-sm text-gray-600 mt-1">הצלחה</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setResults({ known: 0, unknown: 0 });
                setAnsweredWords([]);
                setShowSummary(false);
                loadData();
              }}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl(`VocabularyQuickPractice?setId=${setId}&start=${startIndex}&end=${endIndex}`))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
            >
              עבור לתרגול מהיר
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("VocabularySets"))}
              variant="ghost"
              className="w-full"
            >
              חזור לסטים
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <button
            onClick={() => navigate(createPageUrl(`VocabularySetMode?setId=${setId}&start=${startIndex}&end=${endIndex}`))}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold">כרטיסיות - סט {setId}</h1>
            <p className="text-sm opacity-90">מילה {currentIndex + 1} מתוך {words.length}</p>
          </div>
          <div className="w-10" />
        </div>
        <Progress value={progress} className="h-2 bg-white/20" />
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="perspective-1000"
          >
            <motion.div
              onClick={() => setIsFlipped(!isFlipped)}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-64 cursor-pointer"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div 
                className="absolute inset-0 bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center backface-hidden border-4 border-blue-200"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-sm text-blue-600 font-semibold mb-4">עברית</div>
                <div className="text-4xl font-bold text-gray-900 text-center">
                  {currentWord?.hebrew_word}
                </div>
                <div className="text-sm text-gray-500 mt-6">לחץ להפוך</div>
              </div>

              {/* Back */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center backface-hidden"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-sm text-white/80 font-semibold mb-4">English</div>
                <div className="text-4xl font-bold text-white text-center" dir="ltr">
                  {currentWord?.english_answer}
                </div>
                {currentWord?.example_sentence && (
                  <div className="text-sm text-white/70 mt-6 text-center italic" dir="ltr">
                    "{currentWord.example_sentence}"
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(false)}
              className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <X className="w-10 h-10 text-white" />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(true)}
              className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.button>
          </div>

          <div className="flex justify-center gap-8 mt-4 text-sm">
            <span className="text-red-600 font-semibold">לא ידעתי</span>
            <span className="text-green-600 font-semibold">ידעתי</span>
          </div>
        </div>
      </div>
    </div>
  );
}