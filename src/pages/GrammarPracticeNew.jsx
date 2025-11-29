import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, RotateCcw, Check, X, Loader2, Crown, ArrowLeft, BookOpen, Target, Trophy, Pencil, List
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const GRAMMAR_TOPICS = {
  'be_verbs': { name: 'Be (am/is/are)', description: 'פעלי הוויה בהווה' },
  'present_simple': { name: 'Present Simple', description: 'הווה פשוט' },
  'present_progressive': { name: 'Present Progressive', description: 'הווה ממושך' },
  'past_simple': { name: 'Past Simple', description: 'עבר פשוט' },
  'future': { name: 'Future (will/going to)', description: 'זמן עתיד' },
  'there_is_are': { name: 'There is/There are', description: 'יש/ישנם' },
  'can_cant': { name: "Can/Can't", description: 'יכולת ואי-יכולת' },
  'wh_questions': { name: 'WH Questions', description: 'שאלות מידע' },
  'pronouns': { name: 'Pronouns', description: 'כינויי גוף' },
  'adjectives': { name: 'Adjectives', description: 'שמות תואר' },
  'comparative_superlative': { name: 'Comparative & Superlative', description: 'השוואה ומעולה' },
  'countable_uncountable': { name: 'Countable/Uncountable', description: 'שמות ספירים ולא ספירים' },
  'prepositions': { name: 'Prepositions (at/in/on)', description: 'מילות יחס' },
  'imperatives': { name: 'Imperatives', description: 'ציווי' },
  'some_any': { name: 'Some/Any', description: 'כמה/משהו' },
  'much_many': { name: 'Much/Many', description: 'הרבה (ספיר/לא ספיר)' }
};

export default function GrammarPracticeNewPage() {
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('topic');
  const practiceMode = urlParams.get('mode') || 'select'; // 'select' or 'practice'
  const questionType = urlParams.get('type') || 'multiple_choice'; // 'multiple_choice' or 'free_write'

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [mode, setMode] = useState(practiceMode);

  const topic = GRAMMAR_TOPICS[topicId] || { name: 'דקדוק', description: '' };

  useEffect(() => {
    loadData();
  }, [topicId, questionType]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser?.selected_subject || 'אנגלית';
      const units = currentUser?.selected_units || 3;

      // Load questions for this topic
      const filter = {
        subject_id: subject,
        unit_level: units,
        is_active: true
      };
      
      if (topicId) {
        filter.topic = topicId;
      }

      const allQuestions = await base44.entities.GrammarQuestion.filter(filter, 'order', 100);
      
      // Filter by question type if in practice mode
      let filteredQuestions = allQuestions;
      if (mode === 'practice' && questionType !== 'all') {
        filteredQuestions = allQuestions.filter(q => q.question_type === questionType);
      }

      // Take first 10 questions and shuffle
      const practiceQuestions = filteredQuestions.slice(0, 10).sort(() => Math.random() - 0.5);
      setQuestions(practiceQuestions);

    } catch (error) {
      console.error("Error loading grammar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPractice = (type) => {
    setMode('practice');
    navigate(createPageUrl(`GrammarPracticeNew?topic=${topicId}&mode=practice&type=${type}`), { replace: true });
  };

  const checkAnswer = (answer) => {
    const question = questions[currentIndex];
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
    const question = questions[currentIndex];

    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
    setAnsweredQuestions(prev => [...prev, { ...question, userAnswer: answer, isCorrect: correct }]);

    // Update progress
    try {
      const existingProgress = await base44.entities.GrammarProgress.filter({
        user_email: user.email,
        question_id: question.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        const newCorrect = (p.times_correct || 0) + (correct ? 1 : 0);
        const isMastered = newCorrect >= 3;
        
        await base44.entities.GrammarProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: newCorrect,
          times_incorrect: (p.times_incorrect || 0) + (correct ? 0 : 1),
          is_weak: !correct ? true : (isMastered ? false : p.is_weak),
          is_mastered: isMastered,
          last_practiced: new Date().toISOString()
        });
      } else {
        await base44.entities.GrammarProgress.create({
          question_id: question.id,
          user_email: user.email,
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
      setShowResult(false);
    } else {
      setShowSummary(true);
    }
  };

  const loadMoreQuestions = async () => {
    setIsLoading(true);
    setCurrentIndex(0);
    setUserAnswer('');
    setShowResult(false);
    setResults({ correct: 0, incorrect: 0 });
    setAnsweredQuestions([]);
    setShowSummary(false);
    await loadData();
  };

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

  // Mode Selection Screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-blue-50 pb-24">
        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(createPageUrl("GrammarTopics"))}
              className="text-white p-2 hover:bg-white/10 rounded-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-white" dir="ltr">{topic.name}</h1>
              <p className="text-xs text-white/80">{topic.description}</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          {/* Topic Info Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
            <h3 className="font-bold text-gray-900 mb-2 text-lg">בחר סוג תרגול</h3>
            <p className="text-gray-600 text-sm mb-4">
              בחר את סוג התרגול המועדף עליך
            </p>

            {/* Practice Mode Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => startPractice('multiple_choice')}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg"
              >
                <List className="w-6 h-6" />
                <div className="text-right">
                  <div className="text-base">בחירה אמריקאית</div>
                  <div className="text-xs opacity-80">Multiple Choice</div>
                </div>
              </Button>

              <Button
                onClick={() => startPractice('free_write')}
                className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg"
              >
                <Pencil className="w-6 h-6" />
                <div className="text-right">
                  <div className="text-base">כתיבה חופשית</div>
                  <div className="text-xs opacity-80">Free Write</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Stats for this topic */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <h4 className="font-bold text-gray-900 mb-3">סטטיסטיקות הנושא</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-xs text-blue-700">שאלות</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-600">10</div>
                <div className="text-xs text-green-700">בסשן</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-purple-600">2</div>
                <div className="text-xs text-purple-700">סוגי תרגול</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Summary Screen
  if (showSummary) {
    const totalQuestions = questions.length || 1;
    const correctCount = results.correct || 0;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
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
            <p className="text-white/90 text-lg font-medium">{evaluation.text}</p>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-blue-100">
              <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
              <div className="text-xs text-gray-500 font-medium">שאלות</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-gray-500 font-medium">נכון</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-red-200">
              <div className="text-2xl font-bold text-red-600">{results.incorrect || 0}</div>
              <div className="text-xs text-gray-500 font-medium">שגוי</div>
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
                {wrongQuestions.map((q, idx) => (
                  <div key={idx} className="bg-red-50 rounded-xl p-3 text-sm">
                    <div className="text-gray-800 mb-1" dir="ltr">{q.question}</div>
                    <div className="text-green-700 font-medium" dir="ltr">תשובה: {q.answer}</div>
                    {q.explanation && (
                      <div className="text-gray-600 mt-2 text-xs border-t border-red-200 pt-2">
                        <strong>הסבר:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={loadMoreQuestions}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
            >
              עוד 10 שאלות
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>

            {wrongQuestions.length > 0 && (
              <Button
                onClick={() => {
                  if (user?.is_premium) {
                    // Practice errors
                    sessionStorage.setItem('grammarErrors', JSON.stringify(wrongQuestions));
                    loadMoreQuestions();
                  } else {
                    navigate(createPageUrl("Premium"));
                  }
                }}
                variant="outline"
                className="w-full h-12 text-base font-bold border-2 border-blue-500 text-blue-600 rounded-2xl hover:bg-blue-50"
                disabled={!user?.is_premium}
              >
                {!user?.is_premium && <Crown className="w-4 h-4 ml-2 text-amber-500" />}
                שאלות שטעיתי
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("GrammarTopics"))}
              className="w-full text-gray-500 font-medium"
            >
              חזרה לנושאים
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  if (!question) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 font-medium">אין שאלות זמינות בנושא זה</p>
          <Button 
            onClick={() => navigate(createPageUrl("GrammarTopics"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            חזרה לנושאים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("GrammarTopics"))}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white" dir="ltr">{topic.name}</span>
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
              {/* Question Type Badge */}
              <div className="flex justify-center mb-4">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full">
                  {question.question_type === 'multiple_choice' ? 'בחירה מרובה' :
                   question.question_type === 'fill_blank' ? 'השלמה' : 'כתיבה חופשית'}
                </span>
              </div>
              
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
                    {question.question_type === 'free_write' ? (
                      <Textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="כתוב את התשובה כאן..."
                        className="h-32 text-lg rounded-2xl border-2 border-gray-200 focus:border-blue-500 bg-white shadow-sm resize-none"
                        dir="ltr"
                        autoFocus
                      />
                    ) : (
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
                    )}

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

                  {/* Correct answer */}
                  <div className="bg-white rounded-xl p-4 space-y-3">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">
                        {!isCorrect ? 'התשובה הנכונה:' : 'תשובה:'}
                      </div>
                      <div className="text-xl font-bold text-gray-900" dir="ltr">
                        {question.answer}
                      </div>
                    </div>

                    {/* Explanation */}
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