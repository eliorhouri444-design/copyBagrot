import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Check, X, Loader2, Zap, Trophy, RotateCcw, Volume2, Target
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// מצב 3 - חיזוק מילים חלשות - רק Flashcards על מילים שלא ידעתי

export default function VocabularyStrengthenPage() {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weakWords, setWeakWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({ mastered: 0, stillWeak: 0 });
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadWeakWords();
  }, []);

  const loadWeakWords = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get weak words from progress
      const weakProgress = await base44.entities.VocabularyProgress.filter({
        user_email: currentUser.email,
        is_weak: true
      }, '-updated_date', 50);

      if (weakProgress.length === 0) {
        setWeakWords([]);
        setIsLoading(false);
        return;
      }

      // Get the actual word data
      const wordIds = weakProgress.map(p => p.word_id);
      const allWords = await base44.entities.VocabularyQuestion.filter({
        subject_id: currentUser.selected_subject || 'אנגלית',
        unit_level: currentUser.selected_units || 3,
        is_active: true
      }, null, 500);

      const weakWordData = allWords.filter(w => wordIds.includes(w.id));
      
      // Sort by how many times they got it wrong
      const sortedWeakWords = weakWordData.map(w => {
        const progress = weakProgress.find(p => p.word_id === w.id);
        return { ...w, timesIncorrect: progress?.times_incorrect || 0 };
      }).sort((a, b) => b.timesIncorrect - a.timesIncorrect);

      setWeakWords(sortedWeakWords);

    } catch (error) {
      console.error("Error loading weak words:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (knewIt) => {
    const currentWord = weakWords[currentIndex];
    
    setResults(prev => ({
      mastered: prev.mastered + (knewIt ? 1 : 0),
      stillWeak: prev.stillWeak + (knewIt ? 0 : 1)
    }));

    // Update progress
    try {
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: currentWord.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        const newCorrect = (p.times_correct || 0) + (knewIt ? 1 : 0);
        // Remove from weak list if answered correctly 2+ times
        const shouldRemoveFromWeak = knewIt && newCorrect >= 2;
        
        await base44.entities.VocabularyProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: newCorrect,
          times_incorrect: (p.times_incorrect || 0) + (knewIt ? 0 : 1),
          is_weak: !shouldRemoveFromWeak,
          is_known: shouldRemoveFromWeak,
          last_practiced: new Date().toISOString(),
          mastery_level: Math.min(100, Math.max(0, (p.mastery_level || 0) + (knewIt ? 20 : -5)))
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }

    // Move to next or show summary
    setIsFlipped(false);
    if (currentIndex < weakWords.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    } else {
      setShowSummary(true);
    }
  };

  // Text-to-Speech function
  const speakWord = (text, lang = 'en-US') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">טוען מילים לחיזוק...</p>
        </div>
      </div>
    );
  }

  // No weak words
  if (weakWords.length === 0) {
    return (
      <div className="min-h-screen bg-blue-50 pb-8">
        {/* Header */}
        <div className="bg-green-600 px-5 py-6 rounded-b-3xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">מצוין!</h2>
            <p className="text-white/90">אין לך מילים לחיזוק כרגע</p>
          </div>
        </div>
        
        <div className="px-5 py-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-200 text-center mb-6">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">כל המילים נשלטות! המשך לתרגל כדי לשמור על הרמה.</p>
          </div>
          
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-bold rounded-2xl shadow-lg"
          >
            חזור לתרגול
          </Button>
        </div>
      </div>
    );
  }

  // Summary
  if (showSummary) {
    const accuracy = Math.round((results.mastered / (results.mastered + results.stillWeak)) * 100);
    
    return (
      <div className="min-h-screen bg-blue-50 pb-8">
        {/* Header */}
        <div className="bg-orange-500 px-5 py-6 rounded-b-3xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div className="text-5xl font-bold text-white mb-2">{accuracy}%</div>
            <p className="text-white/90 text-lg font-medium">סיימת חיזוק!</p>
          </div>
        </div>

        <div className="px-5 py-6 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">{results.mastered}</div>
              <div className="text-sm text-gray-600 font-medium">נשלטו</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-orange-200">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-600">{results.stillWeak}</div>
              <div className="text-sm text-gray-600 font-medium">עדיין לחיזוק</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {results.stillWeak > 0 && (
              <Button
                onClick={() => {
                  setCurrentIndex(0);
                  setResults({ mastered: 0, stillWeak: 0 });
                  setShowSummary(false);
                  loadWeakWords();
                }}
                className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-lg font-bold rounded-2xl shadow-lg"
              >
                <RotateCcw className="w-5 h-5 ml-2" />
                המשך לחזק
              </Button>
            )}
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              variant="outline"
              className="w-full h-12 text-base font-bold border-2 border-blue-300 text-blue-600 rounded-2xl hover:bg-blue-50"
            >
              חזור לתרגול
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = weakWords[currentIndex];
  const progress = ((currentIndex + 1) / weakWords.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("Practice"))}
          className="p-2 -ml-2 text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">
            חיזוק מילים • {currentIndex + 1}/{weakWords.length}
          </span>
        </div>

      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-orange-200 h-2">
        <div 
          className="bg-orange-600 h-2 transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm"
        >
          {/* 3D Flip Card */}
          <div
            className="relative w-full h-[380px] cursor-pointer"
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
                className="absolute inset-0 bg-white rounded-[28px] border-2 border-orange-200 shadow-lg flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Weak indicator */}
                <span className="absolute top-4 left-4 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                  לחיזוק
                </span>

                {currentWord.part_of_speech && (
                  <span className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {currentWord.part_of_speech}
                  </span>
                )}

                <div className="text-3xl font-bold text-gray-900 mb-2 text-center" dir="ltr">
                  {currentWord.english_answer}
                </div>
                
                {currentWord.phonetic && (
                  <div className="text-sm text-gray-400 mb-3" dir="ltr">/{currentWord.phonetic}/</div>
                )}

                {(currentWord.audio?.english_audio_url || currentWord.audio_url) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const audio = new Audio(currentWord.audio?.english_audio_url || currentWord.audio_url);
                      audio.play();
                    }}
                    className="mb-4 p-3 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                  className="px-6 py-2.5 rounded-2xl border-2 border-orange-400 text-orange-600 font-medium bg-transparent hover:bg-orange-50 transition-colors"
                >
                  הפוך כרטיס
                </button>
              </div>

              {/* Back Side */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white rounded-[28px] border-2 border-orange-200 shadow-lg flex flex-col items-center justify-center p-6 overflow-y-auto"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {currentWord.part_of_speech && (
                  <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {currentWord.part_of_speech}
                  </span>
                )}

                <div className="text-2xl font-bold text-gray-900 mb-1 text-center">
                  {currentWord.hebrew_word}
                </div>
                <div className="text-lg text-orange-600 text-center mb-3" dir="ltr">
                  {currentWord.english_answer}
                </div>

                {currentWord.example_sentence && (
                  <div className="text-sm text-gray-600 text-center p-2 bg-white/70 rounded-xl max-w-xs mb-2" dir="ltr">
                    "{currentWord.example_sentence}"
                  </div>
                )}

                {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-2">
                    <span className="text-xs text-gray-500">נרדפות:</span>
                    {currentWord.synonyms.slice(0, 3).map((syn, i) => (
                      <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full" dir="ltr">{syn}</span>
                    ))}
                  </div>
                )}

                {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    <span className="text-xs text-gray-500">הפכים:</span>
                    {currentWord.antonyms.slice(0, 3).map((ant, i) => (
                      <span key={i} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full" dir="ltr">{ant}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-12">
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 h-14 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-green-100 hover:border-green-300 transition-all"
            >
              <Check className="w-5 h-5 text-green-600" />
              <span className="font-semibold">עכשיו יודע!</span>
            </button>
            
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 h-14 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-orange-100 hover:border-orange-300 transition-all"
            >
              <X className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">עוד לא</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}