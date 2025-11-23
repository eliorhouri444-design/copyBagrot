import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomWeakExamBuilderPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    buildAndNavigateToExam();
  }, []);

  const buildAndNavigateToExam = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get all practice attempts
      const attempts = await base44.entities.AttemptNew.list("-created_date", 500);
      const userAttempts = attempts.filter(a => 
        a.created_by === currentUser.email && 
        a.subject_id === currentUser.selected_subject
      );

      // Build question stats with priority scoring
      const questionStats = {};
      userAttempts.forEach(attempt => {
        const qid = attempt.question_id;
        if (!qid) return;

        if (!questionStats[qid]) {
          questionStats[qid] = {
            question_id: qid,
            topic: attempt.topic_id,
            attempts: 0,
            successes: 0,
            lastAttempt: attempt.created_date,
            difficulty: 3
          };
        }

        questionStats[qid].attempts++;
        if (attempt.status === "correct" || attempt.percentage >= 70) {
          questionStats[qid].successes++;
        }
      });

      // Calculate priority score
      const now = new Date();
      const scoredQuestions = Object.values(questionStats).map(stat => {
        const failures = stat.attempts - stat.successes;
        const lastDate = new Date(stat.lastAttempt);
        const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        const recencyFactor = Math.min(2, 1 + (daysSince / 30));
        
        return {
          ...stat,
          score: failures * stat.difficulty * recencyFactor,
          failures
        };
      })
      .filter(q => q.failures > 0)
      .sort((a, b) => b.score - a.score);

      if (scoredQuestions.length === 0) {
        setError("לא נמצאו שאלות שטעית בהן. התחל לתרגל!");
        setIsLoading(false);
        return;
      }

      // Get top question IDs
      const topQuestionIds = scoredQuestions.slice(0, 30).map(q => q.question_id);
      
      // Load questions from bank
      const allQuestions = await base44.entities.QuestionBank.list();
      const weakQuestions = allQuestions.filter(q => 
        topQuestionIds.includes(q.question_id) && 
        q.is_active === true &&
        q.subject_id === currentUser.selected_subject
      );

      // Sort by priority
      const sortedQuestions = weakQuestions.sort((a, b) => {
        const scoreA = scoredQuestions.find(s => s.question_id === a.question_id)?.score || 0;
        const scoreB = scoredQuestions.find(s => s.question_id === b.question_id)?.score || 0;
        return scoreB - scoreA;
      }).slice(0, 20);

      if (sortedQuestions.length === 0) {
        setError("לא נמצאו שאלות מתאימות");
        setIsLoading(false);
        return;
      }

      // Build GenericExam from these questions
      const examQuestions = sortedQuestions.map((q, idx) => ({
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
        title: `מבחן מותאם אישית - ${currentUser.selected_subject}`,
        description: "מבחן המבוסס על שאלות שטעית בהן בעבר",
        subject: currentUser.selected_subject,
        unit_level: currentUser.selected_units,
        duration_minutes: Math.min(90, sortedQuestions.length * 4),
        total_points: totalPoints,
        passing_grade: 56,
        questions: examQuestions,
        is_generated: true,
        module_id: "custom_weak"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">בונה מבחן מותאם אישית...</h2>
          <p className="text-gray-600">מנתח את הטעויות שלך ובוחר שאלות</p>
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