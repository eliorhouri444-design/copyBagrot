import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Target, ArrowRight, Check, X, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function VocabularyStrengthenPage() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const loadWeakWords = async () => {
      try {
        const user = await base44.auth.me();
        const progress = await base44.entities.VocabularyProgress.filter({
          user_email: user.email,
          is_weak: true
        });

        if (progress.length === 0) {
          setWords([]);
          setIsLoading(false);
          return;
        }

        // Get full word details for the weak words
        // Note: In a real app we would use $in query or join, here we might need to fetch relevant words or just use stored details if enough
        // Assuming we stored hebrew/english in progress entity for simplicity/performance
        
        setWords(progress);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadWeakWords();
  }, []);

  const handleResult = async (success) => {
    const word = words[currentIndex];
    
    // Update logic
    try {
      await base44.entities.VocabularyProgress.update(word.id, {
        is_weak: !success,
        is_known: success,
        times_correct: (word.times_correct || 0) + (success ? 1 : 0),
        last_practiced: new Date().toISOString()
      });
    } catch(e) { console.error(e); }

    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished session
      navigate(createPageUrl("VocabularyTraining"));
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin"/></div>;

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center text-center p-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-900 mb-2">אין מילים חלשות!</h1>
        <p className="text-green-700 mb-8">כל הכבוד, אתה שולט בכל החומר שלמדת.</p>
        <Button onClick={() => navigate(createPageUrl("VocabularyTraining"))}>חזור לאימון</Button>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen bg-red-50 flex flex-col p-6">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("VocabularyTraining"))}>
          <ArrowRight />
        </Button>
        <span className="font-bold text-red-900">חיזוק מילים ({currentIndex + 1}/{words.length})</span>
        <Target className="text-red-600" />
      </div>

      <div className="flex-1 flex items-center justify-center perspective-1000">
        <motion.div
          className="w-full max-w-sm aspect-[3/4] relative cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 border-2 border-red-100 backface-hidden">
            <h2 className="text-4xl font-black text-gray-900 mb-4" dir="ltr">{currentWord.english_word}</h2>
            <p className="text-gray-400 text-sm mt-8">לחץ כדי לחשוף</p>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 bg-red-600 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-white backface-hidden"
            style={{ transform: "rotateY(180deg)" }}
          >
            <h2 className="text-4xl font-bold">{currentWord.hebrew_word}</h2>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 flex gap-4">
        <Button 
          className="flex-1 h-14 bg-white text-green-600 hover:bg-green-50 border-2 border-green-100 text-lg"
          onClick={() => handleResult(true)}
        >
          <Check className="mr-2"/> הצלחתי
        </Button>
        <Button 
          className="flex-1 h-14 bg-white text-red-600 hover:bg-red-50 border-2 border-red-100 text-lg"
          onClick={() => handleResult(false)}
        >
          <X className="mr-2"/> עדיין קשה
        </Button>
      </div>
    </div>
  );
}