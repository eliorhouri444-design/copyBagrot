import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Check, X, AlertTriangle } from 'lucide-react';
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

  const handleMarkWeak = () => {
    onUpdateWord?.(currentWord.id, { is_weak: true });
  };

  const goToNext = () => {
    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const knownCount = Object.values(results).filter(r => r.known).length + (results[currentWord.id]?.known ? 0 : 0);
      onComplete?.({
        total: words.length,
        known: Object.values(results).filter(r => r.known).length,
        unknown: Object.values(results).filter(r => !r.known).length
      });
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>{currentIndex + 1} / {words.length}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="bg-white rounded-xl border-2 border-gray-200 p-8 min-h-[280px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 transition-colors"
      >
        {!isFlipped ? (
          <>
            <div className="text-3xl font-bold text-gray-900 mb-4 text-center">
              {currentWord.english_answer}
            </div>
            <div className="text-sm text-gray-500">לחץ להפיכה</div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-blue-600 mb-3 text-center">
              {currentWord.hebrew_word}
            </div>
            {currentWord.example_sentence && (
              <div className="text-sm text-gray-600 text-center mt-4 p-3 bg-gray-50 rounded-lg max-w-sm">
                <span className="font-medium">דוגמה: </span>
                {currentWord.example_sentence}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleDontKnow}
          variant="outline"
          className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50"
        >
          <X className="w-5 h-5 ml-2" />
          לא יודע
        </Button>
        <Button
          onClick={handleKnow}
          className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-5 h-5 ml-2" />
          יודע
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-3">
        <Button
          onClick={goToPrev}
          variant="ghost"
          disabled={currentIndex === 0}
          className="flex-1 h-10"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          הקודם
        </Button>
        <Button
          onClick={handleMarkWeak}
          variant="ghost"
          className="flex-1 h-10 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        >
          <AlertTriangle className="w-4 h-4 ml-1" />
          סמן כחלש
        </Button>
        <Button
          onClick={goToNext}
          variant="ghost"
          className="flex-1 h-10"
        >
          הבא
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}