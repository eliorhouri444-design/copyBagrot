import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, Check, X, Loader2 } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

// מצב 1 - FLASHCARDS בלבד - לימוד נקי ללא שאלות

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
  const [isFlipped, setIsFlipped] = useState(false);

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
        setsData.forEach((set) => {
          wordsForPractice = [...wordsForPractice, ...allWords.slice(set.startIndex, set.endIndex)];
        });
      } else {
        wordsForPractice = allWords.slice(startIndex, endIndex);
      }

      // Load user progress to prioritize weak words
      const userProgress = await base44.entities.VocabularyProgress.filter({
        user_email: currentUser.email,
        subject_id: subject
      }, null, 1000);

      const progressMap = {};
      userProgress.forEach(p => {
        progressMap[p.word_id] = p;
      });

      // Sort words: weak words first, then by streak (ascending), then unlearned
      wordsForPractice.sort((a, b) => {
        const progA = progressMap[a.id];
        const progB = progressMap[b.id];

        // Weak words first
        if (progA?.is_weak && !progB?.is_weak) return -1;
        if (!progA?.is_weak && progB?.is_weak) return 1;

        // Then by streak (lower streak = needs more practice)
        const streakA = progA?.streak || 0;
        const streakB = progB?.streak || 0;
        if (streakA !== streakB) return streakA - streakB;

        // Unlearned words before mastered ones
        if (!progA?.is_known && progB?.is_known) return -1;
        if (progA?.is_known && !progB?.is_known) return 1;

        return 0;
      });

      setWords(wordsForPractice);

    } catch (error) {
      console.error("Error loading vocabulary data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (isKnown) => {
    const currentWord = words[currentIndex];

    setAnsweredWords((prev) => [...prev, { ...currentWord, isKnown }]);
    setResults((prev) => ({
      known: prev.known + (isKnown ? 1 : 0),
      unknown: prev.unknown + (isKnown ? 0 : 1)
    }));

    // Update progress in database with streak tracking
    try {
      const existingProgress = await base44.entities.VocabularyProgress.filter({
        user_email: user.email,
        word_id: currentWord.id
      });

      if (existingProgress.length > 0) {
        const p = existingProgress[0];
        // Calculate new streak - if correct, increment; if wrong, reset to 0
        const newStreak = isKnown ? (p.streak || 0) + 1 : 0;
        // Word is considered "mastered" if streak reaches 4-5
        const isMastered = newStreak >= 4;
        // Calculate mastery level based on streak
        const masteryBoost = isKnown ? (newStreak >= 3 ? 15 : 10) : -20;
        const newMastery = Math.min(100, Math.max(0, (p.mastery_level || 0) + masteryBoost));

        await base44.entities.VocabularyProgress.update(p.id, {
          times_seen: (p.times_seen || 0) + 1,
          times_correct: (p.times_correct || 0) + (isKnown ? 1 : 0),
          times_incorrect: (p.times_incorrect || 0) + (isKnown ? 0 : 1),
          streak: newStreak,
          is_known: isMastered || p.is_known,
          is_weak: !isKnown ? true : (newStreak >= 2 ? false : p.is_weak),
          last_practiced: new Date().toISOString(),
          mastery_level: newMastery
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
          streak: isKnown ? 1 : 0,
          is_known: false,
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
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 200);
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

  // Auto-continue to quiz after 2 seconds
  useEffect(() => {
    if (showSummary) {
      sessionStorage.setItem('flashcardResults', JSON.stringify(answeredWords));
      const timer = setTimeout(() => {
        if (isMultiSet) {
          navigate(createPageUrl(`VocabularyQuickPractice?multiSet=true&sets=${setsParam}`));
        } else {
          navigate(createPageUrl(`VocabularyQuickPractice?setId=${setId}&start=${startIndex}&end=${endIndex}`));
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSummary, answeredWords, isMultiSet, setsParam, setId, startIndex, endIndex, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>);

  }

  if (showSummary) {
    const evaluation = getEvaluation();
    const masteredWords = answeredWords.filter(w => w.isKnown);
    const weakWords = answeredWords.filter(w => !w.isKnown);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">

          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900">{results.known}/{words.length}</div>
            <p className={`text-base mt-2 ${evaluation.color}`}>{evaluation.text}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{masteredWords.length}</div>
              <div className="text-xs text-green-700">ידעתי</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{weakWords.length}</div>
              <div className="text-xs text-red-700">לחיזוק</div>
            </div>
          </div>

          {/* Mastered words with streak info */}
          {masteredWords.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">מילים שנשלטו:</div>
              <div className="flex flex-wrap gap-1.5">
                {masteredWords.slice(0, 8).map((w, idx) => (
                  <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-medium" dir="ltr">
                    {w.english_answer}
                  </span>
                ))}
                {masteredWords.length > 8 && (
                  <span className="text-xs text-gray-500">+{masteredWords.length - 8}</span>
                )}
              </div>
            </div>
          )}

          {/* Weak words */}
          {weakWords.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">לחיזוק:</div>
              <div className="flex flex-wrap gap-1.5">
                {weakWords.map((w, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded-lg text-xs font-medium" dir="ltr">
                    {w.english_answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 rounded-xl p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">עובר לבוחן...</span>
          </div>
        </motion.div>
      </div>);

  }

  const currentWord = words[currentIndex];
  const progress = (currentIndex + 1) / words.length * 100;

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleAnswerWithFlip = (isKnown) => {
    setIsFlipped(false);
    handleAnswer(isKnown);
  };

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">אין מילים זמינות</p>
          <Button onClick={() => navigate(createPageUrl("VocabularySets"))}>
            חזור
          </Button>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <button
          onClick={() => navigate(createPageUrl("VocabularySets"))}
          className="p-2 -ml-2 text-gray-500">

          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-blue-600">
          שאלה {currentIndex + 1} מתוך {words.length}
        </span>
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2.5">
        <div
          className="bg-blue-600 h-2.5 transition-all duration-300"
          style={{ width: `${progress}%` }} />

      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm">

          {/* 3D Flip Card */}
          <div
            className="relative w-full h-[380px] cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={handleFlip}>

            <motion.div
              className="relative w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ transformStyle: 'preserve-3d' }}>

              {/* Front Side */}
              <div
                className="absolute inset-0 bg-white rounded-[28px] border-2 border-blue-100 shadow-lg flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: 'hidden' }}>

                {/* Part of Speech Tag */}
                {currentWord.part_of_speech && (
                  <span className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {currentWord.part_of_speech}
                  </span>
                )}

                <div className="text-3xl font-bold text-gray-900 mb-2 text-center" dir="ltr">
                  {currentWord.english_answer}
                </div>

                {/* Phonetic */}
                {currentWord.phonetic && (
                  <div className="text-sm text-gray-400 mb-3" dir="ltr">/{currentWord.phonetic}/</div>
                )}

                {/* Audio Button */}
                {(currentWord.audio?.english_audio_url || currentWord.audio_url) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const audio = new Audio(currentWord.audio?.english_audio_url || currentWord.audio_url);
                      audio.play();
                    }}
                    className="mb-4 p-3 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={(e) => {e.stopPropagation();setIsFlipped(true);}}
                  className="px-6 py-2.5 rounded-2xl border-2 border-blue-400 text-blue-600 font-medium bg-transparent hover:bg-blue-50 transition-colors">

                  הפוך כרטיס
                </button>
              </div>

              {/* Back Side */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white rounded-[28px] border-2 border-blue-200 shadow-lg flex flex-col items-center justify-center p-6 overflow-y-auto"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>

                {/* Part of Speech Tag */}
                {currentWord.part_of_speech && (
                  <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {currentWord.part_of_speech}
                  </span>
                )}

                <div className="text-2xl font-bold text-gray-900 mb-1 text-center">
                  {currentWord.hebrew_word}
                </div>
                <div className="text-lg text-blue-600 text-center mb-3" dir="ltr">
                  {currentWord.english_answer}
                </div>

                {/* Example Sentence */}
                {currentWord.example_sentence && (
                  <div className="text-sm text-gray-600 text-center p-2 bg-white/70 rounded-xl max-w-xs mb-2" dir="ltr">
                    "{currentWord.example_sentence}"
                  </div>
                )}

                {/* Synonyms */}
                {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-2">
                    <span className="text-xs text-gray-500">נרדפות:</span>
                    {currentWord.synonyms.slice(0, 3).map((syn, i) => (
                      <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full" dir="ltr">{syn}</span>
                    ))}
                  </div>
                )}

                {/* Antonyms */}
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
              onClick={() => handleAnswerWithFlip(true)}
              className="flex-1 h-14 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-green-100 hover:border-green-300 transition-all">

              <Check className="w-5 h-5 text-green-600" />
              <span className="font-semibold">ידעתי</span>
            </button>
            
            <button
              onClick={() => handleAnswerWithFlip(false)}
              className="flex-1 h-14 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center gap-2 text-gray-800 hover:bg-red-100 hover:border-red-300 transition-all">

              <X className="w-5 h-5 text-red-500" />
              <span className="font-semibold">לא ידעתי</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>);

}