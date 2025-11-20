
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Flag,
  AlertCircle, // Added AlertCircle import
  Lightbulb,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import LatexRenderer from "@/components/exams/LatexRenderer";
import InteractiveGraph from "@/components/exams/InteractiveGraph";

export default function ExamSessionNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState({});
  const [isLoading, setIsLoading] = useState(true); // Added
  const [loadError, setLoadError] = useState(null); // Added

  useEffect(() => {
    const loadExam = async () => {
      try {
        setIsLoading(true); // Set loading state
        setLoadError(null); // Clear any previous errors

        const params = new URLSearchParams(location.search);
        const examId = params.get('examId');

        if (!examId) {
          setLoadError('לא נמצא מזהה מבחן'); // Set error message
          setIsLoading(false); // Stop loading
          return;
        }

        // טעינת המבחן
        const examData = await base44.entities.ExamNew.filter({ exam_id: examId });
        if (!examData || examData.length === 0) {
          setLoadError('מבחן לא נמצא'); // Set error message
          setIsLoading(false); // Stop loading
          return;
        }

        const currentExam = examData[0];
        setExam(currentExam);
        setTimeLeft(currentExam.duration_sec);
        setStartTime(Date.now());

        // טעינת השאלות
        const examItems = await base44.entities.ExamItemNew.filter({ exam_id: examId });
        const sortedItems = examItems.sort((a, b) => a.order_index - b.order_index);

        // טעינת נתוני השאלות
        const questionPromises = sortedItems.map(item =>
          base44.entities.QuestionBank.filter({ question_id: item.question_id })
        );
        
        const questionResults = await Promise.all(questionPromises);
        const loadedQuestions = questionResults.map(result => result[0]).filter(Boolean);
        
        if (loadedQuestions.length === 0) { // Check if no questions were loaded
          setLoadError('לא נמצאו שאלות במבחן');
          setIsLoading(false);
          return;
        }

        setQuestions(loadedQuestions);

        // יצירת attempt
        const currentUser = await base44.auth.me();
        const attempt = await base44.entities.AttemptNew.create({
          attempt_id: `ATT-${Date.now()}`,
          exam_id: examId,
          user_id: currentUser.email,
          started_at: new Date().toISOString(),
          status: "in_progress",
          settings_snapshot: {
            duration_sec: currentExam.duration_sec,
            policy: currentExam.policy
          }
        });

        setAttemptId(attempt.id);
        setIsLoading(false); // Stop loading on success
      } catch (error) {
        console.error("Error loading exam:", error);
        setLoadError('שגיאה בטעינת המבחן: ' + error.message); // Set error message with details
        setIsLoading(false); // Stop loading on error
      }
    };

    loadExam();
  }, [location, navigate]);

  useEffect(() => {
    if (!exam || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, timeLeft]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (answer) => {
    setResponses({
      ...responses,
      [currentQuestion.question_id]: {
        user_input_raw: typeof answer === 'string' ? answer : JSON.stringify(answer),
        user_input_struct: answer,
        time_spent_sec: Math.floor((Date.now() - startTime) / 1000)
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('האם אתה בטוח שברצונך להגיש את המבחן?')) return;

    try {
      // חישוב ציון
      let totalPoints = 0;
      let earnedPoints = 0;

      const responseRecords = await Promise.all(
        Object.entries(responses).map(async ([questionId, response]) => {
          const questionItem = questions.find(item => item.question_id === questionId); // Renamed `question` to `questionItem`
          if (!questionItem) return null;

          const isCorrect = checkAnswer(questionItem, response.user_input_struct);
          const points = isCorrect ? questionItem.metadata.points : 0;

          earnedPoints += points;
          totalPoints += questionItem.metadata.points;

          return await base44.entities.ResponseNew.create({
            response_id: `RES-${Date.now()}-${questionId}`,
            attempt_id: attemptId,
            question_id: questionId,
            user_input_raw: response.user_input_raw,
            user_input_struct: response.user_input_struct,
            is_correct: isCorrect,
            time_spent_sec: response.time_spent_sec,
            hints_used: hintsUsed[questionId] || []
          });
        })
      );

      // עדכון attempt
      const scorePct = (earnedPoints / totalPoints) * 100;
      await base44.entities.AttemptNew.update(attemptId, {
        submitted_at: new Date().toISOString(),
        score_raw: earnedPoints,
        score_pct: scorePct,
        status: "submitted"
      });

      // יצירת דוח
      const report = await generateReport(attemptId, exam, questions, responses, scorePct);

      // ניווט לדוח
      navigate(createPageUrl("ExamReport") + `?reportId=${report.id}`);
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert('שגיאה בהגשת המבחן');
    }
  };

  const checkAnswer = (question, userAnswer) => {
    const spec = question.answer_spec;

    if (question.type === 'mcq') {
      if (Array.isArray(userAnswer)) {
        return JSON.stringify(userAnswer.sort()) === JSON.stringify(spec.correct.sort());
      }
      return spec.correct.includes(userAnswer);
    }

    if (question.type === 'numeric') {
      const numAnswer = parseFloat(userAnswer);
      const target = spec.target;
      const tolerance = spec.tolerance_abs || 0.01;
      return Math.abs(numAnswer - target) <= tolerance;
    }

    if (question.type === 'algebraic') {
      // פישוט - נורמליזציה בסיסית
      const normalize = (expr) => expr.replace(/\s/g, '').toLowerCase();
      return normalize(userAnswer) === normalize(spec.canonical);
    }

    return false;
  };

  const generateReport = async (attemptId, exam, questions, responses, scorePct) => {
    const user = await base44.auth.me();
    
    // ניתוח לפי נושאים
    const topicsBreakdown = {};
    questions.forEach(questionItem => {
      const topicId = questionItem.topic_id;
      if (!topicsBreakdown[topicId]) {
        topicsBreakdown[topicId] = { questions_count: 0, correct_count: 0, time_spent: 0 };
      }
      topicsBreakdown[topicId].questions_count++;
      
      const response = responses[questionItem.question_id];
      if (response && checkAnswer(questionItem, response.user_input_struct)) {
        topicsBreakdown[topicId].correct_count++;
      }
      if (response) {
        topicsBreakdown[topicId].time_spent += response.time_spent_sec;
      }
    });

    const topics = await base44.entities.TopicNew.list();
    const topicsArray = Object.entries(topicsBreakdown).map(([topicId, statsData]) => {
      const topicItem = topics.find(topicRecord => topicRecord.topic_id === topicId);
      return {
        topic: topicItem?.name_he || topicId,
        score: (statsData.correct_count / statsData.questions_count) * 100,
        ...statsData
      };
    });

    const strengths = topicsArray.filter(topicItem => topicItem.score >= 85);
    const weaknesses = topicsArray.filter(topicItem => topicItem.score < 70);

    return await base44.entities.ExamReport.create({
      attempt_id: attemptId,
      exam_id: exam.exam_id,
      subject: exam.subject_id,
      unit_level: 5,
      overall_score: scorePct,
      duration_minutes: Math.floor((Date.now() - startTime) / 60000),
      correct_answers: Object.values(responses).filter((responseItem, responseIndex) =>
        checkAnswer(questions[responseIndex], responseItem.user_input_struct)
      ).length,
      total_questions: questions.length,
      topics_breakdown: topicsArray,
      strengths,
      weaknesses,
      recommended_topics: weaknesses.map(weakTopic => weakTopic.topic),
      time_per_question_avg: (Date.now() - startTime) / 1000 / questions.length
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מבחן...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <Button
            onClick={() => navigate(createPageUrl("Exams"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            חזור למבחנים
          </Button>
        </div>
      </div>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Timer Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-white" />
            <div className="text-white">
              <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
              <div className="text-xs opacity-90">זמן נותר</div>
            </div>
          </div>

          <div className="text-white text-center">
            <div className="text-sm font-bold">{exam.title}</div>
            <div className="text-xs opacity-90">
              שאלה {currentQuestionIndex + 1} מתוך {questions.length}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="bg-green-500 hover:bg-green-600 text-white h-10"
          >
            <Send className="w-4 h-4 mr-2" />
            הגש
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Display */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-2xl p-8"
          >
            {/* Question Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {currentQuestionIndex + 1}
                </div>
                <div>
                  <div className="text-xs text-gray-500">שאלה {currentQuestionIndex + 1}</div>
                  <div className="text-sm font-semibold text-gray-700">
                    {currentQuestion.metadata?.points} נקודות
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMarked = new Set(markedForReview);
                    if (newMarked.has(currentQuestionIndex)) {
                      newMarked.delete(currentQuestionIndex);
                    } else {
                      newMarked.add(currentQuestionIndex);
                    }
                    setMarkedForReview(newMarked);
                  }}
                  className={markedForReview.has(currentQuestionIndex) ? 'bg-yellow-100 border-yellow-300' : ''}
                >
                  <Flag className="w-4 h-4" />
                </Button>

                {exam.policy?.hints_allowed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint(!showHint)}
                  >
                    <Lightbulb className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Question Body */}
            <div className="mb-6">
              <div className="text-lg text-gray-900 leading-relaxed mb-4">
                <LatexRenderer content={currentQuestion.latex_body} />
              </div>

              {currentQuestion.assets?.images && currentQuestion.assets.images.length > 0 && (
                <div className="mb-4">
                  {currentQuestion.assets.images.map((img, idx) => (
                    <img key={idx} src={img} alt="שאלה" className="max-w-full rounded-lg shadow-md" />
                  ))}
                </div>
              )}
            </div>

            {/* Answer Area */}
            <div className="space-y-4">
              {currentQuestion.type === 'mcq' && (
                <RadioGroup
                  value={responses[currentQuestion.question_id]?.user_input_struct}
                  onValueChange={(value) => handleAnswer(value)}
                >
                  <div className="space-y-3">
                    {currentQuestion.answer_spec?.options?.map((optionItem, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center space-x-2 space-x-reverse p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        <RadioGroupItem value={optionItem.id} id={optionItem.id} />
                        <Label htmlFor={optionItem.id} className="flex-1 cursor-pointer text-lg">
                          <LatexRenderer content={optionItem.latex} />
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {currentQuestion.type === 'numeric' && (
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    value={responses[currentQuestion.question_id]?.user_input_struct || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="הכנס תשובה מספרית..."
                    className="text-xl h-16 text-center"
                  />
                </div>
              )}

              {currentQuestion.type === 'algebraic' && (
                <div>
                  <Input
                    value={responses[currentQuestion.question_id]?.user_input_struct || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="הכנס ביטוי אלגברי..."
                    className="text-xl h-16 font-mono"
                  />
                </div>
              )}

              {currentQuestion.type === 'open' && (
                <div>
                  <Textarea
                    value={responses[currentQuestion.question_id]?.user_input_struct || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="כתוב את תשובתך..."
                    className="h-48 text-lg"
                  />
                </div>
              )}

              {currentQuestion.type === 'graph' && currentQuestion.graph_config && (
                <InteractiveGraph
                  onPointsChange={(points) => handleAnswer({ points })}
                  initialPoints={responses[currentQuestion.question_id]?.user_input_struct?.points || []}
                />
              )}
            </div>

            {/* Hint */}
            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <strong>רמז:</strong> השתמש בנוסחאות הבסיסיות שלמדת
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-gray-200">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="h-12"
              >
                <ChevronRight className="w-5 h-5 ml-2" />
                הקודם
              </Button>

              <div className="text-center">
                <div className="text-sm text-gray-600">
                  {Object.keys(responses).length} / {questions.length} נענו
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === questions.length - 1}
                className="bg-blue-600 hover:bg-blue-700 h-12"
              >
                הבא
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
