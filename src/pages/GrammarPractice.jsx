import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, Check, X, Loader2, ArrowLeft, RotateCcw, BookOpen, Target, Trophy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// נושאי דקדוק
const GRAMMAR_TOPICS = {
  'present_simple': 'Present Simple',
  'present_progressive': 'Present Progressive',
  'past_simple': 'Past Simple',
  'future': 'Future',
  'there_is_are': 'There is / There are',
  'adjectives': 'Adjectives',
  'pronouns': 'Pronouns',
  'wh_questions': 'WH Questions',
  'prepositions': 'Prepositions',
  'countable_uncountable': 'Countable / Uncountable',
  'comparative_superlative': 'Comparative / Superlative',
  'present_perfect': 'Present Perfect',
  'passive': 'Passive Voice',
  'gerunds_infinitives': 'Gerunds / Infinitives',
  'modals': 'Modals',
  'conditionals_01': 'Conditionals (0/1)',
  'relative_clauses': 'Relative Clauses',
  'conditionals_23': 'Conditionals (2/3)',
  'passive_advanced': 'Passive Advanced',
  'reported_speech': 'Reported Speech',
};

export default function GrammarPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicParam = urlParams.get('topic');
  const modeParam = urlParams.get('mode'); // 'weak' for weak questions practice
  const questionType = urlParams.get('type'); // 'multiple_choice' or 'free_write'

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(!questionType && !modeParam);

  useEffect(() => {
    if (!showModeSelector) {
      loadData();
    } else {
      loadUserOnly();
    }
  }, [showModeSelector]);

  const loadUserOnly = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser?.selected_subject || 'אנגלית';
      const units = currentUser?.selected_units || 3;

      let allQuestions = [];

      if (modeParam === 'weak') {
        // Load weak questions
        const weakProgress = await base44.entities.GrammarProgress.filter({
          user_email: currentUser.email,
          is_weak: true
        }, null, 100);

        const weakIds = weakProgress.map(p => p.question_id);
        
        if (weakIds.length > 0) {
          const allGrammarQuestions = await base44.entities.GrammarQuestion.filter({
            subject_id: subject,
            unit_level: units,
            is_active: true
          }, null, 1000);
          
          allQuestions = allGrammarQuestions.filter(q => weakIds.includes(q.id));
        }
      } else {
        // Load questions for specific topic
        const filter = {
          subject_id: subject,
          unit_level: units,
          is_active: true
        };
        
        if (topicParam) {
          filter.topic = topicParam;
        }
        
        if (questionType) {
          filter.question_type = questionType;
        }

        allQuestions = await base44.entities.GrammarQuestion.filter(filter, 'order', 500);
      }

      // Shuffle and limit to 10 questions per session
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffled.slice(0, 10));

    } catch (error) {
      console.error("Error loading grammar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnswer = (answer) => {
    const question = questions[currentIndex];
    const correctAnswer = question.answer.toLowerCase().trim();
    const userAnswerClean = answer.toLowerCase().trim();

    if (correctAnswer === userAnswerClean) return true;

    // Check acceptable answers
    if (question.acceptable_answers?.length > 0) {
      return question.acceptable_answers.some(a => 
        a.toLowerCase().trim() === userAnswerClean
      );
    }

    return false;
  };

  const handleSubmit = async (answer = null) => {
    const finalAnswer = answer || selectedOption || userAnswer;
    const correct = checkAnswer(finalAnswer);
    const question = questions[currentIndex];

    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
    setAnsweredQuestions(prev => [...prev, { ...question, userAnswer: finalAnswer, isCorrect: correct }]);

    // Update progress
    try {
      const existingProgress = await base44.entities.GrammarProgress.filter({
        user_email: user.email,
        question_id: question.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        await base44.entities.GrammarProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (correct ? 1 : 0),
          times_incorrect: (p.times_incorrect || 0) + (correct ? 0 : 1),
          is_weak: !correct,
          is_mastered: correct && (p.times_correct || 0) >= 2,
          last_practiced: new Date().toISOString()
        });
      } else {
        await base44.entities.GrammarProgress.create({
          user_email: user.email,
          question_id: question.id,
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          topic: question.topic,
          times_seen: 1,
          times_correct: correct ? 1 : 0,
          times_incorrect: correct ? 0 : 1,
          is_weak: !correct,
          is_mastered: false,
          last_practiced: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setShowSummary(true);
    }
  };

  const selectMode = (type) => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('type', type);
    window.history.pushState({}, '', newUrl);
    setShowModeSelector(false);
  };

  // Mode Selector Screen
  if (showModeSelector && !isLoading) {
    const topicName = GRAMMAR_TOPICS[topicParam] || 'דקדוק';
    
    return (
      <div className="min-h-screen bg-blue-50 pb-8">
        {/* Header */}
        <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("Grammar"))}
            className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-white">{topicName}</span>
            <div className="text-xs text-white/80">בחר סוג תרגול</div>
          </div>
          <div className="w-10" />
        </div>

        <div className="px-5 py-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">איך תרצה לתרגל?</h2>
            <p className="text-gray-600">בחר את סוג השאלות</p>
          </div>

          {/* Multiple Choice */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectMode('multiple_choice')}
            className="w-full bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all text-right"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">בחירה אמריקאית</h3>
                <p className="text-sm text-gray-600">בחר את התשובה הנכונה מתוך 4 אפשרויות</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>

          {/* Free Write */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectMode('free_write')}
            className="w-full bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200 hover:border-green-400 transition-all text-right"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">כתיבה חופשית</h3>
                <p className="text-sm text-gray-600">כתוב את התשובה בעצמך</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>

          {/* All Types */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('type');
              window.history.pushState({}, '', newUrl);
              setShowModeSelector(false);
            }}
            className="w-full bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200 hover:border-purple-400 transition-all text-right"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎲</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">מעורב</h3>
                <p className="text-sm text-gray-600">שילוב של כל סוגי השאלות</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">טוען שאלות...</p>
        </div>
      </div>
    );
  }

  // Summary Screen
  if (showSummary) {
    const totalQuestions = questions.length || 1;
    const accuracy = Math.round((results.correct / totalQuestions) * 100);
    const wrongQuestions = answeredQuestions.filter(q => !q.isCorrect);

    const getEvaluation = () => {
      if (accuracy >= 90) return { text: "מצוין! שליטה מושלמת!", icon: Trophy, color: "text-green-600" };
      if (accuracy >= 70) return { text: "יפה מאוד! כמעט שם!", icon: Target, color: "text-blue-600" };
      if (accuracy >= 50) return { text: "בסדר, המשך לתרגל", icon: BookOpen, color: "text-orange-600" };
      return { text: "צריך לחזור על החומר", icon: RotateCcw, color: "text-red-600" };
    };
    const evaluation = getEvaluation();
    const EvalIcon = evaluation.icon;

    return (
      <div className="min-h-screen bg-blue-50 pb-8">
        {/* Header */}
        <div className="bg-blue-600 px-5 py-6 rounded-b-3xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <EvalIcon className="w-10 h-10 text-white" />
            </div>
            <div className="text-5xl font-bold text-white mb-2">{accuracy}%</div>
            <p className={`text-white/90 text-lg font-medium`}>{evaluation.text}</p>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-green-200">
              <div className="text-3xl font-bold text-green-600">{results.correct}</div>
              <div className="text-sm text-gray-600">נכון</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-red-200">
              <div className="text-3xl font-bold text-red-600">{results.incorrect}</div>
              <div className="text-sm text-gray-600">שגוי</div>
            </div>
          </div>

          {/* Wrong answers */}
          {wrongQuestions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-200">
              <div className="text-sm text-gray-700 mb-3 font-bold flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                שאלות לחיזוק:
              </div>
              <div className="space-y-2">
                {wrongQuestions.slice(0, 5).map((q, idx) => (
                  <div key={idx} className="text-sm text-gray-600 bg-red-50 rounded-lg p-2" dir="ltr">
                    <span className="font-medium">{q.question}</span>
                    <br />
                    <span className="text-green-600">✓ {q.answer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => {
                setCurrentIndex(0);
                setUserAnswer('');
                setSelectedOption(null);
                setShowResult(false);
                setResults({ correct: 0, incorrect: 0 });
                setAnsweredQuestions([]);
                setShowSummary(false);
                loadData();
              }}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              תרגל שוב
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Grammar"))}
              className="w-full h-12 text-base font-bold border-2 border-blue-300 text-blue-600 rounded-2xl hover:bg-blue-50"
            >
              חזרה לדקדוק
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 font-medium">אין שאלות זמינות</p>
          <Button 
            onClick={() => navigate(createPageUrl("Grammar"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            חזרה לדקדוק
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isMultipleChoice = question.question_type === 'multiple_choice' && question.options?.length > 0;

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("Grammar"))}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white">
            {GRAMMAR_TOPICS[question.topic] || question.topic}
          </span>
          <div className="text-xs text-white/80">
            שאלה {currentIndex + 1} מתוך {questions.length}
          </div>
        </div>
        <div className="w-10" />
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-blue-400 h-2">
        <div
          className="bg-white h-2 transition-all duration-300 rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-sm"
          >
            {/* Question Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6 mb-5 border border-blue-100">
              <div className="flex justify-center mb-4">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full">
                  {isMultipleChoice ? 'בחירה מרובה' : 'כתיבה חופשית'}
                </span>
              </div>
              
              <h2 className="text-lg font-bold text-gray-700 text-center" dir="ltr">
                {question.question}
              </h2>
            </div>

            {!showResult ? (
              <div className="space-y-3">
                {isMultipleChoice ? (
                  <>
                    {question.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedOption(option)}
                        className={`w-full bg-white rounded-2xl p-4 text-center border-2 transition-all shadow-sm ${
                          selectedOption === option 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                        dir="ltr"
                      >
                        <span className="text-lg font-semibold text-gray-900">{option}</span>
                      </button>
                    ))}
                    {selectedOption && (
                      <Button
                        onClick={() => handleSubmit(selectedOption)}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl mt-4 shadow-lg"
                      >
                        אשר תשובה
                      </Button>
                    )}
                  </>
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

                  <div className="bg-white rounded-xl p-4 space-y-2">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">התשובה הנכונה:</div>
                      <div className="text-xl font-bold text-gray-900" dir="ltr">
                        {question.answer}
                      </div>
                    </div>

                    {question.explanation && (
                      <div className="text-sm text-gray-600 text-center border-t pt-2 mt-2">
                        {question.explanation}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
                >
                  {currentIndex < questions.length - 1 ? 'לשאלה הבאה' : 'סיום'}
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}