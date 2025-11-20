import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Clock, Send, AlertCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function FullExamSimulationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const subjectId = searchParams.get('subject');
  const unitLevel = parseInt(searchParams.get('units') || '0');
  const examYear = searchParams.get('year');
  const examSeason = searchParams.get('season');
  const module = searchParams.get('module');

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(5400); // 90 minutes
  const [sessionId, setSessionId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (user && subjectId) {
      loadExam();
      createSession();
    }
  }, [user, subjectId]);

  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && !isSubmitted) {
      handleSubmitExam();
    }
  }, [timeRemaining, isSubmitted]);

  const loadExam = async () => {
    try {
      toast.loading('טוען מבחן...', { id: 'load' });
      
      const filter = {
        subject_id: subjectId,
        unit_level: unitLevel,
        origin_type: 'bagrut',
        is_active: true
      };

      if (examYear) filter.origin_details = { $regex: examYear };
      if (module) filter.origin_details = { $regex: module };

      const examQuestions = await base44.entities.QuestionBank.filter(filter);

      if (examQuestions.length === 0) {
        toast.error('לא נמצאו שאלות למבחן זה', { id: 'load' });
        return;
      }

      const sorted = examQuestions.sort((a, b) => 
        a.question_id.localeCompare(b.question_id)
      );

      setQuestions(sorted);
      toast.success(`${sorted.length} שאלות נטענו!`, { id: 'load' });
    } catch (error) {
      console.error('Error loading exam:', error);
      toast.error('שגיאה בטעינת מבחן', { id: 'load' });
    }
  };

  const createSession = async () => {
    try {
      const session = await base44.entities.PracticeSessionNew.create({
        session_id: `exam_${Date.now()}`,
        session_type: 'full_exam',
        subject_id: subjectId,
        unit_level: unitLevel,
        exam_details: { year: examYear, season: examSeason, module },
        started_at: new Date().toISOString()
      });
      setSessionId(session.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handleSubmitExam = async () => {
    try {
      setIsSubmitting(true);
      toast.loading('בודק את המבחן...', { id: 'submit' });

      const scoringPromises = questions.map(async (question) => {
        const userAnswer = answers[question.question_id] || '';
        
        if (!userAnswer.trim()) {
          return {
            question_id: question.question_id,
            score: 0,
            max_score: question.max_score,
            status: 'incorrect',
            feedback: 'לא ניתנה תשובה'
          };
        }

        try {
          const response = await base44.functions.invoke('scoreAnswer', {
            question_id: question.question_id,
            user_answer_text: userAnswer,
            subject_id: subjectId
          });

          if (response.data?.success) {
            return {
              question_id: question.question_id,
              ...response.data
            };
          }
        } catch (error) {
          console.error('Error scoring question:', question.question_id, error);
        }

        return {
          question_id: question.question_id,
          score: 0,
          max_score: question.max_score,
          status: 'incorrect',
          feedback: 'שגיאה בבדיקה'
        };
      });

      const allResults = await Promise.all(scoringPromises);

      const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
      const maxScore = allResults.reduce((sum, r) => sum + r.max_score, 0);
      const percentage = Math.round((totalScore / maxScore) * 100);

      setResults({
        questions: allResults,
        totalScore,
        maxScore,
        percentage
      });

      if (sessionId) {
        await base44.entities.PracticeSessionNew.update(sessionId, {
          completed_at: new Date().toISOString(),
          is_completed: true,
          total_score: totalScore,
          max_score: maxScore,
          percentage,
          duration_seconds: 5400 - timeRemaining
        });
      }

      setIsSubmitted(true);
      toast.success('✅ המבחן נבדק!', { id: 'submit' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה בבדיקת המבחן', { id: 'submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">טוען מבחן...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-b-3xl p-6 shadow-xl mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Exams"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="text-center text-white">
            <Award className="w-16 h-16 mx-auto mb-3" />
            <h1 className="text-3xl font-bold mb-2">תוצאות המבחן</h1>
            <div className="text-5xl font-black mb-2">{results.percentage}%</div>
            <p className="text-lg">{results.totalScore} / {results.maxScore} נקודות</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 space-y-4">
          {results.questions.map((result, idx) => {
            const question = questions.find(q => q.question_id === result.question_id);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-2xl p-4 ${
                  result.status === 'correct' ? 'bg-green-50 border-2 border-green-200' :
                  result.status === 'partial' ? 'bg-yellow-50 border-2 border-yellow-200' :
                  'bg-red-50 border-2 border-red-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">שאלה {idx + 1}</div>
                  <div className="text-xl font-black">{result.score}/{result.max_score}</div>
                </div>
                <div className="text-sm text-gray-700 mb-2">{question?.question_text.substring(0, 100)}...</div>
                <div className="text-sm">{result.feedback}</div>
              </motion.div>
            );
          })}

          <Button
            onClick={() => navigate(createPageUrl("Exams"))}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold"
          >
            חזרה למבחנים
          </Button>
        </div>
      </div>
    );
  }

  const totalMaxScore = questions.reduce((sum, q) => sum + q.max_score, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      {/* Header with Timer */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-3xl p-6 shadow-xl mb-6 sticky top-0 z-50">
        <div className="flex items-center justify-between text-white">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('האם לצאת מהמבחן?')) {
                navigate(createPageUrl("Exams"));
              }
            }}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="text-center">
            <h1 className="text-xl font-bold">{subjectId} - {unitLevel} יח׳</h1>
            <p className="text-sm opacity-90">{examYear} {examSeason}</p>
          </div>

          <div className={`text-center px-4 py-2 rounded-lg ${
            timeRemaining < 600 ? 'bg-red-500' : 'bg-white/20'
          }`}>
            <Clock className="w-5 h-5 mx-auto mb-1" />
            <div className="text-lg font-bold">{formatTime(timeRemaining)}</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Warning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <strong>שים לב:</strong> זהו מבחן בתנאי בגרות. ענה על כל השאלות בזמן המוקצב. לא ניתן לשנות תשובות אחרי ההגשה.
            </div>
          </div>
        </motion.div>

        {/* Questions */}
        {questions.map((question, idx) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-600">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">
                  {question.max_score} נקודות
                </div>
                <div className="text-lg leading-relaxed whitespace-pre-wrap mb-4">
                  {question.question_text}
                </div>
                {question.question_image_url && (
                  <img
                    src={question.question_image_url}
                    alt="question"
                    className="rounded-xl border-2 border-gray-200 max-w-full mb-4"
                  />
                )}

                <Textarea
                  value={answers[question.question_id] || ''}
                  onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                  placeholder="כתוב את התשובה שלך כאן..."
                  className="min-h-32"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-white border-t-4 border-blue-600 rounded-t-2xl shadow-2xl p-6">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-1">
              ענית על {Object.keys(answers).filter(k => answers[k].trim()).length} / {questions.length} שאלות
            </div>
            <div className="text-xs text-gray-500">
              סה"כ נקודות: {totalMaxScore}
            </div>
          </div>
          <Button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                בודק...
              </>
            ) : (
              <>
                <Send className="w-6 h-6 mr-2" />
                הגש מבחן
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}