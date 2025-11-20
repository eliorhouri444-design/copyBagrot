import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, TrendingDown, ChevronRight, Crown, Lock, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function WeakTopicsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const allWeakTopics = await base44.entities.WeakTopic.list();
        
        const userWeakTopics = allWeakTopics
          .filter(wt => wt.created_by === currentUser.email)
          .map(wt => {
            const accuracy = wt.total_attempts > 0 
              ? Math.round(((wt.total_attempts - wt.wrong_attempts) / wt.total_attempts) * 100)
              : 0;
            
            return {
              ...wt,
              accuracy,
              weakness_score: 100 - accuracy
            };
          })
          .sort((a, b) => b.weakness_score - a.weakness_score);

        setWeakTopics(userWeakTopics);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStartCustomPractice = async () => {
    if (!user?.is_premium) {
      navigate(createPageUrl("Premium"));
      return;
    }

    if (weakTopics.length === 0) {
      alert("לא נמצאו נושאים חלשים. המשך לתרגל כדי לזהות נקודות לשיפור!");
      return;
    }

    const topWeakTopics = weakTopics.slice(0, 5);
    const questionsPool = [];

    for (const topic of topWeakTopics) {
      const topicQuestions = await base44.entities.QuestionBank.filter({
        topic_id: topic.topic_id,
        is_active: true
      });
      
      const questionsToAdd = Math.min(3, topicQuestions.length);
      questionsPool.push(...topicQuestions.slice(0, questionsToAdd));
    }

    if (questionsPool.length === 0) {
      alert("לא נמצאו שאלות זמינות לנושאים החלשים");
      return;
    }

    const shuffled = questionsPool.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 10);

    const session = await base44.entities.PracticeSessionNew.create({
      session_type: "custom",
      subject_id: selectedQuestions[0].subject_id,
      unit_level: selectedQuestions[0].unit_level,
      questions: selectedQuestions.map(q => q.question_id),
      started_at: new Date().toISOString(),
      is_completed: false
    });

    navigate(createPageUrl(`CustomPractice?sessionId=${session.id}`));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  const isPremium = user?.is_premium;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-3xl p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold">תרגול מותאם אישית</h1>
            <p className="text-sm opacity-90">מבוסס על הנושאים החלשים שלך</p>
          </div>

          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-300 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">תכונה לפרימיום</h3>
                <p className="text-gray-700 mb-4">
                  תרגול מותאם אישית זמין רק למנויי פרימיום. המערכת אוספת נתונים על הנושאים החלשים שלך כדי שתוכל להשתמש בתכונה זו כשתשדרג.
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                >
                  <Crown className="w-5 h-5 ml-2" />
                  שדרג לפרימיום
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" />
            הנושאים החלשים שלך
          </h2>

          {weakTopics.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">עדיין לא נאספו נתונים</p>
              <p className="text-sm text-gray-500 mt-2">המשך לתרגל כדי לזהות נקודות לשיפור</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {weakTopics.slice(0, 10).map((topic, idx) => {
                  const parts = topic.topic_id.split('_');
                  const displayName = parts.length >= 3 ? parts.slice(2).join(' ') : topic.topic_id;

                  return (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-red-600">#{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{displayName}</h3>
                            <p className="text-sm text-gray-600">
                              דיוק: {topic.accuracy}% • {topic.wrong_attempts} טעויות מתוך {topic.total_attempts}
                            </p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {topic.weakness_score}%
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {isPremium && (
                <Button
                  onClick={handleStartCustomPractice}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-bold"
                >
                  <Play className="w-6 h-6 ml-2" />
                  התחל תרגול מותאם אישית
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}