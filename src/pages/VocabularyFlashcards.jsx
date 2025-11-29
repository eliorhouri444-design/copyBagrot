import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, RotateCcw, Check, X, ArrowRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function VocabularyFlashcards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const subject = user?.selected_subject || 'אנגלית';
      
      // Fetch words
      const vocabList = await base44.entities.VocabularyQuestion.list();
      
      // Filter for relevant words (you might want to add logic here to filter by unit/topic)
      const relevantWords = vocabList.filter(w => w.subject_id === subject || !w.subject_id);
      
      if (relevantWords.length > 0) {
        // Shuffle words
        const shuffled = relevantWords.sort(() => Math.random() - 0.5);
        setWords(shuffled);
      } else {
        setWords([]);
      }
    } catch (error) {
      console.error("Error loading words:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setFinished(true);
      }
    }, 200);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRestart = () => {
    setFinished(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    loadWords(); // Reshuffle
  };

  const speak = (text, lang = 'en-US') => {
    if (!text) return;
    // Cancel current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower
    window.speechSynthesis.speak(utterance);
  };

  const handleCardClick = (e) => {
    // Don't flip if clicking audio button
    if (e.target.closest('.audio-btn')) return;
    handleFlip();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">אין מילים זמינות</h2>
        <p className="text-gray-600 mb-8">לא נמצאו מילים לתרגול במאגר.</p>
        <Button onClick={() => navigate(createPageUrl("Practice"))}>חזור לתרגול</Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">כל הכבוד!</h2>
          <p className="text-gray-600 mb-8">עברת על כל הכרטיסיות בסבב זה.</p>
          <div className="space-y-3">
            <Button onClick={handleRestart} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <RotateCcw className="w-4 h-4 ml-2" />
              תרגל שוב
            </Button>
            <Button onClick={() => navigate(createPageUrl("Practice"))} variant="outline" className="w-full">
              חזור לדף הראשי
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Practice"))}>
          <ArrowRight className="w-6 h-6" />
        </Button>
        <h1 className="font-bold text-lg">כרטיסיות מילים</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 h-2">
        <div 
          className="bg-blue-600 h-2 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        ></div>
      </div>
      <div className="text-center text-sm text-gray-500 py-2">
        {currentIndex + 1} / {words.length}
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-20">
        <div 
          className="relative w-full max-w-md aspect-[3/4] sm:aspect-[4/3] cursor-pointer perspective-1000"
          onClick={handleCardClick}
        >
          <motion.div
            className="w-full h-full relative preserve-3d transition-all duration-500"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 border-2 border-blue-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="audio-btn absolute top-4 right-4 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full w-10 h-10"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(currentWord.english_answer || currentWord.english_word);
                }}
              >
                <Volume2 className="w-6 h-6" />
              </Button>

              <span className="text-sm text-blue-500 font-bold uppercase tracking-wider mb-8">אנגלית</span>
              
              <h2 className="text-5xl font-black text-gray-800 text-center break-words max-w-full leading-tight">
                {currentWord.english_answer || currentWord.english_word}
              </h2>
              
              <div className="mt-auto pt-8 text-gray-300 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>לחץ להיפוך</span>
              </div>
            </div>

            {/* Back */}
            <div 
              className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 relative overflow-hidden"
              style={{ transform: "rotateY(180deg)" }}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none"></div>
              
              <span className="text-sm text-blue-200 font-bold uppercase tracking-wider mb-6">תרגום</span>
              
              <h2 className="text-4xl font-bold text-center break-words max-w-full mb-6">
                {currentWord.hebrew_word}
              </h2>
              
              {currentWord.example_sentence && (
                <div className="mt-2 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-lg text-center w-full border border-white/10">
                  <p className="italic opacity-90 font-medium">"{currentWord.example_sentence}"</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="audio-btn mt-2 text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(currentWord.example_sentence);
                    }}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center gap-4">
        <Button 
          onClick={handleNext} 
          className="w-full max-w-md h-14 text-lg font-bold rounded-xl shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          הבא <ChevronLeft className="w-5 h-5 mr-1" />
        </Button>
      </div>
    </div>
  );
}