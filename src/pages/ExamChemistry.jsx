import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, Award, CheckCircle, X, AlertCircle, Loader2, ChevronRight, ChevronLeft, BookOpen, AlertTriangle, FileText, Beaker, Lightbulb, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import AdManager from "../components/ads/AdManager";

export default function ExamChemistryPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [showSolutionDialog, setShowSolutionDialog] = useState(false);
  const [currentSolution, setCurrentSolution] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  const mode = urlParams.get('mode');

  const [exam, setExam] = useState(null);
  const [examLoading, setExamLoading] = useState(true);
  const [examError, setExamError] = useState(null);

  useEffect(() => {
    const loadExam = async () => {
      if (!examId) {
        setExamError("No exam ID provided");
        setExamLoading(false);
        return;
      }

      try {
        const examData = await base44.entities.GenericExam.get(examId);
        setExam(examData);
        setExamLoading(false);
      } catch (error) {
        console.error("Error loading exam:", error);
        setExamError(error.message);
        setExamLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        
        if (mode === 'edit' && u?.role === 'admin') {
          setIsEditMode(true);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [mode]);

  useEffect(() => {
    if (!exam || !examId) return;

    const loadProgress = async () => {
      try {
        const progress = await base44.entities.ExamProgress.filter({
          exam_id: examId,
          completed: false
        });

        if (progress.length > 0) {
          setSavedProgress(progress[0]);
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };

    loadProgress();
  }, [exam, examId]);

  useEffect(() => {
    if (exam && examStarted && !examFinished) {
      setTimeLeft(exam.duration_minutes * 60);
    }
  }, [exam, examStarted]);

  useEffect(() => {
    if (examStarted && !examFinished && timeLeft > 0) {
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
    }
  }, [examStarted, examFinished, timeLeft]);

  useEffect(() => {
    if (!examStarted || examFinished) return;

    const autoSave = setInterval(() => {
      saveProgress();
    }, 30000);

    const handleBeforeUnload = (e) => {
      saveProgress();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(autoSave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examStarted, examFinished, userAnswers, currentQuestion, timeLeft]);

  const saveProgress = async () => {
    if (!exam || examFinished || isSubmitting) return;

    try {
      const progressData = {
        exam_id: exam.id,
        exam_type: 'chemistry',
        subject: exam.subject,
        unit_level: exam.unit_level,
        current_question: currentQuestion,
        user_answers: userAnswers,
        time_left: timeLeft,
        completed: false
      };

      if (savedProgress?.id) {
        await base44.entities.ExamProgress.update(savedProgress.id, progressData);
      } else {
        const newProgress = await base44.entities.ExamProgress.create(progressData);
        setSavedProgress(newProgress);
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleResumeProgress = () => {
    if (savedProgress) {
      setUserAnswers(savedProgress.user_answers || {});
      setCurrentQuestion(savedProgress.current_question || 0);
      setTimeLeft(savedProgress.time_left || (exam.duration_minutes * 60));
      setExamStarted(true);
      setSavedProgress(null);
    }
  };

  const handleStartFresh = async () => {
    if (savedProgress?.id) {
      await base44.entities.ExamProgress.delete(savedProgress.id);
    }
    setSavedProgress(null);
    setExamStarted(true);
  };

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleExitExam = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    await saveProgress();
    navigate(createPageUrl("Exams"));
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionNumber]: answer
    }));
  };

  const handleViewSolution = async (questionNumber) => {
    try {
      const question = exam.questions?.find(q => q.question_number === questionNumber);
      if (!question) return;

      // Try to get solution from SolutionBank
      const solutions = await base44.entities.SolutionBank.filter({
        question_id: question.question_id || `${exam.id}_q${questionNumber}`
      });

      let solutionData = null;
      if (solutions.length > 0) {
        solutionData = solutions[0];
      } else if (question.solution_steps || question.explanation) {
        // Use question's built-in solution
        solutionData = {
          solution_text: question.explanation || '',
          solution_steps: question.solution_steps || [],
          final_answers: [{ value: question.correct_answer }]
        };
      }

      setCurrentSolution({
        question: question.question_text,
        questionNumber,
        ...solutionData
      });
      setShowSolutionDialog(true);
    } catch (error) {
      console.error("Error loading solution:", error);
      alert("לא נמצא פתרון לשאלה זו");
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let totalScore = 0;
      let earnedScore = 0;
      const results = [];

      // Grade chemistry answers with AI assistance
      const gradeChemistryAnswer = async (userAnswer, correctAnswer, questionText) => {
        try {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `אתה בודק כימיה מומחה לבגרות ישראלית.

שאלה: ${questionText}
תשובה נכונה: ${correctAnswer}
תשובת תלמיד: ${userAnswer}

בדוק את התשובה לפי קריטריונים של בגרות בכימיה:
- דיוק מדעי (נוסחאות, מונחים, מושגים)
- שלבי חישוב (אם רלוונטי)
- יחידות מידה נכונות
- הסבר הגיוני

תן ציון 0-100 והסבר בעברית.`,
            response_json_schema: {
              type: "object",
              properties: {
                is_correct: { type: "boolean" },
                score_percent: { type: "number", description: "0-100" },
                explanation_hebrew: { type: "string" },
                key_points_correct: { type: "array", items: { type: "string" } },
                key_points_missing: { type: "array", items: { type: "string" } },
                calculation_errors: { type: "array", items: { type: "string" } }
              }
            }
          });

          return response;
        } catch (error) {
          console.error("Error grading with AI:", error);
          const isMatch = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
          return {
            is_correct: isMatch,
            score_percent: isMatch ? 100 : 0,
            explanation_hebrew: isMatch ? "תשובה נכונה" : "תשובה שגויה"
          };
        }
      };

      for (const questionItem of (exam.questions || [])) {
        const userAnswer = userAnswers[questionItem.question_number];
        let isCorrect = false;
        let pointsAwarded = 0;
        let aiResult = null;

        totalScore += questionItem.points;

        if (userAnswer && userAnswer.trim()) {
          if (questionItem.question_type === 'multiple_choice') {
            isCorrect = userAnswer.trim().toLowerCase() === questionItem.correct_answer.trim().toLowerCase();
            pointsAwarded = isCorrect ? questionItem.points : 0;
          } else {
            aiResult = await gradeChemistryAnswer(userAnswer, questionItem.correct_answer, questionItem.question_text);
            isCorrect = aiResult.is_correct;
            pointsAwarded = (questionItem.points * (aiResult.score_percent || 0)) / 100;
          }
          
          earnedScore += pointsAwarded;
        }

        results.push({
          question_number: questionItem.question_number,
          user_answer: userAnswer || '',
          correct_answer: questionItem.correct_answer,
          is_correct: isCorrect,
          points_awarded: Math.round(pointsAwarded),
          explanation: aiResult?.explanation_hebrew || questionItem.explanation || '',
          ai_details: aiResult
        });
      }

      const scorePercent = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;

      await base44.entities.ExamAttempt.create({
        exam_id: examId,
        subject: exam.subject,
        unit_level: exam.unit_level,
        module_id: exam.module_id,
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        answers: results,
        score_percent: scorePercent,
        passed: scorePercent >= (exam.passing_grade || 56),
        total_points: totalScore,
        earned_points: Math.round(earnedScore),
        exam_type: 'generic'
      });

      if (savedProgress?.id) {
        await base44.entities.ExamProgress.delete(savedProgress.id);
      }

      setScore({
        total: totalScore,
        earned: Math.round(earnedScore),
        percent: Math.round(scorePercent),
        results: results
      });

      setExamFinished(true);
    } catch (error) {
      console.error("Error submitting exam:", error);
      alert("שגיאה בשמירת המבחן");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!examId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">לא נמצא מזהה מבחן</h1>
          <p className="text-gray-600 mb-6">אנא בחר מבחן מרשימת המבחנים</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))}>
            חזרה למבחנים
          </Button>
        </div>
      </div>
    );
  }

  if (examLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מבחן כימיה...</p>
        </div>
      </div>
    );
  }

  if (examError || !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">מבחן לא נמצא</h1>
          <p className="text-gray-600 mb-6">
            {examError || 'המבחן שחיפשת לא קיים במערכת'}
          </p>
          <Button onClick={() => navigate(createPageUrl("Exams"))}>
            חזרה למבחנים
          </Button>
        </div>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 pb-24">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("AdminExamEditor"))}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <FlaskConical className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white">מצב עריכה - כימיה</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{exam.title}</h1>
          <p className="text-white/90 text-sm">{exam.subject} - {exam.unit_level} יחידות</p>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-6">
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">מצב תצוגה ועריכה</h3>
                <p className="text-amber-800">
                  לעריכת המבחן, השאלות והפתרונות - עבור לעמוד ניהול המבחנים
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Beaker className="w-6 h-6 text-orange-600" />
              פרטי המבחן
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">כותרת</div>
                <div className="font-bold">{exam.title}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">מקצוע</div>
                <div className="font-bold">{exam.subject}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">יחידות</div>
                <div className="font-bold">{exam.unit_level}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">משך</div>
                <div className="font-bold">{exam.duration_minutes} דקות</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">סה"כ נקודות</div>
                <div className="font-bold">{exam.total_points}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">ציון עובר</div>
                <div className="font-bold">{exam.passing_grade}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">מספר שאלות</div>
                <div className="font-bold">{exam.questions?.length || 0}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-gray-600">פרק</div>
                <div className="font-bold">{exam.module_id?.includes('_B') ? 'פרק ב\' - בחירה' : exam.module_id === 'lab' ? 'מעבדה' : 'פרק א\' - חובה'}</div>
              </div>
            </div>
          </div>

          {exam.instructions && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">הוראות:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{exam.instructions}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">שאלות ({exam.questions?.length || 0})</h3>
            
            <div className="space-y-4">
              {exam.questions?.map((questionItem, questionIndex) => (
                <div key={questionIndex} className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-orange-900 text-lg">שאלה {questionItem.question_number || questionIndex + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-semibold">{questionItem.question_type}</span>
                      <span className="text-sm bg-orange-600 text-white px-3 py-1 rounded font-bold">{questionItem.points} נק'</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 mb-3">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{questionItem.question_text}</p>
                  </div>

                  {questionItem.question_image_url && (
                    <div className="bg-blue-50 rounded p-3 mb-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">תמונה:</div>
                      <a 
                        href={questionItem.question_image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs break-all"
                      >
                        {questionItem.question_image_url}
                      </a>
                    </div>
                  )}

                  {questionItem.options && questionItem.options.length > 0 && (
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">אפשרויות:</div>
                      <div className="space-y-1">
                        {questionItem.options.map((optionValue, optionIndex) => (
                          <div key={optionIndex} className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2">
                            {optionIndex + 1}. {optionValue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-green-50 rounded-lg p-3 mb-3">
                    <span className="text-xs font-semibold text-green-700">תשובה נכונה: </span>
                    <span className="text-sm text-green-600 font-medium">{questionItem.correct_answer}</span>
                  </div>

                  {questionItem.explanation && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">הסבר:</div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{questionItem.explanation}</p>
                    </div>
                  )}

                  {questionItem.solution_steps && questionItem.solution_steps.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3 mt-3">
                      <div className="text-xs font-semibold text-purple-700 mb-2">שלבי פתרון:</div>
                      <div className="space-y-1">
                        {questionItem.solution_steps.map((step, idx) => (
                          <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-purple-600 font-bold">{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionItem.topic && (
                    <div className="mt-3">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">נושא: {questionItem.topic}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (savedProgress && !examStarted) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">מבחן בתהליך</DialogTitle>
            <DialogDescription>נמצא מבחן שלא הושלם. האם להמשיך?</DialogDescription>
          </DialogHeader>

          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong>שאלה:</strong> {savedProgress.current_question + 1} מתוך {exam.questions?.length || 0}
            </p>
            <p className="text-sm text-gray-700">
              <strong>זמן נותר:</strong> {Math.floor(savedProgress.time_left / 60)} דקות
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handleResumeProgress} className="w-full bg-orange-600">
              המשך מאיפה שעצרתי
            </Button>
            <Button onClick={handleStartFresh} variant="outline" className="w-full">
              התחל מחדש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Exams"))} className="mb-4">
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
                <FlaskConical className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-gray-600">{exam.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{exam.duration_minutes}</div>
                <div className="text-sm text-gray-600">דקות</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{exam.total_points}</div>
                <div className="text-sm text-gray-600">נקודות</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{exam.questions?.length || 0}</div>
                <div className="text-sm text-gray-600">שאלות</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-5 mb-6">
              <div className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
                <Beaker className="w-5 h-5 text-orange-600" />
                מבנה המבחן
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="font-semibold text-gray-900 mb-1">🧪 סוג המבחן</div>
                  <p>{exam.description || `מבחן ${exam.subject} - ${exam.unit_level} יחידות`}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="font-semibold text-gray-900 mb-1">⏱️ משך זמן</div>
                  <p>{exam.duration_minutes} דקות מתוזמנות</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="font-semibold text-gray-900 mb-1">📊 מבנה הניקוד</div>
                  <p>סה"כ {exam.questions?.length || 0} שאלות • {exam.total_points} נקודות • ציון עובר: {exam.passing_grade}</p>
                </div>

                {exam.instructions && (
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <div className="font-semibold text-gray-900 mb-1">ℹ️ הוראות מיוחדות</div>
                    <p className="whitespace-pre-wrap">{exam.instructions}</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleStartExam}
              className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 text-white text-lg font-bold"
            >
              התחל מבחן
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (examFinished && score) {
    const passed = score.percent >= (exam.passing_grade || 56);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-2xl shadow-xl p-8 mb-6 ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}>
            <div className="text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                {passed ? (
                  <CheckCircle className="w-20 h-20 mx-auto mb-4" />
                ) : (
                  <X className="w-20 h-20 mx-auto mb-4" />
                )}
              </motion.div>
              <h1 className="text-4xl font-bold mb-2">{Math.round(score.percent)}</h1>
              <p className="text-xl">{passed ? 'עברת את המבחן!' : 'לא עברת את המבחן'}</p>
              <p className="text-sm opacity-90 mt-2">{score.earned} / {score.total} נקודות</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-orange-600" />
              סקירת תשובות
            </h2>
            
            <div className="space-y-4">
              {score.results.map((resultItem, resultIndex) => {
                const question = exam.questions?.[resultIndex];
                
                return (
                  <div
                    key={resultIndex}
                    className={`p-4 rounded-xl border-2 ${resultItem.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-gray-900">שאלה {resultItem.question_number}</div>
                      <div className={`text-sm font-bold ${resultItem.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                        {resultItem.points_awarded} / {question?.points || 0} נק'
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      <strong>תשובתך:</strong> {resultItem.user_answer || 'לא נענה'}
                    </div>

                    {!resultItem.is_correct && (
                      <div className="text-sm text-green-700 mb-2">
                        <strong>תשובה נכונה:</strong> {resultItem.correct_answer}
                      </div>
                    )}

                    {resultItem.explanation && (
                      <div className="bg-white p-3 rounded-lg text-sm text-gray-700 mt-2">
                        <strong className="text-orange-600">הסבר:</strong> {resultItem.explanation}
                      </div>
                    )}

                    {resultItem.ai_details?.key_points_correct?.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-3 mt-2">
                        <div className="text-xs font-bold text-green-900 mb-1">✓ נקודות נכונות:</div>
                        <ul className="text-xs text-green-700 list-disc list-inside">
                          {resultItem.ai_details.key_points_correct.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resultItem.ai_details?.key_points_missing?.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-3 mt-2">
                        <div className="text-xs font-bold text-orange-900 mb-1">⚠️ נקודות חסרות:</div>
                        <ul className="text-xs text-orange-700 list-disc list-inside">
                          {resultItem.ai_details.key_points_missing.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resultItem.ai_details?.calculation_errors?.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-3 mt-2">
                        <div className="text-xs font-bold text-red-900 mb-1">✗ שגיאות חישוב:</div>
                        <ul className="text-xs text-red-700 list-disc list-inside">
                          {resultItem.ai_details.calculation_errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={() => handleViewSolution(resultItem.question_number)}
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      צפה בפתרון המלא
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Exams"))}
                variant="outline"
                className="flex-1"
              >
                חזרה למבחנים
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                נסה שוב
              </Button>
            </div>
          </div>
        </div>

        {/* Solution Dialog */}
        <Dialog open={showSolutionDialog} onOpenChange={setShowSolutionDialog}>
          <DialogContent dir="rtl" className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-orange-600" />
                פתרון מפורט - שאלה {currentSolution?.questionNumber}
              </DialogTitle>
            </DialogHeader>

            {currentSolution && (
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-sm font-bold text-gray-900 mb-2">השאלה:</div>
                  <p className="text-gray-700 whitespace-pre-wrap">{currentSolution.question}</p>
                </div>

                {currentSolution.solution_text && (
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <div className="text-sm font-bold text-blue-900 mb-2">📝 הסבר מלא:</div>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{currentSolution.solution_text}</p>
                  </div>
                )}

                {currentSolution.solution_steps && currentSolution.solution_steps.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                    <div className="text-sm font-bold text-purple-900 mb-3">🔬 שלבי הפתרון:</div>
                    <div className="space-y-3">
                      {currentSolution.solution_steps.map((step, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                              {step.step || idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-800 mb-1">{step.description || step}</p>
                              {step.key_formula && (
                                <div className="text-xs bg-blue-50 text-blue-800 rounded px-2 py-1 mt-1 font-mono">
                                  {step.key_formula}
                                </div>
                              )}
                              {step.key_result && (
                                <div className="text-xs text-green-700 mt-1">
                                  ✓ {step.key_result}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentSolution.final_answers && currentSolution.final_answers.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="text-sm font-bold text-green-900 mb-2">✓ תשובה סופית:</div>
                    {currentSolution.final_answers.map((answer, idx) => (
                      <div key={idx} className="text-gray-800">
                        <span className="font-bold">{answer.value || answer}</span>
                        {answer.unit && <span className="text-gray-600 mr-1">{answer.unit}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowSolutionDialog(false)} className="w-full bg-orange-600">
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!exam.questions || exam.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">לא נמצאו שאלות</h2>
          <p className="text-gray-600 mb-4">אין שאלות במבחן זה</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))} className="bg-orange-600">
            חזור למבחנים
          </Button>
        </div>
      </div>
    );
  }

  const question = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              יציאה מהמבחן
            </DialogTitle>
            <DialogDescription>האם אתה בטוח שברצונך לצאת?</DialogDescription>
          </DialogHeader>

          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong>💾 שמירה אוטומטית:</strong> התשובות והזמן יישמרו ותוכל להמשיך מאוחר יותר
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={() => setShowExitDialog(false)} variant="outline" className="w-full">
              המשך במבחן
            </Button>
            <Button onClick={handleConfirmExit} className="w-full bg-red-600 hover:bg-red-700">
              צא ושמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-b-[2rem] p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={handleExitExam} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <Clock className="w-5 h-5 text-white" />
            <span className={`text-xl font-bold text-white ${timeLeft < 300 ? 'animate-pulse text-red-300' : ''}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-2 flex items-center justify-center gap-2">
          <FlaskConical className="w-6 h-6" />
          {exam.title}
        </h1>
        <Progress value={progress} className="h-2 bg-white/20" />
        <div className="flex justify-between text-white text-xs mt-2">
          <span>שאלה {currentQuestion + 1} מתוך {exam.questions?.length || 0}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                שאלה {question.question_number}
              </h2>
              <div className="bg-orange-100 px-3 py-1 rounded-full text-sm font-bold text-orange-600">
                {question.points} נק'
              </div>
            </div>

            <p className="text-gray-700 text-lg mb-6 whitespace-pre-wrap" dir="rtl">
              {question.question_text}
            </p>

            {question.question_image_url && (
              <img src={question.question_image_url} alt="שאלה" className="max-w-full rounded-lg mb-6" />
            )}

            {question.question_type === 'multiple_choice' && question.options && (
              <div className="space-y-3">
                {question.options.map((optionValue, optionIndex) => (
                  <motion.button
                    key={optionIndex}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswerChange(question.question_number, optionValue)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                      userAnswers[question.question_number] === optionValue
                        ? 'bg-orange-100 border-orange-500'
                        : 'bg-white border-gray-200 hover:border-orange-300'
                    }`}
                    dir="rtl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        userAnswers[question.question_number] === optionValue
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                      }`}>
                        {userAnswers[question.question_number] === optionValue && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-base">{optionValue}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {question.question_type === 'short_answer' && (
              <Input
                value={userAnswers[question.question_number] || ''}
                onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                placeholder="הקלד תשובה..."
                className="w-full h-12 text-lg"
                dir="rtl"
              />
            )}

            {(question.question_type === 'open_question' || question.question_type === 'calculation' || question.question_type === 'proof') && (
              <Textarea
                value={userAnswers[question.question_number] || ''}
                onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                placeholder="כתוב תשובה מלאה עם שלבי פתרון..."
                className="w-full h-40 text-lg"
                dir="rtl"
              />
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                variant="outline"
                className="flex-1 h-12"
              >
                <ChevronRight className="w-5 h-5 ml-2" />
                הקודם
              </Button>

              {currentQuestion === exam.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  {isSubmitting ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />שומר...</> : 'סיים מבחן'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(exam.questions.length - 1, prev + 1))}
                  className="flex-1 h-12 bg-orange-600"
                >
                  הבא
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}