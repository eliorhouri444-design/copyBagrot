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
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl("Practice"))}
          className="text-right flex-1 hover:opacity-90 transition-opacity"
        >
          <h1 className="text-[16px] font-bold text-white">תרגול מותאם אישית</h1>
          <p className="text-[11px] text-white/90">בחר את סוג התרגול המתאים לך</p>
        </button>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Crown className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="px-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold">🟥 מבחן טעויות</h3>
                <p className="text-xs opacity-90">תרגל שאלות שטעית בהן בעבר</p>
              </div>
              <Target className="w-7 h-7" />
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-gray-900">איך זה עובד?</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>שאלות שטעית בהן בתרגולים קודמים</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>ממוקד בדיוק במה שקשה לך</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
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
              className="w-full h-14 bg-[#3B82F6] hover:bg-blue-700 text-white text-base font-bold rounded-[14px] disabled:opacity-50"
            >
              <Target className="w-5 h-5 ml-2" />
              התחל תרגול טעויות
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-[#3B82F6] p-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold">🟦 מבחן לפי חולשות</h3>
                <p className="text-xs opacity-90">תרגל נושאים שאתה חלש בהם</p>
              </div>
              <TrendingDown className="w-7 h-7" />
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
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
              className="w-full h-14 bg-[#3B82F6] hover:bg-blue-700 text-white text-base font-bold rounded-[14px] disabled:opacity-50"
            >
              <TrendingDown className="w-5 h-5 ml-2" />
              התחל תרגול נושאים חלשים
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-5 border-r-4 border-r-blue-500"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">💡 טיפ</h3>
              <p className="text-sm text-gray-600 mt-1">
                מומלץ להתחיל ב"מבחן טעויות" כדי לתקן את מה שכבר טעית בו, ואז לעבור ל"מבחן לפי חולשות" לחיזוק כללי
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}