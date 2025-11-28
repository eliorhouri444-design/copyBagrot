import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Loader2, Target, Zap, Crown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// נושאי דקדוק לפי רמות
const GRAMMAR_TOPICS = {
  3: [
    { id: 'present_simple', name: 'Present Simple', icon: '📘', description: 'פועל בהווה פשוט' },
    { id: 'present_progressive', name: 'Present Progressive', icon: '🔄', description: 'הווה ממושך' },
    { id: 'past_simple', name: 'Past Simple', icon: '⏮️', description: 'עבר פשוט' },
    { id: 'future', name: 'Future (will/going to)', icon: '🔮', description: 'זמן עתיד' },
    { id: 'there_is_are', name: 'There is / There are', icon: '📍', description: 'יש / ישנם' },
    { id: 'adjectives', name: 'Adjectives', icon: '🎨', description: 'תארים' },
    { id: 'pronouns', name: 'Pronouns', icon: '👤', description: 'כינויי גוף' },
    { id: 'wh_questions', name: 'WH Questions', icon: '❓', description: 'שאלות WH' },
    { id: 'prepositions', name: 'Prepositions', icon: '📐', description: 'מילות יחס' },
    { id: 'countable_uncountable', name: 'Countable / Uncountable', icon: '🔢', description: 'ספירים ולא ספירים' },
    { id: 'comparative_superlative', name: 'Comparative / Superlative', icon: '📊', description: 'השוואה' },
  ],
  4: [
    { id: 'present_perfect', name: 'Present Perfect', icon: '✅', description: 'הווה מושלם' },
    { id: 'passive', name: 'Passive Voice', icon: '🔁', description: 'סביל' },
    { id: 'gerunds_infinitives', name: 'Gerunds / Infinitives', icon: '🎯', description: 'שם פועל' },
    { id: 'modals', name: 'Modals', icon: '💪', description: 'פעלים מודאליים' },
    { id: 'conditionals_01', name: 'Conditionals (0/1)', icon: '🔀', description: 'משפטי תנאי' },
  ],
  5: [
    { id: 'relative_clauses', name: 'Relative Clauses', icon: '🔗', description: 'פסוקיות זיקה' },
    { id: 'conditionals_23', name: 'Conditionals (2/3)', icon: '🌀', description: 'תנאי מתקדם' },
    { id: 'passive_advanced', name: 'Passive Advanced', icon: '🔄', description: 'סביל מתקדם' },
    { id: 'reported_speech', name: 'Reported Speech', icon: '💬', description: 'דיבור עקיף' },
  ]
};

export default function GrammarPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState({});
  const [topicStats, setTopicStats] = useState({});

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

      // Load all grammar questions
      const allQuestions = await base44.entities.GrammarQuestion.filter({
        subject_id: subject,
        unit_level: units,
        is_active: true
      }, 'order', 1000);
      setQuestions(allQuestions);

      // Load user progress
      const userProgress = await base44.entities.GrammarProgress.filter({
        user_email: currentUser.email,
        subject_id: subject,
        unit_level: units
      }, null, 2000);

      // Build progress map
      const progressMap = {};
      userProgress.forEach(p => {
        progressMap[p.question_id] = p;
      });
      setProgress(progressMap);

      // Calculate stats per topic
      const stats = {};
      allQuestions.forEach(q => {
        if (!stats[q.topic]) {
          stats[q.topic] = { total: 0, answered: 0, correct: 0, weak: 0 };
        }
        stats[q.topic].total++;
        
        const prog = progressMap[q.id];
        if (prog) {
          if (prog.times_seen > 0) stats[q.topic].answered++;
          stats[q.topic].correct += prog.times_correct || 0;
          if (prog.is_weak) stats[q.topic].weak++;
        }
      });
      setTopicStats(stats);

    } catch (error) {
      console.error("Error loading grammar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTopicsForLevel = () => {
    const units = user?.selected_units || 3;
    let topics = [...GRAMMAR_TOPICS[3]];
    if (units >= 4) topics = [...topics, ...GRAMMAR_TOPICS[4]];
    if (units >= 5) topics = [...topics, ...GRAMMAR_TOPICS[5]];
    return topics;
  };

  const getOverallProgress = () => {
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return 0;
    
    const answeredQuestions = Object.values(progress).filter(p => p.times_seen > 0).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const getWeakQuestionsCount = () => {
    return Object.values(progress).filter(p => p.is_weak).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const topics = getTopicsForLevel();
  const overallProgress = getOverallProgress();
  const weakCount = getWeakQuestionsCount();

  return (
    <div className="min-h-screen bg-blue-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 px-5 py-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white p-2 hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-white">דקדוק</h1>
            <p className="text-sm text-white/80">{user?.selected_subject || 'אנגלית'} • {user?.selected_units || 3} יחידות</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">התקדמות כוללת</h3>
            <span className="text-sm text-blue-600 font-semibold">{overallProgress}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-xs text-gray-600">שאלות</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(progress).filter(p => p.times_seen > 0).length}
              </div>
              <div className="text-xs text-gray-600">נענו</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{weakCount}</div>
              <div className="text-xs text-gray-600">לחיזוק</div>
            </div>
          </div>
        </div>

        {/* Weak Questions Button */}
        {weakCount > 0 && (
          <Button
            onClick={() => {
              if (user?.is_premium) {
                navigate(createPageUrl("GrammarPractice?mode=weak"));
              } else {
                navigate(createPageUrl("Premium"));
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            {!user?.is_premium && <Crown className="w-4 h-4" />}
            <Zap className="w-5 h-5" />
            תרגול {weakCount} שאלות שטעיתי
          </Button>
        )}

        {/* Topics Grid */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">נושאי דקדוק</h3>
          
          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h4 className="font-bold text-gray-900 mb-1">אין שאלות עדיין</h4>
              <p className="text-sm text-gray-600">הוסף שאלות דקדוק כדי להתחיל לתרגל</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic, index) => {
                const stats = topicStats[topic.id] || { total: 0, answered: 0, correct: 0, weak: 0 };
                const topicProgress = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0;
                const hasQuestions = stats.total > 0;
                
                return (
                  <motion.button
                    key={topic.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      if (hasQuestions) {
                        navigate(createPageUrl(`GrammarPractice?topic=${topic.id}`));
                      }
                    }}
                    disabled={!hasQuestions}
                    className={`bg-[#EAF3FF] rounded-2xl p-4 text-right transition-all ${
                      hasQuestions 
                        ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-2xl mb-2">{topic.icon}</div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{topic.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{topic.description}</p>
                    
                    {hasQuestions ? (
                      <>
                        <div className="bg-white/50 rounded-full h-1.5 overflow-hidden mb-1">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${topicProgress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{stats.total} שאלות</div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-400">בקרוב...</div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Premium Banner */}
        {!user?.is_premium && (
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8" />
              <div className="flex-1">
                <h4 className="font-bold">שדרג לפרימיום</h4>
                <p className="text-sm opacity-90">גישה לכל השאלות + תרגול טעויות</p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl("Premium"))}
                className="bg-white text-amber-600 hover:bg-gray-100"
              >
                שדרג
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}