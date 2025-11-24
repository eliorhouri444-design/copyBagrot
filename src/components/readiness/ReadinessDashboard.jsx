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
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        <div className={`bg-gradient-to-r ${getReadinessColor(scores.overall)} p-6 text-white text-center`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Target className="w-8 h-8" />
            <h2 className="text-2xl font-bold">מדד המוכנות שלך</h2>
          </div>
          <div className="text-7xl font-black mb-2">{scores.overall}%</div>
          <p className="text-xl font-semibold">{getReadinessMessage(scores.overall)}</p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{scores.mastery}%</div>
            <div className="text-sm text-gray-600">שליטה בחומר</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{scores.practice}%</div>
            <div className="text-sm text-gray-600">תרגול</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <FileCheck className="w-7 h-7 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{scores.exams}%</div>
            <div className="text-sm text-gray-600">בגרויות</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{scores.speed}%</div>
            <div className="text-sm text-gray-600">מהירות</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">
            כדי להגיע לציון {targets.targetScore} אתה צריך:
          </h3>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold">לפתור עוד שאלות</span>
              <span className="text-3xl font-black text-blue-600">{remaining.practice}</span>
            </div>
            <div className="text-xs text-gray-600">
              {readinessData.current.totalPractice} / {targets.requirements.practice} הושלמו
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold">לבצע עוד בגרויות מלאות</span>
              <span className="text-3xl font-black text-blue-600">{remaining.exams}</span>
            </div>
            <div className="text-xs text-gray-600">
              {readinessData.current.totalExams} / {targets.requirements.exams} הושלמו
            </div>
          </div>

          {remaining.untouchedTopics > 0 && (
            <div className="bg-white rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-900 font-semibold">ללמוד נושאים שלא נגעת</span>
                <span className="text-3xl font-black text-orange-600">{remaining.untouchedTopics}</span>
              </div>
              <div className="text-xs text-gray-600">
                מתוך {readinessData.current.topicsMastered} נושאים שכבר שולטים
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold">לחזור על נושאים חלשים</span>
              <span className="text-3xl font-black text-blue-600">{remaining.weakTopics}</span>
            </div>
            <div className="text-xs text-gray-600">
              נושאים שצריכים חיזוק
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-red-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold">להוריד טעויות ל-</span>
              <span className="text-3xl font-black text-red-600">&lt;{targets.requirements.errorRate}%</span>
            </div>
            <div className="text-xs text-gray-600">
              כרגע: {Math.round(readinessData.current.currentErrorRate)}% טעויות
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold">לשפר מהירות ב-</span>
              <span className="text-3xl font-black text-amber-600">15%</span>
            </div>
            <div className="text-xs text-gray-600">
              יעד: {Math.round(targets.requirements.speed * 100)}% יעילות
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200"
      >
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">המלצות יומיות (היום)</h3>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white mb-4">
          <div className="text-center">
            <div className="text-sm opacity-90 mb-1">היום אתה צריך לבצע:</div>
            <div className="text-4xl font-black">{daily.studyMinutes || Math.ceil(daily.questions * 1.5)}</div>
            <div className="text-sm opacity-90">דקות לימוד</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span className="text-gray-900 font-semibold text-sm">ללמוד:</span>
              </div>
              <span className="text-purple-600 font-bold">{daily.topics} נושאים</span>
            </div>
            <div className="text-xs text-gray-600">
              {remaining.untouchedTopics > 0 
                ? `עוד ${remaining.untouchedTopics} נושאים שלא נגעת בהם`
                : 'חזור על נושאים קיימים'}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="text-gray-900 font-semibold text-sm">לפתור:</span>
              </div>
              <span className="text-purple-600 font-bold">{daily.questions} שאלות</span>
            </div>
            <div className="text-xs text-gray-600">
              תרגול יומי מותאם לציון {targets.targetScore}
            </div>
          </div>

          {daily.examsPerWeek > 0 && (
            <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-900 font-semibold text-sm">לבצע:</span>
                </div>
                <span className="text-purple-600 font-bold">
                  {daily.examsPerWeek > 1 ? `${daily.examsPerWeek} בגרויות השבוע` : 'בגרות השבוע'}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {daily.examMinutes || 90} דקות סימולציה מלאה
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-gray-900 font-semibold text-sm">לחזור על:</span>
              </div>
              <span className="text-purple-600 font-bold">{daily.reviewMistakes} טעויות</span>
            </div>
            <div className="text-xs text-gray-600">
              חיזוק נקודות חולשה
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`rounded-2xl shadow-lg p-6 border-2 ${
          isOnTrack 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
            : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className={`w-6 h-6 ${isOnTrack ? 'text-green-600' : 'text-red-600'}`} />
          <h3 className="text-xl font-bold text-gray-900">ציר הזמן</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="text-center">
              <div className="text-5xl font-black text-gray-900 mb-1">
                {timeline.weeksNeeded}
              </div>
              <div className="text-sm text-gray-600">שבועות עד מוכנות מלאה</div>
              <div className="text-xs text-gray-500 mt-1">
                ({timeline.daysNeeded} ימים)
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {timeline.daysUntilExam}
              </div>
              <div className="text-sm text-gray-600">ימים עד הבגרות</div>
            </div>
          </div>

          {isOnTrack ? (
            <div className="bg-green-100 rounded-xl p-4 border-2 border-green-300 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-900 font-bold">
                אתה בדיוק בזמן! 🎯
              </p>
              <p className="text-green-700 text-sm mt-1">
                תמשיך בקצב הזה ותצליח
              </p>
            </div>
          ) : (
            <div className="bg-red-100 rounded-xl p-4 border-2 border-red-300 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-900 font-bold">
                צריך להגביר! ⏰
              </p>
              <p className="text-red-700 text-sm mt-1">
                אתה צריך {timeline.daysNeeded} ימים אבל נשארו רק {timeline.daysUntilExam}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-6 text-center text-white shadow-lg"
        >
          <Award className="w-16 h-16 mx-auto mb-3" />
          <h3 className="text-2xl font-bold mb-2">שדרג לפרימיום</h3>
          <p className="text-white/90 mb-4">
            קבל תוכנית לימוד מותאמת אישית וגישה לכל התרגולים
          </p>
          <Button
            onClick={() => navigate(createPageUrl("Premium"))}
            className="bg-white text-amber-600 hover:bg-gray-100 h-12 text-base font-bold rounded-2xl px-8"
          >
            שדרג עכשיו
          </Button>
        </motion.div>
      )}
    </div>
  );
}