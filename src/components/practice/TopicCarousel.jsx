import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Play, Target, Edit2, Plus, Lock, BookOpen, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";

export default function TopicCarousel({ topics: initialTopics = [], onEditTopic, onAddTopic, isPremium }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState(initialTopics);
  const [vocabStats, setVocabStats] = useState(null);
  const [showVocabSetSelector, setShowVocabSetSelector] = useState(false);
  const [vocabularySets, setVocabularySets] = useState([]);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [totalSets, setTotalSets] = useState(0);
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);

  useEffect(() => {
    setTopics(initialTopics);
  }, [initialTopics]);

  // Load stats when topic changes
  useEffect(() => {
    const loadStats = async () => {
      const currentTopic = topics[currentIndex];
      if (!currentTopic) return;

      const isVocab = currentTopic.isVocabulary || 
                      currentTopic.topic_id?.toLowerCase().includes('vocabulary') || 
                      currentTopic.topic_id?.toLowerCase().includes('אוצר_מילים') ||
                      currentTopic.topic_id?.includes('vocab');

      if (isVocab) {
        try {
          const user = await base44.auth.me();
          const subject = user?.selected_subject || 'אנגלית';
          const units = user?.selected_units || 3;

          // We need to check if this specific topic IS the vocabulary topic for this level
          // For simplicity, if it's a vocab topic, we show general vocab stats for that level
          
          const [allWords, userProgress] = await Promise.all([
            base44.entities.VocabularyQuestion.filter({
              subject_id: subject,
              unit_level: units,
              is_active: true
            }, null, 2000),
            base44.entities.VocabularyProgress.filter({
              user_email: user.email,
              subject_id: subject,
              unit_level: units
            }, null, 2000)
          ]);

          const validWordIds = new Set(allWords.map((w) => w.id));
          const validProgress = userProgress.filter((p) => validWordIds.has(p.word_id));
          const masteredWords = validProgress.filter((p) => p.is_known).length;
          const weakWords = validProgress.filter((p) => p.is_weak).length;
          
          const masteryProgress = allWords.length > 0 ? Math.round(masteredWords / allWords.length * 100) : 0;

          setVocabStats({
            totalWords: allWords.length,
            learnedWords: validProgress.length,
            masteredWords,
            weakWords,
            masteryProgress,
            isVocab: true
          });
        } catch (error) {
          console.error("Error loading vocab stats:", error);
        }
      } else {
        setVocabStats(null);
      }
    };
    loadStats();
  }, [currentIndex, topics]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => prev === 0 ? topics.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev === topics.length - 1 ? 0 : prev + 1);
  };

  const handleStartPractice = async () => {
    const topic = topics[currentIndex];
    const topicIdParam = encodeURIComponent(topic.topic_id);

    if (topic.isVocabulary || topic.topic_id?.toLowerCase().includes('vocabulary') || topic.topic_id?.toLowerCase().includes('אוצר_מילים') || topic.topic_id?.includes('vocab')) {
      // Check saved progress
      try {
        const user = await base44.auth.me();
        if (user?.last_vocabulary_position) {
          const pos = user.last_vocabulary_position;
          
          // Load total sets
          const allWords = await base44.entities.VocabularyQuestion.filter({
            subject_id: user?.selected_subject || 'אנגלית',
            unit_level: user?.selected_units || 3,
            is_active: true
          }, null, 2000);
          const totalSetsCount = Math.ceil(allWords.length / 10);
          setTotalSets(totalSetsCount);

          if (pos.set_id > totalSetsCount) {
              setShowCompletedDialog(true);
              return;
          }

          const start = (pos.set_id - 1) * 10;
          const end = start + 10;

          setSavedProgress({
            currentSet: pos.set_id,
            startIndex: start,
            endIndex: end,
            resumeIndex: pos.question_index,
            resumeWordId: pos.word_id,
            mode: pos.mode || 'flashcards'
          });
          setShowContinueDialog(true);
          return;
        }
      } catch (e) {
        console.error("Error checking vocabulary progress:", e);
      }
      navigate(createPageUrl(`VocabularyTraining`));
      return;
    }

    if (topic.isGrammar || topic.topic_id?.toLowerCase().includes('grammar') || topic.topic_id?.toLowerCase().includes('דקדוק')) {
      navigate(createPageUrl(`GrammarTopics`));
      return;
    }

    if (topic.topic_id?.toLowerCase().includes('reading') || topic.topic_id?.toLowerCase().includes('הבנת_הנקרא')) {
      navigate(createPageUrl(`ReadingComprehension`));
      return;
    }

    if (topic.isExtendedReading) {
      navigate(createPageUrl(`ExtendedReading?topicid=${topicIdParam}`));
    } else {
      navigate(createPageUrl(`TopicPracticeNew?topicid=${topicIdParam}&set=1`));
    }
  };

  if (topics.length === 0) {
    return (
      <div className="bg-indigo-50 rounded-2xl p-6 text-center">
        <Target className="w-12 h-12 mx-auto mb-3 text-[#3B82F6]" />
        <h3 className="text-[16px] font-bold text-[#2B2B2B] mb-1">אין שאלות זמינות</h3>
        <p className="text-[#6E6E6E] text-[12px]">הוסף שאלות במאגר כדי להתחיל לתרגל</p>
      </div>);
  }

  const currentTopic = topics[currentIndex];
  const totalPractices = (currentTopic.stats?.failedSets || 0) + (currentTopic.stats?.mediumSets || 0) + (currentTopic.stats?.excellentSets || 0);
  const progress = vocabStats ? vocabStats.masteryProgress : (currentTopic.stats?.progress || 0);

  return (
    <div className="relative w-full py-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTopic?.topic_id || currentIndex}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            const threshold = 50;
            if (info.offset.x > threshold && topics.length > 1) {
              handlePrevious();
            } else if (info.offset.x < -threshold && topics.length > 1) {
              handleNext();
            }
          }}>

          <div className="bg-[#ffffff] p-4 rounded-2xl">
            {/* Header with gradient */}
            <div className="bg-[#3B82F6] text-white mb-3 p-4 rounded-xl relative">
              {onEditTopic &&
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTopic(currentTopic);
                }}
                className="absolute top-2 left-2 text-white hover:bg-white/20">

                  <Edit2 className="w-5 h-5" />
                </Button>
              }
              {onAddTopic &&
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTopic();
                }}
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-20">

                  <Plus className="w-5 h-5" />
                </Button>
              }

              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="white" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${progress}, 100`} />

                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">{currentTopic.icon || '📚'}</span>
                  </div>
                </div>
                
                <div className="flex-1 text-right">
                  <h2 className="text-white text-lg font-bold mb-0.5">{currentTopic.name}</h2>
                  <div className="text-3xl font-black text-white">
                    {progress}%
                  </div>
                  <p className="text-white/80 text-sm">
                    {vocabStats ? `סה"כ ${vocabStats.totalWords} מילים` : `${totalPractices} תרגולים בוצעו`}
                  </p>

                </div>
              </div>
            </div>

            {vocabStats ? 
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-50 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">נלמדו</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{vocabStats.learnedWords}</div>
                </div>
                <div className="bg-blue-50 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">שליטה</div>
                  <div className="text-lg font-bold text-green-600">{vocabStats.masteredWords}</div>
                </div>
                <div className="bg-blue-50 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">חיזוק</div>
                  <div className="text-lg font-bold text-orange-600">{vocabStats.weakWords}</div>
                </div>
              </div>
            :
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-50 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">מצוין</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{currentTopic.stats?.excellentSets || 0}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ציון: 100–86</div>
                </div>
                <div className="bg-blue-50 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">בינוני</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{currentTopic.stats?.mediumSets || 0}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ציון: 85–56</div>
                </div>
                <div className="bg-blue-50 p-3 text-center rounded-xl">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[11px] text-[#6E6E6E] font-medium mb-0.5">נמוך</div>
                  <div className="text-lg font-bold text-[#2B2B2B]">{currentTopic.stats?.failedSets || 0}</div>
                  <div className="text-[9px] text-[#6E6E6E]">ציון: 55–0</div>
                </div>
              </div>
            }

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-2">

              <Button
                onClick={handleStartPractice}
                className="bg-[#3B82F6] text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-11 hover:bg-[#2563EB] active:bg-[#1E40AF]">

              <Play className="w-4 h-4 ml-2" />
              התחל תרגול
              </Button>

              {isPremium ?
              <>
                  <Button
                  onClick={() => {
                      if (vocabStats) {
                        navigate(createPageUrl("VocabularyStrengthen"));
                      } else if (currentTopic.topic_id?.toLowerCase().includes('grammar') || currentTopic.topic_id?.toLowerCase().includes('דקדוק')) {
                        // Grammar strengthen not implemented yet in this scope, default to custom weak
                        sessionStorage.setItem('weakPracticeTopic', currentTopic.topic_id);
                        navigate(createPageUrl("CustomWeakPractice"));
                      } else {
                        sessionStorage.setItem('weakPracticeTopic', currentTopic.topic_id);
                        navigate(createPageUrl("CustomWeakPractice"));
                      }
                  }} className="bg-blue-500 text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-[#2563EB] active:bg-[#1E40AF] w-full h-10">
                    <Target className="w-4 h-4 ml-2" />
                    {vocabStats ? 'תרגול מילים חלשות' : 'תרגול טעויות בנושא זה'}
                  </Button>
                  <Button
                  onClick={() => {
                      if (vocabStats) {
                        navigate(createPageUrl("VocabularySets"));
                      } else {
                        sessionStorage.setItem('selectedTopicForPractice', currentTopic.topic_id);
                        navigate(`${createPageUrl("TopicPracticeNew")}?topicId=${encodeURIComponent(currentTopic.topic_id)}&selectSet=true`);
                      }
                  }}
                  className="bg-[#3B82F6] text-white text-[13px] px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-10 hover:bg-[#2563EB] active:bg-[#1E40AF]">
                    בחר תרגול ספציפי
                  </Button>
                </> :

              <>
                  <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="bg-[#3B82F6] text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-10 hover:bg-[#2563EB] active:bg-[#1E40AF]">
                    <Lock className="w-4 h-4 ml-2" />
                    תרגול טעויות
                  </Button>
                  <div className="bg-[#ffffff] p-2.5 rounded-lg border border-[#E9F0FF]">
                    <div className="text-center mb-2">
                      <h4 className="text-[11px] font-bold text-[#2B2B2B] mb-0.5">מוגבל ל-10 תרגולים</h4>
                      <p className="text-[9px] text-[#6E6E6E]">מוגבל ל-10 התרגולים הראשונים בנושא</p>
                    </div>
                    <Button
                    onClick={handleStartPractice}
                    variant="outline"
                    className="w-full h-9 text-[11px] font-semibold border border-[#E9F0FF] text-[#3B82F6] hover:bg-[#F5F8FF] rounded-[14px] mb-1.5">
                      בחר תרגול (מוגבל ל-10)
                    </Button>
                    <Button
                    onClick={() => navigate(createPageUrl("Premium"))}
                    className="w-full h-9 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-[11px] font-bold flex items-center justify-center gap-2 rounded-[14px]">
                      <Crown className="w-3.5 h-3.5" />
                      לגישה מלאה 500+ תרגולים
                    </Button>
                  </div>
                </>
              }
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {topics.length > 1 &&
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-0 pointer-events-none z-10">
          <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          className="rounded-full shadow-lg bg-white hover:bg-gray-50 w-9 h-9 pointer-events-auto -translate-x-3 border-0">

            <ChevronRight className="w-5 h-5 text-[#3B82F6]" />
          </Button>

          <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="rounded-full shadow-lg bg-white hover:bg-gray-50 w-9 h-9 pointer-events-auto translate-x-3 border-0">

            <ChevronLeft className="w-5 h-5 text-[#3B82F6]" />
          </Button>
        </div>
      }

      {/* Dots indicator */}
      {topics.length > 1 &&
      <div className="flex justify-center gap-1.5 mt-3">
          {topics.map((_, idx) =>
        <button
          key={idx}
          onClick={() => setCurrentIndex(idx)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
          idx === currentIndex ?
          'w-6 bg-[#3B82F6]' :
          'w-1.5 bg-gray-300 hover:bg-gray-400'}`
          } />

        )}
        </div>
      }

      {/* Continue Progress Dialog */}
      <Dialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              להמשיך מאיפה שהפסקת?
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="text-3xl font-bold text-blue-600 mb-1">תרגול {savedProgress?.currentSet}</div>
              <div className="text-lg font-semibold text-blue-800 mb-1">כרטיס {(savedProgress?.resumeIndex || 0) + 1}</div>
              <div className="text-sm text-gray-600">מילים {savedProgress?.startIndex + 1} - {savedProgress?.endIndex}</div>
            </div>
            <p className="text-gray-600 text-sm">נשמר התקדמות מהפעם הקודמת</p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => {
                setShowContinueDialog(false);
                const targetPage = savedProgress.mode === 'practice' ? 'VocabularyQuickPractice' : 'VocabularyFlashcards';
                let url = `${targetPage}?setId=${savedProgress.currentSet}&start=${savedProgress.startIndex}&end=${savedProgress.endIndex}&resumeIndex=${savedProgress.resumeIndex}`;
                if (savedProgress.resumeWordId) {
                    url += `&resumeWordId=${savedProgress.resumeWordId}`;
                }
                navigate(createPageUrl(url));
              }}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">

              המשך מתרגול {savedProgress?.currentSet} (כרטיס {(savedProgress?.resumeIndex || 0) + 1})
            </Button>
            <Button
              onClick={async () => {
                try {
                  await base44.auth.updateMe({ last_vocabulary_position: null });
                } catch (e) { console.error(e); }
                setShowContinueDialog(false);
                navigate(createPageUrl(`VocabularyFlashcards`) + '?setId=1&start=0&end=10');
              }}
              variant="outline"
              className="w-full h-12 border-2 border-gray-300 text-gray-700 font-bold rounded-xl">

              התחל מחדש מתרגול 1
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completed All Sets Dialog */}
      <Dialog open={showCompletedDialog} onOpenChange={setShowCompletedDialog}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              כל הכבוד!
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">אתה בקיא בכל אוצר המילים!</h3>
            <p className="text-gray-600 text-sm">סיימת את כל {totalSets} הסטים בהצלחה</p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => {
                localStorage.removeItem('vocabSetProgress');
                setShowCompletedDialog(false);
                navigate(createPageUrl(`VocabularyFlashcards`) + '?setId=1&start=0&end=10');
              }}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">

              <RotateCcw className="w-4 h-4 ml-2" />
              תרגול מחדש מתרגול 1
            </Button>
            <Button
              onClick={() => setShowCompletedDialog(false)}
              variant="ghost"
              className="w-full h-10 text-gray-500">

              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}