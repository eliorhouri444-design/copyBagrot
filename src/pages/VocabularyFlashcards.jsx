import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Check, X, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function VocabularyFlashcardsPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const isMultiSet = urlParams.get('multiSet') === 'true';
  const setsParam = urlParams.get('sets');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState({ known: 0, unknown: 0 });
  const [answeredWords, setAnsweredWords] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const subject = currentUser?.selected_subject || 'אנגלית';
      const units = currentUser?.selected_units || 3;

      const allWords = await base44.entities.VocabularyQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'order', 500);

      let wordsForPractice = [];
      if (isMultiSet) {
        const setsData = JSON.parse(sessionStorage.getItem('vocabSetsData') || '[]');
        setsData.forEach(set => {
          wordsForPractice = [...wordsForPractice, ...allWords.slice(set.startIndex, set.endIndex)];
        });
      } else {
        wordsForPractice = allWords.slice(startIndex, endIndex);
      }
      
      setWords(wordsForPractice);

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (isKnown) => {
    const currentWord = words[currentIndex];
    
    setAnsweredWords(prev => [...prev, { ...currentWord, isKnown }]);
    setResults(prev => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Update progress in database
    try {
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: currentWord.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        await base44.entities.VocabularyProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (isKnown ? 1 : 0),
          times_incorrect: (p.times_incorrect || 0) + (isKnown ? 0 : 1),
          is_known: isKnown ? true : p.is_known,
          is_weak: !isKnown ? true : false,
          last_practiced: new Date().toISOString(),
          mastery_level: Math.min(100, Math.max(0, (p.mastery_level || 0) + (isKnown ? 10 : -15)))
        });
      } else {
        await base44.entities.VocabularyProgress.create({
          word_id: currentWord.id,
          user_email: user.email,
          subject_id: user.selected_subject || 'אנגלית',
          unit_level: user.selected_units || 3,
          hebrew_word: currentWord.hebrew_word,
          english_word: currentWord.english_answer,
          times_seen: 1,
          times_correct: isKnown ? 1 : 0,
          times_incorrect: isKnown ? 0 : 1,
          is_known: isKnown,
          is_weak: !isKnown,
          last_practiced: new Date().toISOString(),
          mastery_level: isKnown ? 20 : 0
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    // Move to next word or show summary
    if (currentIndex < words.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    } else {
      setShowSummary(true);
    }
  };

  const getEvaluation = () => {
    const ratio = results.known / words.length;
    if (ratio >= 0.8) return { text: "מצוין! אתה שולט במילים", color: "text-green-600" };
    if (ratio >= 0.6) return { text: "בסדר, אפשר להתקדם", color: "text-blue-600" };
    if (ratio >= 0.4) return { text: "כדאי לחזור על המילים שוב", color: "text-orange-600" };
    return { text: "צריך לתרגל עוד, אל תוותר!", color: "text-red-600" };
  };

  // Store words for quiz
  const goToQuiz = () => {
    sessionStorage.setItem('flashcardResults', JSON.stringify(answeredWords));
    if (isMultiSet) {
      navigate(createPageUrl(`VocabularyQuickPractice?multiSet=true&sets=${setsParam}`));
    } else {
      navigate(createPageUrl(`VocabularyQuickPractice?setId=${setId}&start=${startIndex}&end=${endIndex}`));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (showSummary) {
    const evaluation = getEvaluation();
    const unknownWords = answeredWords.filter(w => !w.isKnown);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">סיימת את הכרטיסיות</h2>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">ידעת</span>
              <span className="font-bold text-green-600">{results.known} מילים</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">לא ידעת</span>
              <span className="font-bold text-red-600">{results.unknown} מילים</span>
            </div>
            <div className="pt-2">
              <p className={`text-center font-semibold ${evaluation.color}`}>
                {evaluation.text}
              </p>
            </div>
          </div>

          {unknownWords.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="text-sm text-gray-500 mb-2">מילים לחזרה:</div>
              <div className="flex flex-wrap gap-2">
                {unknownWords.slice(0, 5).map((word, idx) => (
                  <span key={idx} className="bg-white px-2 py-1 rounded text-sm text-gray-700 border">
                    {word.hebrew_word}
                  </span>
                ))}
                {unknownWords.length > 5 && (
                  <span className="text-sm text-gray-400">+{unknownWords.length - 5} עוד</span>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={goToQuiz}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold"
          >
            עבור לבוחן
          </Button>
          
          <button
            onClick={() => navigate(createPageUrl("VocabularySets"))}
            className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700"
          >
            חזרה לנושאים
          </button>
        </motion.div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">אין מילים זמינות</p>
          <Button onClick={() => navigate(createPageUrl("VocabularySets"))}>
            חזור
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - minimal */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(createPageUrl("VocabularySets"))}
          className="p-2 -ml-2 text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="w-9" />
      </div>
      
      <Progress value={progress} className="h-1 rounded-none" />

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            {/* English word */}
            <div className="text-3xl font-bold text-gray-900 mb-4" dir="ltr">
              {currentWord.english_answer}
            </div>
            
            {/* Example sentence */}
            {currentWord.example_sentence && (
              <div className="text-sm text-gray-500 italic mb-6" dir="ltr">
                "{currentWord.example_sentence}"
              </div>
            )}

            {/* Hebrew translation - smaller */}
            <div className="text-lg text-gray-600 pt-4 border-t border-gray-100">
              {currentWord.hebrew_word}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <X className="w-5 h-5 text-red-500" />
              <span className="font-medium">לא ידעתי</span>
            </button>
            
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium">ידעתי</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}