import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, X, RotateCcw, Award, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { calculateNextReview } from './EnglishStudyEngine';

export default function VocabularyTrainer({
  words = [],
  onComplete,
  onWordResult,
  timeLimit = 15 // דקות
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, mastered: 0 });
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [isFinished, setIsFinished] = useState(false);

  // Filter words that need review today
  const wordsToReview = words.filter(w => {
    if (w.isMastered) return false;
    if (!w.nextReviewDate) return true;
    return new Date(w.nextReviewDate) <= new Date();
  });

  const currentWord = wordsToReview[currentIndex];

  // Timer
  useEffect(() => {
    if (isFinished || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkAnswer = () => {
    if (!currentWord) return;
    
    const normalizedAnswer = userAnswer.trim().toLowerCase();
    const correctAnswer = currentWord.english_answer.toLowerCase();
    const acceptableAnswers = currentWord.acceptable_answers?.map(a => a.toLowerCase()) || [];
    
    const correct = normalizedAnswer === correctAnswer || acceptableAnswers.includes(normalizedAnswer);
    setIsCorrect(correct);
    setShowResult(true);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1)
    }));

    // Calculate next review using spaced repetition
    const reviewResult = calculateNextReview(
      currentWord,
      correct,
      currentWord.consecutiveCorrect || 0
    );

    if (reviewResult.isMastered) {
      setStats(prev => ({ ...prev, mastered: prev.mastered + 1 }));
    }

    // Report result to parent
    if (onWordResult) {
      onWordResult({
        wordId: currentWord.id,
        isCorrect: correct,
        ...reviewResult
      });
    }
  };

  const nextWord = () => {
    setShowResult(false);
    setUserAnswer('');
    
    if (currentIndex >= wordsToReview.length - 1) {
      setIsFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (showResult) {
        nextWord();
      } else if (userAnswer.trim()) {
        checkAnswer();
      }
    }
  };

  if (wordsToReview.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">מעולה!</h3>
        <p className="text-gray-600">אין מילים לחזרה להיום. חזור מחר!</p>
      </div>
    );
  }

  if (isFinished) {
    const accuracy = stats.correct + stats.wrong > 0 
      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
      : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Award className="w-10 h-10 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">סיימת!</h3>
        <p className="text-gray-600 mb-6">תרגול אוצר מילים הושלם</p>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
            <div className="text-xs text-green-700">נכונות</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
            <div className="text-xs text-red-700">שגויות</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
            <div className="text-xs text-purple-700">דיוק</div>
          </div>
        </div>

        {stats.mastered > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <Zap className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-amber-800 font-semibold">
              {stats.mastered} מילים חדשות נשלטות! 🎉
            </p>
          </div>
        )}

        <Button
          onClick={() => onComplete && onComplete(stats)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold"
        >
          סיים
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {currentIndex + 1} / {wordsToReview.length}
          </span>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className={timeLeft < 60 ? 'text-red-600 font-bold' : ''}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
        <Progress value={((currentIndex + 1) / wordsToReview.length) * 100} className="h-2" />
      </div>

      {/* Word card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200"
        >
          <div className="text-center mb-6">
            <Brain className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentWord?.hebrew_word}
            </h3>
            {currentWord?.category && (
              <span className="text-sm text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                {currentWord.category}
              </span>
            )}
          </div>

          {!showResult ? (
            <div className="space-y-4">
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="הקלד את התרגום באנגלית..."
                className="text-center text-lg h-14"
                autoFocus
                dir="ltr"
              />
              <Button
                onClick={checkAnswer}
                disabled={!userAnswer.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
              >
                בדוק
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-4 rounded-xl text-center ${
                isCorrect 
                  ? 'bg-green-100 border-2 border-green-300' 
                  : 'bg-red-100 border-2 border-red-300'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isCorrect ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <X className="w-6 h-6 text-red-600" />
                  )}
                  <span className={`font-bold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? 'נכון!' : 'לא נכון'}
                  </span>
                </div>
                
                {!isCorrect && (
                  <div className="text-gray-700">
                    <span className="text-sm">התשובה הנכונה: </span>
                    <span className="font-bold text-lg" dir="ltr">{currentWord?.english_answer}</span>
                  </div>
                )}
              </div>

              {currentWord?.example_sentence && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">דוגמה:</p>
                  <p className="text-gray-800 italic" dir="ltr">{currentWord.example_sentence}</p>
                </div>
              )}

              <Button
                onClick={nextWord}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold h-12"
              >
                {currentIndex >= wordsToReview.length - 1 ? 'סיים' : 'הבא'}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Stats */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-1 text-green-600">
          <Check className="w-4 h-4" />
          <span>{stats.correct}</span>
        </div>
        <div className="flex items-center gap-1 text-red-600">
          <X className="w-4 h-4" />
          <span>{stats.wrong}</span>
        </div>
      </div>
    </div>
  );
}