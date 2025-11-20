
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Check, Loader2, BookOpen, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import QuestionViewer from "../components/questionbank/QuestionViewer";
import AnswerFeedback from "../components/questionbank/AnswerFeedback";

export default function TopicPracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const topicId = searchParams.get('topic');
  const subjectId = searchParams.get('subject');
  const unitLevel = parseInt(searchParams.get('units') || '0');

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    answered: 0,
    correct: 0,
    totalScore: 0,
    maxScore: 0
  });
  const [showSolution, setShowSolution] = useState(false);
  const [currentSolution, setCurrentSolution] = useState(null);

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
    if (user && topicId) {
      loadQuestions();
      createSession();
    }
  }, [user, topicId]);

  const loadQuestions = async () => {
    try {
      toast.loading('טוען שאלות...', { id: 'load' });
      
      const filter = {
        subject_id: subjectId,
        unit_level: unitLevel,
        is_active: true
      };

      // אם יש topic ספציפי
      if (topicId && topicId !== 'random') {
        filter.topic_id = topicId;
      }

      const allQuestions = await base44.entities.QuestionBank.filter(filter);

      if (allQuestions.length === 0) {
        toast.error('לא נמצאו שאלות', { id: 'load' });
        return;
      }

      // ערבוב אקראי
      const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
      setQuestions(shuffled);
      
      setSessionStats(prev => ({
        ...prev,
        total: shuffled.length,
        maxScore: shuffled.reduce((sum, q) => sum + q.max_score, 0)
      }));

      toast.success(`${shuffled.length} שאלות נטענו!`, { id: 'load' });
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('שגיאה בטעינת שאלות', { id: 'load' });
    }
  };

  const createSession = async () => {
    try {
      const session = await base44.entities.PracticeSessionNew.create({
        session_id: `session_${Date.now()}`,
        session_type: 'topic_practice',
        subject_id: subjectId,
        unit_level: unitLevel,
        topic_id: topicId,
        started_at: new Date().toISOString()
      });
      setSessionId(session.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      toast.error('נא לכתוב תשובה');
      return;
    }

    const currentQuestion = questions[currentIndex];

    try {
      setIsSubmitting(true);
      toast.loading('בודק תשובה...', { id: 'check' });

      const response = await base44.functions.invoke('scoreAnswer', {
        question_id: currentQuestion.question_id,
        user_answer_text: userAnswer,
        subject_id: subjectId
      });

      if (response.data?.success) {
        const scoreData = response.data;
        setResult(scoreData);

        setSessionStats(prev => ({
          ...prev,
          answered: prev.answered + 1,
          correct: scoreData.status === 'correct' ? prev.correct + 1 : prev.correct,
          totalScore: prev.totalScore + scoreData.score
        }));

        // טעינת הפתרון
        const solutions = await base44.entities.SolutionBank.filter({ 
          question_id: currentQuestion.question_id 
        });
        if (solutions.length > 0) {
          setCurrentSolution(solutions[0]);
        }

        toast.success(`ציון: ${scoreData.score}/${scoreData.max_score}`, { id: 'check' });
      } else {
        toast.error('שגיאה בבדיקה', { id: 'check' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה: ' + error.message, { id: 'check' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setResult(null);
      setShowSolution(false);
      setCurrentSolution(null);
    } else {
      // סיום סשן
      finishSession();
    }
  };

  const finishSession = async () => {
    try {
      if (sessionId) {
        await base44.entities.PracticeSessionNew.update(sessionId, {
          completed_at: new Date().toISOString(),
          is_completed: true,
          total_score: sessionStats.totalScore,
          max_score: sessionStats.maxScore,
          percentage: Math.round((sessionStats.totalScore / sessionStats.maxScore) * 100)
        });
      }

      toast.success('🎉 סיימת את התרגול!');
      setTimeout(() => {
        navigate(createPageUrl("Practice"));
      }, 2000);
    } catch (error) {
      console.error('Error finishing session:', error);
    }
  };

  if (!user || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-3xl p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Practice"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">תרגול לפי נושא</h1>
          <p className="text-sm opacity-90">שאלה {currentIndex + 1} מתוך {questions.length}</p>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-white"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-md">
            <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-bold">{sessionStats.answered}/{sessionStats.total}</div>
            <div className="text-xs text-gray-600">נענו</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-md">
            <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-bold">{sessionStats.correct}</div>
            <div className="text-xs text-gray-600">נכונות</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-md">
            <Award className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-lg font-bold">{sessionStats.totalScore}/{sessionStats.maxScore}</div>
            <div className="text-xs text-gray-600">ציון</div>
          </div>
        </div>

        {/* Question - Use new component */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <QuestionViewer 
              question={currentQuestion} 
              solution={showSolution ? currentSolution : null}
              showSolution={showSolution}
            />

            {!result && (
              <>
                <Textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="כתוב את התשובה שלך כאן..."
                  className="min-h-32 mb-4 mt-4"
                  disabled={isSubmitting}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !userAnswer.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white h-12 font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      בודק...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      בדוק תשובה
                    </>
                  )}
                </Button>
              </>
            )}

            {result && (
              <AnswerFeedback
                result={result}
                onNext={handleNext}
                onShowSolution={() => setShowSolution(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
