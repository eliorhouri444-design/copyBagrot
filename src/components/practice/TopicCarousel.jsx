import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Play, Target, Edit2, Plus, Lock, BookOpen, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function TopicCarousel({ topics: initialTopics = [], onEditTopic, onAddTopic, isPremium }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState(initialTopics);

  useEffect(() => {
    setTopics(initialTopics);
  }, [initialTopics]);

  useEffect(() => {
    if (topics.length > 0) {
      const selectedTopicId = sessionStorage.getItem('selectedTopicId');
      if (selectedTopicId) {
        const topicIdx = topics.findIndex((t) => t.topic_id === selectedTopicId);
        if (topicIdx !== -1) {
          setCurrentIndex(topicIdx);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
        sessionStorage.removeItem('selectedTopicId');
      }
    }
  }, [topics]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => prev === 0 ? topics.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev === topics.length - 1 ? 0 : prev + 1);
  };

  const handleStartPractice = async () => {
    const topic = topics[currentIndex];
    const topicIdParam = encodeURIComponent(topic.topic_id);

    if (topic.isVocabulary) {
      navigate(createPageUrl(`VocabularyPractice?topicId=${topicIdParam}`));
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
  const progress = currentTopic.stats?.progress || 0;

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
                {/* Progress Circle */}
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
                  <div className="text-3xl font-black text-white">{progress}%</div>
                  <p className="text-white/80 text-sm">{totalPractices} תרגולים בוצעו</p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
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
                    sessionStorage.setItem('weakPracticeTopic', currentTopic.topic_id);
                    navigate(createPageUrl("CustomWeakPractice"));
                  }} className="bg-blue-500 text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-[#2563EB] active:bg-[#1E40AF] w-full h-10">
                    <Target className="w-4 h-4 ml-2" />
                    תרגול טעויות בנושא זה
                  </Button>
                  <Button
                  onClick={() => {
                    sessionStorage.setItem('selectedTopicForPractice', currentTopic.topic_id);
                    navigate(`${createPageUrl("TopicPracticeNew")}?topicId=${encodeURIComponent(currentTopic.topic_id)}&selectSet=true`);
                  }}
                  className="bg-[#3B82F6] text-white text-[13px] px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-10 hover:bg-[#2563EB] active:bg-[#1E40AF]">
                    בחר תרגול ספציפי (מעל 500 שאלות)
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
    </div>);

}