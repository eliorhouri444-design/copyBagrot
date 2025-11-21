import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, Award, CheckCircle, X, AlertCircle, Loader2, ChevronRight, ChevronLeft, BookOpen, AlertTriangle, Zap, FileText } from "lucide-react";
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

export default function ExamGenericPage() {
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
  
  const [displayMode, setDisplayMode] = useState('carousel');
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  const mode = urlParams.get('mode');

  const { data: exam, isLoading: examLoading, error: examError } = useQuery({
    queryKey: ['generic-exam', examId],
    queryFn: async () => {
      if (!examId) throw new Error('No exam ID provided');
      return await base44.entities.GenericExam.get(examId);
    },
    enabled: !!examId,
    retry: false
  });

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
  }, [examStarted, examFinished, userAnswers, currentQuestion, timeLeft, displayMode]);

  const saveProgress = async () => {
    if (!exam || examFinished || isSubmitting) return;

    try {
      const progressData = {
        exam_id: exam.id,
        exam_type: 'generic',
        subject: exam.subject,
        unit_level: exam.unit_level,
        current_question: currentQuestion,
        user_answers: userAnswers,
        time_left: timeLeft,
        display_mode: displayMode,
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
      // קריטי: לשמור את המצב המדויק שהמשתמש בחר
      const savedMode = savedProgress.display_mode;
      if (savedMode) {
        setDisplayMode(savedMode);
      }
      setExamStarted(true);
      setSavedProgress(null);
    }
  };

  const handleStartFresh = async () => {
    if (savedProgress?.id) {
      await base44.entities.ExamProgress.delete(savedProgress.id);
    }
    setSavedProgress(null);
    setShowModeDialog(true);
  };

  const handleStartExam = (mode) => {
    setDisplayMode(mode);
    setShowModeDialog(false);
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

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let totalScore = 0;
      let earnedScore = 0;
      const results = [];
      const unitLevel = exam.unit_level || 0;

      const checkAnswerWithAI = async (userAnswer, correctAnswer, questionText) => {
        try {
          let explanationLanguageInstruction = '';
          if (exam.subject === 'אנגלית') {
            if (unitLevel === 3) {
              explanationLanguageInstruction = 'Write ALL explanations ONLY in Hebrew (explanation_hebrew)';
            } else if (unitLevel === 4) {
              explanationLanguageInstruction = 'Write explanations in BOTH Hebrew (explanation_hebrew) and English (explanation_english)';
            } else if (unitLevel === 5) {
              explanationLanguageInstruction = 'Write ALL explanations ONLY in English (explanation)';
            }
          }

          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Grade this answer for ${exam.subject} ${unitLevel} units exam.
            ${explanationLanguageInstruction}
            
            Question: ${questionText}
            Correct: ${correctAnswer}
            Student: ${userAnswer}
            
            If content correct but has spelling errors, set has_spelling_error=true and deduct up to 20%.
            JSON response:`,
            response_json_schema: {
              type: "object",
              properties: {
                is_correct: { type: "boolean" },
                has_spelling_error: { type: "boolean" },
                similarity_score: { type: "number" },
                points_deduction_percent: { type: "number" },
                explanation: { type: "string" },
                explanation_hebrew: { type: "string" },
                explanation_english: { type: "string" }
              },
              required: ["is_correct", "similarity_score"]
            }
          });

          return response;
        } catch (error) {
          console.error("Error invoking LLM for answer check:", error);
          const isMatch = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
          return {
            is_correct: isMatch,
            has_spelling_error: false,
            similarity_score: isMatch ? 100 : 0,
            points_deduction_percent: 0,
            explanation_hebrew: isMatch ? "נכון" : "שגוי"
          };
        }
      };

      for (const questionItem of exam.questions) {
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
            aiResult = await checkAnswerWithAI(userAnswer, questionItem.correct_answer, questionItem.question_text);
            isCorrect = aiResult.is_correct;
            
            if (isCorrect) {
              pointsAwarded = questionItem.points;
              if (aiResult.has_spelling_error) {
                const deductionPercent = Math.min(aiResult.points_deduction_percent || 20, 20);
                pointsAwarded = questionItem.points * (1 - deductionPercent / 100);
              }
            }
          }
          
          earnedScore += pointsAwarded;
        }

        let displayExplanation = questionItem.explanation || '';
        if (aiResult && exam.subject === 'אנגלית') {
          if (unitLevel === 3) {
            displayExplanation = aiResult.explanation_hebrew || '';
          } else if (unitLevel === 4) {
            displayExplanation = (aiResult.explanation_hebrew || '') + '\n' + (aiResult.explanation_english || '');
          } else if (unitLevel === 5) {
            displayExplanation = aiResult.explanation || aiResult.explanation_english || '';
          }
        }

        results.push({
          question_number: questionItem.question_number,
          user_answer: userAnswer || '',
          correct_answer: questionItem.correct_answer,
          is_correct: isCorrect,
          points_awarded: Math.round(pointsAwarded),
          explanation: displayExplanation,
          has_spelling_error: aiResult?.has_spelling_error || false
        });
      }

      const scorePercent = (earnedScore / totalScore) * 100;

      await base44.entities.ExamAttempt.create({
        exam_id: examId,
        subject: exam.subject,
        unit_level: exam.unit_level,
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        answers: results,
        score_percent: scorePercent,
        passed: scorePercent >= exam.passing_grade,
        total_points: totalScore,
        earned_points: Math.round(earnedScore)
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מבחן...</p>
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
            {examError?.message || 'המבחן שחיפשת לא קיים במערכת'}
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-24">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
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
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white">מצב עריכה</span>
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
                <p className="text-amber-800 mb-4">
                  כרגע אתה צופה במבחן במצב עריכה. כדי לערוך את תוכן המבחן, השאלות והתשובות, 
                  לחץ על הכפתור למטה לפתיחת ה-Dashboard.
                </p>
                <Button
                  onClick={() => window.open('https://app.base44.co/dashboard', '_blank')}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  פתח את ה-Dashboard
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">פרטי המבחן</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">כותרת</div>
                <div className="font-bold">{exam.title}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">מקצוע</div>
                <div className="font-bold">{exam.subject}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">יחידות</div>
                <div className="font-bold">{exam.unit_level}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">משך</div>
                <div className="font-bold">{exam.duration_minutes} דקות</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">סה"כ נקודות</div>
                <div className="font-bold">{exam.total_points}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">ציון עובר</div>
                <div className="font-bold">{exam.passing_grade}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">מספר שאלות</div>
                <div className="font-bold">{exam.questions?.length || 0}</div>
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
                <div key={questionIndex} className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-indigo-900 text-lg">שאלה {questionItem.question_number || questionIndex + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">{questionItem.question_type}</span>
                      <span className="text-sm bg-indigo-600 text-white px-3 py-1 rounded font-bold">{questionItem.points} נק'</span>
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
                            {String.fromCharCode(65 + optionIndex)}. {optionValue}
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
                      <p className="text-sm text-gray-700">{questionItem.explanation}</p>
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

  if (savedProgress && !examStarted && !showModeDialog) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">מבחן בתהליך</DialogTitle>
            <DialogDescription>נמצא מבחן שלא הושלם. האם להמשיך?</DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong>שאלה:</strong> {savedProgress.current_question + 1} מתוך {exam.questions.length}
            </p>
            <p className="text-sm text-gray-700">
              <strong>זמן נותר:</strong> {Math.floor(savedProgress.time_left / 60)} דקות
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handleResumeProgress} className="w-full bg-blue-600">
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

  if (showModeDialog && !examStarted) {
    return (
      <Dialog open={showModeDialog} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">בחר מצב בחינה</DialogTitle>
            <DialogDescription className="text-center">
              {exam.reading_text ? 'הסיפור יופיע בכל המצבים' : 'בחר איך תרצה לראות את השאלות'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-6">
            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartExam('normal')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-300 hover:border-blue-500 transition-all text-right shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-xl font-bold text-gray-900">מצב רגיל</h3>
                  <p className="text-sm text-blue-700 font-medium">📄 כמו בבגרות אמיתית</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>כל השאלות ביחד</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>גלילה חופשית</span>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartExam('carousel')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-300 hover:border-purple-500 transition-all text-right shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-xl font-bold text-gray-900">מצב קרוסלה</h3>
                  <p className="text-sm text-purple-700 font-medium">⚡ שאלה אחרי שאלה</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>התמקדות בשאלה אחת</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>הסיפור תמיד מול העיניים</span>
                </div>
              </div>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Exams"))} className="mb-4">
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600 mb-6">{exam.description}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
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
                <div className="text-2xl font-bold text-gray-900">{exam.questions.length}</div>
                <div className="text-sm text-gray-600">שאלות</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
              <div className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                מבנה המבחן והוראות
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="font-semibold text-gray-900 mb-1">📝 סוג המבחן</div>
                  <p>{exam.description || `מבחן ${exam.subject} - ${exam.unit_level} יחידות`}</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="font-semibold text-gray-900 mb-1">⏱️ משך זמן</div>
                  <p>{exam.duration_minutes} דקות מתוזמנות</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <div className="font-semibold text-gray-900 mb-1">📊 מבנה הניקוד</div>
                  <p>סה"כ {exam.questions.length} שאלות • {exam.total_points} נקודות • ציון עובר: {exam.passing_grade}</p>
                </div>

                {exam.reading_text && (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <div className="font-semibold text-gray-900 mb-1">📖 טקסט קריאה</div>
                    <p>המבחן כולל קטע קריאה שיופיע לצד השאלות במהלך המבחן</p>
                  </div>
                )}

                {exam.instructions && (
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <div className="font-semibold text-gray-900 mb-1">ℹ️ הוראות מיוחדות</div>
                    <p className="whitespace-pre-wrap">{exam.instructions}</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => setShowModeDialog(true)}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold"
            >
              התחל מבחן
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (examFinished && score) {
    const passed = score.percent >= exam.passing_grade;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">סקירת תשובות</h2>
            
            <div className="space-y-4">
              {score.results.map((resultItem, resultIndex) => (
                <div
                  key={resultIndex}
                  className={`p-4 rounded-xl border-2 ${resultItem.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-gray-900">שאלה {resultItem.question_number}</div>
                    <div className={`text-sm font-bold ${resultItem.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                      {resultItem.points_awarded} / {exam.questions[resultIndex].points} נק'
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
                      <strong className="text-blue-600">הסבר:</strong> {resultItem.explanation}
                    </div>
                  )}
                </div>
              ))}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                נסה שוב
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to detect and extract American-style options from question text
  const extractAmericanOptions = (questionText) => {
    if (!questionText) return null;
    
    // Pattern 1: A) ... B) ... C) ... D) ... (multiline safe)
    const patternParens = /([A-E])\)\s*([^\n]+?)(?=\s*[A-E]\)|$)/gi;
    // Pattern 2: A. ... B. ... C. ... D. ... (multiline safe)
    const patternDots = /([A-E])\.\s*([^\n]+?)(?=\s*[A-E]\.|$)/gi;
    
    let matches = [...questionText.matchAll(patternParens)];
    let separator = ')';
    
    if (matches.length === 0) {
      matches = [...questionText.matchAll(patternDots)];
      separator = '.';
    }
    
    if (matches.length >= 2 && matches.length <= 5) {
      const options = matches.map(match => match[2].trim());
      const firstOptionIndex = questionText.indexOf(`A${separator}`);
      const mainQuestion = questionText.substring(0, firstOptionIndex).trim();
      
      return { mainQuestion, options, hasOptions: true };
    }
    
    return null;
  };

  const question = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              יציאה מהמבחן
            </DialogTitle>
            <DialogDescription>האם אתה בטוח שברצונך לצאת?</DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4">
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

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-4 shadow-xl mb-4">
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

        <h1 className="text-xl font-bold text-white text-center mb-2">{exam.title}</h1>
        <Progress value={progress} className="h-2 bg-white/20" />
        <div className="flex justify-between text-white text-xs mt-2">
          <span>שאלה {currentQuestion + 1} מתוך {exam.questions.length}</span>
        </div>
      </div>

      {displayMode === 'carousel' ? (
        <div className="px-4 pb-6" style={{ height: 'calc(100vh - 180px)', maxHeight: 'calc(100vh - 180px)' }}>
          <div className="bg-white rounded-xl shadow-lg h-full overflow-hidden flex flex-col max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto">
              {exam.reading_text && (
                <div className="border-b-2 border-gray-200">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {exam.subject === 'אנגלית' ? 'Reading Text' : 'טקסט הקריאה'}
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap" dir="ltr">
                      {exam.reading_text}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {exam.subject === 'אנגלית' ? `Question ${question.question_number}` : `שאלה ${question.question_number}`}
                    </h2>
                    <div className="bg-blue-100 px-3 py-1 rounded-full text-sm font-bold text-blue-600">
                      {question.points} נק'
                    </div>
                  </div>

                  {(() => {
                    const extracted = extractAmericanOptions(question.question_text);
                    if (extracted && extracted.hasOptions) {
                      return (
                        <>
                          <p className="text-gray-700 text-lg mb-6 whitespace-pre-wrap" dir="ltr">
                            {extracted.mainQuestion}
                          </p>
                          <div className="space-y-3 mb-6">
                            {extracted.options.map((optionValue, optionIndex) => (
                              <motion.button
                                key={optionIndex}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleAnswerChange(question.question_number, optionValue)}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                  userAnswers[question.question_number] === optionValue
                                    ? 'bg-blue-100 border-blue-500 shadow-md'
                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                }`}
                                dir="ltr"
                              >
                                <span className="font-bold text-blue-600 mr-2">{String.fromCharCode(65 + optionIndex)})</span>
                                {optionValue}
                              </motion.button>
                            ))}
                          </div>
                        </>
                      );
                    }
                    return (
                      <>
                        <p className="text-gray-700 text-lg mb-6 whitespace-pre-wrap" dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}>
                          {question.question_text}
                        </p>
                        {question.question_image_url && (
                          <img src={question.question_image_url} alt="שאלה" className="max-w-full rounded-lg mb-6" />
                        )}
                      </>
                    );
                  })()}

                  {/* Multiple choice with options array - only if no American style detected */}
                  {question.question_type === 'multiple_choice' && question.options && question.options.length > 0 && !extractAmericanOptions(question.question_text)?.hasOptions && (
                    <div className="space-y-3">
                      {question.options.map((optionValue, optionIndex) => (
                        <motion.button
                          key={optionIndex}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswerChange(question.question_number, optionValue)}
                          className={`w-full p-4 rounded-xl border-2 transition-all ${
                            userAnswers[question.question_number] === optionValue
                              ? 'bg-blue-100 border-blue-500 shadow-md'
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                          dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                        >
                          {optionValue}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Short answer - only if no American style */}
                  {question.question_type === 'short_answer' && !extractAmericanOptions(question.question_text)?.hasOptions && (
                    <Input
                      value={userAnswers[question.question_number] || ''}
                      onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                      placeholder={exam.subject === 'אנגלית' ? "Type your answer..." : "הקלד תשובה..."}
                      className="w-full h-12 text-lg"
                      dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                    />
                  )}

                  {/* Open questions, calculations, proofs - only if no American style */}
                  {(question.question_type === 'open_question' || question.question_type === 'calculation' || question.question_type === 'proof') && !extractAmericanOptions(question.question_text)?.hasOptions && (
                    <Textarea
                      value={userAnswers[question.question_number] || ''}
                      onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                      placeholder={exam.subject === 'אנגלית' ? "Write your answer..." : "כתוב תשובה מלאה..."}
                      className="w-full h-40 text-lg"
                      dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                    />
                  )}

                  {/* Fallback for other question types - only if no American style */}
                  {question.question_type !== 'multiple_choice' && 
                   question.question_type !== 'short_answer' &&
                   question.question_type !== 'open_question' &&
                   question.question_type !== 'calculation' &&
                   question.question_type !== 'proof' && 
                   !extractAmericanOptions(question.question_text)?.hasOptions && (
                    <Textarea
                      value={userAnswers[question.question_number] || ''}
                      onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                      placeholder={exam.subject === 'אנגלית' ? "Write your answer..." : "הקלד תשובה..."}
                      className="w-full h-32 text-lg"
                      dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
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
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />שומר...</> : 'סיים מבחן'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCurrentQuestion(prev => Math.min(exam.questions.length - 1, prev + 1))}
                        className="flex-1 h-12 bg-blue-600"
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
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 pb-6">
          {exam.reading_text && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {exam.subject === 'אנגלית' ? 'Reading Text' : 'טקסט הקריאה'}
              </h3>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap" dir="ltr">
                {exam.reading_text}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="space-y-6">
              {exam.questions.map((questionItem, qIdx) => (
                <div key={qIdx} className="pb-6 border-b last:border-b-0">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {exam.subject === 'אנגלית' ? `Question ${questionItem.question_number}` : `שאלה ${questionItem.question_number}`}
                    </h3>
                    <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-bold text-blue-600">
                      {questionItem.points} נק'
                    </span>
                  </div>

                  {(() => {
                    const extracted = extractAmericanOptions(questionItem.question_text);
                    if (extracted && extracted.hasOptions) {
                      return (
                        <>
                          <p className="text-gray-700 mb-4" dir="ltr">
                            {extracted.mainQuestion}
                          </p>
                          <div className="space-y-2">
                            {extracted.options.map((optionValue, optionIndex) => (
                              <button
                                key={optionIndex}
                                onClick={() => handleAnswerChange(questionItem.question_number, optionValue)}
                                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                  userAnswers[questionItem.question_number] === optionValue
                                    ? 'bg-blue-100 border-blue-500 shadow-md'
                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                }`}
                                dir="ltr"
                              >
                                <span className="font-bold text-blue-600 mr-2">{String.fromCharCode(65 + optionIndex)})</span>
                                {optionValue}
                              </button>
                            ))}
                          </div>
                        </>
                      );
                    }
                    return (
                      <p className="text-gray-700 mb-4" dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}>
                        {questionItem.question_text}
                      </p>
                    );
                  })()}

                  {/* Multiple choice with options array - only if no American style detected */}
                  {questionItem.question_type === 'multiple_choice' && questionItem.options && questionItem.options.length > 0 && !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                    <div className="space-y-2">
                      {questionItem.options.map((optionValue, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => handleAnswerChange(questionItem.question_number, optionValue)}
                          className={`w-full p-3 rounded-lg border-2 transition-all ${
                            userAnswers[questionItem.question_number] === optionValue
                              ? 'bg-blue-100 border-blue-500 shadow-md'
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                          dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                        >
                          {optionValue}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Short answer - only if no American style */}
                  {questionItem.question_type === 'short_answer' && !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                    <Input
                      value={userAnswers[questionItem.question_number] || ''}
                      onChange={(e) => handleAnswerChange(questionItem.question_number, e.target.value)}
                      placeholder={exam.subject === 'אנגלית' ? "Type answer..." : "הקלד תשובה..."}
                      className="w-full h-12"
                      dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                    />
                  )}

                  {/* Open questions, calculations, proofs - only if no American style */}
                  {(questionItem.question_type === 'open_question' || questionItem.question_type === 'calculation' || questionItem.question_type === 'proof') && !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                    <Textarea
                      value={userAnswers[questionItem.question_number] || ''}
                      onChange={(e) => handleAnswerChange(questionItem.question_number, e.target.value)}
                      placeholder={exam.subject === 'אנגלית' ? "Write your answer..." : "כתוב תשובה..."}
                      className="w-full h-32"
                      dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                    />
                  )}

                  {/* Fallback for any other question type - only if no American style */}
                  {questionItem.question_type !== 'multiple_choice' && 
                   questionItem.question_type !== 'short_answer' &&
                   questionItem.question_type !== 'open_question' &&
                   questionItem.question_type !== 'calculation' &&
                   questionItem.question_type !== 'proof' &&
                   !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                    <Textarea
                      value={userAnswers[questionItem.question_number] || ''}
                      onChange={(e) => handleAnswerChange(questionItem.question_number, e.target.value)}
                      placeholder={exam.subject === 'אנגלית' ? "Write your answer..." : "הקלד תשובה..."}
                      className="w-full h-32"
                      dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold mt-6"
            >
              {isSubmitting ? <><Loader2 className="animate-spin w-5 h-5 ml-2" />שומר...</> : 'סיים מבחן'}
            </Button>
          </div>
        </div>
      )}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {exam.subject === 'אנגלית' ? `Question ${questionItem.question_number}` : `שאלה ${questionItem.question_number}`}
                      </h3>
                      <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-bold text-blue-600">
                        {questionItem.points} נק'
                      </span>
                    </div>

                    {(() => {
                      const extracted = extractAmericanOptions(questionItem.question_text);
                      if (extracted && extracted.hasOptions) {
                        return (
                          <>
                            <p className="text-gray-700 mb-4" dir="ltr">
                              {extracted.mainQuestion}
                            </p>
                            <div className="space-y-2 mb-4">
                              {extracted.options.map((optionValue, optionIndex) => (
                                <button
                                  key={optionIndex}
                                  onClick={() => handleAnswerChange(questionItem.question_number, optionValue)}
                                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                    userAnswers[questionItem.question_number] === optionValue
                                      ? 'bg-blue-100 border-blue-500 shadow-md'
                                      : 'bg-white border-gray-200 hover:border-blue-300'
                                  }`}
                                  dir="ltr"
                                >
                                  <span className="font-bold text-blue-600 mr-2">{String.fromCharCode(65 + optionIndex)})</span>
                                  {optionValue}
                                </button>
                              ))}
                            </div>
                          </>
                        );
                      }
                      return (
                        <p className="text-gray-700 mb-4" dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}>
                          {questionItem.question_text}
                        </p>
                      );
                    })()}

                    {/* Multiple choice with options array - only if no American style detected */}
                    {questionItem.question_type === 'multiple_choice' && questionItem.options && questionItem.options.length > 0 && !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                      <div className="space-y-2">
                        {questionItem.options.map((optionValue, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => handleAnswerChange(questionItem.question_number, optionValue)}
                            className={`w-full p-3 rounded-lg border-2 transition-all ${
                              userAnswers[questionItem.question_number] === optionValue
                                ? 'bg-blue-100 border-blue-500 shadow-md'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                            dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                          >
                            {optionValue}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Short answer */}
                    {questionItem.question_type === 'short_answer' && !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                      <Input
                        value={userAnswers[questionItem.question_number] || ''}
                        onChange={(e) => handleAnswerChange(questionItem.question_number, e.target.value)}
                        placeholder={exam.subject === 'אנגלית' ? "Type answer..." : "הקלד תשובה..."}
                        className="w-full h-12"
                        dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                      />
                    )}

                    {/* Open questions, calculations, proofs */}
                    {(questionItem.question_type === 'open_question' || questionItem.question_type === 'calculation' || questionItem.question_type === 'proof') && !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                      <Textarea
                        value={userAnswers[questionItem.question_number] || ''}
                        onChange={(e) => handleAnswerChange(questionItem.question_number, e.target.value)}
                        placeholder={exam.subject === 'אנגלית' ? "Write your answer..." : "כתוב תשובה..."}
                        className="w-full h-32"
                        dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                      />
                    )}

                    {/* Fallback for any other question type - as long as not American style */}
                    {questionItem.question_type !== 'multiple_choice' && 
                     questionItem.question_type !== 'short_answer' &&
                     questionItem.question_type !== 'open_question' &&
                     questionItem.question_type !== 'calculation' &&
                     questionItem.question_type !== 'proof' &&
                     !extractAmericanOptions(questionItem.question_text)?.hasOptions && (
                      <Textarea
                        value={userAnswers[questionItem.question_number] || ''}
                        onChange={(e) => handleAnswerChange(questionItem.question_number, e.target.value)}
                        placeholder={exam.subject === 'אנגלית' ? "Write your answer..." : "הקלד תשובה..."}
                        className="w-full h-32"
                        dir={exam.subject === 'אנגלית' ? 'ltr' : 'rtl'}
                      />
                    )}
                  </div>
                ))}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}