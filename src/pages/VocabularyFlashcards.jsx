import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Check, X, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function VocabularyFlashcardsPage() {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState({ known: 0, unknown: 0 });
  const [answeredWords, setAnsweredWords] = useState([]);
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

      let wordsForPractice = [];
      if (isMultiSet) {
        const setsData = JSON.parse(sessionStorage.getItem('vocabSetsData') || '[]');
        setsData.forEach(set => {
          wordsForPractice = [...wordsForPractice, ...allWords.slice(set.startIndex, set.endIndex)];
        });
      } else {
        wordsForPractice = allWords.slice(startIndex, endIndex);
      }
      
      setWords(wordsForPractice);

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
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    } else {
      setShowSummary(true);
    }
  };

  const getEvaluation = () => {
    const ratio = results.known / words.length;
    if (ratio >= 0.8) return { text: "מצוין! אתה שולט במילים", color: "text-green-600" };
    if (ratio >= 0.6) return { text: "בסדר, אפשר להתקדם", color: "text-blue-600" };
    if (ratio >= 0.4) return { text: "כדאי לחזור על המילים שוב", color: "text-orange-600" };
    return { text: "צריך לתרגל עוד, אל תוותר!", color: "text-red-600" };
  };

  // Auto-continue to quiz
  useEffect(() => {
    if (showSummary) {
      sessionStorage.setItem('flashcardResults', JSON.stringify(answeredWords));
      const timer = setTimeout(() => {
        if (isMultiSet) {
          navigate(createPageUrl(`VocabularyQuickPractice?multiSet=true&sets=${setsParam}`));
        } else {
          navigate(createPageUrl(`VocabularyQuickPractice?setId=${setId}&start=${startIndex}&end=${endIndex}`));
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSummary]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (showSummary) {
    const evaluation = getEvaluation();
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center"
        >
          <div className="mb-4">
            <div className="text-4xl font-bold text-gray-900">{results.known}/{words.length}</div>
            <p className={`text-sm mt-2 ${evaluation.color}`}>{evaluation.text}</p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">עובר לבוחן...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleAnswerWithFlip = (isKnown) => {
    setIsFlipped(false);
    handleAnswer(isKnown);
  };

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">אין מילים זמינות</p>
          <Button onClick={() => navigate(createPageUrl("VocabularySets"))}>
            חזור
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
          שאלה {currentIndex + 1} מתוך {words.length}
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

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm"
        >
          {/* 3D Flip Card */}
          <div 
            className="relative w-full h-[300px] cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={handleFlip}
          >
            <motion.div
              className="relative w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front Side */}
              <div 
                className="absolute inset-0 bg-white rounded-[28px] border-2 border-blue-100 shadow-lg flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-3xl font-bold text-gray-900 mb-4 text-center" dir="ltr">
                  {currentWord.english_answer}
                </div>
                <p className="text-blue-500 text-lg mb-6">← לחץ להפוך</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                  className="px-6 py-2.5 rounded-2xl border-2 border-blue-400 text-blue-600 font-medium bg-transparent hover:bg-blue-50 transition-colors"
                >
                  הפוך כרטיס
                </button>
              </div>

              {/* Back Side */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white rounded-[28px] border-2 border-blue-200 shadow-lg flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-3xl font-bold text-gray-900 mb-3 text-center">
                  {currentWord.hebrew_word}
                </div>
                <div className="text-xl text-blue-600 text-center" dir="ltr">
                  {currentWord.english_answer}
                </div>
                {currentWord.example_sentence && (
                  <div className="text-sm text-gray-500 text-center mt-6 p-3 bg-white/70 rounded-xl max-w-xs" dir="ltr">
                    "{currentWord.example_sentence}"
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => handleAnswerWithFlip(true)}
              className="flex-1 h-14 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-green-100 hover:border-green-300 transition-all"
            >
              <Check className="w-5 h-5 text-green-600" />
              <span className="font-semibold">ידעתי</span>
            </button>
            
            <button
              onClick={() => handleAnswerWithFlip(false)}
              className="flex-1 h-14 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-red-100 hover:border-red-300 transition-all"
            >
              <X className="w-5 h-5 text-red-500" />
              <span className="font-semibold">לא ידעתי</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}