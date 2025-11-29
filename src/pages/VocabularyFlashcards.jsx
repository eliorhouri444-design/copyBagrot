import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, Check, X, Loader2, Volume2, Image as ImageIcon, AlertTriangle, RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function VocabularyFlashcardsPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');
  const resumeIndex = parseInt(urlParams.get('resumeIndex') || '0');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({ known: 0, unknown: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [answeredWords, setAnsweredWords] = useState([]);

  useEffect(() => {
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

        const setWords = allWords.slice(startIndex, endIndex);
        setWords(setWords);
        setCurrentIndex(resumeIndex >= 0 && resumeIndex < setWords.length ? resumeIndex : 0);

      } catch (error) {
        console.error("Error loading vocabulary:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const speakWord = (text, lang = 'en-US') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnswer = async (isKnown) => {
    const currentWord = words[currentIndex];
    
    // Save progress locally for summary
    setAnsweredWords(prev => [...prev, { ...currentWord, isKnown }]);
    setResults(prev => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Update DB
    try {
        // Save bookmark
        await base44.auth.updateMe({
            last_vocabulary_position: {
                set_id: parseInt(setId),
                question_index: currentIndex + 1,
                word_id: currentWord.id,
                mode: 'flashcards',
                timestamp: new Date().toISOString()
            }
        });

        // Update word progress
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
                is_known: isKnown || p.is_known,
                is_weak: !isKnown,
                last_practiced: new Date().toISOString()
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
    } catch (e) {
        console.error("Error saving progress", e);
    }

    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    } else {
      setShowSummary(true);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;

  if (showSummary) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">סיימת את הסט!</h2>
          <p className="text-gray-600 mb-6">
            ידעת {results.known} מתוך {words.length} מילים
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 p-3 rounded-xl">
              <div className="text-xl font-bold text-green-700">{results.known}</div>
              <div className="text-xs text-green-600">ידעתי</div>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <div className="text-xl font-bold text-red-700">{results.unknown}</div>
              <div className="text-xs text-red-600">לחיזוק</div>
            </div>
          </div>

          <Button 
            onClick={() => navigate(createPageUrl(`VocabularyQuickPractice?setId=${setId}&start=${startIndex}&end=${endIndex}`))}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold text-lg"
          >
            תרגל עכשיו בבוחן
          </Button>
          
          <Button 
            onClick={() => navigate(createPageUrl("VocabularySets"))}
            variant="ghost"
            className="w-full mt-2 text-gray-500"
          >
            חזור לרשימה
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  if (!currentWord) return null;

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <button onClick={() => navigate(createPageUrl("VocabularySets"))}>
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="font-bold text-gray-800">
          כרטיס {currentIndex + 1} / {words.length}
        </div>
        <div className="w-6" />
      </div>

      {/* Progress */}
      <div className="h-1 bg-gray-200 w-full">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-6 perspective-1000">
        <motion.div
          className="relative w-full max-w-sm aspect-[3/4] cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 border-2 border-blue-100 backface-hidden">
            <span className="absolute top-6 right-6 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
              אנגלית
            </span>
            
            <h2 className="text-4xl font-black text-gray-900 mb-4 text-center" dir="ltr">
              {currentWord.english_answer}
            </h2>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                speakWord(currentWord.english_answer);
              }}
              className="p-3 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
            >
              <Volume2 className="w-6 h-6 text-blue-600" />
            </button>

            <p className="text-gray-400 text-sm mt-8">לחץ כדי להפוך</p>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 bg-blue-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-white backface-hidden"
            style={{ transform: "rotateY(180deg)" }}
          >
            <span className="absolute top-6 right-6 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
              עברית
            </span>

            <h2 className="text-4xl font-bold mb-2 text-center">
              {currentWord.hebrew_word}
            </h2>

            {currentWord.example_sentence && (
              <div className="mt-6 bg-white/10 p-4 rounded-xl text-center backdrop-blur-sm">
                <p className="text-sm opacity-90 italic" dir="ltr">"{currentWord.example_sentence}"</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-white border-t border-gray-100">
        <div className="flex gap-4 max-w-sm mx-auto">
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 h-14 bg-green-100 hover:bg-green-200 text-green-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-5 h-5" />
            ידעתי
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 h-14 bg-red-100 hover:bg-red-200 text-red-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-5 h-5" />
            לא ידעתי
          </button>
        </div>
      </div>
    </div>
  );
}