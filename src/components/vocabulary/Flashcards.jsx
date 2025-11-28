import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Flashcards({ words, onComplete, onUpdateWord }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({});

  if (!words || words.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">אין מילים לתרגול</p>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  const handleKnow = () => {
    setResults(prev => ({ ...prev, [currentWord.id]: { known: true } }));
    onUpdateWord?.(currentWord.id, { is_known: true, times_correct: 1 });
    goToNext();
  };

  const handleDontKnow = () => {
    setResults(prev => ({ ...prev, [currentWord.id]: { known: false } }));
    onUpdateWord?.(currentWord.id, { is_known: false, times_incorrect: 1 });
    goToNext();
  };

  const goToNext = () => {
    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 100);
    } else {
      onComplete?.({
        total: words.length,
        known: Object.values(results).filter(r => r.known).length,
        unknown: Object.values(results).filter(r => !r.known).length
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-500">{Math.round(progress)}%</span>
        <span className="text-sm font-semibold text-blue-600">שאלה {currentIndex + 1} מתוך {words.length}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-[#2086b1] h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* 3D Flip Card */}
      <div 
        className="relative w-full h-[300px] cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
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
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleKnow}
          className="flex-1 h-14 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-green-100 hover:border-green-300 transition-all"
        >
          <Check className="w-5 h-5 text-green-600" />
          <span className="font-semibold">ידעתי</span>
        </button>
        
        <button
          onClick={handleDontKnow}
          className="flex-1 h-14 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-red-100 hover:border-red-300 transition-all"
        >
          <X className="w-5 h-5 text-red-500" />
          <span className="font-semibold">לא ידעתי</span>
        </button>
      </div>
    </div>
  );
}