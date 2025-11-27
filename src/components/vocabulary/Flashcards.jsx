import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

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
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete?.({
        total: words.length,
        known: Object.values(results).filter(r => r.known).length,
        unknown: Object.values(results).filter(r => !r.known).length
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        <span className="text-sm font-medium text-blue-600">שאלה {currentIndex + 1} מתוך {words.length}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Flashcard */}
      <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-8 min-h-[220px] flex flex-col items-center justify-center">
        {!isFlipped ? (
          <>
            <div className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {currentWord.english_answer}
            </div>
            <Button
              onClick={() => setIsFlipped(true)}
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              הפוך כרטיס
            </Button>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900 mb-2 text-center">
              {currentWord.hebrew_word}
            </div>
            <div className="text-base text-gray-600 text-center">
              {currentWord.english_answer}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons - Always visible */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleKnow}
          className="flex-1 h-12 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-green-300 hover:bg-green-50 transition-colors"
        >
          <span className="font-medium">ידעתי</span>
          <Check className="w-5 h-5 text-green-500" />
        </button>
        
        <button
          onClick={handleDontKnow}
          className="flex-1 h-12 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-red-300 hover:bg-red-50 transition-colors"
        >
          <span className="font-medium">לא ידעתי</span>
          <X className="w-5 h-5 text-red-500" />
        </button>
      </div>
    </div>
  );
}