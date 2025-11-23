import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, TrendingDown, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function WeakAreaSelectionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ mistakes: 0, weakTopics: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserAndStats();
  }, []);

  const loadUserAndStats = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Count mistakes
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const wrongAttempts = attempts.filter(a => 
        a.created_by === currentUser.email && 
        a.subject_id === currentUser.selected_subject &&
        parseInt(a.unit_level) === parseInt(currentUser.selected_units) &&
        (a.status === "incorrect" || a.percentage < 50)
      );

      const uniqueMistakes = new Set(wrongAttempts.map(a => a.question_id)).size;

      // Count weak topics
      const topicStats = {};
      attempts.filter(a => a.created_by === currentUser.email).forEach(attempt => {
        const topic = attempt.topic_id || 'unknown';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total++;
        if (attempt.status === "correct") topicStats[topic].correct++;
      });

      const weakTopicsCount = Object.values(topicStats).filter(
        t => t.total >= 3 && ((t.correct / t.total * 100) < 70)
      ).length;

      setStats({ mistakes: uniqueMistakes, weakTopics: weakTopicsCount });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-2xl mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold text-white">תרגול מותאם אישית</h1>
              <Crown className="w-6 h-6 text-yellow-300" />
            </div>
            <p className="text-sm text-white/90 mt-1">בחר את סוג התרגול המתאים לך</p>
          </div>
        </div>
      </motion.div>

      <div className="px-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-xl">
                <Target className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">🟥 מבחן טעויות</h2>
                <p className="text-sm text-white/90">תרגל שאלות שטעית בהן בעבר</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-red-600" />
                <h3 className="font-bold text-gray-900">איך זה עובד?</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold mt-0.5">•</span>
                  <span>שאלות שטעית בהן בתרגולים קודמים</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold mt-0.5">•</span>
                  <span>ממוקד בדיוק במה שקשה לך</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold mt-0.5">•</span>
                  <span>מסודר לפי מספר הטעויות - מהרבה למעט</span>
                </li>
              </ul>
            </div>

            {stats.mistakes > 0 ? (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="text-center">
                  <div className="text-4xl font-black text-red-600 mb-1">
                    {stats.mistakes}
                  </div>
                  <div className="text-sm text-gray-700">שאלות שטעית בהן מחכות לך</div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                <div className="text-green-700 font-semibold">
                  ✨ כל הכבוד! אין לך טעויות בתרגולים
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate(createPageUrl("CustomWeakPractice"))}
              disabled={stats.mistakes === 0}
              className="w-full h-16 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-lg font-bold shadow-lg disabled:opacity-50"
            >
              <Target className="w-6 h-6 ml-2" />
              התחל תרגול טעויות
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-xl">
                <TrendingDown className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">🟦 מבחן לפי חולשות</h2>
                <p className="text-sm text-white/90">תרגל נושאים שאתה חלש בהם</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-gray-900">איך זה עובד?</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>ניתוח חכם של הנושאים שאתה חלש בהם</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>מבוסס על אחוזי ההצלחה שלך בכל נושא</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>עובד גם אם אין לך טעויות ספציפיות</span>
                </li>
              </ul>
            </div>

            {stats.weakTopics > 0 ? (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="text-center">
                  <div className="text-4xl font-black text-blue-600 mb-1">
                    {stats.weakTopics}
                  </div>
                  <div className="text-sm text-gray-700">נושאים שכדאי לחזק</div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                <div className="text-green-700 font-semibold">
                  ✨ מצוין! אין לך נושאים חלשים
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate(createPageUrl("WeakTopics"))}
              disabled={stats.weakTopics === 0}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-bold shadow-lg disabled:opacity-50"
            >
              <TrendingDown className="w-6 h-6 ml-2" />
              התחל תרגול נושאים חלשים
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-5 border-2 border-purple-200"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-purple-600" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">💡 טיפ</h3>
              <p className="text-sm text-gray-700 mt-1">
                מומלץ להתחיל ב"מבחן טעויות" כדי לתקן את מה שכבר טעית בו, ואז לעבור ל"מבחן לפי חולשות" לחיזוק כללי
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}