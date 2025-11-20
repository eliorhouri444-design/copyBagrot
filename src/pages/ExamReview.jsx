import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, 
  CheckCircle, 
  X, 
  AlertTriangle,
  TrendingUp,
  Loader2,
  FileText,
  Award,
  Target,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function ExamReviewPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [examAttemptId, setExamAttemptId] = useState(null);
  const [review, setReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState({});

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

    // קבלת examAttemptId מה-URL
    const urlParams = new URLSearchParams(window.location.search);
    const attemptId = urlParams.get('attemptId');
    
    if (attemptId) {
      setExamAttemptId(attemptId);
      loadReview(attemptId);
    } else {
      setIsLoading(false);
      alert("מזהה מבחן חסר");
      navigate(createPageUrl("Exams"));
    }
  }, [navigate]);

  const loadReview = async (attemptId) => {
    setIsLoading(true);
    try {
      // בדיקה אם כבר קיימת ביקורת
      const existingReviews = await base44.entities.DetailedExamReview.filter({
        exam_attempt_id: attemptId
      });

      if (existingReviews.length > 0) {
        setReview(existingReviews[0]);
      } else {
        // יצירת ביקורת חדשה
        const result = await base44.functions.invoke('reviewExamDetailed', {
          examAttemptId: attemptId
        });

        if (result.data?.success) {
          setReview(result.data.review);
        } else {
          throw new Error(result.data?.error || 'שגיאה ביצירת הביקורת');
        }
      }
    } catch (error) {
      console.error("Error loading review:", error);
      alert("❌ שגיאה בטעינת הביקורת: " + error.message);
      navigate(createPageUrl("Exams"));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestion = (questionNumber) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionNumber]: !prev[questionNumber]
    }));
  };

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-lime-600";
    if (percentage >= 50) return "text-yellow-600";
    if (percentage >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return "bg-green-50 border-green-200";
    if (percentage >= 70) return "bg-lime-50 border-lime-200";
    if (percentage >= 50) return "bg-yellow-50 border-yellow-200";
    if (percentage >= 30) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">מנתח את המבחן...</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">לא נמצאה ביקורת למבחן זה</p>
        </div>
      </div>
    );
  }

  const passedExam = review.total_score >= 56;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${passedExam ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-orange-500 to-red-500'} rounded-b-[2rem] p-6 shadow-xl mb-6`}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Exams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            {passedExam ? (
              <CheckCircle className="w-10 h-10 text-white" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-white" />
            )}
          </motion.div>

          <h1 className="text-3xl font-bold mb-2">{Math.round(review.total_score)}</h1>
          <p className="text-lg opacity-90">{review.subject} • {review.unit_level} יחידות</p>
          <p className="text-sm opacity-80 mt-1">
            {passedExam ? '🎉 עברת את המבחן!' : '💪 כמעט! תתרגל עוד קצת'}
          </p>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {/* Overall Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600" />
            סיכום ביצועים
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {review.question_reviews.filter(r => r.is_fully_correct).length}
              </div>
              <div className="text-sm text-gray-600">תשובות נכונות</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {review.question_reviews.filter(r => r.partial_credit).length}
              </div>
              <div className="text-sm text-gray-600">ציון חלקי</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {review.question_reviews.filter(r => !r.is_fully_correct && !r.partial_credit).length}
              </div>
              <div className="text-sm text-gray-600">תשובות שגויות</div>
            </div>
          </div>

          {/* Strengths */}
          {review.strengths?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                נקודות חוזק
              </h3>
              <ul className="space-y-1">
                {review.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {review.areas_for_improvement?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                תחומים לשיפור
              </h3>
              <ul className="space-y-1">
                {review.areas_for_improvement.map((area, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-orange-600">→</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Study Recommendations */}
          {review.study_recommendations?.length > 0 && (
            <div>
              <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                המלצות ללמידה
              </h3>
              <ul className="space-y-1">
                {review.study_recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600">💡</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Question Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            ביקורת מפורטת לכל שאלה
          </h2>

          <div className="space-y-3">
            {review.question_reviews.map((questionReview, idx) => {
              const isExpanded = expandedQuestions[questionReview.question_number];
              const percentage = (questionReview.points_earned / questionReview.max_points) * 100;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className={`border-2 rounded-xl overflow-hidden ${getScoreBg(questionReview.points_earned, questionReview.max_points)}`}
                >
                  <button
                    onClick={() => toggleQuestion(questionReview.question_number)}
                    className="w-full p-4 text-right hover:bg-white/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          questionReview.is_fully_correct ? 'bg-green-500' :
                          questionReview.partial_credit ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}>
                          {questionReview.is_fully_correct ? (
                            <CheckCircle className="w-6 h-6 text-white" />
                          ) : questionReview.partial_credit ? (
                            <AlertTriangle className="w-6 h-6 text-white" />
                          ) : (
                            <X className="w-6 h-6 text-white" />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-gray-900">
                            שאלה {questionReview.question_number}
                          </div>
                          <div className="text-sm text-gray-600">
                            {questionReview.points_earned.toFixed(1)} / {questionReview.max_points} נקודות
                            {questionReview.partial_credit && ' (ציון חלקי)'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${getScoreColor(questionReview.points_earned, questionReview.max_points)}`}>
                          {percentage.toFixed(0)}%
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t-2"
                      >
                        <div className="p-4 bg-white space-y-4">
                          {/* User's Answer */}
                          <div>
                            <div className="font-semibold text-gray-900 mb-2">התשובה שלך:</div>
                            <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-800">
                              {questionReview.user_answer}
                            </div>
                            {questionReview.user_drawing_url && (
                              <div className="mt-2">
                                <img 
                                  src={questionReview.user_drawing_url} 
                                  alt="ציור" 
                                  className="max-w-full rounded-lg border-2 border-blue-200"
                                />
                              </div>
                            )}
                          </div>

                          {/* Correct Answer */}
                          <div>
                            <div className="font-semibold text-green-700 mb-2">התשובה הנכונה:</div>
                            <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-800">
                              {questionReview.correct_answer}
                            </div>
                          </div>

                          {/* Step-by-Step Review (Math/Physics) */}
                          {questionReview.step_by_step_review?.length > 0 && (
                            <div>
                              <div className="font-semibold text-purple-700 mb-2">ביקורת שלב אחר שלב:</div>
                              <div className="space-y-2">
                                {questionReview.step_by_step_review.map((step, stepIdx) => (
                                  <div
                                    key={stepIdx}
                                    className={`rounded-lg p-3 border-2 ${
                                      step.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      {step.is_correct ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <X className="w-4 h-4 text-red-600" />
                                      )}
                                      <span className="font-bold text-gray-900">
                                        שלב {step.step_number}: {step.step_description}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-700 mb-1">
                                      {step.feedback}
                                    </div>
                                    {!step.is_correct && step.correct_approach && (
                                      <div className="text-sm text-green-700 bg-green-100 rounded p-2 mt-2">
                                        <strong>הדרך הנכונה:</strong> {step.correct_approach}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-600 mt-1">
                                      נקודות: {step.points_earned.toFixed(1)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Language Errors (English/Hebrew) */}
                          {questionReview.language_errors?.length > 0 && (
                            <div>
                              <div className="font-semibold text-orange-700 mb-2">שגיאות לשוניות:</div>
                              <div className="space-y-2">
                                {questionReview.language_errors.map((error, errIdx) => (
                                  <div key={errIdx} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-sm text-gray-900">
                                        {error.error_type === 'spelling' ? '🔤 שגיאת כתיב' :
                                         error.error_type === 'grammar' ? '📝 שגיאת דקדוק' :
                                         error.error_type === 'punctuation' ? '⚡ פיסוק' :
                                         '✍️ מבנה'}
                                      </span>
                                      <span className="text-xs text-red-600 font-bold">
                                        -{error.points_deducted} נק׳
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                      <span className="line-through text-red-600">{error.error_text}</span>
                                      <span className="mx-2">→</span>
                                      <span className="text-green-600 font-semibold">{error.correction}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Overall Feedback */}
                          {questionReview.overall_feedback && (
                            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                              <div className="font-semibold text-blue-900 mb-2">💬 משוב כללי:</div>
                              <div className="text-sm text-gray-800 leading-relaxed">
                                {questionReview.overall_feedback}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Study Recommendations */}
        {review.study_recommendations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              המלצות ללמידה
            </h2>

            <div className="space-y-2">
              {review.study_recommendations.map((rec, idx) => (
                <div key={idx} className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-sm">
                  {rec}
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full mt-4 bg-white text-blue-600 hover:bg-gray-100 h-12 font-bold"
            >
              התחל תרגול ממוקד
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}