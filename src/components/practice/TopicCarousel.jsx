import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Play, Loader2, Target, Edit2, Plus, Crown, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function TopicCarousel({ subject, units, onEditTopic, onAddTopic, isPremium }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState(null);

  // פונקציית טעינה מרכזית
  const loadTopics = useCallback(async () => {
    if (!subject || !units) return;
    
    setIsLoading(true);
    console.log(`🔄 TopicCarousel: Loading topics for ${subject} ${units} units...`);
    
    try {
      // טעינה מקבילית של כל הנתונים
      const [user, customTopics, allQuestions, allVocabQuestions, allAttempts] = await Promise.all([
        base44.auth.me(),
        base44.entities.TopicNew.filter({ subject_id: subject, unit_level: parseInt(units), is_active: true }),
        base44.entities.QuestionBank.list(),
        subject === 'אנגלית' ? base44.entities.VocabularyQuestion.list() : Promise.resolve([]),
        base44.entities.AttemptNew.list("-created_date", 5000)
      ]);

      // סינון שאלות רלוונטיות
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

      // סינון attempts של המשתמש הנוכחי
      const userAttempts = allAttempts.filter(a =>
        a.created_by === user.email &&
        a.subject_id === subject
      );

      console.log(`📊 Found ${relevantQuestions.length} questions, ${userAttempts.length} user attempts`);

      // בניית מפת נושאים
      const topicsMap = {};

      // הוספת נושאים מותאמים אישית
      customTopics.forEach(topic => {
        topicsMap[topic.topic_id] = {
          topic_id: topic.topic_id,
          name: topic.name,
          icon: topic.icon || "📚",
          description: topic.description || "",
          color: topic.color || "from-blue-500 to-blue-600",
          order: topic.order || 0,
          questions: [],
          vocabQuestions: [],
          subject_id: topic.subject_id,
          unit_level: topic.unit_level
        };
      });

      // הוספת שאלות רגילות
      relevantQuestions.forEach(q => {
        if (!topicsMap[q.topic_id]) {
          const parts = q.topic_id.split('_');
          const displayName = parts.length >= 3 ? parts.slice(2).join(' ') : q.topic_id;
          topicsMap[q.topic_id] = {
            topic_id: q.topic_id,
            name: displayName,
            icon: "📚",
            description: "",
            color: "from-blue-500 to-blue-600",
            order: 999,
            questions: [],
            vocabQuestions: [],
            subject_id: q.subject_id,
            unit_level: q.unit_level
          };
        }
        topicsMap[q.topic_id].questions.push(q);
      });

      // הוספת שאלות אוצר מילים
      relevantVocabQuestions.forEach(q => {
        const topicId = q.topic_id || 'vocabulary_general';
        if (!topicsMap[topicId]) {
          topicsMap[topicId] = {
            topic_id: topicId,
            name: topicId,
            icon: "📝",
            description: "",
            color: "from-green-500 to-green-600",
            order: 999,
            questions: [],
            vocabQuestions: [],
            subject_id: q.subject_id,
            unit_level: q.unit_level
          };
        }
        topicsMap[topicId].vocabQuestions.push(q);
      });

      // המרה למערך עם סטטיסטיקות
      const topicsArray = Object.values(topicsMap)
        .filter(topic => {
          // סינון נושאים לא רצויים
          const id = topic.topic_id?.toLowerCase() || '';
          const name = topic.name?.toLowerCase() || '';
          if (id === 'unknown' || name === 'unknown') return false;
          if (id === 'vocabulary_general' || name === 'vocabulary_general') return false;
          if (!topic.name || topic.name.trim() === '') return false;
          return true;
        })
        .map(topic => {
          const totalQuestions = topic.questions.length + topic.vocabQuestions.length;
          const isVocabulary = topic.vocabQuestions.length > 0 && topic.questions.length === 0;
          const hasReadingText = topic.questions[0]?.reading_text && topic.questions[0].reading_text.length > 50;

          // חישוב סטטיסטיקות מה-attempts
          const topicAttempts = userAttempts.filter(a => a.topic_id === topic.topic_id);
          
          // קבלת התשובה האחרונה לכל שאלה ייחודית
          const latestByQuestion = {};
          topicAttempts.forEach(a => {
            const existing = latestByQuestion[a.question_id];
            if (!existing || new Date(a.created_date) > new Date(existing.created_date)) {
              latestByQuestion[a.question_id] = a;
            }
          });

          const latestAttempts = Object.values(latestByQuestion);
          const uniqueAnswered = latestAttempts.length;
          const correct = latestAttempts.filter(a => a.status === 'correct').length;
          const wrong = latestAttempts.filter(a => a.status === 'incorrect').length;
          const partial = latestAttempts.filter(a => a.status === 'partial').length;
          const progress = totalQuestions > 0 ? Math.round((uniqueAnswered / totalQuestions) * 100) : 0;
          const successRate = latestAttempts.length > 0 ? Math.round((correct / latestAttempts.length) * 100) : 0;

          console.log(`📈 ${topic.topic_id}: ${uniqueAnswered}/${totalQuestions} answered, ${correct}✓ ${wrong}✗ ${partial}~`);

          return {
            ...topic,
            questionCount: totalQuestions,
            actualQuestionCount: totalQuestions,
            isVocabulary,
            isExtendedReading: hasReadingText,
            stats: {
              correct,
              wrong,
              partial,
              total: latestAttempts.length,
              progress,
              uniqueAnswered,
              successRate
            }
          };
        })
        .sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return b.actualQuestionCount - a.actualQuestionCount;
        });

      setTopics(topicsArray);
      setLastLoadTime(new Date());
      console.log(`✅ TopicCarousel: Loaded ${topicsArray.length} topics`);

    } catch (error) {
      console.error("❌ TopicCarousel: Error loading topics:", error);
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [subject, units]);

  // טעינה ראשונית וכשמשתנים הפרמטרים
  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // האזנה לאירועי עדכון גלובליים
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 TopicCarousel: Received global update event');
      loadTopics();
    };

    window.addEventListener('mastery-update', handleUpdate);
    window.addEventListener('practice-complete', handleUpdate);
    window.addEventListener('exam-complete', handleUpdate);
    
    // גם כשחוזרים לדף
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadTopics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('mastery-update', handleUpdate);
      window.removeEventListener('practice-complete', handleUpdate);
      window.removeEventListener('exam-complete', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadTopics]);

  const handleStartPractice = () => {
    const topic = topics[currentIndex];
    const topicIdParam = encodeURIComponent(topic.topic_id);

    if (topic.isVocabulary) {
      navigate(createPageUrl(`VocabularyPractice?topicId=${topicIdParam}`));
    } else if (topic.isExtendedReading) {
      navigate(createPageUrl(`ExtendedReading?topicid=${topicIdParam}`));
    } else {
      navigate(createPageUrl(`TopicPracticeNew?topicid=${topicIdParam}&set=1`));
    }
  };

  const handleRefresh = () => {
    loadTopics();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-3" />
        <p className="text-gray-600 text-sm font-semibold">טוען נושאים...</p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
        <Target className="w-12 h-12 mx-auto mb-3 text-blue-600" />
        <h3 className="text-base font-bold text-gray-900 mb-1">אין שאלות זמינות</h3>
        <p className="text-gray-600 text-sm">הוסף שאלות במאגר כדי להתחיל לתרגל</p>
      </div>
    );
  }

  const currentTopic = topics[currentIndex];

  return (
    <div className="bg-white p-4 rounded-2xl shadow-lg">
      {/* כפתור רענון */}
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="text-gray-500 hover:text-blue-600 h-8 px-2"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.x > 50 && topics.length > 1) {
                setCurrentIndex(prev => prev === 0 ? topics.length - 1 : prev - 1);
              } else if (info.offset.x < -50 && topics.length > 1) {
                setCurrentIndex(prev => prev === topics.length - 1 ? 0 : prev + 1);
              }
            }}
          >
            {/* כרטיס הנושא */}
            <div className={`bg-gradient-to-br ${currentTopic.color} p-4 rounded-xl relative mb-3`}>
              <div className="text-center text-white">
                <div className="text-3xl mb-1.5">{currentTopic.icon}</div>
                <h2 className="font-bold text-lg mb-0.5">{currentTopic.name}</h2>
                <p className="text-white/90 text-sm">
                  {currentTopic.stats.uniqueAnswered} / {currentTopic.actualQuestionCount} נענו
                </p>
              </div>

              {onEditTopic && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onEditTopic(currentTopic); }}
                  className="absolute top-2 left-2 text-white hover:bg-white/20"
                >
                  <Edit2 className="w-5 h-5" />
                </Button>
              )}

              {onAddTopic && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onAddTopic(); }}
                  className="absolute top-2 right-2 text-white hover:bg-white/20"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* סטטיסטיקות */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-200">
              <div className="text-sm font-bold text-center text-gray-900 mb-2">📊 הסטטיסטיקה שלך</div>
              
              {/* פס התקדמות */}
              <div className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-200">
                <div className="flex justify-center items-center mb-1">
                  <span className="text-xl font-bold text-blue-600">{currentTopic.stats.progress}%</span>
                </div>
                <div className="text-xs font-semibold text-center text-gray-700 mb-1.5">התקדמות</div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${currentTopic.stats.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-blue-600 rounded-full"
                  />
                </div>
                <p className="text-xs text-gray-600 text-center mt-1">
                  {currentTopic.stats.uniqueAnswered} / {currentTopic.actualQuestionCount} שאלות נענו
                </p>
              </div>

              {/* ספירת תשובות */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                  <div className="text-lg font-bold text-green-600">{currentTopic.stats.correct}</div>
                  <div className="text-xs text-gray-600">נכונות</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                  <div className="text-lg font-bold text-red-600">{currentTopic.stats.wrong}</div>
                  <div className="text-xs text-gray-600">שגויות</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
                  <div className="text-lg font-bold text-orange-600">{currentTopic.stats.partial}</div>
                  <div className="text-xs text-gray-600">חלקיות</div>
                </div>
              </div>

              {/* אחוז הצלחה */}
              {currentTopic.stats.total > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-xs text-gray-600">אחוז הצלחה: </span>
                  <span className={`text-sm font-bold ${
                    currentTopic.stats.successRate >= 70 ? 'text-green-600' :
                    currentTopic.stats.successRate >= 50 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {currentTopic.stats.successRate}%
                  </span>
                </div>
              )}
            </div>

            {/* כפתורי פעולה */}
            <div className="space-y-2">
              <Button
                onClick={handleStartPractice}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
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
                  className="w-full h-10 text-sm font-bold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white"
                >
                  <Target className="w-4 h-4 ml-2" />
                  תרגול טעויות בנושא זה
                </Button>
              ) : (
                <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="w-full h-10 text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700"
                >
                  <Lock className="w-4 h-4 ml-2" />
                  תרגול טעויות (פרימיום)
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* חצי ניווט */}
        {topics.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(prev => prev === 0 ? topics.length - 1 : prev - 1)}
              className="absolute right-0 top-1/4 -translate-y-1/2 -translate-x-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 z-10 border border-gray-200"
            >
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </button>

            <button
              onClick={() => setCurrentIndex(prev => prev === topics.length - 1 ? 0 : prev + 1)}
              className="absolute left-0 top-1/4 -translate-y-1/2 translate-x-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 z-10 border border-gray-200"
            >
              <ChevronLeft className="w-4 h-4 text-blue-600" />
            </button>
          </>
        )}
      </div>

      {/* נקודות ניווט */}
      {topics.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {topics.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}