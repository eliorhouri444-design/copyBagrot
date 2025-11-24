import React from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  BookOpen, 
  FileCheck, 
  Zap, 
  Calendar,
  Award,
  CheckCircle,
  AlertTriangle,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReadinessDashboard({ readinessData, isPremium }) {
  const navigate = useNavigate();

  if (!readinessData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <p className="text-gray-500">אין מספיק נתונים לחישוב מוכנות</p>
      </div>
    );
  }

  const { scores, remaining, daily, timeline, targets } = readinessData;
  const isOnTrack = timeline.daysNeeded <= timeline.daysUntilExam;

  const getReadinessColor = (score) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-indigo-600";
    if (score >= 40) return "from-yellow-500 to-orange-500";
    return "from-orange-500 to-red-500";
  };

  const getReadinessMessage = (score) => {
    if (score >= 90) return "מוכן מצוין! 🔥";
    if (score >= 75) return "מוכנות טובה 💪";
    if (score >= 50) return "בדרך הנכונה 📈";
    if (score >= 25) return "צריך להגביר 🎯";
    return "התחל עכשיו! 🚀";
  };

  return (
    <div className="space-y-4">
      {/* כותרת - המוכנות שלך */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        <div className={`bg-gradient-to-r ${getReadinessColor(scores.overall)} p-5 text-white text-center`}>
          <h2 className="text-lg font-bold mb-1">המוכנות שלך</h2>
          <div className="text-6xl font-black mb-1">{scores.overall}%</div>
          <p className="text-sm opacity-90">מבוסס על שליטה, תרגול, בגרויות ומהירות</p>
        </div>
      </motion.div>

      {/* 4 מדדים */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-black text-blue-600">{scores.mastery}%</div>
            <div className="text-xs text-gray-600">שליטה בחומר</div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-black text-purple-600">{scores.practice}%</div>
            <div className="text-xs text-gray-600">תרגול</div>
          </div>

          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <FileCheck className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-black text-green-600">{scores.exams}%</div>
            <div className="text-xs text-gray-600">בגרויות</div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
            <Zap className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <div className="text-2xl font-black text-amber-600">{scores.speed}%</div>
            <div className="text-xs text-gray-600">מהירות פתרון</div>
          </div>
        </div>
      </motion.div>

      {/* מה חסר לך כדי להגיע לציון */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <h3 className="text-base font-bold text-gray-900 mb-3">
          מה חסר לך כדי להגיע ל-{targets.targetScore}
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-500">•</span>
            <span className="text-gray-700">לפתור {remaining.practice} שאלות</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-500">•</span>
            <span className="text-gray-700">להשלים {remaining.exams} בגרויות מלאות</span>
          </div>
          {remaining.untouchedTopics > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-orange-500">•</span>
              <span className="text-gray-700">ללמוד {remaining.untouchedTopics} נושאים חדשים</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">לחזור על {remaining.weakTopics} נושאים חלשים</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-red-500">•</span>
            <span className="text-gray-700">טעויות: &lt;{targets.requirements.errorRate}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-500">•</span>
            <span className="text-gray-700">לשפר מהירות ב-15%</span>
          </div>
        </div>
      </motion.div>

      {/* המשימות שלך להיום */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <h3 className="text-base font-bold text-gray-900 mb-3">המשימות שלך להיום</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">ללמוד {daily.topics} נושאים</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">לפתור {daily.questions} שאלות</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">לחזור על {daily.reviewMistakes} טעויות</span>
          </div>
        </div>
      </motion.div>

      {/* ציר זמן */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <h3 className="text-base font-bold text-gray-900 mb-3">ציר זמן</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">•</span>
            <span className="text-gray-700">{timeline.daysNeeded} ימים עד מוכנות מלאה</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-500">•</span>
            <span className="text-gray-700">{timeline.daysUntilExam} ימים עד הבגרות</span>
          </div>
        </div>

        {!isOnTrack && (
          <div className="mt-3 bg-red-50 rounded-lg p-3 border border-red-200">
            <p className="text-red-700 text-sm font-medium">
              ⚠️ עליך להגביר את הקצב כדי לעמוד במטרה
            </p>
          </div>
        )}
        
        {isOnTrack && (
          <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-green-700 text-sm font-medium">
              ✓ אתה בדיוק בזמן! תמשיך בקצב הזה
            </p>
          </div>
        )}
      </motion.div>

      {/* פרימיום */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl shadow-lg p-4"
        >
          <h3 className="text-base font-bold text-gray-900 mb-2">שדרג לפרימיום</h3>
          <p className="text-sm text-gray-600 mb-3">
            גישה לתוכנית מותאמת אישית ולכל התרגולים
          </p>
          <Button
            onClick={() => navigate(createPageUrl("Premium"))}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white h-11 text-sm font-bold rounded-xl"
          >
            שדרג עכשיו
          </Button>
        </motion.div>
      )}
    </div>
  );
}