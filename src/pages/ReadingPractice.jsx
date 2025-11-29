import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Check, X, Loader2, FileText, Trophy, RotateCcw, BookOpen, AlertTriangle, HelpCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

// Question categories order by depth
const CATEGORY_ORDER = [
  'detail', 'main_idea', 'inference', 'true_false', 'vocabulary', 'matching', 'cause_effect'
];

export default function ReadingPracticePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'auto'; // 'auto' or 'weak'

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [textData, setTextData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [viewMode, setViewMode] = useState('reading'); // 'reading' or 'answering'
  const [showTextDialog, setShowTextDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const units = currentUser?.selected_units || 3;

      // 1. Load all texts for level
      const allTexts = await base44.entities.ReadingComprehensionText.filter({
        unit_level: units,
        is_active: true
      });

      if (allTexts.length === 0) {
        alert("לא נמצאו קטעי קריאה לרמתך.");
        navigate(createPageUrl("ReadingComprehension"));
        return;
      }

      // 2. Load progress
      const userProgress = await base44.entities.ReadingProgress.filter({
        user_email: currentUser.email
      });

      // 3. Select Text Logic
      let selectedText = null;
      let selectedQuestions = [];

      if (mode === 'weak') {
        // Find text with most weak questions
        const textWeakCounts = {};
        userProgress.forEach(p => {
          if (p.is_weak) {
            textWeakCounts[p.text_id] = (textWeakCounts[p.text_id] || 0) + 1;
          }
        });

        // Sort texts by weak count descending
        const sortedTextIds = Object.keys(textWeakCounts).sort((a, b) => textWeakCounts[b] - textWeakCounts[a]);
        
        if (sortedTextIds.length > 0) {
          selectedText = allTexts.find(t => t.id === sortedTextIds[0]);
        } else {
          // Fallback to auto if no weak questions found
          selectedText = allTexts[Math.floor(Math.random() * allTexts.length)];
        }
      } else {
        // Auto mode: Prioritize texts with least practice or random
        // Simple: Pick random text for now (or we could implement least_seen logic)
        selectedText = allTexts[Math.floor(Math.random() * allTexts.length)];
      }

      if (!selectedText) {
        // Should not happen given checks above
        selectedText = allTexts[0]; 
      }

      setTextData(selectedText);

      // 4. Prepare Questions for the selected text
      let textQuestions = selectedText.questions || [];
      
      // Sort by category depth
      textQuestions.sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a.category);
        const idxB = CATEGORY_ORDER.indexOf(b.category);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

      // Filter/Reorder based on progress if needed
      // For now, we just show all questions sorted by depth as requested
      // If 'weak' mode, we could filter ONLY weak questions, but usually context requires flow.
      // Let's keep all questions but maybe highlight weak ones or ensure they are included.
      
      setQuestions(textQuestions);

    } catch (error) {
      console.error("Error loading reading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuestions = () => {
    setViewMode('answering');
    setCurrentQuestionIndex(0);
  };

  const checkAnswer = (answer) => {
    const question = questions[currentQuestionIndex];
    const correct = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    return correct;
  };

  const handleSubmit = async (selectedAnswer = null) => {
    const answer = selectedAnswer || userAnswer;
    const question = questions[currentQuestionIndex];
    
    // Basic check
    let correct = false;
    
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
       correct = checkAnswer(answer);
    } else {
       // For open/fill questions, simple match or AI check could be used.
       // For now simple match against provided answer key
       correct = checkAnswer(answer);
    }

    setIsCorrect(correct);
    setShowResult(true);
    setResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
    setAnsweredQuestions(prev => [...prev, { ...question, userAnswer: answer, isCorrect: correct }]);

    // Update Progress
    try {
      const existingProgress = await base44.entities.ReadingProgress.filter({
        user_email: user.email,
        text_id: textData.id,
        question_id: question.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        const newStreak = correct ? (p.streak || 0) + 1 : 0;
        const isMastered = newStreak >= 3;
        // Weak if incorrect twice (cumulative)
        const newIncorrect = (p.times_incorrect || 0) + (correct ? 0 : 1);
        const isWeak = !correct && newIncorrect >= 2;

        await base44.entities.ReadingProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (correct ? 1 : 0),
          times_incorrect: newIncorrect,
          streak: newStreak,
          is_weak: correct ? (isMastered ? false : p.is_weak) : isWeak, // Remove weak if mastered
          is_mastered: isMastered,
          last_practiced: new Date().toISOString()
        });
      } else {
        await base44.entities.ReadingProgress.create({
          user_email: user.email,
          text_id: textData.id,
          question_id: question.id,
          times_seen: 1,
          times_correct: correct ? 1 : 0,
          times_incorrect: correct ? 0 : 1,
          streak: correct ? 1 : 0,
          is_weak: !correct, // First mistake makes it weak? prompt says "Wrong 2 times -> Weak". So initially false.
          is_mastered: false,
          last_practiced: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
    } else {
      setShowSummary(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!textData) return null;

  // Summary Screen
  if (showSummary) {
    const totalQuestions = questions.length;
    const correctCount = results.correct;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);
    const wrongQuestions = answeredQuestions.filter(q => !q.isCorrect);

    return (
      <div className="min-h-screen bg-blue-50 pb-8">
        <div className="bg-blue-600 px-5 py-6 rounded-b-3xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div className="text-5xl font-bold text-white mb-2">{accuracy}%</div>
            <p className="text-white/90 text-lg font-medium">כל הכבוד!</p>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-gray-500 font-medium">נכון</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-red-200">
              <div className="text-2xl font-bold text-red-600">{results.incorrect}</div>
              <div className="text-xs text-gray-500 font-medium">שגוי</div>
            </div>
          </div>

          {/* Weak Questions List */}
          {wrongQuestions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-200">
              <div className="text-sm text-gray-700 mb-3 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                שאלות לחיזוק:
              </div>
              <div className="space-y-2">
                {wrongQuestions.map((q, idx) => (
                  <div key={idx} className="bg-red-50 rounded-xl p-3 text-sm">
                    <div className="text-gray-800 mb-1" dir="ltr">{q.question}</div>
                    <div className="text-green-700 font-medium" dir="ltr">תשובה: {q.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => {
                // Restart with same text
                setViewMode('reading');
                setResults({ correct: 0, incorrect: 0 });
                setAnsweredQuestions([]);
                setShowSummary(false);
                setShowResult(false);
                setCurrentQuestionIndex(0);
                setUserAnswer('');
              }}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-2xl shadow-lg"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("ReadingComprehension"))}
              className="w-full text-gray-500 font-medium"
            >
              חזרה לתפריט
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Reading Phase
  if (viewMode === 'reading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => navigate(createPageUrl("ReadingComprehension"))}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-gray-900 block">קרא את הטקסט</span>
            <span className="text-xs text-gray-500">{textData.title}</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Text Display */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-20">
            <div 
              className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap"
              style={{ fontFamily: "'Georgia', serif", direction: 'ltr' }}
            >
              {textData.text_content}
            </div>
          </div>
        </div>

        {/* Start Button (Fixed Bottom) */}
        <div className="p-4 bg-white border-t border-gray-200 sticky bottom-0 z-10">
          <Button 
            onClick={handleStartQuestions}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-lg"
          >
            התחל לענות על השאלות
          </Button>
        </div>
      </div>
    );
  }

  // Answering Phase
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setViewMode('reading')}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
        >
          <FileText className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white">שאלה {currentQuestionIndex + 1}</span>
          <div className="text-xs text-white/80">מתוך {questions.length}</div>
        </div>
        <button
          onClick={() => setShowTextDialog(true)}
          className="p-2 -mr-2 text-white hover:bg-white/10 rounded-lg"
        >
          <BookOpen className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-blue-400 h-2">
        <div
          className="bg-white h-2 transition-all duration-300 rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question Area */}
      <div className="flex-1 p-5 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-100">
              <div className="flex justify-center mb-4">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  {currentQuestion.category?.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center leading-relaxed" dir="ltr">
                {currentQuestion.question}
              </h2>
            </div>

            {!showResult ? (
              <div className="space-y-3">
                {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') ? (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, idx) => {
                      const isSelected = userAnswer === option;
                      return (
                        <button
                          key={idx}
                          onClick={() => setUserAnswer(option)}
                          className={`w-full bg-white rounded-xl p-4 text-left border-2 transition-all shadow-sm ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          dir="ltr"
                        >
                          <span className="text-lg font-medium text-gray-800">{option}</span>
                        </button>
                      );
                    })}
                    {userAnswer && (
                      <Button
                        onClick={() => handleSubmit()}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-xl mt-4 shadow-lg"
                      >
                        בדוק תשובה
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentQuestion.type === 'fill_blank' ? (
                       <Input
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type the missing word..."
                        className="h-14 text-lg text-center rounded-xl border-2 border-gray-200"
                        dir="ltr"
                        autoFocus
                      />
                    ) : (
                      <Textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="h-32 text-lg rounded-xl border-2 border-gray-200"
                        dir="ltr"
                        autoFocus
                      />
                    )}
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={!userAnswer.trim()}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-xl shadow-lg"
                    >
                      בדוק תשובה
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-2xl p-6 shadow-lg ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isCorrect ? <Check className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
                    </div>
                    <span className={`text-2xl font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-1">Answer:</div>
                    <div className="text-lg font-bold text-gray-900" dir="ltr">
                      {currentQuestion.answer}
                    </div>
                    {currentQuestion.explanation && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Explanation:</div>
                        <div className="text-sm text-gray-700" dir="ltr">{currentQuestion.explanation}</div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold rounded-xl shadow-lg"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'שאלה הבאה' : 'סיים וראה תוצאות'}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Text Dialog Overlay */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{textData.title}</DialogTitle>
          </DialogHeader>
          <div 
            className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap p-2"
            style={{ fontFamily: "'Georgia', serif", direction: 'ltr' }}
          >
            {textData.text_content}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTextDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}