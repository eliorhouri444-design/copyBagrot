import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, TrendingUp, Zap, BookOpen, ChevronLeft, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function SmartRecommendations({ user }) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      generateRecommendations();
    }
  }, [user]);

  const generateRecommendations = async () => {
    setIsLoading(true);
    try {
      // Get user's practice history
      const attempts = await base44.entities.AttemptNew.list("-created_date", 100);
      const userAttempts = attempts.filter(a => a.created_by === user.email);

      // Analyze weak topics
      const topicStats = {};
      userAttempts.forEach(attempt => {
        const topic = attempt.topic_id || 'unknown';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0, incorrect: 0 };
        }
        topicStats[topic].total++;
        if (attempt.status === "correct") topicStats[topic].correct++;
        else topicStats[topic].incorrect++;
      });

      const weakTopics = Object.entries(topicStats)
        .map(([topic, stats]) => ({
          topic,
          accuracy: stats.total > 0 ? (stats.correct / stats.total * 100) : 0,
          total: stats.total
        }))
        .filter(t => t.accuracy < 70 && t.total >= 3)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3);

      // Get exam attempts
      const examAttempts = await base44.entities.ExamAttempt.list("-created_date", 10);
      const userExams = examAttempts.filter(e => e.created_by === user.email);

      const recos = [];

      // Recommendation 1: Weak topics
      if (weakTopics.length > 0) {
        recos.push({
          id: "weak_topics",
          title: "חזק נושאים חלשים",
          description: `יש לך ${weakTopics.length} נושאים שדורשים תשומת לב`,
          icon: Target,
          color: "from-orange-500 to-red-600",
          action: () => navigate(createPageUrl("CustomWeakPractice")),
          priority: "high"
        });
      }

      // Recommendation 2: Practice consistency
      const last7Days = userAttempts.filter(a => {
        const date = new Date(a.created_date);
        const now = new Date();
        const diff = (now - date) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      });

      if (last7Days.length < 10) {
        recos.push({
          id: "practice_more",
          title: "הגבר תרגול",
          description: `תרגלת רק ${last7Days.length} פעמים השבוע - המטרה 10+`,
          icon: TrendingUp,
          color: "from-blue-500 to-cyan-600",
          action: () => navigate(createPageUrl("Practice")),
          priority: "medium"
        });
      }

      // Recommendation 3: Exam simulation
      if (userExams.length < 5) {
        recos.push({
          id: "more_exams",
          title: "תרגל מבחנים מלאים",
          description: "סימולציות בגרות ישפרו את הציונים שלך",
          icon: BookOpen,
          color: "from-purple-500 to-pink-600",
          action: () => navigate(createPageUrl("Exams")),
          priority: "medium"
        });
      }

      // Recommendation 4: Study planner
      const studySessions = await base44.entities.StudySession.list();
      const userSessions = studySessions.filter(s => s.created_by === user.email);

      if (userSessions.length === 0) {
        recos.push({
          id: "study_planner",
          title: "תכנן לימודים",
          description: "צור לוח זמנים ללמידה יעילה",
          icon: Brain,
          color: "from-green-500 to-emerald-600",
          action: () => navigate(createPageUrl("StudyPlanner")),
          priority: "low"
        });
      }

      // Recommendation 5: Custom practice
      recos.push({
        id: "custom_practice",
        title: "תרגול מותאם אישית",
        description: "בנה תרגול מדויק לפי הצרכים שלך",
        icon: Zap,
        color: "from-yellow-500 to-orange-600",
        action: () => navigate(createPageUrl("CustomPracticeBuilder")),
        priority: "low"
      });

      setRecommendations(recos.slice(0, 4));
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5" />
          המלצות חכמות עבורך
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {recommendations.map((reco, idx) => {
          const Icon = reco.icon;
          return (
            <motion.button
              key={reco.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={reco.action}
              className={`w-full bg-gradient-to-r ${reco.color} rounded-xl p-4 text-white text-right hover:shadow-lg transition-all`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-8 h-8 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1">{reco.title}</div>
                  <div className="text-xs opacity-90">{reco.description}</div>
                </div>
                <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}