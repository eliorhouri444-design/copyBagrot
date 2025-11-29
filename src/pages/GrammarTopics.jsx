import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, ChevronLeft, Loader2, Check, Lock, Crown, Zap, Target, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const GRAMMAR_TOPICS = [
  { id: 'be_verbs', name: 'Be (am/is/are)', icon: '🔵', description: 'פעלי הוויה בהווה', color: 'bg-blue-100' },
  { id: 'present_simple', name: 'Present Simple', icon: '⏰', description: 'הווה פשוט', color: 'bg-green-100' },
  { id: 'present_progressive', name: 'Present Progressive', icon: '🔄', description: 'הווה ממושך', color: 'bg-teal-100' },
  { id: 'past_simple', name: 'Past Simple', icon: '⏪', description: 'עבר פשוט', color: 'bg-purple-100' },
  { id: 'future', name: 'Future (will/going to)', icon: '🚀', description: 'זמן עתיד', color: 'bg-indigo-100' },
  { id: 'there_is_are', name: 'There is/There are', icon: '📍', description: 'יש/ישנם', color: 'bg-pink-100' },
  { id: 'can_cant', name: "Can/Can't", icon: '💪', description: 'יכולת ואי-יכולת', color: 'bg-orange-100' },
  { id: 'wh_questions', name: 'WH Questions', icon: '❓', description: 'שאלות מידע', color: 'bg-amber-100' },
  { id: 'pronouns', name: 'Pronouns', icon: '👤', description: 'כינויי גוף', color: 'bg-cyan-100' },
  { id: 'adjectives', name: 'Adjectives', icon: '🎨', description: 'שמות תואר', color: 'bg-rose-100' },
  { id: 'comparative_superlative', name: 'Comparative & Superlative', icon: '📊', description: 'השוואה ומעולה', color: 'bg-violet-100' },
  { id: 'countable_uncountable', name: 'Countable/Uncountable', icon: '🔢', description: 'שמות ספירים ולא ספירים', color: 'bg-lime-100' },
  { id: 'prepositions', name: 'Prepositions (at/in/on)', icon: '📌', description: 'מילות יחס', color: 'bg-emerald-100' },
  { id: 'imperatives', name: 'Imperatives', icon: '👆', description: 'ציווי', color: 'bg-sky-100' },
  { id: 'some_any', name: 'Some/Any', icon: '🎯', description: 'כמה/משהו', color: 'bg-fuchsia-100' },
  { id: 'much_many', name: 'Much/Many', icon: '📈', description: 'הרבה (ספיר/לא ספיר)', color: 'bg-red-100' }
];

export default function GrammarTopicsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState({});
  const [stats, setStats] = useState({
    learned: 0,
    mastered: 0,
    weak: 0,
    total: 0
  });

  const displaySubject = user?.selected_subject || 'אנגלית';
  const displayUnits = user?.selected_units || 3;

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
      }, 'order', 2000);
      setQuestions(allQuestions);

      // Load user progress
      const userProgress = await base44.entities.GrammarProgress.filter({
        user_email: currentUser.email,
        subject_id: subject
      }, null, 2000);

      const progressMap = {};
      userProgress.forEach(p => {
        progressMap[p.question_id] = p;
      });
      setProgress(progressMap);

      // Calculate stats
      const learned = Object.values(progressMap).filter(p => p.times_seen > 0).length;
      const mastered = Object.values(progressMap).filter(p => p.is_mastered || p.times_correct >= 3).length;
      const weak = Object.values(progressMap).filter(p => p.is_weak).length;

      setStats({
        learned,
        mastered,
        weak,
        total: allQuestions.length
      });

    } catch (error) {
      console.error("Error loading grammar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTopicStats = (topicId) => {
    const topicQuestions = questions.filter(q => q.topic === topicId);
    const topicProgress = topicQuestions.map(q => progress[q.id]).filter(Boolean);
    
    const total = topicQuestions.length;
    const mastered = topicProgress.filter(p => p.is_mastered || p.times_correct >= 3).length;
    const practiced = topicProgress.filter(p => p.times_seen > 0).length;
    
    return {
      total,
      mastered,
      practiced,
      progressPercent: total > 0 ? Math.round((mastered / total) * 100) : 0
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

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
            <p className="text-xs text-white/80">Grammar • {displaySubject} • {displayUnits} יחידות</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stats Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">סטטיסטיקות</h3>
            <span className="text-sm text-blue-600 font-semibold">{stats.total} שאלות</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{stats.learned}</div>
              <div className="text-xs text-blue-700">למדת</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-600">{stats.mastered}</div>
              <div className="text-xs text-green-700">בשליטה</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-orange-600">{stats.weak}</div>
              <div className="text-xs text-orange-700">חיזוק</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-xs text-gray-700">סה״כ</div>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">בחר נושא לתרגול</h3>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {GRAMMAR_TOPICS.map((topic, index) => {
            const topicStats = getTopicStats(topic.id);
            const isLocked = !user?.is_premium && index >= 4;
            const isCompleted = topicStats.progressPercent === 100;
            
            return (
              <motion.button
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => {
                  if (isLocked) {
                    navigate(createPageUrl("Premium"));
                  } else {
                    navigate(createPageUrl(`GrammarPracticeNew?topic=${topic.id}`));
                  }
                }}
                className={`relative bg-white rounded-2xl p-4 text-right border-2 transition-all shadow-sm ${
                  isLocked 
                    ? 'border-gray-200 opacity-70' 
                    : isCompleted 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 ${topic.color} rounded-xl flex items-center justify-center mb-3 text-2xl`}>
                  {isLocked ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : isCompleted ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    topic.icon
                  )}
                </div>

                {/* Content */}
                <div className="font-bold text-gray-900 text-sm mb-1 leading-tight" dir="ltr">
                  {topic.name}
                  {isLocked && <Crown className="w-3 h-3 text-amber-500 inline mr-1" />}
                </div>
                <div className="text-xs text-gray-500 mb-2">{topicStats.total} שאלות</div>

                {/* Progress Bar */}
                {topicStats.total > 0 && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${topicStats.progressPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{topicStats.progressPercent}%</div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Strengthen Weak Button */}
        {stats.weak > 0 && (
          <Button
            onClick={() => navigate(createPageUrl("GrammarStrengthen"))}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            חזק {stats.weak} שאלות חלשות
          </Button>
        )}

        {/* Premium Banner */}
        {!user?.is_premium && (
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8" />
              <div className="flex-1">
                <h4 className="font-bold">שדרג לפרימיום</h4>
                <p className="text-sm opacity-90">גישה לכל {GRAMMAR_TOPICS.length} נושאי הדקדוק</p>
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