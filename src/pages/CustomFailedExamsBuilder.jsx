import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomFailedExamsBuilderPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    buildAndNavigateToExam();
  }, []);

  const buildAndNavigateToExam = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get all exam attempts
      const allExamAttempts = await base44.entities.ExamAttempt.list("-created_date", 100);
      const failedExams = allExamAttempts.filter(e => 
        e.created_by === currentUser.email &&
        e.subject === currentUser.selected_subject &&
        (!e.passed || e.score_percent < (e.passing_grade || 56))
      );

      if (failedExams.length === 0) {
        setError("לא נמצאו בגרויות שנכשלת בהן. כל הכבוד! 🌟");
        setIsLoading(false);
        return;
      }

      // Get all practice attempts to find weak topics
      const practiceAttempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const userPractice = practiceAttempts.filter(a => 
        a.created_by === currentUser.email && 
        a.subject_id === currentUser.selected_subject
      );

      // Find weak topics
      const topicStats = {};
      userPractice.forEach(attempt => {
        const topic = attempt.topic_id;
        if (!topic) return;
        
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, correct: 0 };
        }
        topicStats[topic].total++;
        if (attempt.status === "correct") topicStats[topic].correct++;
      });

      const weakTopics = Object.entries(topicStats)
        .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) < 0.6)
        .map(([topic, _]) => topic);

      // Load all questions from question bank
      const allQuestions = await base44.entities.QuestionBank.list();
      
      // Collect questions from failed exams
      const questionsToInclude = new Map();
      const questionsFromFailedExams = [];

      // Get questions that appeared in failed exams
      for (const failedExam of failedExams) {
        if (!failedExam.answers || !Array.isArray(failedExam.answers)) continue;
        
        // Find questions user got wrong or partially wrong
        const wrongAnswers = failedExam.answers.filter(ans => 
          !ans.is_correct || (ans.points_awarded || 0) < (ans.max_points || 5)
        );

        for (const wrongAnswer of wrongAnswers) {
          // Try to find the question in question bank
          const matchingQ = allQuestions.find(q => 
            q.question_text === wrongAnswer.question_text ||
            q.question_id === wrongAnswer.question_id
          );

          if (matchingQ && !questionsToInclude.has(matchingQ.question_id)) {
            questionsToInclude.set(matchingQ.question_id, {
              ...matchingQ,
              _priority: 3,
              _reason: "נכשלת בשאלה זו במבחן"
            });
            questionsFromFailedExams.push(matchingQ);
          }
        }
      }

      // Add questions from weak topics
      const weakTopicQuestions = allQuestions.filter(q => 
        weakTopics.includes(q.topic_id) && 
        q.is_active &&
        q.subject_id === currentUser.selected_subject &&
        !questionsToInclude.has(q.question_id)
      );

      weakTopicQuestions.slice(0, 10).forEach(q => {
        questionsToInclude.set(q.question_id, {
          ...q,
          _priority: 2,
          _reason: `נושא חלש: ${q.topic_id}`
        });
      });

      const finalQuestions = Array.from(questionsToInclude.values())
        .sort((a, b) => b._priority - a._priority)
        .slice(0, 25);

      if (finalQuestions.length === 0) {
        setError("לא נמצאו שאלות מתאימות לבניית מבחן");
        setIsLoading(false);
        return;
      }

      // Build exam questions
      const examQuestions = finalQuestions.map((q, idx) => ({
        question_number: idx + 1,
        question_text: q.question_text,
        question_image_url: q.question_image_url,
        question_type: q.question_type || 'short_answer',
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        points: q.max_score || 5,
        topic: q.topic_id,
        reading_text: q.reading_text
      }));

      const totalPoints = examQuestions.reduce((sum, q) => sum + q.points, 0);

      // Create the custom exam
      const customExam = await base44.entities.GenericExam.create({
        title: `מבחן משולב - בגרויות ונושאים חלשים`,
        description: `מבוסס על ${failedExams.length} בגרויות שנכשלת בהן + ${weakTopics.length} נושאים חלשים`,
        subject: currentUser.selected_subject,
        unit_level: currentUser.selected_units,
        duration_minutes: Math.min(90, finalQuestions.length * 4),
        total_points: totalPoints,
        passing_grade: 56,
        questions: examQuestions,
        is_generated: true,
        module_id: "custom_failed_exams"
      });

      // Navigate to the exam
      window.location.href = createPageUrl("ExamGeneric") + `?examId=${encodeURIComponent(customExam.id)}`;
    } catch (error) {
      console.error("Error building exam:", error);
      setError("שגיאה ביצירת המבחן: " + error.message);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-orange-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">בונה מבחן מבגרויות שנכשלת...</h2>
          <p className="text-gray-600">מנתח בגרויות קודמות ונושאים חלשים</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{error.includes("כל הכבוד") ? "מצוין!" : "שגיאה"}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate(createPageUrl("Statistics"))} className="w-full">
              חזרה לסטטיסטיקה
            </Button>
            <Button onClick={() => navigate(createPageUrl("Exams"))} variant="outline" className="w-full">
              עבור לבגרויות
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}