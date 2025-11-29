import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Volume2, 
  ArrowRight,
  Settings,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VocabularyFlashcards() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    if (words.length > 0 && !isFlipped && autoPlay) {
      // Small delay to allow transition to finish
      const timer = setTimeout(() => {
        speak(words[currentIndex].english_answer || words[currentIndex].english_word);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, words, isFlipped, autoPlay]);

  const loadWords = async () => {
    try {
      setLoading(true);
      const vocabList = await base44.entities.VocabularyQuestion.list();
      
      if (vocabList.length > 0) {
        const shuffled = vocabList.sort(() => Math.random() - 0.5);
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

  const speak = (text, lang = 'en-US') => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setDirection(1);
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('.no-flip')) return;
    setIsFlipped(!isFlipped);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <RotateCcw className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">המאגר ריק</h2>
        <p className="text-gray-600 mb-8">לא נמצאו מילים לתרגול כרגע.</p>
        <Button onClick={() => navigate(createPageUrl("Practice"))} className="bg-blue-600 hover:bg-blue-700">
          חזור לתרגול
        </Button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Practice"))} className="text-gray-600 hover:bg-gray-100">
            <ArrowRight className="w-6 h-6" />
          </Button>
          <span className="font-bold text-lg text-gray-800">אוצר מילים</span>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-between p-2">
                <Label htmlFor="autoplay" className="text-sm">השמעה אוטומטית</Label>
                <Switch 
                  id="autoplay" 
                  checked={autoPlay} 
                  onCheckedChange={setAutoPlay} 
                />
              </div>
              <DropdownMenuItem onClick={() => {
                setWords([...words].sort(() => Math.random() - 0.5));
                setCurrentIndex(0);
                setIsFlipped(false);
              }}>
                <RotateCcw className="w-4 h-4 mr-2" />
                ערבב מילים
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-200">
        <motion.div 
          className="h-full bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        
        {/* Card Container */}
        <div className="w-full max-w-md aspect-[4/5] sm:aspect-[3/2] relative perspective-1000">
          <motion.div
            className="w-full h-full relative preserve-3d cursor-pointer"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            onClick={handleCardClick}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front of Card (English) */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center justify-center p-8">
              <div className="absolute top-6 right-6">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="no-flip w-12 h-12 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600"
                  onClick={(e) => {
                    speak(currentWord.english_answer || currentWord.english_word);
                  }}
                >
                  <Volume2 className="w-6 h-6" />
                </Button>
              </div>
              
              <span className="text-sm font-bold tracking-widest text-blue-500 uppercase mb-8">English</span>
              
              <h2 className="text-5xl sm:text-6xl font-black text-gray-800 text-center leading-tight break-words max-w-full px-4">
                {currentWord.english_answer || currentWord.english_word}
              </h2>
              
              <p className="absolute bottom-8 text-gray-400 text-sm flex items-center gap-2 animate-pulse">
                <RotateCcw className="w-4 h-4" />
                לחץ כדי לראות תרגום
              </p>
            </div>

            {/* Back of Card (Hebrew) */}
            <div 
              className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-white"
              style={{ transform: "rotateY(180deg)" }}
            >
              <div className="absolute inset-0 bg-white/5 rounded-3xl pointer-events-none" />
              
              <span className="text-sm font-bold tracking-widest text-blue-200 uppercase mb-8">תרגום</span>
              
              <h2 className="text-4xl sm:text-5xl font-bold text-center leading-tight break-words max-w-full mb-8">
                {currentWord.hebrew_word}
              </h2>

              {currentWord.example_sentence && (
                <div className="w-full bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 relative group">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="no-flip absolute top-2 right-2 w-8 h-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                    onClick={(e) => {
                      speak(currentWord.example_sentence);
                    }}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <p className="text-lg text-center italic font-medium pt-2 pb-1 px-2" dir="ltr">
                    "{currentWord.example_sentence}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Navigation Controls */}
        <div className="w-full max-w-md mt-8 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-14 h-14 rounded-full border-2 border-gray-200 hover:bg-white hover:border-blue-300 transition-all"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </Button>

          <div className="text-center">
            <span className="text-lg font-bold text-gray-800">{currentIndex + 1}</span>
            <span className="text-sm text-gray-400 mx-2">/</span>
            <span className="text-lg text-gray-500">{words.length}</span>
          </div>

          <Button
            onClick={handleNext}
            disabled={currentIndex === words.length - 1}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}