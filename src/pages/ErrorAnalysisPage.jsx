
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, TrendingDown, Target, BookOpen, Award, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import toast from 'react-hot-toast'; // Added import for toast notifications

export default function ErrorAnalysisPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAnalysis();
    }
  }, [user]);

  const loadAnalysis = async () => {
    try {
      setIsLoading(true);

      // שלוף את כל הניסיונות של המשתמש
      const userAttempts = await base44.entities.AttemptNew.filter({
        created_by: user.email
      });

      setAttempts(userAttempts);

      // ניתוח
      const totalAttempts = userAttempts.length;
      const incorrectAttempts = userAttempts.filter(a => a.status === 'incorrect');
      const partialAttempts = userAttempts.filter(a => a.status === 'partial');

      // ניתוח לפי נושאים
      const topicErrors = {};
      const subjectErrors = {};

      for (const attempt of incorrectAttempts) {
        // שלוף את השאלה
        const questions = await base44.entities.QuestionBank.filter({
          question_id: attempt.question_id
        });

        if (questions.length > 0) {
          const question = questions[0];
          
          // ספירה לפי נושא
          if (question.topic_id) {
            topicErrors[question.topic_id] = (topicErrors[question.topic_id] || 0) + 1;
          }

          // ספירה לפי מקצוע
          if (question.subject_id) {
            subjectErrors[question.subject_id] = (subjectErrors[question.subject_id] || 0) + 1;
          }
        }
      }

      // מיון נושאים לפי שכיחות
      const sortedTopics = Object.entries(topicErrors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const avgScore = userAttempts.length > 0
        ? userAttempts.reduce((sum, a) => sum + a.percentage, 0) / userAttempts.length
        : 0;

      setAnalysis({
        totalAttempts,
        incorrectCount: incorrectAttempts.length,
        partialCount: partialAttempts.length,
        correctCount: userAttempts.filter(a => a.status === 'correct').length,
        avgScore: Math.round(avgScore),
        weakTopics: sortedTopics,
        subjectBreakdown: subjectErrors
      });

    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeWeakTopic = async (topicId) => {
    try {
      toast.loading('יוצר תרגול מותאם...', { id: 'adaptive' });

      const response = await base44.functions.invoke('generateAdaptivePractice', {
        subject_id: user.selected_subject,
        unit_level: user.selected_units,
        weak_topics: [topicId],
        count: 10
      });

      if (response.data?.success) {
        toast.success('תרגול מותאם מוכן!', { id: 'adaptive' });
        navigate(createPageUrl(`TopicPracticePage?topic=${topicId}&subject=${user.selected_subject}&units=${user.selected_units}`));
      } else {
        toast.error('שגיאה ביצירת תרגול', { id: 'adaptive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה', { id: 'adaptive' });
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">מנתח טעויות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-b-3xl p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Profile"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center text-white">
          <TrendingDown className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">ניתוח טעויות</h1>
          <p className="text-sm opacity-90">למד מהטעויות ושפר את הביצועים</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Overall Stats */}
        {analysis && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">📊 סטטיסטיקה כללית</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-3xl font-black text-blue-600">{analysis.totalAttempts}</div>
                  <div className="text-sm text-gray-600">סה"כ ניסיונות</div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-3xl font-black text-green-600">{analysis.avgScore}%</div>
                  <div className="text-sm text-gray-600">ציון ממוצע</div>
                </div>

                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <Target className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-3xl font-black text-yellow-600">{analysis.partialCount}</div>
                  <div className="text-sm text-gray-600">תשובות חלקיות</div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <div className="text-3xl font-black text-red-600">{analysis.incorrectCount}</div>
                  <div className="text-sm text-gray-600">תשובות שגויות</div>
                </div>
              </div>
            </motion.div>

            {/* Weak Topics */}
            {analysis.weakTopics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl p-6"
              >
                <h2 className="text-xl font-bold mb-4">🎯 נושאים לשיפור</h2>
                <p className="text-sm text-gray-600 mb-4">
                  הנושאים שבהם טעית הכי הרבה - כדאי לחזור עליהם!
                </p>

                <div className="space-y-3">
                  {analysis.weakTopics.map(([topicId, count], idx) => (
                    <motion.div
                      key={topicId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-bold text-red-900">{topicId}</div>
                          <div className="text-sm text-red-700">{count} טעויות</div>
                        </div>
                        <div className="text-3xl font-black text-red-600">#{idx + 1}</div>
                      </div>

                      <Button
                        onClick={() => handlePracticeWeakTopic(topicId)}
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        תרגל נושא זה
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white"
            >
              <h2 className="text-xl font-bold mb-3">💡 המלצות אישיות</h2>
              <ul className="space-y-2 text-sm">
                {analysis.avgScore < 60 && (
                  <li>• הציון הממוצע שלך נמוך - כדאי לתרגל יותר ולעבוד עם המורה החכם</li>
                )}
                {analysis.incorrectCount > analysis.correctCount && (
                  <li>• יש לך הרבה טעויות - התמקד בנושאים הבעייתיים ותרגל אותם</li>
                )}
                {analysis.partialCount > 5 && (
                  <li>• יש לך הרבה תשובות חלקיות - אתה בכיוון הנכון, פשוט תדייק יותר</li>
                )}
                <li>• תרגול קבוע של 30 דקות ביום יכול לשפר את הציונים ב-20%</li>
                <li>• נסה לפתור מבחנים מלאים בתנאי בגרות כדי להתרגל ללחץ</li>
              </ul>
            </motion.div>
          </>
        )}

        {!analysis || analysis.totalAttempts === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-12 text-center"
          >
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">אין עדיין נתונים</h3>
            <p className="text-gray-600 mb-6">
              התחל לתרגל ולפתור שאלות כדי לקבל ניתוח טעויות אישי
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              התחל תרגול
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
