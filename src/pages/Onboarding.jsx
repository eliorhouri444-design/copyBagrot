import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookCheck, ChevronLeft, Target, Zap, Calendar, CheckCircle, Palette, Eye, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const learningStyles = [
  { 
    id: "visual", 
    icon: Eye, 
    title: "חזותי", 
    description: "אני לומד הכי טוב עם דיאגרמות, תרשימים ואיורים", 
    color: "from-blue-500 to-cyan-500",
    emoji: "👁️"
  },
  { 
    id: "practice", 
    icon: Target, 
    title: "מעשי", 
    description: "אני צריך לתרגל ולפתור בעיות כדי להבין", 
    color: "from-purple-500 to-pink-500",
    emoji: "🎯"
  },
  { 
    id: "quick", 
    icon: Zap, 
    title: "מהיר", 
    description: "אני אוהב חזרות קצרות ותמציתיות", 
    color: "from-orange-500 to-red-500",
    emoji: "⚡"
  },
  { 
    id: "structured", 
    icon: Calendar, 
    title: "מובנה", 
    description: "אני מעדיף תוכנית למידה ברורה ומסודרת", 
    color: "from-green-500 to-emerald-500",
    emoji: "📅"
  }
];

const studyGoals = [
  { id: "pass", label: "לעבור את המבחן", score: "56+", emoji: "✅", color: "border-blue-500" },
  { id: "good", label: "ציון טוב", score: "70+", emoji: "👍", color: "border-green-500" },
  { id: "excellent", label: "ציון מצוין", score: "85+", emoji: "⭐", color: "border-purple-500" },
  { id: "perfect", label: "ציון מושלם", score: "95+", emoji: "🏆", color: "border-amber-500" }
];

const studyTime = [
  { id: "15min", label: "15 דקות ביום", emoji: "🕐" },
  { id: "30min", label: "30 דקות ביום", emoji: "🕕" },
  { id: "1hour", label: "שעה ביום", emoji: "⏰" },
  { id: "2hours", label: "שעתיים ביום", emoji: "⌛" }
];

const visualPreferences = [
  { id: "colorful", label: "צבעוני ומלא חיים", icon: Palette, emoji: "🎨" },
  { id: "minimal", label: "מינימליסטי ונקי", icon: Smartphone, emoji: "📱" },
  { id: "classic", label: "קלאסי ומסורתי", icon: BookCheck, emoji: "📚" },
  { id: "modern", label: "מודרני ועכשווי", icon: Zap, emoji: "✨" }
];

const soundPreferences = [
  { id: "silent", label: "שקט מוחלט", emoji: "🔇" },
  { id: "background", label: "מוזיקת רקע שקטה", emoji: "🎵" },
  { id: "effects", label: "אפקטים קוליים", emoji: "🔔" },
  { id: "voice", label: "הסברים קוליים", emoji: "🎤" }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [preferences, setPreferences] = useState({
    learningStyle: null,
    studyGoal: null,
    dailyTime: null,
    visualStyle: null,
    soundStyle: null
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.onboarding_completed) {
          navigate(currentUser?.subject_selected ? createPageUrl("Home") : createPageUrl("SubjectSelection"));
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    checkUser();
  }, [navigate]);

  const handleNext = () => {
    if (stage === 0 && preferences.learningStyle) setStage(1);
    else if (stage === 1 && preferences.studyGoal) setStage(2);
    else if (stage === 2 && preferences.dailyTime) setStage(3);
    else if (stage === 3 && preferences.visualStyle) setStage(4);
    else if (stage === 4 && preferences.soundStyle) handleComplete();
  };

  const handleComplete = async () => {
    try {
      await base44.auth.updateMe({ 
        onboarding_completed: true, 
        learning_preferences: preferences 
      });
      navigate(createPageUrl("SubjectSelection"));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const canProceed = () => {
    if (stage === 0) return preferences.learningStyle !== null;
    if (stage === 1) return preferences.studyGoal !== null;
    if (stage === 2) return preferences.dailyTime !== null;
    if (stage === 3) return preferences.visualStyle !== null;
    if (stage === 4) return preferences.soundStyle !== null;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
          בגרות פלוס
        </h1>
        <p className="text-sm text-gray-600 text-center mt-1">נתאים את החוויה במיוחד בשבילך</p>
      </motion.div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              key="learning-style"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🎓</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">איך אתה אוהב ללמוד?</h2>
                <p className="text-gray-600">בחר את סגנון הלמידה שמתאים לך</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningStyles.map((style) => {
                  const Icon = style.icon;
                  return (
                    <motion.button
                      key={style.id}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setPreferences({ ...preferences, learningStyle: style.id })}
                      className={`p-6 rounded-2xl border-3 transition-all text-right ${
                        preferences.learningStyle === style.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                          {style.emoji}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1 text-lg">{style.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{style.description}</p>
                        </div>
                      </div>
                      {preferences.learningStyle === style.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-3 flex items-center justify-center"
                        >
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🎯</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">מה היעד שלך?</h2>
                <p className="text-gray-600">בחר את הציון שאתה מכוון אליו</p>
              </div>

              <div className="space-y-3">
                {studyGoals.map((goal) => (
                  <motion.button
                    key={goal.id}
                    whileHover={{ scale: 1.02, x: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPreferences({ ...preferences, studyGoal: goal.id })}
                    className={`w-full p-5 rounded-2xl border-3 transition-all flex items-center justify-between ${
                      preferences.studyGoal === goal.id
                        ? `${goal.color} bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg ring-4 ring-blue-100`
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{goal.emoji}</div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-lg">{goal.label}</div>
                        <div className="text-sm text-gray-600">{goal.score}</div>
                      </div>
                    </div>
                    {preferences.studyGoal === goal.id && <CheckCircle className="w-7 h-7 text-blue-600" />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 2 && (
            <motion.div
              key="time"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">⏰</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">כמה זמן יש לך?</h2>
                <p className="text-gray-600">בחר את משך הזמן היומי ללמידה</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyTime.map((time) => (
                  <motion.button
                    key={time.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPreferences({ ...preferences, dailyTime: time.id })}
                    className={`p-8 rounded-2xl border-3 transition-all ${
                      preferences.dailyTime === time.id
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg ring-4 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-5xl mb-3">{time.emoji}</div>
                    <div className="font-bold text-gray-900 text-lg">{time.label}</div>
                    {preferences.dailyTime === time.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mt-3"
                      >
                        <CheckCircle className="w-6 h-6 text-blue-600 mx-auto" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 3 && (
            <motion.div
              key="visual"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🎨</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">איזה עיצוב אתה אוהב?</h2>
                <p className="text-gray-600">בחר את סגנון העיצוב המועדף עליך</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visualPreferences.map((pref) => (
                  <motion.button
                    key={pref.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPreferences({ ...preferences, visualStyle: pref.id })}
                    className={`p-6 rounded-2xl border-3 transition-all ${
                      preferences.visualStyle === pref.id
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg ring-4 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-3">{pref.emoji}</div>
                    <div className="font-bold text-gray-900 text-lg">{pref.label}</div>
                    {preferences.visualStyle === pref.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mt-3"
                      >
                        <CheckCircle className="w-6 h-6 text-blue-600 mx-auto" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 4 && (
            <motion.div
              key="sound"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔊</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">העדפות קול</h2>
                <p className="text-gray-600">איך אתה מעדיף ללמוד?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {soundPreferences.map((pref) => (
                  <motion.button
                    key={pref.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPreferences({ ...preferences, soundStyle: pref.id })}
                    className={`p-6 rounded-2xl border-3 transition-all ${
                      preferences.soundStyle === pref.id
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg ring-4 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-3">{pref.emoji}</div>
                    <div className="font-bold text-gray-900">{pref.label}</div>
                    {preferences.soundStyle === pref.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mt-3"
                      >
                        <CheckCircle className="w-6 h-6 text-blue-600 mx-auto" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === stage ? 'w-10 bg-gradient-to-r from-blue-600 to-purple-600' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <motion.div 
          className="mt-8"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stage === 4 ? (
              <span className="flex items-center gap-2">
                <span>סיום</span>
                <CheckCircle className="w-6 h-6" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>הבא</span>
                <ChevronLeft className="w-6 h-6" />
              </span>
            )}
          </Button>
        </motion.div>

        {stage > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            <Button
              variant="ghost"
              onClick={() => setStage(stage - 1)}
              className="text-gray-600 hover:text-gray-900"
            >
              חזרה
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}