import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, AlertTriangle, BookOpen, Info, Zap, Loader2, Home, Flag, ChevronRight, ChevronLeft } from "lucide-react";
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
import AudioPlayer from "../components/exams/AudioPlayer";

const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const matrix = [];
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= longer.length; j++) {
      if (i === 0) matrix[0][j] = j;
      else {
        const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
  }
  const editDistance = matrix[shorter.length][longer.length];
  return (longer.length - editDistance) / longer.length;
};

const checkAnswerWithAI = async (userAnswer, correctAnswer, questionText, unitLevel = 3) => {
  try {
    let explanationLanguageInstruction = '';
    if (unitLevel === 3) {
      explanationLanguageInstruction = 'Write explanation ONLY in Hebrew (explanation_hebrew field).';
    } else if (unitLevel === 4) {
      explanationLanguageInstruction = 'Write explanations in BOTH Hebrew (explanation_hebrew) and English (explanation_english).';
    } else if (unitLevel === 5) {
      explanationLanguageInstruction = 'Write explanation ONLY in English (explanation field).';
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an experienced English teacher grading ${unitLevel} units level.
      ${explanationLanguageInstruction}
      
      Question: "${questionText}"
      Correct answer: "${correctAnswer}"
      Student answer: "${userAnswer}"
      
      If the content is correct but has spelling errors, mark has_spelling_error=true and deduct up to 20% from score.
      Respond in JSON:`,
      response_json_schema: {
        type: "object",
        properties: {
          is_correct: { type: "boolean" },
          has_spelling_error: { type: "boolean" },
          similarity_score: { type: "number" },
          points_deduction: { type: "number" },
          explanation_hebrew: { type: "string" },
          explanation_english: { type: "string" },
          explanation: { type: "string" },
          feedback_hebrew: { type: "string" }
        },
        required: ["is_correct", "similarity_score"]
      }
    });

    let displayExplanation = '';
    if (unitLevel === 3) {
      displayExplanation = response.explanation_hebrew || response.feedback_hebrew || '';
    } else if (unitLevel === 4) {
      displayExplanation = (response.explanation_hebrew || '') + (response.explanation_hebrew && response.explanation_english ? '\n\n' : '') + (response.explanation_english || '');
    } else if (unitLevel === 5) {
      displayExplanation = response.explanation || response.explanation_english || '';
    }

    return {
      isCorrect: response.is_correct,
      hasSpellingError: response.has_spelling_error || false,
      similarityScore: response.similarity_score,
      pointsDeduction: response.points_deduction || 0,
      explanation: displayExplanation,
      feedback: response.feedback_hebrew || ''
    };
  } catch (error) {
    console.error("Error invoking LLM or parsing response:", error);
    const similarity = calculateSimilarity(userAnswer.toLowerCase().trim(), correctAnswer.toLowerCase().trim());
    return {
      isCorrect: similarity >= 0.85,
      hasSpellingError: false,
      similarityScore: Math.round(similarity * 100),
      pointsDeduction: 0,
      explanation: similarity >= 0.85 ? "התשובה קרובה מאוד." : "התשובה שונה.",
      feedback: `התשובה הנכונה: ${correctAnswer}`
    };
  }
};

export default function ExamModuleAPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [currentSection, setCurrentSection] = useState("reading");
  const [readingAnswers, setReadingAnswers] = useState({});
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2700);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);
  const [showDetailedExplanations, setShowDetailedExplanations] = useState(false);
  const [showAdForExplanations, setShowAdForExplanations] = useState(false);

  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [displayMode, setDisplayMode] = useState('exam');
  const [hasStarted, setHasStarted] = useState(false);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentListeningQuestion, setCurrentListeningQuestion] = useState(0);
  const [savedProgress, setSavedProgress] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [audioPlayCount, setAudioPlayCount] = useState(0);

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportingQuestion, setReportingQuestion] = useState(null);

  // NEW: State for all exam attempts by the user
  const [examAttempts, setExamAttempts] = useState([]);

  // Derived state for premium status
  const isPremium = user?.is_premium || false;

  // Derived state for the current module being analyzed for stats
  const currentModule = useMemo(() => {
    if (!exam) return null;
    return {
      id: exam.id,
      entity: 'ModuleAExam', // This page specifically handles Module A exams
      exam_type: 'module_a' // Corresponding exam_type used in ExamAttempt records
    };
  }, [exam]);

  // NEW: Effect to fetch exam attempts for the current user
  useEffect(() => {
    if (user?.id) {
      const fetchAttempts = async () => {
        try {
          // Fetch all exam attempts for the logged-in user
          const attempts = await base44.entities.ExamAttempt.filter({ user_id: user.id });
          setExamAttempts(attempts);
        } catch (error) {
          console.error("Error fetching exam attempts:", error);
        }
      };
      fetchAttempts();
    }
  }, [user]); // Re-run when user changes

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.is_premium) {
          setShowDetailedExplanations(true);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setUser({ id: "guest", email: "guest@example.com", is_premium: false, skip_exam_intro: false, role: 'user' });
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user === undefined || user === null) return;

    const loadExam = async () => {
      const params = new URLSearchParams(location.search);
      const examId = params.get('examId');

      if (examId) {
        try {
          const exams = await base44.entities.ModuleAExam.list();
          const foundExam = exams.find(examItem => examItem.id === examId);

          if (foundExam) {
            setExam(foundExam);

            const progressList = await base44.entities.ExamProgress.filter({
              exam_id: examId,
              completed: false,
              user_id: user.id // Filter by user_id for progress
            });

            if (progressList.length > 0) {
              setSavedProgress(progressList[0]);
              setShowResumeDialog(true);
            } else {
              setShowIntroDialog(true);
            }
          }
        } catch (error) {
          console.error("Error loading exam:", error);
        }
      }
    };
    loadExam();
  }, [location, user]);

  useEffect(() => {
    if (!exam || showResults || !hasStarted || displayMode !== "exam") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowResults(true);
          setResults({ loading: true });
          setHasStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, showResults, hasStarted, displayMode]);

  useEffect(() => {
    if (!hasStarted || !exam || showResults || displayMode === "practice") return;

    const saveInterval = setInterval(() => {
      saveProgress();
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [hasStarted, exam, showResults, readingAnswers, listeningAnswers, currentSection, currentQuestion, currentListeningQuestion, timeLeft, displayMode, audioPlayCount, user]); // Added user to dependencies

  const saveProgress = async () => {
    if (!exam || showResults) return;
    try {
      const progressData = {
        exam_id: exam.id,
        exam_type: 'module_a',
        subject: exam.subject,
        unit_level: exam.unit_level || 3,
        current_section: currentSection,
        current_question: currentSection === 'reading' ? currentQuestion : currentListeningQuestion,
        reading_answers: readingAnswers,
        listening_answers: listeningAnswers,
        time_left: timeLeft,
        display_mode: displayMode,
        audio_play_count: audioPlayCount,
        completed: false,
        user_id: user?.id // Ensure user_id is saved with progress
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
      setCurrentSection(savedProgress.current_section || 'reading');
      setCurrentQuestion(savedProgress.current_question || 0);
      setCurrentListeningQuestion(savedProgress.current_question || 0);
      setReadingAnswers(savedProgress.reading_answers || {});
      setListeningAnswers(savedProgress.listening_answers || {});
      setTimeLeft(savedProgress.time_left || 2700);
      setDisplayMode(savedProgress.display_mode || 'exam');
      setAudioPlayCount(savedProgress.audio_play_count || 0);
      setShowResumeDialog(false);
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

    setShowResumeDialog(false);
    setShowIntroDialog(true);
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

  const handleListeningAnswer = (questionNumber, answer) => {
    setListeningAnswers({
      ...listeningAnswers,
      [questionNumber]: answer
    });
  };

  const calculateScore = useCallback(async () => {
    let readingScore = 0;
    let listeningScore = 0;
    const readingResults = [];
    const listeningResults = [];
    const unitLevel = exam.unit_level || 3;

    for (const questionItem of exam.reading_questions) {
      const userAnswer = readingAnswers[questionItem.question_number];
      let isCorrect = false;
      let pointsAwarded = 0;
      let aiEvaluation = null;

      if (userAnswer && userAnswer.trim() !== "") {
        if (questionItem.question_type === 'multiple_choice') {
          isCorrect = userAnswer.toLowerCase().trim() === questionItem.correct_answer.toLowerCase().trim();
          pointsAwarded = isCorrect ? questionItem.points : 0;
        } else {
          aiEvaluation = await checkAnswerWithAI(userAnswer, questionItem.correct_answer, questionItem.question_text, unitLevel);
          isCorrect = aiEvaluation.isCorrect;
          
          if (aiEvaluation.isCorrect) {
            pointsAwarded = questionItem.points;
            if (aiEvaluation.hasSpellingError) {
              const deduction = Math.min(aiEvaluation.pointsDeduction > 0 ? aiEvaluation.pointsDeduction : questionItem.points * 0.2, questionItem.points * 0.2);
              pointsAwarded = Math.max(0, questionItem.points - deduction); // Ensure points don't go below zero
            }
          }
        }
      }

      readingScore += pointsAwarded;
      readingResults.push({
        question_number: questionItem.question_number,
        question_text: questionItem.question_text,
        user_answer: userAnswer || "לא נענה",
        correct_answer: questionItem.correct_answer,
        is_correct: isCorrect,
        points_awarded: Math.round(pointsAwarded),
        ai_evaluation: aiEvaluation,
        points: questionItem.points,
        has_spelling_error: aiEvaluation?.hasSpellingError || false
      });
    }

    for (const questionItem of exam.listening_questions) {
      const userAnswer = listeningAnswers[questionItem.question_number];
      let isCorrect = false;
      let pointsAwarded = 0;
      let aiEvaluation = null;

      if (userAnswer && userAnswer.trim() !== "") {
        aiEvaluation = await checkAnswerWithAI(userAnswer, questionItem.correct_answer, questionItem.question_text, unitLevel);
        isCorrect = aiEvaluation.isCorrect;
        
        if (aiEvaluation.isCorrect) {
          pointsAwarded = questionItem.points;
          if (aiEvaluation.hasSpellingError) {
            const deduction = Math.min(aiEvaluation.pointsDeduction > 0 ? aiEvaluation.pointsDeduction : questionItem.points * 0.2, questionItem.points * 0.2);
            pointsAwarded = Math.max(0, questionItem.points - deduction); // Ensure points don't go below zero
          }
        }
      }

      listeningScore += pointsAwarded;
      listeningResults.push({
        question_number: questionItem.question_number,
        question_text: questionItem.question_text,
        user_answer: userAnswer || "לא נענה",
        correct_answer: questionItem.correct_answer,
        is_correct: isCorrect,
        points_awarded: Math.round(pointsAwarded),
        ai_evaluation: aiEvaluation,
        points: questionItem.points,
        has_spelling_error: aiEvaluation?.hasSpellingError || false
      });
    }

    const finalScore = readingScore + listeningScore;
    const scorePercent = Math.round((finalScore / 100) * 100);
    const passed = scorePercent >= (exam.passing_grade || 56);

    return {
      readingScore,
      listeningScore,
      finalScore,
      scorePercent,
      passed,
      readingResults,
      listeningResults
    };
  }, [exam, readingAnswers, listeningAnswers]);

  useEffect(() => {
    const performGradingAndSaving = async () => {
      if (!exam || !showResults || !results?.loading) {
        return;
      }

      try {
        if (savedProgress?.id) {
          await base44.entities.ExamProgress.update(savedProgress.id, { completed: true });
          setSavedProgress(null);
        }

        const score = await calculateScore();
        setResults(score);

        if (displayMode === "exam") {
          await base44.entities.ExamAttempt.create({
            exam_id: exam.id,
            subject: exam.subject,
            unit_level: exam.unit_level || 3,
            started_at: new Date(Date.now() - (2700 - timeLeft) * 1000).toISOString(),
            submitted_at: new Date().toISOString(),
            answers: [...score.readingResults, ...score.listeningResults].map(resultItem => ({
              item_id: `q${resultItem.question_number}`,
              user_answer: resultItem.user_answer,
              is_correct: resultItem.is_correct,
              points_earned: resultItem.points_awarded
            })),
            score_percent: score.scorePercent,
            passed: score.passed,
            total_points: 100,
            earned_points: score.finalScore,
            exam_type: 'module_a',
            user_id: user?.id // Ensure user_id is saved with the attempt
          });
        }

        await base44.entities.ModuleAResult.create({
          exam_id: exam.id,
          reading_score: score.readingScore,
          listening_score: score.listeningScore,
          final_score: score.finalScore,
          reading_answers: score.readingResults,
          listening_answers: score.listeningResults,
          duration: (displayMode === "exam") ? Math.floor((2700 - timeLeft) / 60) : 0,
          passed: score.passed,
          subject: exam.subject,
          unit_level: exam.unit_level || 3,
          user_id: user?.id // Ensure user_id is saved with the result
        });
      } catch (error) {
        console.error("Error saving results:", error);
        setResults({
          loading: false,
          error: true,
          message: "אירעה שגיאה בשמירת התוצאות"
        });
      }
    };

    if (showResults && results?.loading) {
      performGradingAndSaving();
    }
  }, [showResults, results?.loading, exam, savedProgress, calculateScore, displayMode, timeLeft, user?.id]);

  const handleFinishExam = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setShowResults(true);
    setResults({ loading: true });
    setHasStarted(false);
  };

  const handleShowExplanations = () => {
    if (user?.is_premium) {
      setShowDetailedExplanations(true);
    } else {
      setShowAdForExplanations(true);
    }
  };

  const handleAdComplete = () => {
    setShowAdForExplanations(false);
    setShowDetailedExplanations(true);
  };

  const handleStartExam = () => {
    setShowIntroDialog(false);
    setHasStarted(true);
  };

  const handleSkipIntroForever = async () => {
    try {
      await base44.auth.updateMe({ skip_exam_intro: true });
      setShowIntroDialog(false);
      setHasStarted(true);
    } catch (error) {
      console.error("Error updating user settings:", error);
      setShowIntroDialog(false);
      setHasStarted(true);
    }
  };

  const handleExitAttempt = async () => {
    await saveProgress();
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    navigate(createPageUrl("Exams"));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextQuestion = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    if (currentSection === 'reading') {
      if (currentQuestion < exam.reading_questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setTimeout(() => setIsSubmitting(false), 300);
      } else {
        setCurrentSection("listening");
        setTimeout(() => setIsSubmitting(false), 300);
      }
    } else {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleReportQuestion = async () => {
    if (!reportText.trim()) {
      alert('נא להזין את פרטי הדיווח');
      return;
    }

    try {
      await base44.entities.ExamReport.create({
        exam_id: exam.id,
        question_number: reportingQuestion,
        report_text: reportText,
        subject: exam.subject,
        unit_level: exam.unit_level,
        user_email: user?.email || 'guest'
      });

      alert('✅ הדיווח נשלח בהצלחה! תודה');
      setShowReportDialog(false);
      setReportText("");
      setReportingQuestion(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert('שגיאה בשליחת הדיווח.');
    }
  };

  // NEW: moduleStats implementation
  const moduleStats = useMemo(() => {
    if (!currentModule || !examAttempts || examAttempts.length === 0) {
      return {
        totalAttempts: 0,
        passedAttempts: 0,
        avgScore: 0,
        progress: 0,
        maxExams: isPremium ? 100 : 10
      };
    }

    const moduleAttempts = examAttempts.filter(attemptItem => {
      // The logic here is directly from the outline, assuming 'currentModule'
      // is designed to identify the type of exam module (A, B, C, Generic).
      // For ExamModuleAPage, currentModule.entity will be 'ModuleAExam'.
      if (currentModule.entity === 'ModuleAExam' && attemptItem.exam_type === 'module_a') return true;
      if (currentModule.entity === 'ModuleBExam' && attemptItem.exam_type === 'module_b') return true;
      if (currentModule.entity === 'ModuleCExam' && attemptItem.exam_type === 'module_c') return true;
      if (currentModule.entity === 'GenericExam' && attemptItem.module_id === currentModule.id) return true;
      return false;
    });

    const totalAttempts = moduleAttempts.length;
    // Use exam.passing_grade if available, otherwise default to 56 as per existing logic
    const passingGrade = exam?.passing_grade || 56;
    const passedAttempts = moduleAttempts.filter(attemptItem => (attemptItem.score_percent || 0) >= passingGrade).length;
    const avgScore = totalAttempts > 0
      ? Math.round(moduleAttempts.reduce((sum, attemptItem) => sum + (attemptItem.score_percent || 0), 0) / totalAttempts)
      : 0;

    const maxExams = isPremium ? 100 : 10;
    const progress = Math.min(100, (totalAttempts / maxExams) * 100);

    return {
      totalAttempts,
      passedAttempts,
      avgScore,
      progress: Math.round(progress),
      maxExams
    };
  }, [currentModule, examAttempts, isPremium, exam]); // Added 'exam' to dependencies for passingGrade

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-lg text-gray-600">טוען מבחן...</div>
        </div>
      </div>
    );
  }

  if (showResumeDialog) {
    return (
      <Dialog open={showResumeDialog} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>מבחן בתהליך</DialogTitle>
            <DialogDescription>נמצא מבחן שלא הושלם. להמשיך?</DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="text-sm space-y-1">
              <p><strong>חלק:</strong> {savedProgress.current_section === 'reading' ? 'הבנת הנקרא' : 'האזנה'}</p>
              <p><strong>זמן שנותר:</strong> {Math.floor(savedProgress.time_left / 60)} דקות</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button onClick={handleStartFresh} variant="outline" className="flex-1 h-12">התחל מחדש</Button>
            <Button onClick={handleResumeProgress} className="flex-1 h-12 bg-blue-600">המשך</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showIntroDialog) {
    return (
      <Dialog open={showIntroDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">ברוכים הבאים למבחן Module A</DialogTitle>
            <DialogDescription className="text-gray-600">
              מבחן זה כולל הבנת הנקרא והאזנה.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleStartExam} className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg">
              התחל מבחן
            </Button>
            <Button variant="outline" onClick={handleSkipIntroForever} className="w-full h-12 text-lg">
              דלג על ההקדמה בפעמים הבאות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (showModeSelection && !hasStarted) {
    return (
      <Dialog open={showModeSelection} onOpenChange={() => {}}>
        <DialogContent dir="rtl" className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-2">בחר מצב בחינה</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => handleModeSelect('exam')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-300"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">מצב רגיל</h3>
              <p className="text-sm text-gray-600">טקסט ושאלות בצד לצד</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => handleModeSelect('interactive')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-300"
            >
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">מצב אינטראקטיבי</h3>
              <p className="text-sm text-gray-600">טקסט בצד, שאלה אחת בצד</p>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showResults && results?.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">בודק תשובות...</h1>
        </div>
      </div>
    );
  }

  if (showResults && results?.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h1>
          <p className="text-gray-600 mb-4">{results.message}</p>
          <Button onClick={() => window.location.reload()} className="h-14 bg-red-600">נסה שוב</Button>
        </div>
      </div>
    );
  }

  if (showResults && !results?.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        {showAdForExplanations && (
          <AdManager onContinue={handleAdComplete}>
            <div>Loading ad...</div>
          </AdManager>
        )}

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

            <div className="text-6xl font-bold mb-2" style={{
              color: results.passed ? '#10B981' : '#EF4444'
            }}>
              {results.scorePercent}
            </div>

            <div className="text-gray-600 mb-4">{results.finalScore} מתוך 100 נקודות</div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">הבנת נקרא</div>
                <div className="text-2xl font-bold">{results.readingScore}</div>
                <div className="text-xs text-gray-500">מתוך 70</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">האזנה</div>
                <div className="text-2xl font-bold">{results.listeningScore}</div>
                <div className="text-xs text-gray-500">מתוך 30</div>
              </div>
            </div>

            {/* Display Module Stats */}
            {currentModule && (
              <div className="bg-blue-50 rounded-xl p-4 mt-6 border border-blue-200 text-sm text-gray-700">
                <h4 className="font-semibold text-lg mb-2">סטטיסטיקות Module A שלך</h4>
                <p><strong>סה"כ ניסיונות:</strong> {moduleStats.totalAttempts}</p>
                <p><strong>ניסיונות מוצלחים:</strong> {moduleStats.passedAttempts}</p>
                <p><strong>ציון ממוצע:</strong> {moduleStats.avgScore}%</p>
                <p><strong>התקדמות (מבחנים שנעשו):</strong> {moduleStats.progress}% ( {moduleStats.totalAttempts} / {moduleStats.maxExams} )</p>
                <Progress value={moduleStats.progress} className="w-full mt-2 h-2" />
              </div>
            )}

            {!user?.is_premium && !showDetailedExplanations && (
              <Button
                onClick={handleShowExplanations}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 mt-4"
              >
                צפה בהסברים מפורטים
              </Button>
            )}
          </div>

          {(user?.is_premium || showDetailedExplanations) && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">סקירת תשובות</h3>
              <div className="space-y-4">
                {results.readingResults.map((resultItem, resultIndex) => (
                  <div key={resultIndex} className={`rounded-xl p-4 border-2 ${
                    resultItem.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="font-semibold mb-2">שאלה {resultItem.question_number}</div>
                    <div className="text-sm space-y-1">
                      <div>תשובתך: {resultItem.user_answer}</div>
                      {!resultItem.is_correct && <div className="text-green-700">תשובה נכונה: {resultItem.correct_answer}</div>}
                      {resultItem.ai_evaluation?.explanation && <div className="text-gray-700 mt-2">{resultItem.ai_evaluation.explanation}</div>}
                      {resultItem.has_spelling_error && <div className="text-amber-700 mt-2">ישנן שגיאות כתיב קלות, ניקוד הופחת.</div>}
                    </div>
                  </div>
                ))}

                {results.listeningResults.map((resultItem, resultIndex) => (
                  <div key={resultIndex} className={`rounded-xl p-4 border-2 ${
                    resultItem.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="font-semibold mb-2">שאלת האזנה {resultItem.question_number}</div>
                    <div className="text-sm space-y-1">
                      <div>תשובתך: {resultItem.user_answer}</div>
                      {!resultItem.is_correct && <div className="text-green-700">תשובה נכונה: {resultItem.correct_answer}</div>}
                      {resultItem.ai_evaluation?.explanation && <div className="text-gray-700 mt-2">{resultItem.ai_evaluation.explanation}</div>}
                      {resultItem.has_spelling_error && <div className="text-amber-700 mt-2">ישנן שגיאות כתיב קלות, ניקוד הופחת.</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={() => navigate(createPageUrl("Exams"))} className="flex-1 h-14 bg-blue-600">חזרה</Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="flex-1 h-14">נסה שוב</Button>
          </div>
        </div>
      </div>
    );
  }

  if (hasStarted && !showResults && currentSection === 'listening') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={handleExitAttempt} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <Clock className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">האזנה</h1>
        </div>

        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="mb-6">
            <AudioPlayer
              audioUrl={exam.listening_audio_url}
              audioText={exam.listening_transcript}
              captionUrl={exam.listening_caption_url}
              playLimit={2}
              onPlayCountChange={setAudioPlayCount}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            {exam.listening_questions.map((questionItem) => (
              <div key={questionItem.question_number} className="pb-6 border-b last:border-b-0">
                <h4 className="font-bold text-gray-900 mb-3">שאלה {questionItem.question_number} ({questionItem.points} נקודות)</h4>
                <p className="text-gray-700 mb-4" dir="ltr">{questionItem.question_text}</p>
                <Input
                  placeholder="Your answer..."
                  value={listeningAnswers[questionItem.question_number] || ""}
                  onChange={(e) => handleListeningAnswer(questionItem.question_number, e.target.value)}
                  className="h-12"
                  dir="ltr"
                />
              </div>
            ))}

            <Button 
              onClick={handleFinishExam} 
              disabled={isSubmitting}
              className="w-full h-14 bg-blue-600 disabled:opacity-50"
            >
              סיים מבחן
            </Button>
          </div>
        </div>

        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-600" />
                דווח על שגיאה
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">אנא תאר את הבעיה בשאלה {reportingQuestion}</p>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="לדוגמה: התשובה צריכה להיות..."
                className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setShowReportDialog(false)} variant="outline" className="flex-1">ביטול</Button>
              <Button onClick={handleReportQuestion} className="flex-1 bg-amber-600">שלח</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>יציאה מהמבחן?</DialogTitle></DialogHeader>
            <p>ההתקדמות תישמר.</p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setShowExitDialog(false)} variant="outline" className="flex-1">המשך</Button>
              <Button onClick={handleConfirmExit} className="flex-1 bg-rose-600">צא</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (hasStarted && !showResults && currentSection === 'reading') {
    if (!exam?.reading_questions || exam.reading_questions.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">לא נמצאו שאלות קריאה במבחן זה</p>
          </div>
        </div>
      );
    }

    const readingQuestion = exam.reading_questions[currentQuestion];
    const readingProgress = ((currentQuestion + 1) / exam.reading_questions.length) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-b-[2rem] p-4 shadow-xl mb-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={handleExitAttempt} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <Clock className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-white text-center mb-2">{exam.title}</h1>
          <Progress value={readingProgress} className="h-2 bg-white/20" />
          <div className="flex justify-between text-white text-xs mt-2">
            <span>שאלה {currentQuestion + 1} מתוך {exam.reading_questions.length}</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-6">
          <div className="grid lg:grid-cols-5 gap-4">
            {exam.reading_text && (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:sticky lg:top-4">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Reading Text
                </h3>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3" dir="ltr">
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
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Question {readingQuestion.question_number}</h2>
                    <div className="bg-blue-100 px-3 py-1 rounded-full text-sm font-bold text-blue-600">
                      {readingQuestion.points} נק'
                    </div>
                  </div>

                  <p className="text-gray-700 text-base sm:text-lg mb-6 whitespace-pre-wrap" dir="ltr">{readingQuestion.question_text}</p>

                  {readingQuestion.question_type === 'multiple_choice' && readingQuestion.options && (
                    <div className="space-y-3">
                      {readingQuestion.options.map((optionValue, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => handleReadingAnswer(readingQuestion.question_number, optionValue)}
                          className={`w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                            readingAnswers[readingQuestion.question_number] === optionValue
                              ? 'bg-blue-100 border-blue-500'
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                          dir="ltr"
                        >
                          {optionValue}
                        </button>
                      ))}
                    </div>
                  )}

                  {readingQuestion.question_type !== 'multiple_choice' && (
                    <Input
                      value={readingAnswers[readingQuestion.question_number] || ''}
                      onChange={(e) => handleReadingAnswer(readingQuestion.question_number, e.target.value)}
                      placeholder="Type your answer..."
                      className="w-full h-12 text-base sm:text-lg"
                      dir="ltr"
                    />
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handlePrevQuestion}
                      disabled={currentQuestion === 0}
                      variant="outline"
                      className="flex-1 h-11 sm:h-12"
                    >
                      <ChevronRight className="w-5 h-5 ml-2" />
                      הקודם
                    </Button>

                    {currentQuestion === exam.reading_questions.length - 1 ? (
                      <Button 
                        onClick={() => setCurrentSection('listening')} 
                        disabled={isSubmitting}
                        className="flex-1 h-11 sm:h-12 bg-purple-600 disabled:opacity-50"
                      >
                        המשך להאזנה
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextQuestion}
                        disabled={isSubmitting}
                        className="flex-1 h-11 sm:h-12 bg-blue-600 disabled:opacity-50"
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

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>יציאה מהמבחן?</DialogTitle></DialogHeader>
            <p>ההתקדמות תישמר.</p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setShowExitDialog(false)} variant="outline" className="flex-1">המשך</Button>
              <Button onClick={handleConfirmExit} className="flex-1 bg-rose-600">צא</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
    </div>
  );
}