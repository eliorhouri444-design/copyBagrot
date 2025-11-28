import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, AlertTriangle, BookOpen, Info, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import AdManager from "../components/ads/AdManager";

export default function ExamModuleCPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [exam, setExam] = useState(null);
  const [currentSection, setCurrentSection] = useState("reading");
  const [readingAnswers, setReadingAnswers] = useState({});
  const [writingText, setWritingText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);
  const [showAd, setShowAd] = useState(false);
  const [showDetailedExplanations, setShowDetailedExplanations] = useState(false);
  const [showAdForExplanations, setShowAdForExplanations] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntroDialog, setShowIntroDialog] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  const [examMode, setExamMode] = useState('exam');
  const [displayMode, setDisplayMode] = useState('normal'); // Changed from 'exam' to 'normal'
  const [showModeSelectionDialog, setShowModeSelectionDialog] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);

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
    const loadExam = async () => {
      const params = new URLSearchParams(location.search);
      const examId = params.get('examId');
      const mode = params.get('mode');

      // Check if in edit mode
      if (mode === 'edit' && user?.role === 'admin') {
        setIsEditMode(true);
        setShowIntroDialog(false);
        setShowModeSelectionDialog(false);
        setHasStarted(true);
        setExamMode('practice'); // No timer in edit mode
      }

      if (examId) {
        const exams = await base44.entities.ModuleCExam.list();
        const foundExam = exams.find(examItem => examItem.id === examId);
        setExam(foundExam);

        if (foundExam?.duration_minutes) {
          setTimeLeft(foundExam.duration_minutes * 60);
        }

        // Skip saved progress check if in edit mode
        if (mode === 'edit' && user?.role === 'admin') {
          return;
        }

        const savedAttempts = await base44.entities.ExamProgress.filter({
          exam_id: examId,
          completed: false
        });

        if (savedAttempts.length > 0) {
          setSavedProgress(savedAttempts[0]);
          setShowResumeDialog(true);
        } else {
          if (user?.skip_exam_intro) {
            setShowModeSelectionDialog(true);
            setShowIntroDialog(false);
          } else {
            setShowIntroDialog(true);
            setShowModeSelectionDialog(false);
          }
          setHasStarted(false);
        }
      }
    };
    if (user !== null) {
      loadExam();
    }
  }, [location, user]);

  useEffect(() => {
    if (!exam || showResults || !hasStarted || examMode === 'practice' || isEditMode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, showResults, hasStarted, examMode, isEditMode]);

  useEffect(() => {
    if (!hasStarted || !exam || showResults) return; // Removed isEditMode

    const autoSave = setInterval(() => {
      saveProgress();
    }, 30000);

    const handleBeforeUnload = (e) => {
      saveProgress();
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome to show a custom message
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(autoSave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasStarted, exam, showResults, readingAnswers, writingText, timeLeft]); // Changed dependencies

  const saveProgress = async () => {
    if (!exam || showResults || isEditMode) return;
    try {
      const progressData = {
        exam_id: exam.id,
        exam_type: 'module_c',
        subject: exam.subject,
        unit_level: exam.unit_level || exam.units || 3,
        current_section: currentSection,
        current_question: currentQuestion,
        reading_answers: readingAnswers,
        writing_text: writingText,
        time_left: examMode !== 'practice' ? timeLeft : null,
        exam_mode: examMode,
        display_mode: displayMode, // Added display_mode
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReadingAnswer = (questionNumber, answer) => {
    setReadingAnswers({
      ...readingAnswers,
      [questionNumber]: answer
    });
  };

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const calculateScore = async () => {
    let readingScore = 0;
    let writingScore = 0;
    const readingResults = [];
    let writingFeedback = {};
    const wordCount = countWords(writingText);

    // Helper function for AI grading with spelling tolerance
    const checkAnswerWithAI = async (userAnswer, correctAnswer, questionText, questionType) => {
      if (!userAnswer || !correctAnswer || !questionText) {
        return {
          isCorrect: false,
          similarityScore: 0,
          explanation: "חסר מידע לבדיקה",
          hasSpellingError: false,
          pointsDeduction: 0
        };
      }

      try {
        const unitLevel = exam.unit_level || exam.units || 3;
        
        let explanationLanguageInstruction = '';
        if (unitLevel === 3) {
          explanationLanguageInstruction = 'כתוב את כל ההסברים בעברית בלבד (explanation_he)';
        } else if (unitLevel === 4) {
          explanationLanguageInstruction = 'כתוב הסברים גם בעברית (explanation_he) וגם באנגלית (explanation_en)';
        } else if (unitLevel === 5) {
          explanationLanguageInstruction = 'כתוב את כל ההסברים באנגלית בלבד (explanation)';
        }

        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `אתה מורה לאנגלית מנוסה. בדוק את תשובת התלמיד לשאלה הבאה.
          רמה: ${unitLevel} יחידות לימוד
          שאלה: ${questionText}
          תשובה נכונה: ${correctAnswer}
          תשובת התלמיד: ${userAnswer}
          
          ${explanationLanguageInstruction}
          
          חשוב: אם התשובה נכונה מבחינת התוכן אבל יש בה שגיאות כתיב, סמן hasSpellingError=true והורד עד 20% מהציון.
          אם התשובה שגויה לחלוטין, הציון 0.
          
          ענה ב-JSON:`,
          response_json_schema: {
            type: "object",
            properties: {
              isCorrect: { type: "boolean", description: "האם התשובה נכונה מבחינת התוכן" },
              hasSpellingError: { type: "boolean", description: "האם יש שגיאות כתיב" },
              similarityScore: { type: "number", description: "ציון דמיון 0-100" },
              pointsDeduction: { type: "number", description: "כמה נקודות להוריד בגלל שגיאות כתיב (0-20% מהציון)" },
              explanation: { type: "string", description: "הסבר באנגלית (רק ל-5 יחידות)" },
              explanation_he: { type: "string", description: "הסבר בעברית (3-4 יחידות)" },
              explanation_en: { type: "string", description: "הסבר באנגלית (4 יחידות)" }
            },
            required: ["isCorrect", "hasSpellingError", "similarityScore"]
          }
        });
        return aiResponse;
      } catch (error) {
        console.error("Error calling AI:", error);
        const isExactMatch = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        return {
          isCorrect: isExactMatch,
          hasSpellingError: false,
          similarityScore: isExactMatch ? 100 : 0,
          pointsDeduction: 0,
          explanation_he: "שגיאת AI: בוצעה בדיקה מדויקת על בסיס התאמה מלאה.",
        };
      }
    };

    // Batch Processing
    const [readingGrading, writingGrading] = await Promise.all([
      (async () => {
        const results = await Promise.all(
          (exam.questions || []).map(async (questionItem) => {
            const userAnswer = readingAnswers[questionItem.question_number];

            if (!userAnswer) {
              return {
                question_number: questionItem.question_number,
                question_text: questionItem.question_text || '',
                user_answer: "לא נענה",
                correct_answer: questionItem.correct_answers?.[0] || '',
                is_correct: false,
                ai_explanation: "לא ניתנה תשובה",
                points: questionItem.points || 10,
                points_awarded: 0,
                question_type: questionItem.question_type,
                has_spelling_error: false
              };
            }

            if (questionItem.question_type === 'multiple_choice') {
              const isCorrect = userAnswer.toLowerCase().trim() === (questionItem.correct_answers?.[0] || '').toLowerCase().trim();
              return {
                question_number: questionItem.question_number,
                question_text: questionItem.question_text || '',
                user_answer: userAnswer,
                correct_answer: questionItem.correct_answers?.[0] || '',
                is_correct: isCorrect,
                ai_explanation: isCorrect ? "תשובה נכונה!" : "תשובה שגויה",
                points: questionItem.points || 10,
                points_awarded: isCorrect ? (questionItem.points || 10) : 0,
                question_type: questionItem.question_type,
                has_spelling_error: false
              };
            }

            try {
              const aiResult = await checkAnswerWithAI(
                userAnswer,
                questionItem.correct_answers?.[0] || '',
                questionItem.question_text || '',
                questionItem.question_type
              );

              const basePoints = questionItem.points || 10;
              let pointsAwarded = 0;

              if (aiResult.isCorrect) {
                pointsAwarded = basePoints;
                
                if (aiResult.hasSpellingError && aiResult.pointsDeduction > 0) {
                  // Cap deduction at 20% of base points
                  const deduction = Math.min(aiResult.pointsDeduction, basePoints * 0.2);
                  pointsAwarded = Math.max(Math.round(basePoints * 0.8), basePoints - deduction);
                }
              }

              const unitLevel = exam.unit_level || exam.units || 3;
              let displayExplanation = '';
              
              if (unitLevel === 3) {
                displayExplanation = aiResult.explanation_he || aiResult.explanation || '';
              } else if (unitLevel === 4) {
                displayExplanation = [aiResult.explanation_he, aiResult.explanation_en].filter(Boolean).join('\n\n');
              } else if (unitLevel === 5) {
                displayExplanation = aiResult.explanation || aiResult.explanation_en || '';
              }

              return {
                question_number: questionItem.question_number,
                question_text: questionItem.question_text || '',
                user_answer: userAnswer,
                correct_answer: questionItem.correct_answers?.[0] || '',
                is_correct: aiResult.isCorrect,
                points_awarded: Math.round(pointsAwarded),
                ai_explanation: displayExplanation,
                points: questionItem.points || 10,
                question_type: questionItem.question_type,
                has_spelling_error: aiResult.hasSpellingError || false,
                spelling_deduction: aiResult.hasSpellingError ? Math.round(basePoints - pointsAwarded) : 0
              };
            } catch (error) {
              console.error("AI error for open question:", error);
              // Fallback for AI error on open questions
              const isCorrect = userAnswer.toLowerCase().trim() === (questionItem.correct_answers?.[0] || '').toLowerCase().trim();
              return {
                question_number: questionItem.question_number,
                question_text: questionItem.question_text || '',
                user_answer: userAnswer,
                correct_answer: questionItem.correct_answers?.[0] || '',
                is_correct: isCorrect,
                ai_explanation: "בדיקה אוטומטית (נפילה לאחור): נדרש דיוק מלא.", // More informative fallback
                points: questionItem.points || 10,
                points_awarded: isCorrect ? (questionItem.points || 10) : 0,
                question_type: questionItem.question_type,
                has_spelling_error: false
              };
            }
          })
        );

        return results;
      })(),

      // בדיקת כתיבה
      (async () => {
        if (wordCount === 0) {
          return { score: 0, feedback: {} };
        }

        try {
          // Simplified prompt for writing grading
          const aiWritingResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `אתה מורה מנוסה לאנגלית הבודק כתיבה של תלמיד בבחינת בגרות ישראלית.
            נושא הכתיבה: ${exam.writing_prompt || ''}
            טקסט התלמיד: ${writingText}
            מספר מילים: ${wordCount} (יעד: ${exam.writing_min_words || 70}-${exam.writing_max_words || 90} מילים)
            
            דרג את הכתיבה מתוך 30 נקודות.
            תן ציון כולל ומשוב קצר וכללי בעברית (עד 2-3 משפטים). אל תכלול פירוט על סעיפים כמו תוכן, ארגון וכו'.
            
            ענה ב-JSON:`,
            response_json_schema: {
              type: "object",
              properties: {
                total_score: { type: "number" },
                feedback_hebrew: { type: "string" }
              },
              required: ["total_score", "feedback_hebrew"]
            }
          });

          return {
            score: Math.round(aiWritingResponse.total_score),
            feedback: aiWritingResponse // aiWritingResponse already contains total_score and feedback_hebrew
          };
        } catch (error) {
          console.error("AI writing error:", error);
          let fallbackScore = 0;
          if (wordCount >= (exam.writing_min_words || 70) && wordCount <= (exam.writing_max_words || 90) + 5) {
            fallbackScore = 25; // Good enough if within range
          } else if (wordCount > 0) {
            fallbackScore = 15; // Some score for partial attempt
          }
          return {
            score: fallbackScore,
            feedback: { feedback_hebrew: "בדיקה אוטומטית בסיסית בוצעה עקב שגיאה במערכת הניקוד. נסה שוב מאוחר יותר." }
          };
        }
      })()
    ]);

    readingResults.push(...readingGrading);
    readingScore = readingGrading.reduce((sum, resultItem) => sum + (resultItem.points_awarded || 0), 0);
    writingScore = writingGrading.score;
    writingFeedback = writingGrading.feedback;

    const finalScore = readingScore + writingScore;
    const scorePercent = Math.round((finalScore / 100) * 100);
    const passed = scorePercent >= 56;

    return {
      readingScore,
      writingScore,
      finalScore,
      scorePercent,
      passed,
      readingResults,
      wordCount,
      writingFeedback
    };
  };

  const startGradingAndSaving = async () => {
    try {
      const scores = await calculateScore();
      setResults(scores);

      await base44.entities.ExamAttempt.create({
        exam_id: exam.id,
        exam_type: 'module_c',
        module_id: 'C',
        subject: exam.subject,
        unit_level: exam.unit_level || exam.units || 3,
        started_at: new Date(Date.now() - (exam.duration_minutes * 60 - timeLeft) * 1000).toISOString(),
        submitted_at: new Date().toISOString(),
        answers: scores.readingResults.map(r => ({
          item_id: `q${r.question_number}`,
          user_answer: r.user_answer,
          is_correct: r.is_correct,
          points_earned: r.points_awarded
        })),
        score_percent: scores.scorePercent,
        passed: scores.passed,
        total_points: 100,
        earned_points: scores.finalScore,
        exam_mode: examMode,
      });

      await base44.entities.ModuleCResult.create({
        exam_id: exam.id,
        reading_score: scores.readingScore,
        writing_score: scores.writingScore,
        final_score: scores.finalScore,
        reading_answers: scores.readingResults,
        writing_text: writingText,
        word_count: scores.wordCount,
        writing_feedback: scores.writingFeedback,
        duration: examMode !== 'practice' ? Math.floor((exam.duration_minutes * 60 - timeLeft) / 60) : 0,
        subject: exam.subject,
        units: exam.unit_level || exam.units || 3,
        exam_mode: examMode,
      });

      if (savedProgress?.id) {
        await base44.entities.ExamProgress.delete(savedProgress.id);
        setSavedProgress(null);
      }
    } catch (error) {
      console.error("Error saving results:", error);
      setResults({
        loading: false,
        error: true,
        message: "אירעה שגיאה בשמירת התוצאות"
      });
    }
  };

  const handleFinishExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setShowResults(true);
    if (!user?.is_premium) {
      setShowAd(true);
    } else {
      setResults({ loading: true });
      startGradingAndSaving();
    }
  };

  const handleAdForGradingComplete = () => {
    setShowAd(false);
    setResults({ loading: true });
    startGradingAndSaving();
  };

  const handleShowExplanations = () => {
    if (user?.is_premium) {
      setShowDetailedExplanations(true);
    } else {
      setShowAdForExplanations(true);
    }
  };

  const handleAdForExplanationsComplete = () => {
    setShowAdForExplanations(false);
    setShowDetailedExplanations(true);
  };

  const handleContinueToWriting = () => {
    setCurrentSection("writing");
  };

  const handleBackToReading = () => {
    setCurrentSection("reading");
    if (displayMode === 'carousel') { // Changed from 'interactive' to 'carousel'
      setCurrentQuestion(0);
    }
  };

  const handleNextQuestion = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    if (exam && currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else if (exam && currentQuestion === exam.questions.length - 1) {
      setCurrentSection("writing");
    }
    
    setTimeout(() => setIsSubmitting(false), 300);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleResumeProgress = () => {
    if (savedProgress) {
      setReadingAnswers(savedProgress.reading_answers || {});
      setWritingText(savedProgress.writing_text || "");
      setCurrentSection(savedProgress.current_section || "reading");
      setCurrentQuestion(savedProgress.current_question || 0);
      const resumedExamMode = savedProgress.exam_mode || 'exam';
      setExamMode(resumedExamMode);
      setDisplayMode(savedProgress.display_mode || 'normal'); // Updated to use saved display_mode
      setTimeLeft(savedProgress.time_left || (exam?.duration_minutes * 60) || 3600);
      setShowResumeDialog(false);
      setShowIntroDialog(false);
      setShowModeSelectionDialog(false);
      setHasStarted(true);
    }
  };

  const handleStartFresh = async () => {
    if (savedProgress?.id) {
      try {
        await base44.entities.ExamProgress.delete(savedProgress.id);
        setSavedProgress(null);
      } catch (error) {
        console.error("Error deleting saved progress:", error);
      }
    }
    setReadingAnswers({});
    setWritingText("");
    setCurrentSection("reading");
    setCurrentQuestion(0);
    setTimeLeft(exam?.duration_minutes * 60 || 3600);
    setExamMode('exam'); // Default to exam mode when starting fresh
    setDisplayMode('normal'); // Default to normal display mode
    setShowResumeDialog(false);
    if (user?.skip_exam_intro) {
      setShowModeSelectionDialog(true);
      setShowIntroDialog(false);
    } else {
      setShowIntroDialog(true);
      setShowModeSelectionDialog(false);
    }
    setHasStarted(false);
  };

  const handleStartExam = (mode, display) => { // Modified signature
    setExamMode(mode);
    setDisplayMode(display); // Set display mode explicitly
    setShowIntroDialog(false);
    setShowModeSelectionDialog(false);
    setHasStarted(true);
    
    if (mode !== 'practice' && exam?.duration_minutes) {
       setTimeLeft(exam.duration_minutes * 60);
    }
  };

  const handleSkipIntroForever = async () => {
    try {
      await base44.auth.updateMe({ skip_exam_intro: true });
      setUser(prev => ({ ...prev, skip_exam_intro: true }));
      setShowIntroDialog(false);
      setShowModeSelectionDialog(true);
    } catch (error) {
      console.error("Error updating user settings:", error);
      setShowIntroDialog(false);
      setShowModeSelectionDialog(true);
    }
  };

  const handleExitAttempt = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    await saveProgress();
    setShowExitDialog(false);
    navigate(createPageUrl("Exams"));
  };

  const handleTimeUp = () => {
    setShowTimeUpDialog(true);
    setHasStarted(false);
  };

  const handleTimeUpFinish = async () => {
    setShowTimeUpDialog(false);
    await handleFinishExam();
  };

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-lg text-gray-600">טוען מבחן...</div>
        </div>
      </div>
    );
  }

  // Edit Mode Preview
  if (isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pb-24">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
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
          <p className="text-white/90 text-sm">Module C - הבנת נקרא + כתיבה</p>
        </div>

        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">מצב תצוגה בלבד</h3>
                <p className="text-amber-800 mb-4">
                  כרגע אתה צופה במבחן במצב תצוגה. כדי לערוך את תוכן המבחן, השאלות והתשובות, 
                  עליך להשתמש בכלי הניהול במערכת או לערוך ישירות דרך Dashboard → Data → ModuleCExam.
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

          {/* Preview of exam structure */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">פרטי המבחן</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">כותרת</div>
                <div className="font-bold">{exam.title}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">משך</div>
                <div className="font-bold">{exam.duration_minutes} דקות</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">מספר שאלות</div>
                <div className="font-bold">{exam.questions?.length || 0}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">נושא כתיבה</div>
                <div className="font-bold">{exam.writing_prompt ? 'קיים' : 'חסר'}</div>
              </div>
            </div>
          </div>

          {/* Reading Section Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">חלק א' - הבנת נקרא</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-gray-700 mb-2">טקסט הקריאה:</h4>
              <div className="text-gray-600 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap" dir="ltr">
                {exam.reading_text}
              </div>
            </div>

            <h4 className="font-bold text-gray-900 mb-3">שאלות ({exam.questions?.length || 0}):</h4>
            <div className="space-y-3">
              {exam.questions?.map((questionItem, questionIndex) => (
                <div key={questionIndex} className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-blue-900">שאלה {questionItem.question_number}</span>
                    <span className="text-sm bg-[#2086b1] text-white px-2 py-1 rounded">{questionItem.points} נק'</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-2" dir="ltr">{questionItem.question_text}</p>
                  {questionItem.options && questionItem.options.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2">
                      סוג: {questionItem.question_type} | אפשרויות: {questionItem.options.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Writing Section Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">חלק ב' - כתיבה</h3>
            <div className="bg-purple-50 border-2 border-blue-500 rounded-lg p-4">
              <h4 className="font-bold text-purple-900 mb-2">נושא הכתיבה:</h4>
              <p className="text-gray-700" dir="ltr">{exam.writing_prompt || 'לא הוגדר נושא'}</p>
              <div className="text-sm text-gray-600 mt-3">
                מספר מילים: {exam.writing_min_words}-{exam.writing_max_words} מילים
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResumeDialog) {
    return (
      <Dialog open={showResumeDialog} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">מבחן בתהליך</DialogTitle>
            <DialogDescription>
              נמצא מבחן שלא הושלם. האם תרצה להמשיך מאיפה שעצרת?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-500">
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>התקדמות:</strong> {savedProgress.current_section === 'reading' ? 'הבנת נקרא' : 'כתיבה'}</p>
              {savedProgress.exam_mode !== 'practice' && (
                <p><strong>זמן שנותר:</strong> {Math.floor(savedProgress.time_left / 60)} דקות</p>
              )}
              <p><strong>מצב:</strong> {savedProgress.display_mode === 'carousel' ? 'קרוסלה' : 'רגיל'}</p> {/* Changed this line */}
              <p><strong>שאלות שנענו:</strong> {Object.keys(savedProgress.reading_answers || {}).length} מתוך {exam.questions.length}</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleStartFresh}
              variant="outline"
              className="flex-1"
            >
              התחל מחדש
            </Button>
            <Button
              onClick={handleResumeProgress}
              className="flex-1 bg-[#2086b1] hover:bg-blue-700 text-white"
            >
              המשך מאיפה שעצרתי
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showModeSelectionDialog && !hasStarted) {
    return (
      <Dialog open={showModeSelectionDialog} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-2">
              בחר מצב בחינה
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              שני המצבים כוללים טיימר מלא של {exam?.duration_minutes || 90} דקות
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-6">
            {/* Exam Mode (Normal Display) */}
            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartExam('exam', 'normal')} // Changed call
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-300 hover:border-blue-500 transition-all text-right shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-[#2086b1] rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-xl font-bold text-gray-900">מצב בגרות רגיל</h3>
                  <p className="text-sm text-blue-700 font-medium">📄 כמו בבחינה אמיתית</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>סיפור בצד, כל השאלות בצד</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>גלילה חופשית</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>טיימר מלא של {exam?.duration_minutes || 90} דקות</span>
                </div>
              </div>

              <div className="mt-4 bg-blue-200 rounded-lg p-3 text-center">
                <span className="text-sm font-bold text-blue-900">מומלץ להכנה לבגרות</span>
              </div>
            </motion.button>

            {/* Carousel Mode */}
            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartExam('exam', 'carousel')} // Changed call
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
                  <span>סיפור תמיד מול העיניים</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>שאלה אחת בכל פעם</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>טיימר מלא של {exam?.duration_minutes || 90} דקות</span>
                </div>
              </div>

              <div className="mt-4 bg-purple-200 rounded-lg p-3 text-center">
                <span className="text-sm font-bold text-purple-900">לתרגול ממוקד</span>
              </div>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showIntroDialog && !hasStarted) {
    return (
      <Dialog open={showIntroDialog} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {exam.title}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-600">
              מבחן מקורי מבוסס על תכנית הלימודים של משרד החינוך - {exam.unit_level || exam.units || 3} יחידות
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-purple-50 rounded-xl p-2 text-center">
              <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900">{exam.questions.length}</div>
              <div className="text-[10px] text-gray-600">שאלות</div>
            </div>
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <FileText className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900">100</div>
              <div className="text-[10px] text-gray-600">נקודות</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900">{exam.duration_minutes || 90}</div>
              <div className="text-[10px] text-gray-600">דקות</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-500 rounded-xl p-3 mb-3">
            <div className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              מבנה המבחן
            </div>
            
            <div className="space-y-2 text-xs text-gray-700">
              <div className="bg-white rounded-lg p-2 border border-blue-100">
                <span className="font-semibold">📖 חלק א׳:</span> הבנת נקרא - {exam.questions.length} שאלות ({exam.questions.reduce((sum, q) => sum + (q.points || 10), 0)} נק׳)
              </div>
              <div className="bg-white rounded-lg p-2 border border-purple-100">
                <span className="font-semibold">✍️ חלק ב׳:</span> כתיבה - {exam.writing_min_words}-{exam.writing_max_words} מילים (30 נק׳)
              </div>
              <div className="bg-white rounded-lg p-2 border border-amber-100">
                <span className="font-semibold">⏱️ משך:</span> {exam.duration_minutes || 90} דקות מתוזמנות • ציון עובר: 56
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button
              onClick={() => handleStartExam('exam', 'normal')}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
            >
              התחל מבחן מתוזמן
            </Button>
            <Button
              onClick={() => handleStartExam('practice', 'normal')}
              variant="outline"
              className="w-full h-12"
            >
              התחל מצב תרגול (ללא זמן)
            </Button>
            <Button
              onClick={handleSkipIntroForever}
              variant="ghost"
              className="w-full text-sm"
            >
              אל תראה לי הסבר זה בעתיד
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showAd) {
    return (
      <AdManager onContinue={handleAdForGradingComplete}>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">בודק את המבחן שלך...</h2>
            <p className="text-gray-600">המערכת בודקת את התשובות והכתיבה שלך</p>
          </div>
        </div>
      </AdManager>
    );
  }

  if (showResults && results?.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">בודק את המבחן שלך...</h2>
          <p className="text-gray-600">המערכת בודקת את התשובות והכתיבה שלך</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    if (showAdForExplanations) {
      return (
        <AdManager onContinue={handleAdForExplanationsComplete}>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">טוען הסברים מפורטים...</h2>
              <p className="text-gray-600">
                <span className="font-semibold text-purple-600">בזכות הפרסומת, אתה מקבל גישה להסברים מקיפים בחינם!</span>
                <br/>
                ההסברים המפורטים יופיעו אוטומטית לאחר סיום הפרסומת.
              </p>
            </div>
          </div>
        </AdManager>
      );
    }

    if (results?.error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאה</h2>
            <p className="text-gray-600 mb-4">{results.message}</p>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              חזרה למבחנים
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
              results.passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {results.passed ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {results.passed ? 'כל הכבוד! עברת את המבחן' : 'המשך להתאמן'}
            </h1>

            <div className="text-6xl font-bold mb-2" style={{
              color: results.passed ? '#10B981' : '#EF4444'
            }}>
              {results.scorePercent}
            </div>

            <div className="text-gray-600 mb-4">
              {results.finalScore} מתוך 100 נקודות
            </div>
          </div>

          {(user?.is_premium || showDetailedExplanations) && (
            <>
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">סקירת תשובות</h3>
                <div className="space-y-4">
                  {results.readingResults.map((resultItem, resultIndex) => (
                    <div key={resultIndex} className="mb-6 pb-4 border-b last:border-b-0 border-blue-500">
                      <p className="font-semibold text-lg text-gray-900 mb-2">שאלה {resultItem.question_number}:</p>
                      <p className="text-gray-700 mb-2 text-left" dir="ltr">{exam.questions.find(questionItem => questionItem.question_number === resultItem.question_number)?.question_text}</p>
                      <p className="text-gray-700 mb-1">
                        <span className="font-medium">תשובתך:</span> <span dir="ltr">{resultItem.user_answer}</span>
                      </p>
                      <p className="text-gray-700 mb-1">
                        <span className="font-medium">תשובה נכונה:</span> <span dir="ltr">{resultItem.correct_answer}</span>
                      </p>
                      <p className={`font-medium ${resultItem.is_correct ? 'text-green-600' : 'text-red-600'} mb-2`}>
                        סטטוס: {resultItem.is_correct ? 'נכון' : 'לא נכון'} ({resultItem.points_awarded} מתוך {resultItem.points} נקודות)
                        {resultItem.has_spelling_error && (
                          <span className="text-amber-600 ml-2">(הורדו {resultItem.spelling_deduction} נקודות על שגיאות כתיב)</span>
                        )}
                      </p>
                      {resultItem.ai_explanation && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 border border-blue-500">
                          <p className="font-medium text-gray-800">הסבר:</p>
                          <div dir="rtl" className="whitespace-pre-wrap">{resultItem.ai_explanation}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {writingText && results.writingFeedback && (
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">סקירת הכתיבה שלך</h3>

                  {/* The detailed score breakdown and specific errors sections were removed as the AI prompt for writing was simplified for speed */}
                  {results.writingFeedback.feedback_hebrew && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border-2 border-blue-500">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <span className="text-xl">📝</span>
                        משוב כללי
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {results.writingFeedback.feedback_hebrew}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      מספר מילים: {results.wordCount} (יעד: {exam.writing_min_words}-{exam.writing_max_words})
                    </div>
                    <div className="whitespace-pre-wrap text-gray-900 max-h-64 overflow-y-auto" dir="ltr">
                      {writingText}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!user?.is_premium && !showDetailedExplanations && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 text-center mb-6">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">הסברים מפורטים על כל טעות</h3>
              <p className="text-gray-700 mb-4">
                רוצה לדעת בדיוק איפה טעית ולקבל הסברים מקצועיים?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                לחץ על הכפתור למטה כדי לצפות בהסברים.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              חזרה למבחנים
            </Button>

            {!user?.is_premium && !showDetailedExplanations && (
              <Button
                onClick={handleShowExplanations}
                className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
              >
                צפה בהסבר מפורט
              </Button>
            )}

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1 h-14"
            >
              נסה שוב
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      <Dialog open={showTimeUpDialog} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-red-600">
              <Clock className="w-8 h-8" />
              הזמן נגמר!
            </DialogTitle>
            <DialogDescription>
              המבחן הסתיים. המערכת תחשב את הציון על סמך התשובות שהספקת למלא.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
            <div className="text-center space-y-2">
              <p className="text-gray-700">
                <strong>שאלות שענית:</strong> {Object.keys(readingAnswers).length} מתוך {exam.questions.length}
              </p>
              {writingText && (
                <p className="text-gray-700">
                  <strong>מילים בכתיבה:</strong> {countWords(writingText)}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleTimeUpFinish}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
            >
              סיים והצג תוצאות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={handleExitAttempt} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          {examMode !== 'practice' ? (
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <Clock className="w-5 h-5 text-white" />
              <span className={`text-xl font-bold text-white ${timeLeft < 300 ? 'animate-pulse text-red-300' : ''}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white">מצב תרגול</span>
            </div>
          )}
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-2">{exam.title}</h1>
        {currentSection === 'reading' && (
          <>
            <Progress value={progress} className="h-2 bg-white/20 [&>div]:bg-white" />
            <div className="flex justify-between text-white text-xs mt-2">
              <span>שאלה {currentQuestion + 1} מתוך {exam.questions.length}</span>
            </div>
          </>
        )}
        {currentSection === 'writing' && (
            <div className="flex justify-between text-white text-xs mt-2">
              <span>חלק ב' - כתיבה</span>
            </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-6">
        {currentSection === "reading" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {displayMode === 'carousel' ? (
              <div className="space-y-4 lg:grid lg:grid-cols-5 lg:gap-4 lg:space-y-0">
                {exam.reading_text && (
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:sticky lg:top-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        Reading Text
                      </h3>
                      <span className="text-xs text-gray-500">📖 Story</span>
                    </div>
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap max-h-48 lg:max-h-full overflow-y-auto bg-gray-50 rounded-lg p-3" dir="ltr">
                      {exam.reading_text}
                    </div>
                  </div>
                )}

                <div className={exam.reading_text ? "lg:col-span-3" : "lg:col-span-5"}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-xl shadow-lg p-4 sm:p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Question {question.question_number}</h2>
                        <div className="bg-blue-100 px-3 py-1 rounded-full text-sm font-bold text-blue-600 flex-shrink-0">
                          {question.points} נק'
                        </div>
                      </div>

                      <p className="text-gray-700 text-base sm:text-lg mb-6 whitespace-pre-wrap" dir="ltr">{question.question_text}</p>

                      {question.question_type === 'multiple_choice' && question.options && (
                        <div className="space-y-3">
                          {question.options.map((optionValue, optionIndex) => (
                            <button
                              key={optionIndex}
                              onClick={() => handleReadingAnswer(question.question_number, optionValue)}
                              className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                                readingAnswers[question.question_number] === optionValue
                                  ? 'bg-blue-100 border-blue-500'
                                  : 'bg-white border-blue-500 hover:border-blue-500'
                              }`}
                              dir="ltr"
                            >
                              <div className="text-sm sm:text-base">{optionValue}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {question.question_type === 'short_answer' && (
                        <Input
                          value={readingAnswers[question.question_number] || ''}
                          onChange={(e) => handleReadingAnswer(question.question_number, e.target.value)}
                          placeholder="Type your answer..."
                          className="w-full h-12 text-base sm:text-lg"
                          dir="ltr"
                        />
                      )}

                      <div className="flex gap-3 mt-6">
                        <Button
                          onClick={handlePreviousQuestion}
                          disabled={currentQuestion === 0}
                          variant="outline"
                          className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                        >
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                          הקודם
                        </Button>

                        {currentQuestion === exam.questions.length - 1 ? (
                          <Button 
                            onClick={() => setCurrentSection("writing")} 
                            disabled={isSubmitting}
                            className="flex-1 h-11 sm:h-12 bg-purple-600 text-sm sm:text-base disabled:opacity-50"
                          >
                            המשך לכתיבה
                          </Button>
                        ) : (
                          <Button
                            onClick={handleNextQuestion}
                            disabled={isSubmitting}
                            className="flex-1 h-11 sm:h-12 bg-[#2086b1] text-sm sm:text-base disabled:opacity-50"
                          >
                            הבא
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : ( // Normal display mode
              <div className="space-y-4">
                {exam.reading_text && (
                  <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4 z-10 max-h-[50vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <h3 className="text-base font-bold text-gray-900">Reading Text</h3>
                      </div>
                      <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">📖 Story</span>
                    </div>
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3" dir="ltr">
                      {exam.reading_text}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 sticky top-0 bg-white py-2 z-10 flex items-center gap-2">
                    <span>Questions</span>
                    <span className="text-sm font-normal text-gray-500">({exam.questions.length})</span>
                  </h3>
                  
                  <div className="space-y-6 sm:space-y-8">
                    {exam.questions.map((questionItem) => (
                      <div key={questionItem.question_number} className="pb-6 border-b last:border-b-0">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900">Question {questionItem.question_number}</h3>
                          <span className="bg-blue-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold text-blue-600 flex-shrink-0">
                            {questionItem.points} נק'
                          </span>
                        </div>

                        <div className="text-gray-700 mb-4 text-sm sm:text-base leading-relaxed whitespace-pre-wrap" dir="ltr">
                          {questionItem.question_text}
                        </div>

                        {questionItem.question_type === 'multiple_choice' && questionItem.options && (
                          <div className="space-y-2 sm:space-y-3">
                            {questionItem.options.map((optionValue, optionIndex) => (
                              <button
                                key={optionIndex}
                                onClick={() => handleReadingAnswer(questionItem.question_number, optionValue)}
                                className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                                  readingAnswers[questionItem.question_number] === optionValue
                                    ? 'bg-blue-100 border-blue-500'
                                    : 'bg-white border-blue-500 hover:border-blue-500'
                                }`}
                                dir="ltr"
                              >
                                <div className="text-sm sm:text-base">{optionValue}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {questionItem.question_type === 'short_answer' && (
                          <Input
                            value={readingAnswers[questionItem.question_number] || ''}
                            onChange={(e) => handleReadingAnswer(questionItem.question_number, e.target.value)}
                            placeholder="Type answer..."
                            className="w-full h-11 sm:h-12 text-sm sm:text-base"
                            dir="ltr"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleContinueToWriting} className="w-full h-12 sm:h-14 bg-purple-600 hover:bg-purple-700 mt-6 text-base sm:text-lg font-bold">
                    המשך לחלק הכתיבה
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {currentSection === "writing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">חלק ב' - כתיבה</h3>

              <div className="bg-purple-50 rounded-xl p-6 mb-6 border-2 border-blue-500">
                <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                  {exam.writing_prompt}
                </div>
                <div className="text-sm text-gray-600">
                  כתוב {exam.writing_min_words}-{exam.writing_max_words} מילים באנגלית
                </div>
              </div>

              <Textarea
                placeholder="Start writing here..."
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                className="h-64 text-base"
                dir="ltr"
              />

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  מספר מילים: <span className={`font-bold ${
                    countWords(writingText) >= exam.writing_min_words &&
                    countWords(writingText) <= exam.writing_max_words
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}>
                    {countWords(writingText)}
                  </span> / {exam.writing_min_words}-{exam.writing_max_words}
                </div>

                <Button
                  onClick={handleBackToReading}
                  variant="outline"
                >
                  חזור להבנת הנקרא
                </Button>
              </div>
            </div>

            <Button
              onClick={handleFinishExam}
              disabled={countWords(writingText) < exam.writing_min_words || isSubmitting}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg disabled:opacity-50"
            >
              סיים מבחן
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}