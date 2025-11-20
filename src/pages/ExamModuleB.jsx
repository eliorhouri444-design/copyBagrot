import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, AlertTriangle, BookOpen, Info, Zap, Loader2, Edit3, ChevronRight, ChevronLeft } from "lucide-react";
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

// הוסף את פונקציות ה-AI מ-ExamModuleA
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const getEditDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const checkAnswerWithAI = async (userAnswer, correctAnswer, questionText) => {
  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה מורה לאנגלית מנוסה הבודק תשובות דקדוק של תלמיד בבחינת בגרות ישראלית.

בדוק את תשובת התלמיד לשאלה הבאה:
שאלה: "${questionText}"
תשובה נכונה: "${correctAnswer}"
תשובת התלמיד: "${userAnswer}"

הערך אם תשובת התלמיד נכונה, תוך התחשבות ב:
1. התאמה במשמעות ובהקשר.
2. שגיאות כתיב קטנות (אות-שתיים) מקובלות אם הכוונה ברורה.
3. ניסוח שונה אך בעל אותה משמעות.
4. דמיון במבנה הדקדוקי.

הגב בפורמט JSON בלבד, בעברית, תוך שימוש במפתח "explanation_hebrew" עבור ההסבר ובמפתח "feedback_hebrew" עבור משוב.`,
      response_json_schema: {
        type: "object",
        properties: {
          is_correct: { type: "boolean" },
          similarity_score: { type: "number", description: "ציון דמיון בין 0 ל-100" },
          explanation_hebrew: { type: "string", description: "הסבר בעברית מדוע התשובה נכונה/לא נכונה" },
          feedback_hebrew: { type: "string", description: "משוב כללי לתשובה בעברית" }
        },
        required: ["is_correct", "similarity_score", "explanation_hebrew"]
      }
    });

    return {
      isCorrect: response.is_correct,
      similarityScore: response.similarity_score,
      explanation: response.explanation_hebrew,
      feedback: response.feedback_hebrew
    };
  } catch (error) {
    console.error("AI checkAnswerWithAI error:", error);
    const userLower = userAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();
    const similarity = calculateSimilarity(userLower, correctLower);

    return {
      isCorrect: similarity > 0.85,
      similarityScore: similarity * 100,
      explanation: similarity > 0.85 ? "המערכת זיהתה דמיון גבוה מאוד בתשובה (בדיקה אוטומטית)." : "המערכת זיהתה חוסר התאמה בתשובה (בדיקה אוטומטית).",
      feedback: `בדיקת גיבוי: דמיון ${Math.round(similarity * 100)}%. התשובה הנכונה היא: ${correctAnswer}`
    };
  }
};

export default function ExamModuleBPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [exam, setExam] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSection, setCurrentSection] = useState("grammar");
  const [grammarAnswers, setGrammarAnswers] = useState({});
  const [writingText, setWritingText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes (2700 seconds)
  const [results, setResults] = useState(null); // This will hold { loading: true } initially on finish
  const [user, setUser] = useState(null);
  const [showDetailedExplanations, setShowDetailedExplanations] = useState(false);
  const [showAdForExplanations, setShowAdForExplanations] = useState(false);

  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [displayMode, setDisplayMode] = useState('exam');
  const [hasStarted, setHasStarted] = useState(false);

  // New states for persistent progress and interactive grammar
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0); // Index for grammar questions
  const [savedProgress, setSavedProgress] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // If user is premium, show explanations by default
        if (currentUser?.is_premium) {
          setShowDetailedExplanations(true);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        // If user loading fails, set a guest user to avoid blocking
        setUser({ id: "guest", email: "guest@example.com", is_premium: false, skip_exam_intro: false, role: 'user' });
      }
    };
    loadUser();
  }, []);

  // Load exam and check for saved progress after user is loaded
  useEffect(() => {
    // Only proceed if user data is loaded (could be null or an object)
    if (user === undefined || user === null) return; // Use undefined/null to check if user has been loaded at least once

    const loadExam = async () => {
      const params = new URLSearchParams(location.search);
      const examId = params.get('examId');
      const mode = params.get('mode');

      // Check if in edit mode
      if (mode === 'edit' && user?.role === 'admin') {
        setIsEditMode(true);
      }

      if (examId) {
        try {
          const exams = await base44.entities.ModuleBExam.list();
          const foundExam = exams.find(e => e.id === examId);

          if (foundExam) {
            setExam(foundExam);

            // Skip exam flow if in edit mode
            if (mode === 'edit' && user?.role === 'admin') {
              return;
            }

            // Check for existing progress for this user and exam
            const progressList = await base44.entities.ExamProgress.filter({
              exam_id: examId,
              completed: false
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
          // Handle error, maybe navigate back or show a message
        }
      }
    };
    loadExam();
  }, [location, user]); // Depend on user state to ensure it's loaded

  // Timer logic
  useEffect(() => {
    // Only start timer if exam is loaded, results are not shown, exam has started, and it's 'exam' or 'interactive' mode
    if (!exam || showResults || !hasStarted || (displayMode !== "exam" && displayMode !== "interactive")) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          // Auto-submit when time runs out. Trigger the result display and grading.
          setShowResults(true);
          setResults({ loading: true });
          setHasStarted(false); // Stop further timer/auto-save actions
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, showResults, hasStarted, displayMode]);

  // Auto-save progress logic
  useEffect(() => {
    // Only auto-save if exam has started, not showing results, and not in practice mode (practice is untimed, and users might not want frequent saves)
    if (!hasStarted || !exam || showResults || displayMode === "practice") return;

    const saveInterval = setInterval(() => {
      saveProgress();
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [hasStarted, exam, showResults, grammarAnswers, writingText, currentSection, currentQuestion, timeLeft, displayMode]);

  const saveProgress = async () => {
    if (!exam || showResults) return; // Don't save if exam not loaded or results are already shown
    try {
      const progressData = {
        exam_id: exam.id,
        exam_type: 'module_b', // Specify exam type for filtering if needed later
        subject: exam.subject,
        unit_level: exam.unit_level || 3,
        current_section: currentSection,
        current_question: currentQuestion, // Save current grammar question index
        reading_answers: grammarAnswers,
        writing_text: writingText,
        time_left: timeLeft,
        display_mode: displayMode,
        completed: false // Mark as not completed yet
      };

      if (savedProgress?.id) {
        // Update existing progress record
        await base44.entities.ExamProgress.update(savedProgress.id, progressData);
      } else {
        // Create a new progress record
        const newProgress = await base44.entities.ExamProgress.create(progressData);
        setSavedProgress(newProgress); // Store the newly created progress object
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleResumeProgress = () => {
    if (savedProgress) {
      setCurrentSection(savedProgress.current_section || 'grammar');
      setCurrentQuestion(savedProgress.current_question || 0);
      setGrammarAnswers(savedProgress.reading_answers || {});
      setWritingText(savedProgress.writing_text || "");
      setTimeLeft(savedProgress.time_left || 2700);
      setShowResumeDialog(false);
      setHasStarted(true);
    }
  };

  const handleStartFresh = async () => {
    if (savedProgress?.id) {
      try {
        // Delete the saved progress if starting fresh
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
    if (displayMode === "practice") { // Only practice is untimed now
      return "ללא הגבלת זמן";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGrammarAnswer = (questionNumber, answer) => {
    setGrammarAnswers({
      ...grammarAnswers,
      [questionNumber]: answer
    });
  };

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const calculateScore = useCallback(async () => {
    let grammarScore = 0;
    const grammarResults = [];
    let writingScore = 0;
    let writingFeedback = {};
    const wordCount = countWords(writingText);

    const [grammarGrading, writingGrading] = await Promise.all([
      // Grammar check
      (async () => {
        const results = [];
        let totalGrammarPointsAwarded = 0;

        for (const questionItem of exam.grammar_questions) {
          const userAnswer = grammarAnswers[questionItem.question_number];
          let isCorrect = false;
          let pointsAwarded = 0;
          let aiEvaluation = null;

          if (userAnswer && userAnswer.trim() !== "") {
            if (questionItem.question_type === 'fill_in_blank') {
              aiEvaluation = await checkAnswerWithAI(
                userAnswer,
                questionItem.correct_answer,
                questionItem.question_text
              );

              isCorrect = aiEvaluation.isCorrect;
              if (aiEvaluation.similarityScore >= 85) {
                pointsAwarded = questionItem.points;
              } else if (aiEvaluation.similarityScore >= 70) {
                pointsAwarded = Math.floor(questionItem.points * 0.7);
              }
            } else if (questionItem.question_type === 'multiple_choice') {
              isCorrect = userAnswer === questionItem.correct_answer;
              pointsAwarded = isCorrect ? questionItem.points : 0;
            } else { // Fallback for unknown types
              isCorrect = userAnswer.toLowerCase().trim() === questionItem.correct_answer.toLowerCase().trim();
              pointsAwarded = isCorrect ? questionItem.points : 0;
            }
          }

          totalGrammarPointsAwarded += pointsAwarded;
          results.push({
            question_number: questionItem.question_number,
            question_text: questionItem.question_text,
            user_answer: userAnswer || "לא נענה",
            correct_answer: questionItem.correct_answer,
            is_correct: isCorrect,
            points_awarded: pointsAwarded,
            ai_evaluation: aiEvaluation,
            points: questionItem.points
          });
        }
        return { totalGrammarPointsAwarded, results };
      })(),

      // Writing check concurrently
      (async () => {
        if (wordCount === 0) {
          return { score: 0, feedback: {} };
        }

        try {
          const aiWritingResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `אתה מורה לאנגלית מנוסה הבודק כתיבה קצרה (35-45 מילים) של תלמיד בבחינת בגרות ישראלית.

נושא: ${exam.writing_prompt}
טקסט התלמיד: ${writingText}
מספר מילים: ${wordCount} (יעד: ${exam.writing_min_words}-${exam.writing_max_words})

דרג את הכתיבה מתוך 30 נקודות, וספק משוב מפורט:
- תוכן (0-10): האם ענה על הנושא? תגובה מלאה? רעיונות רלוונטיים?
- ארגון (0-8): האם יש מבנה ברור? רצף הגיוני של משפטים ורעיונות?
- שפה ואוצר מילים (0-7): בחירת מילים מתאימה? מגוון? בהירות?
- דקדוק ודיוק (0-5): שימוש נכון במבנים דקדוקיים? איות? פיסוק?

הורד נקודות עבור:
- שגיאות כתיב: כל 2-3 שגיאות דומות = -1 נקודה
- שגיאות דקדוק נפוצות: כל אחת = -0.5 נקודה
- מילים מחוץ לטווח: -3 עד -5 נקודות אם חורג משמעותית (מעל 50 מילים או מתחת 30 מילים)

חשוב מאוד: כתוב את כל המשוב וההסברים בעברית בלבד! אל תכתוב באנגלית!

ענה ב-JSON:`,
            response_json_schema: {
              type: "object",
              properties: {
                total_score: { type: "number" },
                content_score: { type: "number" },
                organization_score: { type: "number" },
                language_score: { type: "number" },
                grammar_score: { type: "number" },
                feedback_hebrew: { type: "string", description: "משוב כללי בעברית בלבד!" },
                strengths: { type: "array", items: { type: "string", description: "חוזקה בעברית" } },
                improvements: { type: "array", items: { type: "string", description: "נקודת שיפור בעברית" } }
              },
              required: ["total_score", "feedback_hebrew"]
            }
          });

          return {
            score: Math.round(aiWritingResponse.total_score),
            feedback: aiWritingResponse
          };
        } catch (error) {
          console.error("AI writing grading error:", error);
          let fallbackScore = 0;
          if (wordCount >= exam.writing_min_words && wordCount <= exam.writing_max_words + 5) {
            fallbackScore = 25;
            if (wordCount >= exam.writing_min_words && wordCount <= exam.writing_max_words) {
              fallbackScore = 28;
            }
          } else if (wordCount > 0) {
            fallbackScore = 15;
          }
          return {
            score: fallbackScore,
            feedback: { feedback_hebrew: "בדיקה אוטומטית בסיסית בוצעה עקב תקלה במערכת ה-AI." }
          };
        }
      })()
    ]);

    // Process results
    grammarScore = grammarGrading.totalGrammarPointsAwarded;
    grammarResults.push(...grammarGrading.results);
    writingScore = writingGrading.score;
    writingFeedback = writingGrading.feedback;

    const finalScore = grammarScore + writingScore;
    const scorePercent = Math.round((finalScore / 100) * 100);
    const passed = scorePercent >= (exam.passing_grade || 56);

    return {
      grammarScore,
      writingScore,
      finalScore,
      scorePercent,
      passed,
      grammarResults,
      wordCount,
      writingFeedback
    };
  }, [exam, grammarAnswers, writingText]); // Dependencies for useCallback

  // Effect to perform grading and saving once `showResults` and `results.loading` are set
  useEffect(() => {
    const performGradingAndSaving = async () => {
      if (!exam || !showResults || !results?.loading) {
        return;
      }

      try {
        // If there's saved progress, mark it as completed
        if (savedProgress?.id) {
          await base44.entities.ExamProgress.update(savedProgress.id, { completed: true });
          setSavedProgress(null); // Clear saved progress after finishing
        }

        const score = await calculateScore();
        setResults(score); // Update results with actual score

        // Only create an ExamAttempt record if in 'exam' mode
        if (displayMode === "exam") {
          await base44.entities.ExamAttempt.create({
            exam_id: exam.id,
            subject: exam.subject,
            unit_level: exam.unit_level || 3,
            // Calculate started_at based on original timeLeft (2700) and current timeLeft
            started_at: new Date(Date.now() - (2700 - timeLeft) * 1000).toISOString(),
            submitted_at: new Date().toISOString(),
            answers: score.grammarResults.map(r => ({
              item_id: `q${r.question_number}`,
              user_answer: r.user_answer,
              is_correct: r.is_correct,
              points_earned: r.points_awarded // Use points_awarded from AI grading
            })),
            score_percent: score.scorePercent,
            passed: score.passed,
            total_points: 100, // Assuming total points for module B is 100
            earned_points: score.finalScore
          });
        }

        await base44.entities.ModuleBResult.create({
          exam_id: exam.id,
          grammar_score: score.grammarScore,
          writing_score: score.writingScore,
          final_score: score.finalScore,
          grammar_answers: score.grammarResults,
          writing_text: writingText,
          word_count: score.wordCount,
          writing_feedback: score.writingFeedback,
          duration: (displayMode === "exam" || displayMode === "interactive") ? (2700 - timeLeft) : 0, // Duration only relevant for timed modes
          passed: score.passed,
          subject: exam.subject,
          unit_level: exam.unit_level || 3,
          display_mode: displayMode, // Save the display mode
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
  }, [showResults, results?.loading, exam, savedProgress, calculateScore, displayMode, timeLeft, writingText]);


  // This function is now a trigger for the `performGradingAndSaving` useEffect.
  const handleFinishExam = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // These state updates will cause the above useEffect to run and perform the actual grading.
    setShowResults(true);
    setResults({ loading: true });
    setHasStarted(false); // Stop timer and auto-save
  };

  const handleContinueToWriting = () => {
    setCurrentSection("writing");
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

  // Handlers for exit dialog
  const handleExitAttempt = async () => {
    // Before showing exit dialog, trigger a save
    await saveProgress();
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    navigate(createPageUrl("Exams")); // Navigate back to exams list
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextQuestion = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (currentQuestion < exam.grammar_questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setTimeout(() => setIsSubmitting(false), 300);
    } else {
      setCurrentSection("writing");
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Loading state for initial exam load
  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <div className="text-lg text-gray-600">טוען מבחן...</div>
        </div>
      </div>
    );
  }

  // Edit Mode Preview
  if (isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pb-24">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
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
          <p className="text-white/90 text-sm">Module B - דקדוק + כתיבה</p>
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

          {/* Exam Details */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">פרטי המבחן</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">כותרת</div>
                <div className="font-bold">{exam.title}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">משך</div>
                <div className="font-bold">{exam.duration_minutes || 45} דקות</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">נקודות דקדוק</div>
                <div className="font-bold">{exam.total_grammar_points || 70}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">נקודות כתיבה</div>
                <div className="font-bold">{exam.total_writing_points || 30}</div>
              </div>
            </div>
          </div>

          {/* Grammar Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">חלק א' - דקדוק</h3>
            
            <h4 className="font-bold text-gray-900 mb-3">שאלות ({exam.grammar_questions?.length || 0}):</h4>
            <div className="space-y-3">
              {exam.grammar_questions?.map((questionItem, questionIndex) => (
                <div key={questionIndex} className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-green-900">שאלה {questionItem.question_number}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{questionItem.question_type}</span>
                      <span className="text-sm bg-green-600 text-white px-2 py-1 rounded">{questionItem.points} נק'</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-2" dir="ltr"><strong>שאלה:</strong> {questionItem.question_text}</p>
                  
                  {questionItem.options && questionItem.options.length > 0 && (
                    <div className="bg-white rounded p-3 mb-2">
                      <div className="text-xs font-semibold text-gray-700 mb-1">אפשרויות:</div>
                      {questionItem.options.map((optionValue, optionIndex) => (
                        <div key={optionIndex} className="text-xs text-gray-600" dir="ltr">
                          {String.fromCharCode(65 + optionIndex)}. {optionValue}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="bg-green-100 rounded p-2 mt-2">
                    <span className="text-xs font-semibold text-green-700">תשובה נכונה: </span>
                    <span className="text-xs text-green-600" dir="ltr">{questionItem.correct_answer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Writing Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">חלק ב' - כתיבה</h3>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 mb-2">נושא הכתיבה:</h4>
              <p className="text-gray-700" dir="ltr">{exam.writing_prompt || 'לא הוגדר נושא'}</p>
              <div className="text-sm text-gray-600 mt-3">
                מספר מילים: {exam.writing_min_words || 35}-{exam.writing_max_words || 40} מילים
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Resume Progress Dialog
  if (showResumeDialog) {
    return (
      <Dialog open={showResumeDialog} onOpenChange={() => { }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Info className="w-6 h-6 text-blue-500" />
              מבחן בתהליך
            </DialogTitle>
            <DialogDescription>
              נמצא מבחן שלא הושלם. האם תרצה להמשיך מאיפה שעצרת?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>מבחן:</strong> {exam.title}</p>
              <p><strong>חלק נוכחי:</strong> {savedProgress.current_section === 'grammar' ? 'דקדוק' : 'כתיבה'}</p>
              {(savedProgress.display_mode === 'exam' || savedProgress.display_mode === 'interactive') && savedProgress.time_left !== undefined && (
                <p><strong>זמן שנותר:</strong> {Math.floor(savedProgress.time_left / 60)} דקות</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleStartFresh}
              variant="outline"
              className="flex-1 h-12"
            >
              התחל מחדש
            </Button>
            <Button
              onClick={handleResumeProgress}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              המשך מאיפה שעצרתי
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Intro Dialog
  if (showIntroDialog) {
    return (
      <Dialog open={showIntroDialog} onOpenChange={setShowIntroDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">ברוכים הבאים למבחן Module B</DialogTitle>
            <DialogDescription className="text-gray-600">
              מבחן זה כולל חלק דקדוק (הבנת הנקרא) וחלק כתיבה. המבחן מדמה את מתכונת בחינת הבגרות.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-gray-600">
              * המערכת תבדוק את המבחן ותספק ציון והסברים (למשתמשי פרימיום או לאחר צפייה בפרסומת).
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleStartExam} className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 text-white text-lg hover:from-green-700 hover:to-blue-700">
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




  // Loading state for AI grading after finishing exam
  if (showResults && results?.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">בודק את המבחן שלך...</h1>
          <p className="text-gray-600">המערכת בודקת את התשובות. אנא המתן.</p>
        </div>
      </div>
    );
  }

  // Error state for AI grading/saving
  if (showResults && results?.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">אופס! משהו השתבש.</h1>
          <p className="text-gray-600 mb-4">{results.message || "אירעה שגיאה בבדיקת המבחן או בשמירת התוצאות."}</p>
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 h-14 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
          >
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  // Actual results display
  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        {showAdForExplanations && (
          <AdManager onContinue={handleAdComplete}>
            <div className="min-h-screen flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">טוען הסברים מפורטים...</h2>
              </div>
            </div>
          </AdManager>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Header */}
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

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">דקדוק</div>
                <div className="text-2xl font-bold text-gray-900">{results.grammarScore}</div>
                <div className="text-xs text-gray-500">מתוך {exam.total_grammar_points}</div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">כתיבה</div>
                <div className="text-2xl font-bold text-gray-900">{results.writingScore}</div>
                <div className="text-xs text-gray-500">מתוך {exam.total_writing_points}</div>
              </div>
            </div>

            {!user?.is_premium && !showDetailedExplanations && (
              <Button
                onClick={handleShowExplanations}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg font-bold mt-4"
              >
                צפה בהסבר מפורט על הטעויות
              </Button>
            )}
          </div>

          {/* Grammar Results with explanation */}
          {(user?.is_premium || showDetailedExplanations) && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">סקירת תשובות דקדוק</h3>
              <div className="space-y-4">
                {results.grammarResults.map((resultItem, resultIndex) => (
                  <div key={resultIndex} className={`rounded-xl p-4 border-2 ${
                    resultItem.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="font-semibold text-gray-900 mb-2">
                      שאלה {resultItem.question_number}: {resultItem.question_text}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className={resultItem.is_correct ? 'text-green-700' : 'text-red-700'}>
                        תשובתך: {resultItem.user_answer}
                      </div>
                      {!resultItem.is_correct && (
                        <div className="text-green-700">
                          תשובה נכונה: {resultItem.correct_answer}
                        </div>
                      )}
                      <div className="text-gray-700">
                        נקודות: {resultItem.points_awarded} מתוך {resultItem.points}
                      </div>
                      {resultItem.ai_evaluation?.explanation && (
                        <div className="text-gray-700 mt-2 p-2 bg-gray-100 rounded">
                          <strong>הסבר:</strong> {resultItem.ai_evaluation.explanation}
                          {resultItem.ai_evaluation.feedback && (
                            <span className="block mt-1 text-xs"> (משוב: {resultItem.ai_evaluation.feedback})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Writing Review with Feedback */}
          {(user?.is_premium || showDetailedExplanations) && writingText && results.writingFeedback && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">סקירת הכתיבה שלך</h3>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                  {exam.writing_prompt}
                </div>
                <div className="text-sm text-gray-600">
                  מספר מילים: {results.wordCount} (יעד: {exam.writing_min_words}-{exam.writing_max_words})
                </div>
                <div className="whitespace-pre-wrap text-gray-900" dir="ltr">
                  {writingText}
                </div>
              </div>

              {results.writingFeedback.feedback_hebrew && (
                <div className="bg-blue-50 rounded-xl p-4 mt-4 border-blue-200 border">
                  <h4 className="font-semibold text-blue-800 mb-2">משוב מפורט:</h4>
                  <p className="text-blue-700 whitespace-pre-wrap">{results.writingFeedback.feedback_hebrew}</p>

                  {results.writingFeedback.strengths?.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-semibold text-blue-700">חוזקות:</h5>
                      <ul className="list-disc list-inside text-blue-700">
                        {results.writingFeedback.strengths.map((strengthItem, strengthIndex) => <li key={strengthIndex}>{strengthItem}</li>)}
                      </ul>
                    </div>
                  )}
                  {results.writingFeedback.improvements?.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-semibold text-blue-700">נקודות לשיפור:</h5>
                      <ul className="list-disc list-inside text-blue-700">
                        {results.writingFeedback.improvements.map((improvementItem, improvementIndex) => <li key={improvementIndex}>{improvementItem}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 text-right">
                    <span className="font-bold text-lg text-blue-900">
                      ציון כתיבה: {results.writingFeedback.total_score} מתוך {exam.total_writing_points}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Locked message */}
          {!user?.is_premium && !showDetailedExplanations && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 text-center mb-6">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">הסברים מפורטים על כל טעות</h3>
              <p className="text-gray-700 mb-4">
                רוצה לדעת בדיוק איפה טעית ולקבל הסברים מקצועיים?
              </p>
              <Button
                onClick={handleShowExplanations}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
              >
                צפה בהסבר (לאחר פרסומת קצרה)
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="flex-1 h-14 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              חזרה למבחנים
            </Button>
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

  // Calculate progress for the progress bar
  const progress = currentSection === "grammar"
    ? (currentQuestion / exam.grammar_questions.length) * 50 // Half of the progress for grammar
    : 50 + (countWords(writingText) / (exam.writing_max_words || 45)) * 50; // Other half for writing

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              האם אתה בטוח?
            </DialogTitle>
            <DialogDescription>
              אם תצא עכשיו, ההתקדמות שלך תישמר ותוכל להמשיך מאוחר יותר.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>💾 שמירה אוטומטית:</strong> כל התשובות והזמן הנותר יישמרו.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowExitDialog(false)}
              variant="outline"
              className="flex-1 h-12"
            >
              המשך במבחן
            </Button>
            <Button
              onClick={handleConfirmExit}
              className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white"
            >
              צא ושמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExitAttempt} // Call new exit attempt handler
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <Clock className="w-5 h-5 text-white" />
            <span className="text-xl font-bold text-white">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{exam.title}</h1>
        <p className="text-white/90 text-sm">Module B - דקדוק + כתיבה</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-6">
        {/* Progress */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{currentSection === "grammar" ? "חלק א' - דקדוק" : "חלק ב' - כתיבה"}</span>
            <span>{currentSection === "grammar" ? "70 נקודות" : "30 נקודות"}</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
          />
        </div>

        {/* Grammar Section */}
        {currentSection === "grammar" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-lg p-4 sm:p-6"
                >
                  {(() => {
                    const question = exam.grammar_questions[currentQuestion];
                    if (!question) return null;
                    return (
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Question {question.question_number}</h2>
                          <div className="bg-blue-100 px-3 py-1 rounded-full text-sm font-bold text-blue-600">
                            {question.points} נק'
                          </div>
                        </div>

                        <p className="text-gray-700 text-base sm:text-lg mb-6 whitespace-pre-wrap" dir="ltr">{question.question_text}</p>

                        {question.question_type === "multiple_choice" && question.options ? (
                          <div className="space-y-3">
                            {question.options.map((option, index) => (
                              <button
                                key={index}
                                onClick={() => handleGrammarAnswer(question.question_number, option)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                  grammarAnswers[question.question_number] === option
                                    ? 'bg-green-100 border-green-500'
                                    : 'bg-white border-gray-200 hover:border-green-300'
                                }`}
                                dir="ltr"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <Input
                            placeholder="Type your answer..."
                            value={grammarAnswers[question.question_number] || ""}
                            onChange={(e) => handleGrammarAnswer(question.question_number, e.target.value)}
                            className="h-12 text-base"
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

                          {currentQuestion === exam.grammar_questions.length - 1 ? (
                            <Button 
                              onClick={() => setCurrentSection("writing")} 
                              disabled={isSubmitting}
                              className="flex-1 h-11 sm:h-12 bg-purple-600 disabled:opacity-50"
                            >
                              המשך לכתיבה
                            </Button>
                          ) : (
                            <Button
                              onClick={handleNextQuestion}
                              disabled={isSubmitting}
                              className="flex-1 h-11 sm:h-12 bg-green-600 disabled:opacity-50"
                            >
                              הבא
                              <ChevronLeft className="w-5 h-5 mr-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
          </motion.div>
        )}

        {/* Writing Section */}
        {currentSection === "writing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">חלק ב' - כתיבה</h3>

              <div className="bg-blue-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
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

                {/* Allow going back to grammar section from writing if needed */}
                <Button
                  onClick={() => setCurrentSection("grammar")}
                  variant="outline"
                >
                  חזור לדקדוק
                </Button>
              </div>
            </div>

            <Button
              onClick={handleFinishExam}
              disabled={countWords(writingText) < exam.writing_min_words || isSubmitting}
              className="w-full h-14 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-lg disabled:opacity-50"
            >
              סיים מבחן
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}