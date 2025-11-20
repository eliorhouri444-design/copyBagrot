import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Target, Brain, Loader2, Crown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function CustomPracticePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weakQuestions, setWeakQuestions] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (!currentUser?.is_premium) {
        setIsLoading(false);
        return;
      }

      // טען את כל הניסיונות של המשתמש
      const attempts = await base44.entities.AttemptNew.filter({
        created_by: currentUser.email
      });

      // מצא שאלות שטעה בהן
      const incorrectAttempts = attempts.filter(a => a.status === "incorrect");
      
      // קבץ לפי question_id וספור טעויות
      const questionErrors = {};
      incorrectAttempts.forEach(attempt => {
        if (!questionErrors[attempt.question_id]) {
          questionErrors[attempt.question_id] = {
            count: 0,
            subject_id: attempt.subject_id,
            topic_id: attempt.topic_id
          };
        }
        questionErrors[attempt.question_id].count++;
      });

      // מיין לפי מספר טעויות
      const sortedQuestions = Object.entries(questionErrors)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 30); // עד 30 שאלות מותאמות אישית

      setWeakQuestions(sortedQuestions);

      // חשב סטטיסטיקות
      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter(a => a.status === "correct").length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      setStats({
        totalAttempts,
        correctAttempts,
        accuracy,
        weakQuestionsCount: sortedQuestions.length
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startCustomPractice = async () => {
    if (weakQuestions.length === 0) {
      return;
    }

    try {
      // צור סשן תרגול חדש
      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "custom",
        subject_id: weakQuestions[0][1].subject_id,
        questions: weakQuestions.map(([qId]) => qId),
        started_at: new Date().toISOString(),
        is_completed: false
      });

      // נווט לתרגול עם השאלות המותאמות אישית
      navigate(createPageUrl(`CustomPracticeSession?sessionId=${session.id}`));
    } catch (error) {
      console.error("Error starting practice:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="animate-spin h-16 w-16 text-purple-600" />
      </div>
    );
  }

  if (!user?.is_premium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">תרגול מותאם אישית</h1>
          <p className="text-white/80">פיצ'ר פרימיום 👑</p>
        </div>

        <div className="max-w-2xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">פיצ'ר פרימיום בלבד</h2>
            <p className="text-gray-600 mb-6">
              תרגול מותאם אישית נבנה במיוחד עבורך על בסיס השאלות שטעית בהן
            </p>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 text-right">
              <h3 className="font-bold text-gray-900 mb-3">מה תקבל?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  תרגול ממוקד בדיוק בנושאים החלשים שלך
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  המערכת לומדת מהטעויות שלך ובונה תרגול אידיאלי
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  שיפור מהיר של הציונים בנושאים שאתה חלש בהם
                </li>
              </ul>
            </div>

            <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-lg font-bold"
            >
              <Crown className="w-5 h-5 ml-2" />
              שדרג לפרימיום
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Practice"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
        
        <h1 className="text-3xl font-bold text-white mb-2">תרגול מותאם אישית</h1>
        <p className="text-white/80">נבנה במיוחד עבורך 🎯</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-4 text-center"
            >
              <div className="text-3xl font-bold text-purple-600">{stats.totalAttempts}</div>
              <div className="text-sm text-gray-600">תרגולים סה"כ</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-4 text-center"
            >
              <div className="text-3xl font-bold text-green-600">{stats.accuracy}%</div>
              <div className="text-sm text-gray-600">דיוק כללי</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-4 text-center"
            >
              <div className="text-3xl font-bold text-orange-600">{stats.weakQuestionsCount}</div>
              <div className="text-sm text-gray-600">שאלות לשיפור</div>
            </motion.div>
          </div>
        )}

        {weakQuestions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">התרגול המותאם אישית שלך מוכן!</h2>
              <p className="text-gray-600">
                זיהינו {weakQuestions.length} שאלות שכדאי לתרגל שוב
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-3">איך זה עובד?</h3>
              <p className="text-sm text-gray-700">
                המערכת ניתחה את כל התרגולים שלך ובנתה עבורך סט שאלות ממוקד בדיוק בנושאים שאתה צריך לשפר. 
                תרגול זה יעזור לך לחזק את הנקודות החלשות ולהגיע לשליטה מלאה בחומר.
              </p>
            </div>

            <Button
              onClick={startCustomPractice}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Brain className="w-6 h-6 ml-2" />
              התחל תרגול מותאם אישית
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">מעולה!</h2>
            <p className="text-gray-600 mb-6">
              לא מצאנו נושאים שצריך לשפר. המשך לתרגל כדי שנוכל לבנות עבורך תרגול מותאם אישית.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="bg-purple-600 hover:bg-purple-700"
            >
              חזור לתרגול
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}