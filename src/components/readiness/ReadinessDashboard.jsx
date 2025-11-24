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
  Flame,
  Star,
  Brain,
  ChevronLeft,
  Lock,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LockedFeatureCard, { LockedPreview, PremiumUpsell } from "@/components/premium/LockedFeatureCard";

export default function ReadinessDashboard({ readinessData, isPremium, weakTopics = [], mistakes = [] }) {
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

      {/* מה חסר לך כדי להגיע לציון - פרימיום בלבד */}
      {isPremium ? (
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
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <LockedFeatureCard
            title="מה חסר לך להגיע לציון?"
            description="שדרג לפרימיום כדי לראות בדיוק מה חסר לך - שאלות, בגרויות, נושאים ועוד."
          />
        </motion.div>
      )}

      {/* נושאים חלשים - הצגה לכולם, תרגול רק לפרימיום */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">נושאים חלשים</h3>
        </div>

        {weakTopics.length > 0 ? (
          <>
            <div className="space-y-2">
              {weakTopics.slice(0, 3).map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <span className="text-sm text-gray-700">{topic.name}</span>
                  {isPremium ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(createPageUrl(`TopicPracticeNew?topic=${topic.topic_id}`))}
                      className="text-xs text-blue-600 hover:bg-blue-50 h-7 px-2"
                    >
                      תרגל נושא זה
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Lock className="w-3 h-3" />
                      <span>פרימיום</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isPremium && (
              <PremiumUpsell 
                message="שדרג לפרימיום כדי לתרגל את הנושאים החלשים שלך"
                className="mt-3"
              />
            )}

            {isPremium && weakTopics.length > 3 && (
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("WeakTopics"))}
                className="w-full mt-3 text-sm h-9"
              >
                ראה את כל {weakTopics.length} הנושאים החלשים
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">אין נושאים חלשים - מעולה! 💪</p>
        )}
      </motion.div>

      {/* טעויות - הצגה לכולם, תרגול רק לפרימיום */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">טעויות</h3>
        </div>

        {mistakes.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              יש לך {mistakes.reduce((sum, m) => sum + m.count, 0)} טעויות
            </p>

            <div className="space-y-2">
              {mistakes.slice(0, 2).map((mistake, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div>
                    <span className="text-sm text-gray-700">{mistake.topic_name}</span>
                    <span className="text-xs text-gray-500 mr-2">– {mistake.count} טעויות</span>
                  </div>
                  {isPremium ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(createPageUrl(`TopicPracticeNew?topic=${mistake.topic_id}`))}
                      className="text-xs text-blue-600 hover:bg-blue-50 h-7 px-2"
                    >
                      תרגל טעות זו
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Lock className="w-3 h-3" />
                      <span>פרימיום</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isPremium ? (
              <Button
                onClick={() => navigate(createPageUrl("CustomWeakExam"))}
                className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white text-sm h-9"
              >
                בוחן טעויות מלא
              </Button>
            ) : (
              <PremiumUpsell 
                message={`יש לך ${mistakes.reduce((sum, m) => sum + m.count, 0)} טעויות… רוצה לתקן? (פרימיום)`}
                className="mt-3"
              />
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">אין טעויות עדיין - כל הכבוד! 🎉</p>
        )}
      </motion.div>

      {/* בוחן חכם - AI Test - פרימיום בלבד */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">בוחן חכם (AI)</h3>
          {!isPremium && <Crown className="w-4 h-4 text-amber-500" />}
        </div>

        <p className="text-sm text-gray-600 mb-3">בוחן אוטומטי מבוסס:</p>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">50% טעויות</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">30% נושאים חלשים</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">10% שאלות לא פתורות</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">10% שאלות כלליות לחיזוק</span>
          </div>
        </div>

        {isPremium ? (
          <Button
            onClick={() => navigate(createPageUrl("CustomWeakPractice"))}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm h-10"
          >
            <Brain className="w-4 h-4 ml-2" />
            התחל בוחן חכם
          </Button>
        ) : (
          <Button
            onClick={() => navigate(createPageUrl("Premium"))}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-sm h-10"
          >
            <Lock className="w-4 h-4 ml-2" />
            שדרג לפרימיום
          </Button>
        )}
      </motion.div>

      {/* המשימות שלך להיום - חינם: משימה אחת, פרימיום: כל המשימות */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900">המשימות שלך להיום</h3>
          {!isPremium && <Crown className="w-4 h-4 text-amber-500" />}
        </div>

        <div className="space-y-2">
          {/* משימה ראשונה - לכולם */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-500">•</span>
            <span className="text-gray-700">לפתור {daily.questions} שאלות</span>
          </div>
          
          {/* שאר המשימות - פרימיום בלבד */}
          {isPremium ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-500">•</span>
                <span className="text-gray-700">ללמוד {daily.topics} נושאים</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-500">•</span>
                <span className="text-gray-700">לחזור על {daily.reviewMistakes} טעויות</span>
              </div>
            </>
          ) : (
            <div className="bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <Lock className="w-3 h-3" />
                <span>עוד {2} משימות זמינות בפרימיום</span>
              </div>
            </div>
          )}
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