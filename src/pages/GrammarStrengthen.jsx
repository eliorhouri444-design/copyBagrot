import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Check, X, Loader2, Zap, Trophy, RotateCcw, Target
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function GrammarStrengthenPage() {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weakQuestions, setWeakQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState({ mastered: 0, stillWeak: 0 });
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadWeakQuestions();
  }, []);

  const loadWeakQuestions = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser.selected_subject || 'אנגלית';
      const units = currentUser.selected_units || 3;

      // Get weak questions from progress
      const weakProgress = await base44.entities.GrammarProgress.filter({
        user_email: currentUser.email,
        subject_id: subject,
        is_weak: true
      }, '-updated_date', 50);

      if (weakProgress.length === 0) {
        setWeakQuestions([]);
        setIsLoading(false);
        return;
      }

      // Get the actual question data
      const questionIds = weakProgress.map(p => p.question_id);
      const allQuestions = await base44.entities.GrammarQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, null, 500);

      const weakQuestionData = allQuestions.filter(q => questionIds.includes(q.id));
      
      // Sort by how many times they got it wrong
      const sortedWeakQuestions = weakQuestionData.map(q => {
        const progress = weakProgress.find(p => p.question_id === q.id);
        return { ...q, timesIncorrect: progress?.times_incorrect || 0 };
      }).sort((a, b) => b.timesIncorrect - a.timesIncorrect);

      setWeakQuestions(sortedWeakQuestions.slice(0, 10));

    } catch (error) {
      console.error("Error loading weak questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnswer = (answer) => {
    const question = weakQuestions[currentIndex];
    const correct = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();

    const acceptableAnswers = question.acceptable_answers || [];
    const isAcceptable = acceptableAnswers.some(a =>
      a.toLowerCase().trim() === answer.toLowerCase().trim()
    );

    return correct || isAcceptable;
  };

  const handleSubmit = async (selectedAnswer = null) => {
    const answer = selectedAnswer || userAnswer;
    const correct = checkAnswer(answer);
    const question = weakQuestions[currentIndex];

    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => ({
      mastered: prev.mastered + (correct ? 1 : 0),
      stillWeak: prev.stillWeak + (correct ? 0 : 1)
    }));

    // Update progress
    try {
      const existingProgress = await base44.entities.GrammarProgress.filter({
        user_email: user.email,
        question_id: question.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        const newCorrect = (p.times_correct || 0) + (correct ? 1 : 0);
        // Remove from weak list if answered correctly 2+ times
        const shouldRemoveFromWeak = correct && newCorrect >= 2;
        
        await base44.entities.GrammarProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: newCorrect,
          times_incorrect: (p.times_incorrect || 0) + (correct ? 0 : 1),
          is_weak: !shouldRemoveFromWeak,
          is_mastered: shouldRemoveFromWeak,
          last_practiced: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < weakQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      setShowSummary(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">טוען שאלות לחיזוק...</p>
        </div>
      </div>
    );
  }

  // No weak questions
  if (weakQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-blue-100 pb-24">
        <div className="bg-[#3B82F6] px-5 py-4 rounded-b-[14px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(createPageUrl("GrammarTopics"))}
              className="text-white p-2 hover:bg-white/10 rounded-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-white">חיזוק דקדוק</h1>
            <div className="w-10" />
          </div>
          <div className="text-center pb-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">מצוין!</h2>
            <p className="text-white/80 text-sm">אין לך שאלות לחיזוק כרגע</p>
          </div>
        </div>
        
        <div className="px-5 py-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 text-center mb-6">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">כל השאלות נשלטות! המשך לתרגל כדי לשמור על הרמה.</p>
          </div>
          
          <Button
            onClick={() => navigate(createPageUrl("GrammarTopics"))}
            className="w-full bg-[#3B82F6] hover:bg-blue-700 h-12 text-base font-bold rounded-[14px] shadow"
          >
            חזור לנושאים
          </Button>
        </div>
      </div>
    );
  }

  // Summary
  if (showSummary) {
    const accuracy = Math.round((results.mastered / (results.mastered + results.stillWeak)) * 100);
    
    return (
      <div className="min-h-screen bg-blue-100 pb-24">
        <div className="bg-[#3B82F6] px-5 py-4 rounded-b-[14px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(createPageUrl("GrammarTopics"))}
              className="text-white p-2 hover:bg-white/10 rounded-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-white">סיכום חיזוק</h1>
            <div className="w-10" />
          </div>
          <div className="text-center pb-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="text-4xl font-bold text-white mb-1">{accuracy}%</div>
            <p className="text-white/80 text-sm">סיימת חיזוק!</p>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-blue-100">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">{results.mastered}</div>
              <div className="text-sm text-gray-600 font-medium">נשלטו</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-blue-100">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-600">{results.stillWeak}</div>
              <div className="text-sm text-gray-600 font-medium">עדיין לחיזוק</div>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            {results.stillWeak > 0 && (
              <Button
                onClick={() => {
                  setCurrentIndex(0);
                  setResults({ mastered: 0, stillWeak: 0 });
                  setShowSummary(false);
                  loadWeakQuestions();
                }}
                className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-base font-bold rounded-[14px] shadow"
              >
                <RotateCcw className="w-5 h-5 ml-2" />
                המשך לחזק
              </Button>
            )}
            <Button
              onClick={() => navigate(createPageUrl("GrammarTopics"))}
              variant="outline"
              className="w-full h-11 text-base font-bold border-2 border-blue-200 text-[#3B82F6] rounded-[14px] hover:bg-blue-50"
            >
              חזור לנושאים
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = weakQuestions[currentIndex];
  const progress = ((currentIndex + 1) / weakQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col">
      {/* Header */}
      <div className="bg-[#3B82F6] px-4 py-3 rounded-b-[14px]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("GrammarTopics"))}
            className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <span className="text-base font-bold text-white">חיזוק דקדוק</span>
            <div className="text-xs text-white/80">
              {currentIndex + 1} מתוך {weakQuestions.length}
            </div>
          </div>
          <div className="w-10" />
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-blue-300 h-1.5">
        <div 
          className="bg-white h-1.5 transition-all duration-300 rounded-r-full" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Weak indicator */}
          <div className="flex justify-center mb-4">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-4 py-1.5 rounded-full">
              🔥 לחיזוק
            </span>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-5">
            <h2 className="text-lg font-bold text-gray-900 text-center leading-relaxed" dir="ltr">
              {question.question}
            </h2>
          </div>

          {!showResult ? (
            <div className="space-y-3">
              {question.question_type === 'multiple_choice' && question.options?.length > 0 ? (
                <div className="space-y-3">
                  {question.options.map((option, idx) => {
                    const isSelected = userAnswer === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => setUserAnswer(option)}
                        className={`w-full bg-white rounded-2xl p-4 text-center border-2 transition-all shadow-sm ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                        dir="ltr"
                      >
                        <span className="text-lg font-semibold text-gray-900">{option}</span>
                      </button>
                    );
                  })}
                  {userAnswer && (
                    <Button
                      onClick={() => handleSubmit(userAnswer)}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl mt-4 shadow-lg"
                    >
                      אשר תשובה
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="הקלד את התשובה..."
                    className="h-14 text-lg text-center rounded-2xl border-2 border-gray-200 focus:border-blue-500 bg-white shadow-sm"
                    dir="ltr"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userAnswer.trim()) {
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={!userAnswer.trim()}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg disabled:opacity-50"
                  >
                    בדוק תשובה
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className={`rounded-2xl p-5 shadow-lg ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                    {isCorrect ? (
                      <Check className="w-7 h-7 text-white" />
                    ) : (
                      <X className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <span className={`text-2xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? 'נכון!' : 'לא נכון'}
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">
                      {!isCorrect ? 'התשובה הנכונה:' : 'תשובה:'}
                    </div>
                    <div className="text-xl font-bold text-gray-900" dir="ltr">
                      {question.answer}
                    </div>
                  </div>

                  {question.explanation && (
                    <div className="text-sm text-gray-600 text-center border-t pt-3">
                      <span className="text-gray-400">הסבר: </span>
                      {question.explanation}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
              >
                {currentIndex < weakQuestions.length - 1 ? 'לשאלה הבאה' : 'סיום'}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}