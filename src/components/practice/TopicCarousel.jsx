import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Play, Loader2, Target, Edit2, Plus, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

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

  const handleStartPractice = async () => {
    const topic = topics[currentIndex];
    const topicIdParam = encodeURIComponent(topic.topic_id);

    console.log(`🔍 Starting practice for: ${topic.topic_id}`);
    console.log(`📖 Is Vocabulary: ${topic.isVocabulary}`);
    console.log(`📖 Is Extended Reading: ${topic.isExtendedReading}`);

    if (topic.isVocabulary) {
      console.log("→ Navigating to VocabularyPractice");
      navigate(createPageUrl(`VocabularyPractice?topicId=${topicIdParam}`));
      return;
    }

    if (topic.isExtendedReading) {
      console.log("→ Navigating to ExtendedReading");
      navigate(createPageUrl(`ExtendedReading?topicid=${topicIdParam}`));
    } else {
      console.log("→ Navigating to TopicPracticeNew");
      navigate(createPageUrl(`TopicPracticeNew?topicid=${topicIdParam}&set=1`));
    }
  };

  const defaultColors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-green-500 to-emerald-600",
    "from-orange-500 to-orange-600",
    "from-cyan-500 to-cyan-600"
  ];

  if (topics.length === 0) {
    return (
      <div className="bg-indigo-50 rounded-2xl p-6 text-center">
        <Target className="w-12 h-12 mx-auto mb-3 text-[#3B82F6]" />
        <h3 className="text-[16px] font-bold text-[#2B2B2B] mb-1">אין שאלות זמינות</h3>
        <p className="text-[#6E6E6E] text-[12px]">הוסף שאלות במאגר כדי להתחיל לתרגל</p>
      </div>
    );
  }

  const currentTopic = topics[currentIndex];

  return (
    <div className="bg-[#ffffff] p-4 rounded-2xl">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              const threshold = 50;
              if (info.offset.x > threshold && topics.length > 1) {
                setCurrentIndex((prev) => prev === 0 ? topics.length - 1 : prev - 1);
              } else if (info.offset.x < -threshold && topics.length > 1) {
                setCurrentIndex((prev) => prev === topics.length - 1 ? 0 : prev + 1);
              }
            }}
          >
            <div className="bg-gradient-to-br text-[#3B82F6] mb-3 p-4 rounded-xl from-blue-500 to-blue-600 relative">
              <div className="text-center">
                <div className="text-3xl mb-1.5">{currentTopic.icon}</div>
                <h2 className="text-[#ffffff] mb-0.5 font-bold">{currentTopic.name}</h2>
                <p className="text-[#ffffff] opacity-90">{(currentTopic.stats.failedSets || 0) + (currentTopic.stats.mediumSets || 0) + (currentTopic.stats.excellentSets || 0)} תרגולים בוצעו</p>
              </div>
              {onEditTopic && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTopic(currentTopic);
                  }}
                  className="absolute top-2 left-2 text-white hover:bg-white/20"
                >
                  <Edit2 className="w-5 h-5" />
                </Button>
              )}
              {onAddTopic && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🟢 Plus button clicked in carousel!');
                    onAddTopic();
                  }}
                  className="absolute top-2 right-2 text-white hover:bg-white/20 z-20"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
            </div>

            {currentTopic.stats && (
              <div className="bg-white rounded-xl p-3 mb-3">
                <div className="text-[13px] font-bold text-center text-[#2B2B2B] mb-2">רמת השליטה בנושא</div>
                
                <div className="bg-[#F5F8FF] rounded-xl p-2.5 mb-2.5 border border-[#E9F0FF]">
                  <div className="flex justify-center items-center mb-1.5">
                    <span className="text-[17px] font-bold text-[#3B82F6]">{currentTopic.stats.progress}%</span>
                  </div>
                  <div className="text-[11px] font-semibold text-center text-[#2B2B2B] mb-1.5">התקדמות</div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentTopic.stats.progress}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-[#3B82F6] rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-[#6E6E6E] text-center mt-1">
                    {currentTopic.stats.uniqueCorrectAnswers || 0} / {currentTopic.stats.totalQuestionsInTopic || 0} שאלות נכונות
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-green-50 rounded-lg p-1.5 text-center border border-green-200">
                    <div className="text-[16px] font-bold text-green-600">{currentTopic.stats.excellentSets || 0}</div>
                    <div className="text-[9px] text-[#6E6E6E] font-semibold">מצוין</div>
                    <div className="text-[8px] text-green-500">86%–100%</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-1.5 text-center border border-orange-200">
                    <div className="text-[16px] font-bold text-orange-600">{currentTopic.stats.mediumSets || 0}</div>
                    <div className="text-[9px] text-[#6E6E6E] font-semibold">בינוני</div>
                    <div className="text-[8px] text-orange-500">56%–85%</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-1.5 text-center border border-red-200">
                    <div className="text-[16px] font-bold text-red-600">{currentTopic.stats.failedSets || 0}</div>
                    <div className="text-[9px] text-[#6E6E6E] font-semibold">נמוך</div>
                    <div className="text-[8px] text-red-500">מתחת ל־56%</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={handleStartPractice}
                className="bg-[#3B82F6] text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-11 hover:bg-blue-700 active:bg-blue-800"
              >
                <Play className="w-4 h-4 ml-2" />
                התחל תרגול
              </Button>

              {isPremium ? (
                <Button
                  onClick={() => {
                    sessionStorage.setItem('weakPracticeTopic', currentTopic.topic_id);
                    navigate(createPageUrl("CustomWeakPractice"));
                  }}
                  className="w-full h-10 text-[12px] font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-[14px] text-white"
                >
                  <Target className="w-4 h-4 ml-2" />
                  תרגול טעויות בנושא זה
                </Button>
              ) : (
                <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="bg-[#3B82F6] text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-10 hover:bg-blue-700 active:bg-blue-800"
                >
                  <Lock className="w-4 h-4 ml-2" />
                  תרגול טעויות
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {topics.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => prev === 0 ? topics.length - 1 : prev - 1)}
              className="absolute right-0 top-1/3 -translate-y-1/2 -translate-x-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 z-10 border border-[#E9F0FF]"
            >
              <ChevronRight className="w-4 h-4 text-[#3B82F6]" />
            </button>

            <button
              onClick={() => setCurrentIndex((prev) => prev === topics.length - 1 ? 0 : prev + 1)}
              className="absolute left-0 top-1/3 -translate-y-1/2 translate-x-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 z-10 border border-[#E9F0FF]"
            >
              <ChevronLeft className="w-4 h-4 text-[#3B82F6]" />
            </button>
          </>
        )}
      </div>

      {topics.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {topics.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'w-6 bg-[#3B82F6]' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}