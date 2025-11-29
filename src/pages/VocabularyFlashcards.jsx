import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, Check, X, Loader2, Volume2, Image as ImageIcon, AlertTriangle } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

// מצב 1 - FLASHCARDS בלבד - לימוד נקי ללא שאלות

export default function VocabularyFlashcardsPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get('setId');
  const isMultiSet = urlParams.get('multiSet') === 'true';
  const setsParam = urlParams.get('sets');
  const startIndex = parseInt(urlParams.get('start') || '0');
  const endIndex = parseInt(urlParams.get('end') || '10');
  const resumeIndex = parseInt(urlParams.get('resumeIndex') || '0');
  const resumeWordId = urlParams.get('resumeWordId');

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState({ known: 0, unknown: 0 });
  const [answeredWords, setAnsweredWords] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [generatedImages, setGeneratedImages] = useState({});
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

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

  // Generate image for word based on unit level
  const generateImageForWord = async (word) => {
    if (word.image_url || generatedImages[word.id] || generatingImage) return;
    
    setGeneratingImage(true);
    try {
      const unitLevel = user?.selected_units || 3;
      
      // Base style rules for all levels
      const baseStyle = `
ABSOLUTE REQUIREMENTS (MUST FOLLOW):
1. ZERO TEXT - No letters, words, numbers, labels, captions, signs, or any written content anywhere in the image.
2. PURE ILLUSTRATION ONLY - Show only visual objects, symbols, or simple scenes.
3. Style: Modern flat vector illustration with soft pastel colors (light blue, mint green, soft yellow, light gray).
4. Background: Solid white or very light gradient only.
5. Composition: Single centered subject with clean edges and thin outlines.
6. Format: Square 1:1 ratio with padding around the subject.

FORBIDDEN ELEMENTS:
- Any text, letters, or numbers
- Realistic photographs
- Human faces with details
- Busy or cluttered backgrounds
- Signs, labels, or captions`;

      let levelPrompt = '';
      
      if (unitLevel === 3) {
        // A1-A2 level - very simple
        levelPrompt = `Create a simple flat illustration for the word: "${word.english_answer}" for A1-A2 learners.
RULES:
- Draw ONLY one object or one simple action.
- No facial details, no emotion details.
- Shapes must be basic (icons style).
- Avoid complex ideas. Show the most basic meaning only.
- Use clear symbols.
${baseStyle}`;
      } else if (unitLevel === 4) {
        // A2-B1 level - medium complexity
        levelPrompt = `Create a flat illustration for the word: "${word.english_answer}" for A2-B1 learners.
RULES:
- Keep the flat educational style.
- You may add 1-2 supporting objects ONLY if they help explain meaning.
- Simple emotion indicators allowed (smile, sad face).
- Small scene allowed but must stay minimal.
- Still no real faces, no realism, no text.
${baseStyle}`;
      } else {
        // B1-B2 level - conceptual
        levelPrompt = `Create an advanced educational flat illustration for the word: "${word.english_answer}" at B1-B2 level.
RULES:
- Still flat, vector, pastel colors, 1:1 - style must match lower levels.
- You may draw small scenes or conceptual symbols.
- You may use metaphors (balance scale, idea lightbulb, path forward).
- No realism, no text, no detailed characters.
${baseStyle}`;
      }

      const result = await base44.integrations.Core.GenerateImage({
        prompt: levelPrompt
      });
      
      if (result?.url) {
        setGeneratedImages(prev => ({ ...prev, [word.id]: result.url }));
        // Save to database for future use
        try {
          await base44.entities.VocabularyQuestion.update(word.id, {
            image_url: result.url
          });
        } catch (e) {
          console.log("Could not save image to DB");
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setGeneratingImage(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate image when word changes
  useEffect(() => {
    const currentWord = words[currentIndex];
    if (currentWord && !currentWord.image_url && !generatedImages[currentWord.id]) {
      generateImageForWord(currentWord);
    }
  }, [currentIndex, words]);

  // Update bookmark when current index changes
  useEffect(() => {
    // Only update if not loading to prevent overwriting bookmark with 0 on initial load
    if (!isLoading && user && !isMultiSet && setId && words.length > 0 && !showSummary) {
       base44.auth.updateMe({
         last_vocabulary_position: {
           set_id: parseInt(setId),
           question_index: currentIndex,
           word_id: words[currentIndex]?.id,
           mode: 'flashcards',
           timestamp: new Date().toISOString()
         }
       }).catch(e => console.error("Error saving bookmark:", e));
    }
  }, [currentIndex, user, isMultiSet, setId, words.length, showSummary, isLoading]);

  const handleExit = () => {
    const targetPage = user?.role === 'admin' ? "VocabularySets" : "VocabularyTraining";
    if (showSummary || words.length === 0) {
      navigate(createPageUrl(targetPage));
      return;
    }
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    const targetPage = user?.role === 'admin' ? "VocabularySets" : "VocabularyTraining";
    navigate(createPageUrl(targetPage));
  };

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
      }, 'order', 2000);

      let wordsForPractice = [];
      if (isMultiSet) {
        const setsData = JSON.parse(sessionStorage.getItem('vocabSetsData') || '[]');
        setsData.forEach((set) => {
          wordsForPractice = [...wordsForPractice, ...allWords.slice(set.startIndex, set.endIndex)];
        });
      } else {
        wordsForPractice = allWords.slice(startIndex, endIndex);
      }

      setWords(wordsForPractice);

      // Resume logic
      let targetIndex = 0;
      
      if (resumeWordId && resumeWordId !== 'undefined' && resumeWordId !== 'null') {
        const foundIndex = wordsForPractice.findIndex(w => w.id === resumeWordId);
        if (foundIndex !== -1) {
          targetIndex = foundIndex;
        }
      } 
      
      if (targetIndex === 0 && resumeIndex > 0 && resumeIndex < wordsForPractice.length) {
        targetIndex = resumeIndex;
      }

      if (targetIndex > 0) {
        setCurrentIndex(targetIndex);
      }

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

  // Save progress and auto-continue to quiz after 2 seconds
  useEffect(() => {
    if (showSummary) {
      sessionStorage.setItem('flashcardResults', JSON.stringify(answeredWords));
      
      // Save current set progress for next time
      const currentSetNum = parseInt(setId) || 1;
      const nextSetNum = currentSetNum + 1;
      const nextStart = endIndex;
      const nextEnd = nextStart + 10;
      
      // Save progress to localStorage - next set to continue from
      localStorage.setItem('vocabSetProgress', JSON.stringify({
        currentSet: nextSetNum,
        startIndex: nextStart,
        endIndex: nextEnd,
        lastCompleted: currentSetNum,
        completedAt: new Date().toISOString()
      }));
      
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
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">טוען כרטיסיות...</p>
        </div>
      </div>
    );
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
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <p className="text-gray-600 mb-4 font-medium">אין מילים זמינות</p>
          <Button 
            onClick={() => navigate(createPageUrl("VocabularySets"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            חזור
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
          onClick={handleExit}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white">כרטיסיות</span>
          <div className="text-xs text-white/80">
            {currentIndex + 1} מתוך {words.length}
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

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-5">
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
                className="absolute inset-0 bg-white rounded-3xl border border-blue-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-6"
                style={{ backfaceVisibility: 'hidden' }}>

                {/* Part of Speech Tag */}
                {currentWord.part_of_speech && (
                  <span className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {currentWord.part_of_speech}
                  </span>
                )}

                {/* Image - show generated or existing */}
                {(currentWord.image_url || generatedImages[currentWord.id]) ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden mb-3 shadow-md">
                    <img 
                      src={currentWord.image_url || generatedImages[currentWord.id]} 
                      alt={currentWord.english_answer}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : generatingImage ? (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 mb-3 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : null}

                <div className="text-3xl font-bold text-gray-900 mb-1 text-center" dir="ltr">
                  {currentWord.english_answer}
                </div>

                {/* Phonetic */}
                {currentWord.phonetic && (
                  <div className="text-sm text-gray-400 mb-2" dir="ltr">/{currentWord.phonetic}/</div>
                )}

                {/* Audio Button - Always available with TTS fallback */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentWord.audio?.english_audio_url || currentWord.audio_url) {
                      const audio = new Audio(currentWord.audio?.english_audio_url || currentWord.audio_url);
                      audio.play();
                    } else {
                      speakWord(currentWord.english_answer, 'en-US');
                    }
                  }}
                  className="mb-3 p-3 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Volume2 className="w-6 h-6 text-blue-600" />
                </button>

                <button
                  onClick={(e) => {e.stopPropagation();setIsFlipped(true);}}
                  className="px-6 py-2.5 rounded-2xl border border-blue-200 text-blue-600 font-medium bg-blue-50/50 hover:bg-blue-100 transition-colors">

                  הפוך כרטיס
                </button>
              </div>

              {/* Back Side */}
              <div
                className="absolute inset-0 bg-white rounded-3xl border border-blue-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-5 overflow-y-auto"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>

                {/* Part of Speech Tag */}
                {currentWord.part_of_speech && (
                  <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {currentWord.part_of_speech}
                  </span>
                )}

                {/* Image on back too */}
                {(currentWord.image_url || generatedImages[currentWord.id]) && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden mb-2 shadow-md">
                    <img 
                      src={currentWord.image_url || generatedImages[currentWord.id]} 
                      alt={currentWord.english_answer}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="text-2xl font-bold text-gray-900 mb-1 text-center">
                  {currentWord.hebrew_word}
                </div>
                <div className="text-lg text-blue-600 text-center mb-2" dir="ltr">
                  {currentWord.english_answer}
                </div>

                {/* Audio buttons - Always available with TTS fallback */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentWord.audio?.english_audio_url || currentWord.audio_url) {
                        const audio = new Audio(currentWord.audio?.english_audio_url || currentWord.audio_url);
                        audio.play();
                      } else {
                        speakWord(currentWord.english_answer, 'en-US');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors text-xs text-blue-700 font-medium"
                  >
                    <Volume2 className="w-4 h-4" />
                    מילה
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentWord.audio?.hebrew_audio_url) {
                        const audio = new Audio(currentWord.audio.hebrew_audio_url);
                        audio.play();
                      } else {
                        speakWord(currentWord.hebrew_word, 'he-IL');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 hover:bg-green-200 transition-colors text-xs text-green-700 font-medium"
                  >
                    <Volume2 className="w-4 h-4" />
                    עברית
                  </button>
                </div>

                {/* Example Sentence with audio */}
                {currentWord.example_sentence && (
                  <div className="relative">
                    <div className="text-sm text-gray-600 text-center p-2 bg-white/70 rounded-xl max-w-xs mb-2" dir="ltr">
                      "{currentWord.example_sentence}"
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(currentWord.example_sentence, 'en-US');
                      }}
                      className="absolute -top-1 -left-1 p-1.5 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors"
                    >
                      <Volume2 className="w-3 h-3 text-purple-600" />
                    </button>
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
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => handleAnswerWithFlip(true)}
              className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lg transition-all"
            >
              <Check className="w-6 h-6" />
              <span className="font-bold text-lg">ידעתי</span>
            </button>
            
            <button
              onClick={() => handleAnswerWithFlip(false)}
              className="flex-1 h-14 bg-blue-400 hover:bg-blue-500 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lg transition-all"
            >
              <X className="w-6 h-6" />
              <span className="font-bold text-lg">לא ידעתי</span>
            </button>
          </div>
        </motion.div>
      </div>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              האם אתה בטוח שברצונך לצאת?
            </DialogTitle>
            <DialogDescription>
              המיקום שלך יישמר ותוכל להמשיך בדיוק מאותה נקודה בפעם הבאה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-row-reverse">
            <Button onClick={() => setShowExitDialog(false)} variant="outline" className="flex-1">
              המשך בתרגול
            </Button>
            <Button onClick={confirmExit} className="flex-1 bg-red-600 hover:bg-red-700">
              שמור וצא
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}