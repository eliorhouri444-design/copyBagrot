import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Play, Loader2, Target, Edit2, Plus, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function TopicCarousel({ subject, units, onEditTopic, onAddTopic, isPremium }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingTopic, setIsCheckingTopic] = useState(false);
  const [cachedTopics, setCachedTopics] = useState(null);

  useEffect(() => {
    // תמיד טען מחדש - ללא cache כדי לראות עדכונים מיידית
    loadTopics();
  }, [subject, units]);

  // רענון כשחוזרים לדף (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTopics();
      }
    };
    
    const handleFocus = () => {
      loadTopics();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [subject, units]);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      // Load custom topics first
      const customTopics = await base44.entities.TopicNew.list();
      const relevantCustomTopics = customTopics.filter((t) =>
      t.subject_id === subject &&
      t.unit_level === parseInt(units) &&
      t.is_active === true
      );

      // Load questions
      const allQuestions = await base44.entities.QuestionBank.list();
      const relevantQuestions = allQuestions.filter((q) =>
      q.subject_id === subject &&
      parseInt(q.unit_level) === parseInt(units) &&
      q.is_active === true &&
      q.topic_id
      );

      // Load vocabulary questions if English
      const allVocabQuestions = subject === 'אנגלית' ? await base44.entities.VocabularyQuestion.list() : [];
      const relevantVocabQuestions = allVocabQuestions.filter((q) =>
      q.subject_id === subject &&
      parseInt(q.unit_level) === parseInt(units) &&
      q.is_active === true
      );

      // Build topics map starting from TopicNew
      const topicsMap = {};

      // First, add all custom topics
      relevantCustomTopics.forEach((topic) => {
        topicsMap[topic.topic_id] = {
          topic_id: topic.topic_id,
          questions: [],
          vocabQuestions: [],
          subject_id: topic.subject_id,
          unit_level: topic.unit_level,
          customTopic: topic
        };
      });

      // Then, add questions to existing topics or create new ones
      relevantQuestions.forEach((q) => {
        const topicId = q.topic_id;
        if (!topicsMap[topicId]) {
          topicsMap[topicId] = {
            topic_id: topicId,
            questions: [],
            vocabQuestions: [],
            subject_id: q.subject_id,
            unit_level: q.unit_level
          };
        }
        topicsMap[topicId].questions.push(q);
      });

      // Add vocabulary questions to topics
      relevantVocabQuestions.forEach((q) => {
        const topicId = q.topic_id || 'vocabulary_general';
        if (!topicsMap[topicId]) {
          topicsMap[topicId] = {
            topic_id: topicId,
            questions: [],
            vocabQuestions: [],
            subject_id: q.subject_id,
            unit_level: q.unit_level
          };
        }
        topicsMap[topicId].vocabQuestions.push(q);
      });

      const topicsArray = Object.values(topicsMap).map((topic) => {
        const customTopic = topic.customTopic;

        let displayName = topic.topic_id;
        let icon = "📚";
        let description = "";
        let order = 0;
        let color = "from-blue-500 to-blue-600";

        if (customTopic) {
          displayName = customTopic.name;
          icon = customTopic.icon || "📚";
          description = customTopic.description || "";
          order = customTopic.order || 0;
          color = customTopic.color || "from-blue-500 to-blue-600";
        } else {
          const parts = topic.topic_id.split('_');
          if (parts.length >= 3) {
            displayName = parts.slice(2).join(' ');
          }
        }

        // Store actual count for statistics - include both regular and vocab questions
        const actualCount = topic.questions.length + topic.vocabQuestions.length;
        const isVocabulary = topic.vocabQuestions.length > 0 && topic.questions.length === 0;

        // Check if this is Extended Reading by checking first question
        const hasReadingText = topic.questions[0]?.reading_text &&
        topic.questions[0].reading_text.length > 50;

        return {
          topic_id: topic.topic_id,
          name: displayName,
          icon: icon,
          description: description,
          color: color,
          order: order,
          questionCount: actualCount,
          actualQuestionCount: actualCount,
          subject_id: topic.subject_id,
          unit_level: topic.unit_level,
          isExtendedReading: hasReadingText,
          isVocabulary: isVocabulary
        };
      });

      topicsArray.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.actualQuestionCount - a.actualQuestionCount;
      });

      // סינון נושאים לא רצויים
      const filteredTopics = topicsArray.filter(topic => {
        const id = topic.topic_id?.toLowerCase() || '';
        const name = topic.name?.toLowerCase() || '';
        if (id === 'unknown' || name === 'unknown') return false;
        if (id === 'vocabulary_general' || name === 'vocabulary_general') return false;
        if (!topic.name || topic.name.trim() === '') return false;
        return true;
      });

      // טעינה מקבילה של user ו-attempts
      const [user, attempts] = await Promise.all([
      base44.auth.me(),
      base44.entities.AttemptNew.list("-created_date", 500)]
      );

      const relevantAttempts = attempts.filter((a) =>
      a.created_by === user.email &&
      a.subject_id === subject
      );

      const topicsWithStats = filteredTopics.
      map((topic) => {
        const topicAttempts = relevantAttempts.filter((a) => a.topic_id === topic.topic_id);

        // Count unique questions answered
        const uniqueQuestions = new Set(topicAttempts.map((a) => a.question_id));
        const uniqueAnswered = uniqueQuestions.size;

        const correct = topicAttempts.filter((a) => a.status === 'correct').length;
        const wrong = topicAttempts.filter((a) => a.status === 'incorrect').length;
        const partial = topicAttempts.filter((a) => a.status === 'partial').length;
        const total = topicAttempts.length;

        // Calculate progress based on unique questions vs total available
        const actualTotal = topic.actualQuestionCount || topic.questionCount;
        const progress = actualTotal > 0 && uniqueAnswered > 0 ? Math.round(uniqueAnswered / actualTotal * 100) : 0;

        return {
          ...topic,
          stats: {
            correct: correct || 0,
            wrong: wrong || 0,
            partial: partial || 0,
            total: total || 0,
            progress: progress || 0,
            uniqueAnswered: uniqueAnswered || 0
          }
        };
      });

      setTopics(topicsWithStats);

      // בדוק אם יש נושא נבחר
      const selectedTopicId = sessionStorage.getItem('selectedTopicId');
      if (selectedTopicId) {
        const topicIdx = topicsWithStats.findIndex((t) => t.topic_id === selectedTopicId);
        if (topicIdx !== -1) {
          setCurrentIndex(topicIdx);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
        sessionStorage.removeItem('selectedTopicId');
      }

    } catch (error) {
      console.error("Error loading topics:", error);
      if (cachedTopics) {
        setTopics(cachedTopics); // שימוש ב-cache במקרה של שגיאה
      } else {
        setTopics([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
  "from-cyan-500 to-cyan-600"];


  if (isLoading) {
    return (
      <div className="bg-indigo-50 rounded-2xl p-8 text-center">
        <Loader2 className="animate-spin h-10 w-10 text-[#3B82F6] mx-auto mb-3" />
        <p className="text-[#6E6E6E] text-[13px] font-semibold">טוען נושאים...</p>
      </div>);

  }

  if (topics.length === 0) {
    return (
      <div className="bg-indigo-50 rounded-2xl p-6 text-center">
        <Target className="w-12 h-12 mx-auto mb-3 text-[#3B82F6]" />
        <h3 className="text-[16px] font-bold text-[#2B2B2B] mb-1">אין שאלות זמינות</h3>
        <p className="text-[#6E6E6E] text-[12px]">הוסף שאלות במאגר כדי להתחיל לתרגל</p>
      </div>);

  }

  const currentTopic = topics[currentIndex];

  return (
    <div className="bg-[#ffffff] p-4 rounded-2xl">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}>

            <div className="bg-gradient-to-br text-[#3B82F6] mb-3 p-4 rounded-xl from-blue-500 to-blue-600 relative">
              <div className="text-center">
                <div className="text-3xl mb-1.5">{currentTopic.icon}</div>
                <h2 className="text-[#ffffff] mb-0.5 font-bold">{currentTopic.name}</h2>
                <p className="text-[#ffffff] opacity-90">{currentTopic.stats.uniqueAnswered} / {currentTopic.actualQuestionCount} נענו</p>
              </div>
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
                  console.log('🟢 Plus button clicked in carousel!');
                  onAddTopic();
                }}
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-20">

                  <Plus className="w-5 h-5" />
                </Button>
              }
            </div>

            {currentTopic.stats &&
            <div className="bg-white rounded-xl p-3 mb-3">
                <div className="text-[13px] font-bold text-center text-[#2B2B2B] mb-2">📊 הסטטיסטיקה שלך</div>
                
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
                    className="h-full bg-[#3B82F6] rounded-full" />

                  </div>
                  <p className="text-[10px] text-[#6E6E6E] text-center mt-1">
                    {currentTopic.stats.uniqueAnswered} / {currentTopic.actualQuestionCount || currentTopic.questionCount} שאלות נענו
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-red-50 rounded-lg p-1.5 text-center border border-red-200">
                    <div className="text-[16px] font-bold text-red-600">{currentTopic.stats.wrong}</div>
                    <div className="text-[9px] text-[#6E6E6E]">שגויות</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-1.5 text-center border border-green-200">
                    <div className="text-[16px] font-bold text-green-600">{currentTopic.stats.correct}</div>
                    <div className="text-[9px] text-[#6E6E6E]">נכונות</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-1.5 text-center border border-orange-200">
                    <div className="text-[16px] font-bold text-orange-600">{currentTopic.stats.partial}</div>
                    <div className="text-[9px] text-[#6E6E6E]">חלקיות</div>
                  </div>
                </div>
              </div>
            }

            <div className="space-y-2">
              <Button
                onClick={handleStartPractice} className="bg-[#3B82F6] text-[#fafafa] px-4 py-2 font-bold rounded-[14px] \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD \u05DE\u05D5\u05EA\u05D0\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow w-full h-11 hover:bg-blue-700">


                <Play className="w-4 h-4 ml-2" />
                התחל תרגול
              </Button>

              {isPremium ?
              <Button
                onClick={() => {
                  sessionStorage.setItem('weakPracticeTopic', currentTopic.topic_id);
                  navigate(createPageUrl("CustomWeakPractice"));
                }}
                className="w-full h-10 text-[12px] font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-[14px] text-white">

                  <Target className="w-4 h-4 ml-2" />
                  תרגול טעויות בנושא זה
                </Button> :

              <Button
                onClick={() => navigate(createPageUrl("Premium"))} className="bg-blue-500 text-white px-4 py-2 font-bold rounded-[14px] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full h-10 from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">


                  <Lock className="w-4 h-4 ml-2" />
                  תרגול טעויות
                </Button>
              }
            </div>
          </motion.div>
        </AnimatePresence>

        {topics.length > 1 &&
        <>
            <button
            onClick={() => setCurrentIndex((prev) => prev === 0 ? topics.length - 1 : prev - 1)}
            className="absolute right-0 top-1/3 -translate-y-1/2 -translate-x-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 z-10 border border-[#E9F0FF]">

              <ChevronRight className="w-4 h-4 text-[#3B82F6]" />
            </button>

            <button
            onClick={() => setCurrentIndex((prev) => prev === topics.length - 1 ? 0 : prev + 1)}
            className="absolute left-0 top-1/3 -translate-y-1/2 translate-x-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 z-10 border border-[#E9F0FF]">

              <ChevronLeft className="w-4 h-4 text-[#3B82F6]" />
            </button>
          </>
        }
      </div>

      {topics.length > 1 &&
      <div className="flex justify-center gap-1.5 mt-3">
          {topics.map((_, idx) =>
        <button
          key={idx}
          onClick={() => setCurrentIndex(idx)}
          className={`h-1.5 rounded-full transition-all ${
          idx === currentIndex ? 'w-6 bg-[#3B82F6]' : 'w-1.5 bg-gray-300'}`
          } />

        )}
        </div>
      }
    </div>);

}