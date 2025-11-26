import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, BookOpen, Check, X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { calculateAllowedTime } from './EnglishStudyEngine';

export default function TimedReading({
  text,
  questions = [],
  standardTime = 35, // דקות סטנדרטי
  daysPassed = 0,
  totalDays = 60,
  moduleLevel = 'E',
  onComplete
}) {
  const [phase, setPhase] = useState('intro'); // intro, reading, questions, results
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [readingStartTime, setReadingStartTime] = useState(null);
  const [readingEndTime, setReadingEndTime] = useState(null);

  // חישוב זמן מותר - יורד ככל שמתקרבים לבגרות
  const allowedTime = calculateAllowedTime(standardTime, daysPassed, totalDays);
  const allowedSeconds = allowedTime * 60;

  // Timer
  useEffect(() => {
    if (phase !== 'reading' && phase !== 'questions') return;
    if (isPaused) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up!
          if (phase === 'reading') {
            setPhase('questions');
            return questions.length * 60; // 1 דקה לכל שאלה
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isPaused, timeLeft, questions.length]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentLeft = (timeLeft / allowedSeconds) * 100;
    if (percentLeft > 50) return 'text-green-600';
    if (percentLeft > 25) return 'text-amber-600';
    return 'text-red-600';
  };

  const startReading = () => {
    setPhase('reading');
    setTimeLeft(allowedSeconds);
    setReadingStartTime(Date.now());
  };

  const finishReading = () => {
    setReadingEndTime(Date.now());
    setPhase('questions');
    setTimeLeft(questions.length * 60); // 1 דקה לכל שאלה
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitAnswers = () => {
    // חישוב תוצאות
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });

    const results = {
      correct,
      total: questions.length,
      score: Math.round((correct / questions.length) * 100),
      readingTime: readingEndTime && readingStartTime 
        ? Math.round((readingEndTime - readingStartTime) / 1000)
        : 0,
      allowedTime: allowedSeconds,
      answers
    };

    setPhase('results');
    if (onComplete) onComplete(results);
  };

  // Intro phase
  if (phase === 'intro') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          תרגול Unseen - מודול {moduleLevel}
        </h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-amber-800 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-bold">זמן מותר: {allowedTime} דקות</span>
          </div>
          <p className="text-sm text-amber-700">
            {daysPassed > 0 && (
              <>הזמן קוצר מ-{standardTime} דקות כי אתה מתקרב לבגרות!</>
            )}
          </p>
        </div>

        <div className="space-y-3 text-right max-w-md mx-auto mb-8">
          <h4 className="font-bold text-gray-800">הוראות:</h4>
          <ul className="text-gray-600 text-sm space-y-2">
            <li>• קרא את הטקסט בקפידה</li>
            <li>• כשתסיים לקרוא, לחץ "עבור לשאלות"</li>
            <li>• ענה על {questions.length} שאלות</li>
            <li>• הזמן רץ! נסה לסיים לפני הזמן</li>
          </ul>
        </div>

        <Button
          onClick={startReading}
          className="w-full max-w-md bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold h-14 text-lg"
        >
          <Play className="w-5 h-5 ml-2" />
          התחל לקרוא
        </Button>
      </motion.div>
    );
  }

  // Reading phase
  if (phase === 'reading') {
    return (
      <div className="space-y-4">
        {/* Timer bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${getTimeColor()}`} />
              <span className={`font-bold text-xl ${getTimeColor()}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button
                onClick={finishReading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                עבור לשאלות
              </Button>
            </div>
          </div>
          <Progress value={(timeLeft / allowedSeconds) * 100} className="h-2" />
          
          {timeLeft < 120 && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>פחות מ-2 דקות!</span>
            </div>
          )}
        </div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div 
            className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
            dir="ltr"
            style={{ fontSize: '1.1rem', lineHeight: '1.8' }}
          >
            {text.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4">{paragraph}</p>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Questions phase
  if (phase === 'questions') {
    const question = questions[currentQuestion];
    
    return (
      <div className="space-y-4">
        {/* Timer bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">
              שאלה {currentQuestion + 1} מתוך {questions.length}
            </span>
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${getTimeColor()}`} />
              <span className={`font-bold ${getTimeColor()}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />
        </div>

        {/* Question */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4" dir="ltr">
            {question?.question_text}
          </h3>

          <div className="space-y-3">
            {question?.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(question.id, option)}
                className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
                  answers[question.id] === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                dir="ltr"
              >
                <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>{' '}
                {option}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQuestion > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              className="flex-1"
            >
              הקודם
            </Button>
          )}
          
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={!answers[question?.id]}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              הבא
            </Button>
          ) : (
            <Button
              onClick={submitAnswers}
              disabled={Object.keys(answers).length < questions.length}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              סיים ובדוק
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Results phase
  if (phase === 'results') {
    const correct = questions.filter(q => answers[q.id] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
          score >= 70 ? 'bg-green-100' : score >= 50 ? 'bg-amber-100' : 'bg-red-100'
        }`}>
          <span className={`text-3xl font-black ${
            score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {score}%
          </span>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {score >= 70 ? 'כל הכבוד! 🎉' : score >= 50 ? 'לא רע!' : 'צריך לתרגל יותר'}
        </h3>
        <p className="text-gray-600 mb-6">
          ענית נכון על {correct} מתוך {questions.length} שאלות
        </p>

        {/* סקירת תשובות */}
        <div className="space-y-3 text-right mb-6">
          {questions.map((q, idx) => {
            const isCorrect = answers[q.id] === q.correct_answer;
            return (
              <div 
                key={q.id}
                className={`p-4 rounded-xl border-2 ${
                  isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900" dir="ltr">{q.question_text}</p>
                    {!isCorrect && (
                      <p className="text-sm text-red-700 mt-1" dir="ltr">
                        התשובה הנכונה: {q.correct_answer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={() => onComplete && onComplete({ score, correct, total: questions.length })}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold"
        >
          סיים
        </Button>
      </motion.div>
    );
  }

  return null;
}