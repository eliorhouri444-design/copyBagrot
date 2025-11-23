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
    // טעינה ראשונית מיידית מ-cache
    const cacheKey = `topics_${subject}_${units}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        setTopics(parsedCache);
        setCachedTopics(parsedCache);
        setIsLoading(false);
        // טען ברקע לעדכון
        loadTopics(true);
      } catch (e) {
        console.error('Cache parse error:', e);
        loadTopics(false);
      }
    } else {
      loadTopics(false);
    }
  }, [subject, units]);

  const loadTopics = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
    
    try {
      // טעינה מקבילית של כל הנתונים בבת אחת
      const [customTopics, allQuestions, allVocabQuestions, user, attempts] = await Promise.all([
        base44.entities.TopicNew.list(),
        base44.entities.QuestionBank.list(),
        subject === 'אנגלית' ? base44.entities.VocabularyQuestion.list() : Promise.resolve([]),
        base44.auth.me(),
        base44.entities.AttemptNew.list()
      ]);

      const relevantCustomTopics = customTopics.filter(t => 
        t.subject_id === subject && 
        t.unit_level === parseInt(units) && 
        t.is_active === true
      );

      const relevantQuestions = allQuestions.filter(q => 
        q.subject_id === subject && 
        parseInt(q.unit_level) === parseInt(units) && 
        q.is_active === true &&
        q.topic_id
      );

      const relevantVocabQuestions = allVocabQuestions.filter(q => 
        q.subject_id === subject && 
        parseInt(q.unit_level) === parseInt(units) && 
        q.is_active === true
      );

      // Build topics map starting from TopicNew
      const topicsMap = {};
      
      // First, add all custom topics
      relevantCustomTopics.forEach(topic => {
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
      relevantQuestions.forEach(q => {
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
      relevantVocabQuestions.forEach(q => {
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

      const topicsArray = Object.values(topicsMap).map(topic => {
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

      const relevantAttempts = attempts.filter(a => 
        a.created_by === user.email && 
        a.subject_id === subject
      );

      const topicsWithStats = topicsArray.map(topic => {
        const topicAttempts = relevantAttempts.filter(a => a.topic_id === topic.topic_id);
        
        // Count unique questions answered
        const uniqueQuestions = new Set(topicAttempts.map(a => a.question_id));
        const uniqueAnswered = uniqueQuestions.size;
        
        const correct = topicAttempts.filter(a => a.status === 'correct').length;
        const wrong = topicAttempts.filter(a => a.status === 'incorrect').length;
        const partial = topicAttempts.filter(a => a.status === 'partial').length;
        const total = topicAttempts.length;
        
        // Calculate progress based on unique questions vs total available
        const actualTotal = topic.actualQuestionCount || topic.questionCount;
        const progress = actualTotal > 0 ? Math.round((uniqueAnswered / actualTotal) * 100) : 0;

        return {
          ...topic,
          stats: { correct, wrong, partial, total, progress, uniqueAnswered }
        };
      });

      setTopics(topicsWithStats);
      
      // שמירה ב-cache
      const cacheKey = `topics_${subject}_${units}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(topicsWithStats));

    } catch (error) {
      console.error("Error loading topics:", error);
      if (cachedTopics) {
        setTopics(cachedTopics); // שימוש ב-cache במקרה של שגיאה
      } else {
        setTopics([]);
      }
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
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
    "from-cyan-500 to-cyan-600"
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-semibold">טוען נושאים...</p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">אין שאלות זמינות</h3>
        <p className="text-gray-500">הוסף שאלות במאגר כדי להתחיל לתרגל</p>
      </div>
    );
  }

  const currentTopic = topics[currentIndex];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`bg-gradient-to-br ${currentTopic.color || defaultColors[currentIndex % defaultColors.length]} rounded-3xl p-5 text-white mb-4 relative`}>
              <div className="text-center">
                <div className="text-4xl mb-2">{currentTopic.icon}</div>
                <h2 className="text-2xl font-bold mb-1">{currentTopic.name}</h2>
                <p className="text-xs opacity-90">{currentTopic.stats.uniqueAnswered} / {currentTopic.actualQuestionCount} נענו</p>
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

            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <h3 className="text-base font-bold text-center mb-3">📊 הסטטיסטיקה שלך</h3>
              
              <div className="bg-white rounded-xl p-3 mb-3">
                <div className="flex justify-center items-center mb-2">
                  <span className="text-xl font-bold text-purple-600">{currentTopic.stats.progress}%</span>
                </div>
                <div className="text-xs font-semibold text-center mb-2">התקדמות</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${currentTopic.stats.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-purple-600 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  {currentTopic.stats.uniqueAnswered} / {currentTopic.actualQuestionCount || currentTopic.questionCount} שאלות נענו
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-red-100 rounded-xl p-2 text-center">
                  <div className="text-2xl font-bold text-red-600">{currentTopic.stats.wrong}</div>
                  <div className="text-[10px] text-gray-700">שגויות</div>
                </div>
                <div className="bg-green-100 rounded-xl p-2 text-center">
                  <div className="text-2xl font-bold text-green-600">{currentTopic.stats.correct}</div>
                  <div className="text-[10px] text-gray-700">נכונות</div>
                </div>
                <div className="bg-orange-100 rounded-xl p-2 text-center">
                  <div className="text-2xl font-bold text-orange-600">{currentTopic.stats.partial}</div>
                  <div className="text-[10px] text-gray-700">חלקיות</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleStartPractice}
                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Play className="w-5 h-5 ml-2" />
                התחל תרגול
              </Button>

              {isPremium ? (
                <Button
                  onClick={() => navigate(createPageUrl("CustomWeakPractice"))}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white"
                >
                  <Target className="w-5 h-5 ml-2" />
                  תרגול טעויות
                </Button>
              ) : (
                <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white opacity-60"
                >
                  <Lock className="w-5 h-5 ml-2" />
                  תרגול טעויות
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {topics.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(prev => prev === 0 ? topics.length - 1 : prev - 1)}
              className="absolute right-0 top-1/3 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center hover:bg-gray-50 z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <button
              onClick={() => setCurrentIndex(prev => prev === topics.length - 1 ? 0 : prev + 1)}
              className="absolute left-0 top-1/3 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center hover:bg-gray-50 z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {topics.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {topics.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex ? 'w-8 bg-purple-600' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}