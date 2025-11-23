import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomWeakPracticeBuilderPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    buildAndNavigateToPractice();
  }, []);

  const buildAndNavigateToPractice = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get all practice attempts (not exams)
      const allAttempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const userPractice = allAttempts.filter(a => 
        a.created_by === currentUser.email && 
        a.subject_id === currentUser.selected_subject
      );

      if (userPractice.length === 0) {
        setError("עדיין לא ביצעת תרגולים. התחל לתרגל!");
        setIsLoading(false);
        return;
      }

      // Analyze by topic and question
      const topicStats = {};
      const questionStats = {};

      userPractice.forEach(attempt => {
        const topic = attempt.topic_id;
        const qid = attempt.question_id;

        // Topic stats
        if (topic) {
          if (!topicStats[topic]) {
            topicStats[topic] = { total: 0, correct: 0, incorrect: 0 };
          }
          topicStats[topic].total++;
          if (attempt.status === "correct") topicStats[topic].correct++;
          else topicStats[topic].incorrect++;
        }

        // Question stats
        if (qid) {
          if (!questionStats[qid]) {
            questionStats[qid] = { attempts: 0, successes: 0, topic, lastAttempt: attempt.created_date };
          }
          questionStats[qid].attempts++;
          if (attempt.status === "correct" || attempt.percentage >= 70) {
            questionStats[qid].successes++;
          }
        }
      });

      // Find weak topics (accuracy < 60%, min 3 attempts)
      const weakTopics = Object.entries(topicStats)
        .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) < 0.6)
        .map(([topic, stats]) => ({
          topic,
          accuracy: (stats.correct / stats.total) * 100,
          total: stats.total
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

      // Find failed questions
      const now = new Date();
      const failedQuestions = Object.entries(questionStats)
        .map(([qid, stat]) => {
          const failures = stat.attempts - stat.successes;
          const daysSince = Math.floor((now - new Date(stat.lastAttempt)) / (1000 * 60 * 60 * 24));
          const recencyFactor = Math.min(2, 1 + (daysSince / 30));
          
          return {
            question_id: qid,
            score: failures * 3 * recencyFactor,
            failures,
            topic: stat.topic
          };
        })
        .filter(q => q.failures > 0)
        .sort((a, b) => b.score - a.score);

      // Load questions from bank
      const allQuestions = await base44.entities.QuestionBank.list();
      const questionsMap = new Map();

      // Priority 1: Questions user failed
      failedQuestions.slice(0, 15).forEach(fq => {
        const q = allQuestions.find(qu => qu.question_id === fq.question_id && qu.is_active);
        if (q) {
          questionsMap.set(q.question_id, {
            ...q,
            _priority: 3,
            _failures: fq.failures
          });
        }
      });

      // Priority 2: Questions from weak topics
      weakTopics.slice(0, 5).forEach(wt => {
        const topicQuestions = allQuestions.filter(q => 
          q.topic_id === wt.topic && 
          q.is_active &&
          q.subject_id === currentUser.selected_subject &&
          !questionsMap.has(q.question_id)
        );

        topicQuestions.slice(0, 3).forEach(q => {
          questionsMap.set(q.question_id, {
            ...q,
            _priority: 2,
            _weak_topic: wt.topic
          });
        });
      });

      const finalQuestions = Array.from(questionsMap.values())
        .sort((a, b) => b._priority - a._priority)
        .slice(0, 20);

      if (finalQuestions.length === 0) {
        setError("לא נמצאו שאלות מתרגולים שטעית בהן");
        setIsLoading(false);
        return;
      }

      // Create a practice session with weak questions
      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "custom",
        subject_id: currentUser.selected_subject,
        unit_level: currentUser.selected_units,
        topic_id: "weak_topics_mixed",
        questions: finalQuestions.map(q => q.question_id),
        started_at: new Date().toISOString(),
        is_completed: false
      });

      // Navigate to practice page with these questions
      const questionIds = finalQuestions.map(q => q.question_id).join(',');
      window.location.href = createPageUrl("TopicPracticeNew") + `?topicId=weak_mixed&sessionId=${session.id}&questionIds=${questionIds}`;
    } catch (error) {
      console.error("Error building practice:", error);
      setError("שגיאה ביצירת התרגול: " + error.message);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">בונה תרגול מותאם אישית...</h2>
          <p className="text-gray-600">מנתח נושאים ושאלות חלשים מתרגולים</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate(createPageUrl("Statistics"))} className="w-full">
              חזרה לסטטיסטיקה
            </Button>
            <Button onClick={() => navigate(createPageUrl("Practice"))} variant="outline" className="w-full">
              התחל תרגול
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}