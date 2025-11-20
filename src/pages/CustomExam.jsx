import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, FileCheck, Brain, Loader2, Crown, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function CustomExamPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState([]);
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

      // טען את כל הניסיונות במבחנים של המשתמש
      const attempts = await base44.entities.AttemptNew.filter({
        created_by: currentUser.email
      });

      // קבץ לפי נושא וחשב ביצועים
      const topicStats = {};
      attempts.forEach(attempt => {
        if (!attempt.topic_id) return;
        
        if (!topicStats[attempt.topic_id]) {
          topicStats[attempt.topic_id] = {
            topic_id: attempt.topic_id,
            subject_id: attempt.subject_id,
            totalAttempts: 0,
            correctAttempts: 0,
            totalScore: 0,
            maxScore: 0
          };
        }
        
        topicStats[attempt.topic_id].totalAttempts++;
        if (attempt.status === "correct") {
          topicStats[attempt.topic_id].correctAttempts++;
        }
        topicStats[attempt.topic_id].totalScore += attempt.score || 0;
        topicStats[attempt.topic_id].maxScore += attempt.max_score || 0;
      });

      // מצא נושאים חלשים (דיוק נמוך מ-70%)
      const weakTopicsList = Object.values(topicStats)
        .map(topic => ({
          ...topic,
          accuracy: topic.maxScore > 0 ? (topic.totalScore / topic.maxScore) * 100 : 0
        }))
        .filter(topic => topic.accuracy < 70 && topic.totalAttempts >= 3)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 10);

      setWeakTopics(weakTopicsList);

      // חשב סטטיסטיקות כלליות
      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter(a => a.status === "correct").length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      setStats({
        totalAttempts,
        correctAttempts,
        accuracy,
        weakTopicsCount: weakTopicsList.length
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startCustomExam = async () => {
    if (weakTopics.length === 0) {
      return;
    }

    try {
      // אסוף שאלות מהנושאים החלשים
      const allQuestions = [];
      
      for (const topic of weakTopics.slice(0, 5)) {
        const questions = await base44.entities.QuestionBank.filter({
          topic_id: topic.topic_id,
          is_active: true
        });
        
        // קח עד 4 שאלות מכל נושא
        const topicQuestions = questions.slice(0, 4);
        allQuestions.push(...topicQuestions);
      }

      if (allQuestions.length === 0) {
        alert("לא נמצאו שאלות לנושאים החלשים");
        return;
      }

      // צור מבחן מותאם אישית
      const exam = await base44.entities.GenericExam.create({
        title: "מבחן מותאם אישית - נושאים חלשים",
        subject: user.selected_subject || "אנגלית",
        unit_level: user.selected_units || 3,
        description: "מבחן שנבנה במיוחד עבורך על בסיס הנושאים שאתה חלש בהם",
        duration_minutes: allQuestions.length * 3,
        total_points: allQuestions.reduce((sum, q) => sum + (q.max_score || 10), 0),
        questions: allQuestions.map((q, idx) => ({
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: q.question_type,
          question_image_url: q.question_image_url,
          options: q.options || [],
          correct_answer: "",
          points: q.max_score || 10,
          topic: q.topic_id
        })),
        is_generated: true
      });

      // נווט למבחן
      navigate(createPageUrl(`ExamGeneric?examId=${exam.id}`));
    } catch (error) {
      console.error("Error creating custom exam:", error);
      alert("שגיאה ביצירת המבחן");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="animate-spin h-16 w-16 text-indigo-600" />
      </div>
    );
  }

  if (!user?.is_premium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Exams"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">מבחן מותאם אישית</h1>
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
              מבחן מותאם אישית נבנה במיוחד עבורך על בסיס הנושאים החלשים שלך
            </p>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 text-right">
              <h3 className="font-bold text-gray-900 mb-3">מה תקבל?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  מבחן ממוקד בדיוק בנושאים שאתה חלש בהם
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  המערכת בונה מבחן אידיאלי על בסיס הביצועים שלך
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  הכנה מושלמת לבגרות - חזור על מה שצריך
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Exams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
        
        <h1 className="text-3xl font-bold text-white mb-2">מבחן מותאם אישית</h1>
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
              <div className="text-3xl font-bold text-indigo-600">{stats.totalAttempts}</div>
              <div className="text-sm text-gray-600">מבחנים סה"כ</div>
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
              <div className="text-3xl font-bold text-orange-600">{stats.weakTopicsCount}</div>
              <div className="text-sm text-gray-600">נושאים לשיפור</div>
            </motion.div>
          </div>
        )}

        {weakTopics.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">המבחן המותאם אישית שלך מוכן!</h2>
              <p className="text-gray-600">
                זיהינו {weakTopics.length} נושאים שכדאי לחזק
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-3">הנושאים החלשים שלך:</h3>
              <div className="space-y-2">
                {weakTopics.slice(0, 5).map((topic, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <span className="text-sm font-medium text-gray-900">נושא {topic.topic_id}</span>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-orange-600">{Math.round(topic.accuracy)}%</div>
                      <div className="text-xs text-gray-500">דיוק</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={startCustomExam}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Brain className="w-6 h-6 ml-2" />
              התחל מבחן מותאם אישית
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
              לא מצאנו נושאים חלשים. המשך לתרגל מבחנים כדי שנוכל לבנות עבורך מבחן מותאם אישית.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              חזור למבחנים
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}