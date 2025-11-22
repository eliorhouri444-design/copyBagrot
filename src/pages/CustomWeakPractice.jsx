import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Zap, Target, Play, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function CustomWeakPracticePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWeakTopics();
  }, []);

  const loadWeakTopics = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get all practice attempts
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const userAttempts = attempts.filter(a => 
        a.created_by === currentUser.email && 
        a.subject_id === currentUser.selected_subject
      );

      // Analyze by topic
      const topicStats = {};
      userAttempts.forEach(attempt => {
        const topic = attempt.topic_id || 'unknown';
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0, incorrect: 0, partial: 0 };
        }
        topicStats[topic].total++;
        if (attempt.status === "correct") topicStats[topic].correct++;
        else if (attempt.status === "partial") topicStats[topic].partial++;
        else topicStats[topic].incorrect++;
      });

      // Get topics metadata
      const allTopics = await base44.entities.TopicNew.list();
      const relevantTopics = allTopics.filter(t => 
        t.subject_id === currentUser.selected_subject && 
        t.unit_level === currentUser.selected_units &&
        t.is_active
      );

      // Calculate accuracy and filter weak topics
      const topicsArray = Object.entries(topicStats)
        .map(([topicId, stats]) => {
          const accuracy = stats.total > 0 ? ((stats.correct + stats.partial * 0.7) / stats.total * 100) : 0;
          const topicMeta = relevantTopics.find(t => t.topic_id === topicId);
          
          return {
            topic_id: topicId,
            name: topicMeta?.name || topicId,
            icon: topicMeta?.icon || "📚",
            color: topicMeta?.color || "from-blue-500 to-blue-600",
            accuracy,
            total: stats.total,
            correct: stats.correct,
            incorrect: stats.incorrect,
            partial: stats.partial
          };
        })
        .filter(t => t.accuracy < 70 && t.total >= 3) // Weak topics with enough data
        .sort((a, b) => a.accuracy - b.accuracy); // Worst first

      setWeakTopics(topicsArray);
    } catch (error) {
      console.error("Error loading weak topics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = async (topicId) => {
    try {
      // Verify that questions exist for this topic
      let questions = await base44.entities.QuestionBank.filter({
        topic_id: topicId,
        subject_id: user.selected_subject,
        unit_level: user.selected_units,
        is_active: true
      });

      // If no questions exist, generate them
      if (questions.length === 0) {
        const topicName = weakTopics.find(t => t.topic_id === topicId)?.name || topicId;
        
        if (!confirm(`אין שאלות לנושא "${topicName}". האם ליצור שאלות חדשות באמצעות AI?`)) {
          return;
        }

        // Generate 10 questions for this topic
        const generatedQuestions = await base44.integrations.Core.InvokeLLM({
          prompt: `Create 10 practice questions in Hebrew for the following topic:
Subject: ${user.selected_subject}
Topic: ${topicName}
Level: ${user.selected_units} units

Generate diverse questions with different difficulty levels (easy, medium, hard).
Each question should be clear, relevant to the topic, and include:
- Question text
- Correct answer
- Explanation

Format as a JSON array with this structure for EACH question:`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    question_type: { type: "string", enum: ["open", "multi_choice", "calculation"] },
                    options: { type: "array", items: { type: "string" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" },
                    difficulty_level: { type: "string", enum: ["easy", "medium", "hard"] },
                    max_score: { type: "number" }
                  }
                }
              }
            }
          }
        });

        // Save generated questions to database
        const createdQuestions = [];
        for (const q of generatedQuestions.questions) {
          const newQuestion = await base44.entities.QuestionBank.create({
            question_id: `${topicId}_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            subject_id: user.selected_subject,
            unit_level: user.selected_units,
            topic_id: topicId,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || [],
            difficulty_level: q.difficulty_level || "medium",
            max_score: q.max_score || 10,
            is_active: true,
            origin_type: "ai_generated"
          });
          createdQuestions.push(newQuestion);

          // Create solution
          await base44.entities.SolutionBank.create({
            question_id: newQuestion.question_id,
            solution_text: q.explanation,
            final_answers: [{ value: q.correct_answer }],
            verified: false
          });
        }

        alert(`נוצרו ${createdQuestions.length} שאלות חדשות! מתחיל תרגול...`);
      }

      navigate(createPageUrl(`TopicPracticeNew?topicid=${encodeURIComponent(topicId)}&set=1`));
    } catch (error) {
      console.error('Error starting practice:', error);
      alert('שגיאה: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">מנתח את הנתונים שלך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-2xl mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Statistics"))}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-lg">
            <Zap className="w-6 h-6 text-white" />
            <span className="text-xl font-bold text-white">תרגול מותאם אישית</span>
          </div>
        </div>
        
        <div className="text-center text-white mt-3">
          <h2 className="text-lg font-bold mb-1">נושאים לשיפור</h2>
          <p className="text-sm opacity-90">תרגל את הנושאים החלשים שלך</p>
        </div>
      </motion.div>

      <div className="px-4 space-y-4">
        {weakTopics.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">כל הכבוד! 🌟</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              אין לך נושאים חלשים!
              <br/>
              המשך לתרגל כדי לשמור על הרמה הגבוהה
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-bold shadow-lg"
            >
              חזרה לתרגול
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Target className="w-10 h-10" />
                <div>
                  <h3 className="text-lg font-bold">מצאנו {weakTopics.length} נושאים לשיפור</h3>
                  <p className="text-sm opacity-90">תרגל אותם כדי לשפר את הציונים שלך</p>
                </div>
              </div>
            </motion.div>

            <div className="space-y-3">
              {weakTopics.map((topic, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-lg p-5"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${topic.color} rounded-2xl flex items-center justify-center shadow-md text-2xl flex-shrink-0`}>
                      {topic.icon}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900 mb-1">{topic.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-orange-600">{Math.round(topic.accuracy)}%</span>
                        <span className="text-xs text-gray-500">דיוק נוכחי</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleStartPractice(topic.topic_id)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 px-6 shadow-lg"
                    >
                      <Play className="w-4 h-4 ml-2" />
                      תרגל
                    </Button>
                  </div>

                  <div className="mb-3">
                    <Progress value={topic.accuracy} className="h-2.5 bg-orange-100" />
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">{topic.correct}</div>
                      <div className="text-[10px] text-gray-600">נכונות</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">{topic.partial}</div>
                      <div className="text-[10px] text-gray-600">חלקיות</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">{topic.incorrect}</div>
                      <div className="text-[10px] text-gray-600">שגויות</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}