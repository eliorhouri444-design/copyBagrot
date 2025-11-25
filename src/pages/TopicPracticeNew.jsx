import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Check, X, Calculator, Pencil, Loader2, ChevronRight, Trophy, AlertCircle, Crown, BookOpen, Wand2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import MathCalculator from "@/components/practice/MathCalculator";
import DrawingCanvas from "@/components/practice/DrawingCanvas";
import WritingEditor from "@/components/practice/WritingEditor";
import ListeningPlayer from "@/components/practice/ListeningPlayer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter } from
"@/components/ui/dialog";
import AdManager from "../components/ads/AdManager";
import RatingDialog from "../components/ads/RatingDialog";

const QUESTIONS_PER_SET = 10;
const WRITING_QUESTIONS_PER_SET = 3;
const FREE_USER_MAX_SETS = 3;

export default function TopicPracticeNewPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get("topicid");
  const setNumber = parseInt(urlParams.get("set") || "1");

  const [user, setUser] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [currentSetQuestions, setCurrentSetQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [topicName, setTopicName] = useState("");
  const [readingText, setReadingText] = useState("");
  const [showReadingText, setShowReadingText] = useState(true);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [listeningText, setListeningText] = useState("");
  const [showListeningIntro, setShowListeningIntro] = useState(false);
  const [canProceedToQuestions, setCanProceedToQuestions] = useState(false);

  const [showCalculator, setShowCalculator] = useState(false);
  const [showDrawingBoard, setShowDrawingBoard] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [showAdConfirmDialog, setShowAdConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writingDrafts, setWritingDrafts] = useState({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showWritingFeedback, setShowWritingFeedback] = useState(false);
  const [writingFeedbackData, setWritingFeedbackData] = useState(null);
  const [showRewriteOptions, setShowRewriteOptions] = useState(false);
  const [showSentenceAnalysis, setShowSentenceAnalysis] = useState(false);
  const [showVocabularyHelp, setShowVocabularyHelp] = useState(false);
  const [adSettings, setAdSettings] = useState(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const hasNextSet = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) return false;
    const isWritingTopic = currentSetQuestions.some((q) => q.question_type === "writing");
    const questionsPerSet = isWritingTopic ? WRITING_QUESTIONS_PER_SET : QUESTIONS_PER_SET;
    const nextSetStartIndex = setNumber * questionsPerSet;
    return nextSetStartIndex < allQuestions.length;
  }, [setNumber, allQuestions, currentSetQuestions]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Load ad settings
        const settings = await base44.entities.UserAdSettings.list();
        if (settings.length > 0) {
          setAdSettings(settings[0]);
        } else {
          const newSettings = await base44.entities.UserAdSettings.create({
            free_attempts: 3,
            has_seen_info_today: false,
            ads_viewed_today: 0,
            has_rated: false,
            last_reset_date: new Date().toISOString().split('T')[0]
          });
          setAdSettings(newSettings);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!topicId) {
      setLoadError("חסר מזהה נושא");
      setIsLoading(false);
      return;
    }
    loadQuestions();
  }, [topicId, setNumber]);

  const loadQuestions = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const allQuestionsRaw = await base44.entities.QuestionBank.list();

      const questionsForTopic = allQuestionsRaw.filter((q) =>
      q.topic_id === topicId && q.is_active !== false
      );

      if (questionsForTopic.length === 0) {
        setLoadError(`לא נמצאו שאלות פעילות עבור נושא זה. מזהה הנושא: ${topicId}`);
        setIsLoading(false);
        return;
      }

      const parts = topicId.split('_');
      const name = parts.length >= 3 ? parts.slice(2).join(' ') : topicId;
      setTopicName(name);

      // Check if this is a writing topic
      const isWritingTopic = questionsForTopic.some((q) => q.question_type === "writing");
      const questionsPerSet = isWritingTopic ? WRITING_QUESTIONS_PER_SET : QUESTIONS_PER_SET;

      // Ensure minimum questions per set by duplicating if needed
      let expandedQuestions = [...questionsForTopic];
      while (expandedQuestions.length < questionsPerSet && questionsForTopic.length > 0) {
        const needed = questionsPerSet - expandedQuestions.length;
        expandedQuestions = [...expandedQuestions, ...questionsForTopic.slice(0, Math.min(needed, questionsForTopic.length))];
      }

      // Now get all sets
      const totalSets = Math.ceil(expandedQuestions.length / questionsPerSet);
      let allSetsQuestions = [];

      for (let i = 0; i < totalSets; i++) {
        const start = i * questionsPerSet;
        const end = start + questionsPerSet;
        allSetsQuestions.push(...expandedQuestions.slice(start, end));
      }

      setAllQuestions(allSetsQuestions);

      const startIndex = (setNumber - 1) * questionsPerSet;
      const endIndex = startIndex + questionsPerSet;
      const setQuestions = allSetsQuestions.slice(startIndex, endIndex);

      if (setQuestions.length === 0) {
        setLoadError(`לא נמצאו שאלות לסט ${setNumber}`);
        setIsLoading(false);
        return;
      }

      setCurrentSetQuestions(setQuestions);

      // Check if this is listening comprehension
      const isListeningComprehension = topicId.toLowerCase().includes('listening') ||
      topicId.toLowerCase().includes('האזנה');

      if (isListeningComprehension && setQuestions[0]?.reading_text) {
        setListeningText(setQuestions[0].reading_text);
        setShowListeningIntro(true);
        // Don't set reading text for listening topics
        setReadingText("");
        setShowReadingText(false);
      } else {
        // Check if this is reading comprehension and get reading text
        const isReadingComprehension = topicId.toLowerCase().includes('reading') ||
        topicId.toLowerCase().includes('הבנת הנקרא');

        if (isReadingComprehension && setQuestions[0]?.reading_text) {
          setReadingText(setQuestions[0].reading_text);
          setShowReadingText(true);
        } else {
          setReadingText("");
          setShowReadingText(false);
        }
        setListeningText("");
        setShowListeningIntro(false);
      }

      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "topic_practice",
        subject_id: questionsForTopic[0].subject_id,
        unit_level: questionsForTopic[0].unit_level,
        topic_id: topicId,
        questions: setQuestions.map((q) => q.question_id),
        started_at: new Date().toISOString(),
        is_completed: false
      });

      setSessionId(session.id);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading questions:", error);
      setLoadError("שגיאה בטעינת התרגול");
      setIsLoading(false);
    }
  };

  const handleSaveWritingDraft = async (text, wordCount) => {
    setIsSavingDraft(true);
    const currentQuestion = currentSetQuestions[currentQuestionIndex];

    try {
      const existingDrafts = await base44.entities.WritingAttempt.filter({
        question_id: currentQuestion.question_id,
        status: "draft"
      });

      if (existingDrafts.length > 0) {
        await base44.entities.WritingAttempt.update(existingDrafts[0].id, {
          writing_text: text,
          word_count: wordCount
        });
      } else {
        await base44.entities.WritingAttempt.create({
          question_id: currentQuestion.question_id,
          topic_id: topicId,
          subject_id: currentQuestion.subject_id,
          unit_level: currentQuestion.unit_level,
          writing_text: text,
          word_count: wordCount,
          status: "draft",
          prompt: currentQuestion.question_text
        });
      }
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // שמירת attempt ברקע - לא מחכים לתוצאה
  const saveAttemptInBackground = (attemptData) => {
    base44.entities.AttemptNew.create(attemptData).catch((err) =>
    console.error("Error saving attempt:", err)
    );
  };

  const handleSubmitAnswer = async (providedAnswer) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const currentQuestion = currentSetQuestions[currentQuestionIndex];
    const rawAnswer = providedAnswer || answers[currentQuestion.question_id];
    const userAnswer = typeof rawAnswer === 'object' && rawAnswer !== null && 'text' in rawAnswer ?
    String(rawAnswer.text) :
    String(rawAnswer || "");

    // בדיקה חשובה: אם אין תשובה בכלל - סמן כשגוי
    if (!userAnswer || userAnswer.trim() === "") {
      saveAttemptInBackground({
        question_id: currentQuestion.question_id,
        subject_id: currentQuestion.subject_id,
        topic_id: topicId,
        session_id: sessionId,
        user_answer_text: "",
        score: 0,
        max_score: currentQuestion.max_score || 100,
        percentage: 0,
        status: "unanswered",
        time_spent_seconds: 0
      });

      setResults((prev) => ({
        ...prev,
        [currentQuestion.question_id]: { 
          isCorrect: false, 
          status: "unanswered", 
          correctAnswer: currentQuestion.correct_answer || "", 
          userAnswer: "" 
        }
      }));

      setIsSubmitting(false);
      if (currentQuestionIndex < currentSetQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        saveWeakTopicsStats();
        setShowSummary(true);
      }
      return;
    }

    // Moved displayUnits here to make it accessible to the AI prompt
    const displayUnits = user?.selected_units || 3;
    const targetWords = displayUnits === 4 ? 80 : displayUnits === 5 ? 100 : 80;

    try {
      // בדיקה מהירה לשאלות רב-ברירה - ללא AI
      if ((currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0) {
        // מציאת התשובה הנכונה מהאופציות או מהשדה correct_answer
        let correctAnswer = "";

        // אם יש שדה correct_answer בשאלה
        if (currentQuestion.correct_answer) {
          correctAnswer = String(currentQuestion.correct_answer).trim().toLowerCase().replace(/\s/g, '');
        }

        // נרמול התשובה - הסרת כל הרווחים
        const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s/g, '');
        
        // בדיקה נוספת - אם אין תשובה תקינה מהמשתמש
        const isCorrect = normalizedUserAnswer.length > 0 && normalizedUserAnswer === correctAnswer;

        // שמירה ברקע
        saveAttemptInBackground({
          question_id: currentQuestion.question_id,
          subject_id: currentQuestion.subject_id,
          topic_id: topicId,
          session_id: sessionId,
          user_answer_text: userAnswer,
          score: isCorrect ? currentQuestion.max_score || 100 : 0,
          max_score: currentQuestion.max_score || 100,
          percentage: isCorrect ? 100 : 0,
          status: isCorrect ? "correct" : "incorrect",
          time_spent_seconds: 0
        });

        setResults((prev) => ({
          ...prev,
          [currentQuestion.question_id]: { isCorrect, status: isCorrect ? "correct" : "incorrect", correctAnswer, userAnswer }
        }));

        // מעבר מיידי לשאלה הבאה
        setIsSubmitting(false);
        if (currentQuestionIndex < currentSetQuestions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        } else {
          saveWeakTopicsStats();
          setShowSummary(true);
        }
        return;
      }

      // Check if this is a writing question
      if (currentQuestion.question_type === "writing") {
        console.log("🎯 Starting writing evaluation...");
        // Use AI to evaluate writing
        const wordCount = userAnswer.trim().split(/\s+/).filter((w) => w).length;

        console.log("📝 Sending to AI for evaluation...");
        const evaluation = await base44.integrations.Core.InvokeLLM({
          prompt: `אתה בודק אנגלית קפדני לבגרות ישראלית. בדוק בדיוק כמו בוחן אמיתי של משרד החינוך.

        🎯 משימת הכתיבה: ${currentQuestion.question_text}

        📝 תשובת התלמיד (${wordCount} מילים, רמה: ${displayUnits} יחידות):
        ${userAnswer}

        ---

        📊 בדיקה לפי 4 הקריטריונים הרשמיים של משרד החינוך:

        1️⃣ השגת המשימה (Task Achievement) - 0-25:
        - האם ענה על השאלה במלואה?
        - האם נשאר בנושא?
        - האם פיתח רעיונות מספיק?
        - האם אורך מתאים (${targetWords} מילים)?

        2️⃣ ארגון (Organization) - 0-25:
        - פתיחה ברורה עם הצגת הנושא?
        - כל פסקה = רעיון אחד?
        - מילות קישור (However, Therefore, Moreover, In addition, On the other hand, Finally)?
        - סיכום שמחזיר לנושא?

        3️⃣ דקדוק (Grammar) - 0-25:
        בדוק כל משפט:
        • זמנים (Present/Past/Future) - עקביים?
        • הסכמה (he works, they work)
        • יחיד/רבים (is/are, was/were)
        • מילות יחס (in/on/at)
        • מבנה משפט (Subject + Verb + Object)

        4️⃣ אוצר מילים ואיות (Vocabulary & Spelling) - 0-25:
        • בדוק איות כל מילה (their/there, your/you're)
        • מגוון מילים (לא לחזור על אותה מילה)
        • רמת מילים מתאימה ל-${displayUnits} יחידות
        • שילובי מילים טבעיים

        ---

        🔍 נתח כל משפט ומשפט:
        עבור על כל משפט בתשובה והסבר:
        ✓ מה טוב בו
        ✗ מה צריך לתקן
        → איך לכתוב אותו טוב יותר

        ---

        ⚠️ חשוב:
        - תן ציון מדויק כמו בגרות אמיתית
        - כתוב הכל בעברית כדי שהתלמיד יבין
        - רשום כל טעות עם דוגמה מדויקת מהטקסט
        - הסבר למה הורדת ניקוד בכל סעיף
        - תן דוגמה לשיפור בכל סעיף`,
          response_json_schema: {
            type: "object",
            properties: {
              task_achievement: { type: "number", description: "0-25" },
              organization: { type: "number", description: "0-25" },
              grammar: { type: "number", description: "0-25" },
              vocabulary: { type: "number", description: "0-25" },
              total_score: { type: "number", description: "0-100" },
              bagrut_realistic_score: { type: "number", description: "ציון בגרות ריאליסטי כמו בודק אנושי" },
              task_feedback_hebrew: { type: "string", description: "הסבר בעברית על השגת המשימה - למה הורדת ניקוד ומה לשפר" },
              organization_feedback_hebrew: { type: "string", description: "הסבר בעברית על הארגון - למה הורדת ניקוד ומה לשפר" },
              grammar_feedback_hebrew: { type: "string", description: "הסבר בעברית על הדקדוק - למה הורדת ניקוד ומה לשפר" },
              vocabulary_feedback_hebrew: { type: "string", description: "הסבר בעברית על אוצר המילים - למה הורדת ניקוד ומה לשפר" },
              opening_sentence: { type: "string", description: "משפט פתיחה שמסכם איך התלמיד ענה על המשימה (בעברית)" },
              what_to_do_next_time: { type: "string", description: "הנחיה ספציפית למה לעשות בפעם הבאה (בעברית)" },
              sentence_by_sentence_analysis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    original_sentence: { type: "string" },
                    what_is_good: { type: "string", description: "בעברית - מה טוב במשפט" },
                    what_needs_fixing: { type: "string", description: "בעברית - מה צריך לתקן" },
                    improved_version: { type: "string", description: "גרסה משופרת של המשפט" }
                  }
                },
                description: "ניתוח משפט אחר משפט"
              },
              grammar_errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    explanation_hebrew: { type: "string" }
                  }
                },
                description: "כל שגיאות הדקדוק עם הסבר בעברית"
              },
              spelling_errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    correction: { type: "string" },
                    explanation_hebrew: { type: "string" }
                  }
                },
                description: "כל שגיאות הכתיב עם הסבר בעברית"
              },
              recurring_mistakes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    mistake_type: { type: "string" },
                    count: { type: "number" },
                    explanation_hebrew: { type: "string" },
                    how_to_fix: { type: "string" }
                  }
                },
                description: "טעויות שחוזרות על עצמן"
              },
              rewritten_version_90_plus: { type: "string", description: "גרסה משופרת שמקבלת 90+" },
              rewritten_with_connectors: { type: "string", description: "גרסה עם מילות קישור מתקדמות" },
              rewritten_advanced_vocabulary: { type: "string", description: `גרסה עם אוצר מילים מתקדם (עדיין ${displayUnits} יחידות)` },
              useful_phrases: {
                type: "array",
                items: { type: "string" },
                description: "ביטויים שימושיים לבגרות"
              },
              advanced_vocabulary: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    meaning_hebrew: { type: "string" },
                    example_sentence: { type: "string" }
                  }
                },
                description: "מילים מתקדמות לשדרוג"
              },
              connectors_to_use: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    connector: { type: "string" },
                    usage_hebrew: { type: "string" },
                    example: { type: "string" }
                  }
                },
                description: "מילות קישור לשימוש"
              },
              strengths: {
                type: "array",
                items: { type: "string" },
                description: "נקודות חוזק (בעברית)"
              },
              areas_to_improve: {
                type: "array",
                items: { type: "string" },
                description: "תחומים לשיפור (בעברית)"
              }
            }
          }
        });

        console.log("✅ Got evaluation from AI:", evaluation);

        const totalScore = evaluation.total_score || 0;
        const percentage = totalScore;

        console.log("💾 Saving attempt to database...");
        // שמירה ברקע - לא מחכים
        saveAttemptInBackground({
          question_id: currentQuestion.question_id,
          subject_id: currentQuestion.subject_id,
          topic_id: topicId,
          session_id: sessionId,
          user_answer_text: userAnswer,
          score: totalScore,
          max_score: 100,
          percentage: percentage,
          status: percentage >= 70 ? "correct" : percentage >= 50 ? "partial" : "incorrect",
          detailed_feedback: JSON.stringify(evaluation),
          time_spent_seconds: 0
        });

        setResults((prev) => ({
          ...prev,
          [currentQuestion.question_id]: {
            isCorrect: percentage >= 70,
            status: percentage >= 70 ? "correct" : "partial",
            correctAnswer: "",
            userAnswer,
            writingEvaluation: evaluation,
            percentage
          }
        }));

        // Show feedback dialog for writing
        console.log("🎉 Opening feedback dialog...");
        setWritingFeedbackData({
          evaluation,
          percentage,
          wordCount,
          displayUnits // Pass displayUnits to feedback data
        });
        setShowWritingFeedback(true);
        setIsSubmitting(false);
        console.log("✅ Feedback dialog should be open now");
        return; // Stop here, don't auto-advance
      } else {
        // Regular question handling - בדיקה מהירה קודם
        let isCorrect = false;
        let status = "incorrect";
        let correctAnswer = "";

        // נסה קודם בדיקה פשוטה ללא AI - הסרת כל הרווחים
        const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s/g, '');

        // בדוק אם יש תשובה נכונה בשאלה עצמה
        if (currentQuestion.correct_answer) {
          correctAnswer = String(currentQuestion.correct_answer);
          const normalizedCorrect = correctAnswer.trim().toLowerCase().replace(/\s/g, '');

          if (normalizedUserAnswer === normalizedCorrect) {
            isCorrect = true;
            status = "correct";
          }
        }

        // אם לא נמצאה התאמה, בדוק ב-SolutionBank
        if (!isCorrect) {
          const solutions = await base44.entities.SolutionBank.filter({
            question_id: currentQuestion.question_id
          });

          if (solutions.length > 0) {
            const solution = solutions[0];
            const correctAnswers = solution.final_answers || [];
            const acceptableVariants = solution.acceptable_variants || [];

            if (correctAnswers.length > 0) {
              correctAnswer = correctAnswers[0].value || "";
            }

            // בדיקת התאמה מדויקת - מהירה (הסרת כל הרווחים)
            const exactMatch = correctAnswers.some((ans) =>
            ans.value?.toLowerCase().trim().replace(/\s/g, '') === normalizedUserAnswer
            ) || acceptableVariants.some((variant) =>
            variant.toLowerCase().trim().replace(/\s/g, '') === normalizedUserAnswer
            );

            if (exactMatch) {
              isCorrect = true;
              status = "correct";
            } else if (userAnswer.length > 3) {
              // רק לתשובות ארוכות - השתמש ב-AI
              try {
                const aiCheck = await base44.integrations.Core.InvokeLLM({
                  prompt: `Check if student answer is correct. Be lenient with synonyms and paraphrasing.
Question: ${currentQuestion.question_text}
Correct: ${correctAnswer}
Student: ${userAnswer}
Return JSON with is_correct (boolean) and similarity_score (0-100)`,
                  response_json_schema: {
                    type: "object",
                    properties: {
                      is_correct: { type: "boolean" },
                      similarity_score: { type: "number" }
                    }
                  }
                });

                isCorrect = aiCheck.is_correct || aiCheck.similarity_score >= 70;
                status = aiCheck.similarity_score >= 90 ? "correct" : aiCheck.similarity_score >= 70 ? "partial" : "incorrect";
              } catch (error) {
                console.error("Error with AI check:", error);
              }
            }
          }
        }

        // שמירה ברקע - לא מחכים
        saveAttemptInBackground({
          question_id: currentQuestion.question_id,
          subject_id: currentQuestion.subject_id,
          topic_id: topicId,
          session_id: sessionId,
          user_answer_text: userAnswer,
          score: isCorrect ? currentQuestion.max_score : 0,
          max_score: currentQuestion.max_score,
          percentage: isCorrect ? 100 : 0,
          status: status,
          time_spent_seconds: 0
        });

        setResults((prev) => ({
          ...prev,
          [currentQuestion.question_id]: { isCorrect, status, correctAnswer, userAnswer }
        }));

        // מעבר מיידי לשאלה הבאה או לסיכום
        setIsSubmitting(false);
        if (currentQuestionIndex < currentSetQuestions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        } else {
          saveWeakTopicsStats();
          setShowSummary(true);
        }
        return;
      }
    } catch (error) {
      console.error("❌ Error submitting answer:", error);
      alert(`שגיאה בבדיקת התשובה: ${error.message}\n\nנסה שוב או פנה לתמיכה.`);
      setIsSubmitting(false);
    }
  };

  const saveWeakTopicsStats = async () => {
    try {
      const wrongQuestions = currentSetQuestions.filter((q) => {
        const result = results[q.question_id];
        return result && !result.isCorrect;
      });

      if (wrongQuestions.length === 0) return;

      const topicPerformance = {
        topic_id: topicId,
        subject_id: currentSetQuestions[0].subject_id,
        unit_level: currentSetQuestions[0].unit_level,
        total_questions: currentSetQuestions.length,
        correct_answers: Object.values(results).filter((r) => r.isCorrect).length,
        wrong_answers: wrongQuestions.length,
        accuracy_percent: Math.round(Object.values(results).filter((r) => r.isCorrect).length / currentSetQuestions.length * 100)
      };

      const existingStats = await base44.entities.WeakTopic.filter({
        topic_id: topicId
      });

      if (existingStats.length > 0) {
        const existing = existingStats[0];
        await base44.entities.WeakTopic.update(existing.id, {
          total_attempts: (existing.total_attempts || 0) + currentSetQuestions.length,
          wrong_attempts: (existing.wrong_attempts || 0) + wrongQuestions.length,
          last_practiced: new Date().toISOString()
        });
      } else {
        await base44.entities.WeakTopic.create({
          topic_id: topicId,
          subject: currentSetQuestions[0].subject_id,
          units: currentSetQuestions[0].unit_level,
          total_attempts: currentSetQuestions.length,
          wrong_attempts: wrongQuestions.length,
          last_practiced: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving weak topics stats:", error);
    }
  };

  const handleContinueToNextSet = () => {
    const nextSet = setNumber + 1;
    const isWritingTopic = currentSetQuestions.some((q) => q.question_type === "writing");
    const questionsPerSet = isWritingTopic ? WRITING_QUESTIONS_PER_SET : QUESTIONS_PER_SET;
    const nextSetStartIndex = (nextSet - 1) * questionsPerSet;

    if (nextSetStartIndex >= allQuestions.length) {
      finishPractice();
      return;
    }

    const isPremiumUser = user?.is_premium;

    if (isPremiumUser) {
      continueToNextSet(nextSet);
    } else {
      // Check if user has bonus days left
      const today = new Date().toISOString().split('T')[0];
      const hasActiveBonus = adSettings?.bonus_active_until && adSettings.bonus_active_until >= today;

      if (hasActiveBonus) {
        continueToNextSet(nextSet);
      } else if (!adSettings?.has_rated) {
        setShowRatingDialog(true);
      } else {
        setShowAdDialog(true);
      }
    }
  };

  const continueToNextSet = (nextSet) => {
    const isListening = topicId?.toLowerCase().includes('listening') || topicId?.toLowerCase().includes('האזנה');
    setAnswers({});
    setResults({});
    setCurrentQuestionIndex(0);
    setShowReadingText(true);
    setShowListeningIntro(isListening && listeningText);
    window.location.href = createPageUrl(`TopicPracticeNew?topicid=${encodeURIComponent(topicId)}&set=${nextSet}`);
  };

  const handleConfirmWatchAd = () => {
    setShowAdConfirmDialog(false);
    setShowAdDialog(true);
  };

  const handleAdComplete = () => {
    setShowAdDialog(false);
    const nextSet = setNumber + 1;
    continueToNextSet(nextSet);
  };

  const handleSubmitRating = async (rating) => {
    try {
      if (rating === 5) {
        const bonusEndDate = new Date();
        bonusEndDate.setDate(bonusEndDate.getDate() + 1);

        await base44.entities.UserAdSettings.update(adSettings.id, {
          has_rated: true,
          rating_date: new Date().toISOString(),
          bonus_active_until: bonusEndDate.toISOString().split('T')[0]
        });

        const updatedSettings = await base44.entities.UserAdSettings.filter({ id: adSettings.id });
        if (updatedSettings.length > 0) {
          setAdSettings(updatedSettings[0]);
        }

        setShowRatingDialog(false);
        alert("🎉 תודה על הדירוג! קיבלת יום אחד ללא פרסומות!");
        const nextSet = setNumber + 1;
        continueToNextSet(nextSet);
      } else {
        await base44.entities.UserAdSettings.update(adSettings.id, {
          has_rated: true,
          rating_date: new Date().toISOString()
        });

        const updatedSettings = await base44.entities.UserAdSettings.filter({ id: adSettings.id });
        if (updatedSettings.length > 0) {
          setAdSettings(updatedSettings[0]);
        }

        setShowRatingDialog(false);
        setShowAdDialog(true);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("שגיאה בשמירת הדירוג");
    }
  };

  const finishPractice = async () => {
    if (sessionId) {
      const correctCount = Object.values(results).filter((r) => r.isCorrect).length;
      const totalQuestions = Object.keys(results).length;
      const percentage = totalQuestions > 0 ? correctCount / totalQuestions * 100 : 0;

      await base44.entities.PracticeSessionNew.update(sessionId, {
        completed_at: new Date().toISOString(),
        is_completed: true,
        total_score: correctCount,
        max_score: totalQuestions,
        percentage: percentage
      });
    }

    navigate(createPageUrl("Practice"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">טוען שאלות...</p>
        </div>
      </div>);

  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-700 mb-6">{loadError}</p>
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full bg-blue-600 hover:bg-blue-700">

            <ChevronRight className="w-5 h-5 ml-2" />
            חזור לתרגול
          </Button>
        </div>
      </div>);

  }

  if (currentSetQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין שאלות</h2>
          <p className="text-gray-600 mb-6">לא נמצאו שאלות עבור נושא זה</p>
          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            className="w-full bg-blue-600 hover:bg-blue-700">

            חזור לתרגול
          </Button>
        </div>
      </div>);

  }

  if (showSummary) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת את הסט!</h2>
              <p className="text-gray-600">הנה התוצאות שלך</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-blue-600">
                  {Object.values(results).filter((r) => r.isCorrect).length} / {currentSetQuestions.length}
                </div>
                <div className="text-sm text-gray-600 mt-2">תשובות נכונות</div>
                <div className="text-3xl font-bold text-gray-900 mt-3">
                  {Math.round(Object.values(results).filter((r) => r.isCorrect).length / currentSetQuestions.length * 100)}%
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
              {currentSetQuestions.map((q, idx) => {
                const result = results[q.question_id];
                return (
                  <div key={idx} className={`rounded-xl p-4 border-2 ${
                  q.question_type === "writing" ?
                  'bg-blue-50 border-blue-300' :
                  result?.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`
                  }>
                    <div className="flex items-start gap-3">
                      {q.question_type === "writing" ?
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {Math.round(result?.percentage || 0)}
                        </div> :
                      result?.isCorrect ?
                      <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" /> :

                      <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      }
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">שאלה {idx + 1}</div>
                        <div className="text-sm text-gray-700 mb-2">{q.question_text.substring(0, 80)}...</div>

                        {q.question_type === "writing" && result?.writingEvaluation ?
                        <div className="space-y-2 mt-3">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-300">
                              <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <span className="text-xl">📊</span>
                                Detailed Score Breakdown
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                  <span className="text-xs font-semibold text-gray-700">Task Achievement</span>
                                  <span className="text-sm font-bold text-blue-600">{result.writingEvaluation.task_achievement}/25</span>
                                </div>
                                <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                  <span className="text-xs font-semibold text-gray-700">Organization</span>
                                  <span className="text-sm font-bold text-purple-600">{result.writingEvaluation.organization}/25</span>
                                </div>
                                <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                  <span className="text-xs font-semibold text-gray-700">Grammar</span>
                                  <span className="text-sm font-bold text-green-600">{result.writingEvaluation.grammar}/25</span>
                                </div>
                                <div className="flex justify-between items-center bg-white rounded-lg p-2">
                                  <span className="text-xs font-semibold text-gray-700">Vocabulary</span>
                                  <span className="text-sm font-bold text-orange-600">{result.writingEvaluation.vocabulary}/25</span>
                                </div>
                                <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-2 mt-2">
                                  <span className="text-sm font-bold text-white">Total Score</span>
                                  <span className="text-lg font-bold text-white">{result.writingEvaluation.total_score}/100</span>
                                </div>
                              </div>
                            </div>

                            {result.writingEvaluation.strengths?.length > 0 &&
                          <div className="bg-white rounded-lg p-3 border border-green-200">
                                <div className="text-xs font-bold text-green-900 mb-1">✅ נקודות חוזק:</div>
                                <ul className="text-sm text-gray-700 list-disc list-inside">
                                  {result.writingEvaluation.strengths.map((strength, i) =>
                              <li key={i}>{strength}</li>
                              )}
                                </ul>
                              </div>
                          }

                            {result.writingEvaluation.areas_to_improve?.length > 0 &&
                          <div className="bg-white rounded-lg p-3 border border-orange-200">
                                <div className="text-xs font-bold text-orange-900 mb-1">🎯 תחומים לשיפור:</div>
                                <ul className="text-sm text-gray-700 list-disc list-inside">
                                  {result.writingEvaluation.areas_to_improve.map((area, i) =>
                              <li key={i}>{area}</li>
                              )}
                                </ul>
                              </div>
                          }

                            {/* Corrected: grammar_errors items are objects, not strings */}
                            {result.writingEvaluation.grammar_errors?.length > 0 &&
                          <div className="bg-white rounded-lg p-3 border border-red-200">
                                <div className="text-xs font-bold text-red-900 mb-1">⚠️ שגיאות דקדוק:</div>
                                <ul className="text-sm text-gray-700 list-disc list-inside">
                                  {result.writingEvaluation.grammar_errors.map((err, i) =>
                              <li key={i}>{err.error || JSON.stringify(err)}</li>
                              )}
                                </ul>
                              </div>
                          }

                            {result.writingEvaluation.suggestions &&
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                                <div className="text-xs font-bold text-blue-900 mb-1">💡 הצעות:</div>
                                <div className="text-sm text-gray-700">{result.writingEvaluation.suggestions}</div>
                              </div>
                          }
                          </div> :
                        !result?.isCorrect && q.question_type !== "writing" &&
                        <div className="space-y-2 mt-3">
                            <div className="bg-white rounded-lg p-3 border border-red-200">
                              <div className="text-xs text-gray-600 mb-1">התשובה שלך:</div>
                              <div className="text-sm font-semibold text-red-700" dir="ltr">
                                {result?.userAnswer || "לא נענה"}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="text-xs text-gray-600 mb-1">התשובה הנכונה:</div>
                              <div className="text-sm font-semibold text-green-700" dir="ltr">{result?.correctAnswer}</div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  </div>);

              })}
            </div>

            <div className="flex flex-col gap-2">
              {hasNextSet ? (
                <Button onClick={handleContinueToNextSet} className="w-full bg-blue-600 hover:bg-blue-700">
                  המשך לסט הבא
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              ) : (
                <Button onClick={finishPractice} className="w-full bg-green-600 hover:bg-green-700" disabled>
                  כל הכבוד! סיימת את כל השאלות
                </Button>
              )}
              <Button onClick={finishPractice} variant="outline" className="w-full">
                סיים וחזור לתרגול
              </Button>
            </div>
          </motion.div>
        </div>
      </div>);

  }

  const currentQuestion = currentSetQuestions[currentQuestionIndex];
  const progress = (currentQuestionIndex + 1) / currentSetQuestions.length * 100;
  const hasAnswered = !!answers[currentQuestion.question_id];
  const displayUnits = user?.selected_units || 3;
  const isMathSubject = currentQuestion?.subject_id === 'מתמטיקה';
  const isListeningTopic = topicId?.toLowerCase().includes('listening') ||
  topicId?.toLowerCase().includes('האזנה');

  // Show listening intro if exists and requested
  if (listeningText && showListeningIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-4 sm:p-6 shadow-xl mb-4">
          <div className="flex items-center justify-between text-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Practice"))}
              className="text-white hover:bg-white/20 h-9 w-9">

              <ChevronRight className="w-5 h-5" />
            </Button>

            <div className="text-center flex-1">
              <h1 className="text-lg sm:text-xl font-bold">🎧 {topicName}</h1>
              <p className="text-xs sm:text-sm opacity-90">סט {setNumber} • Listening Practice</p>
            </div>

            <div className="w-9" />
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-20 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white text-center">
              <div className="text-5xl mb-3">🎧</div>
              <h2 className="text-2xl font-bold mb-2">Listen Carefully</h2>
              <p className="text-indigo-100">שים לב - תוכל לשמוע את הקטע מספר פעמים</p>
            </div>

            <ListeningPlayer
              audioText={listeningText}
              maxPlays={2}
              onMaxPlaysReached={() => setCanProceedToQuestions(true)} />


            <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-indigo-200">
              <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                הוראות חשובות:
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3 bg-indigo-50 rounded-lg p-3">
                  <span className="text-indigo-600 font-bold text-lg flex-shrink-0">1</span>
                  <span className="font-medium">האזן לקטע השמיעה - <strong>רק פעמיים!</strong></span>
                </li>
                <li className="flex items-start gap-3 bg-purple-50 rounded-lg p-3">
                  <span className="text-purple-600 font-bold text-lg flex-shrink-0">2</span>
                  <span className="font-medium">אחרי פעמיים, עבור לענות על <strong>{currentSetQuestions.length} שאלות</strong></span>
                </li>
                <li className="flex items-start gap-3 bg-red-50 rounded-lg p-3 border-2 border-red-300">
                  <span className="text-red-600 font-bold text-lg flex-shrink-0">⚠️</span>
                  <span className="font-medium"><strong>חשוב מאוד:</strong> אחרי שתתחיל לענות, לא תוכל לשמוע את הקטע שוב!</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => setShowListeningIntro(false)}
              disabled={!canProceedToQuestions}
              className="w-full h-14 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-base sm:text-lg font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">

              {canProceedToQuestions ?
              <>
                  ✓ התחל לענות על השאלות
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </> :

              <>
                  <span className="text-sm sm:text-base">שמע את הקטע פעמיים כדי להמשיך</span>
                </>
              }
            </Button>
          </motion.div>
        </div>
      </div>);

  }

  // Show reading text if exists and requested
  if (readingText && showReadingText) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-b-[2rem] p-4 sm:p-6 shadow-xl mb-4">
          <div className="flex items-center justify-between text-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Practice"))}
              className="text-white hover:bg-white/20 h-9 w-9">

              <ChevronRight className="w-5 h-5" />
            </Button>

            <div className="text-center flex-1">
              <h1 className="text-lg sm:text-xl font-bold">{topicName}</h1>
              <p className="text-xs sm:text-sm opacity-90">סט {setNumber} • {currentSetQuestions.length} שאלות</p>
            </div>

            <div className="w-9" />
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto">

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5 border-b-2 border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">קרא את הטקסט</h2>
                  <p className="text-xs sm:text-sm text-gray-600">לאחר מכן תענה על 10 שאלות</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="bg-white rounded-lg border-2 border-gray-200">
                <div
                  className="text-base sm:text-lg leading-[1.8] text-gray-900 p-4 sm:p-6 whitespace-pre-wrap text-left"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    direction: 'ltr',
                    lineHeight: '1.8'
                  }}>

                  {readingText}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 pt-0">
              <Button
                onClick={() => setShowReadingText(false)}
                className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-base sm:text-lg font-bold rounded-xl shadow-md">

                יאללה לקרוא - המשך לשאלות
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>);

  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <div className="bg-blue-500 p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3 sm:mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10">

            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-base sm:text-xl font-bold">{topicName}</h1>
            <p className="text-xs sm:text-sm opacity-90">סט {setNumber} • שאלה {currentQuestionIndex + 1} מתוך {currentSetQuestions.length}</p>
          </div>

          {readingText && !isListeningTopic &&
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowStoryDialog(true)}
            className="text-white hover:bg-white/20">

              <BookOpen className="w-5 h-5" />
            </Button>
          }
        </div>

        <div className="bg-white/20 rounded-full h-1.5 sm:h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-white" />

        </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 sm:p-3 gap-3">
        {/* Reading text panel on the right */}
        {readingText && !isListeningTopic &&
        <div className="hidden md:flex md:w-1/2 bg-white rounded-2xl shadow-xl overflow-hidden flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="text-lg font-bold">הטקסט</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
              className="text-base leading-[1.8] text-gray-900 whitespace-pre-wrap text-left"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                direction: 'ltr',
                lineHeight: '1.8'
              }}>

                {readingText}
              </div>
            </div>
          </div>
        }

        {/* Main question area */}
        <motion.div
          key={currentQuestion.question_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">

          <div className="flex-1 overflow-y-auto p-4 pb-4 pt-6">
          {currentQuestion.question_type === "writing" ?
            <WritingEditor
              prompt={currentQuestion.question_text}
              initialText={answers[currentQuestion.question_id] || ""}
              minWords={user?.selected_units === 4 ? 60 : user?.selected_units === 5 ? 80 : 60}
              maxWords={user?.selected_units === 4 ? 100 : user?.selected_units === 5 ? 120 : 100}
              onSaveDraft={(text, wordCount) => {
                setAnswers((prev) => ({ ...prev, [currentQuestion.question_id]: text }));
                handleSaveWritingDraft(text, wordCount);
              }}
              onSubmit={(text, wordCount) => {
                setAnswers((prev) => ({ ...prev, [currentQuestion.question_id]: text }));
                handleSubmitAnswer(text);
              }}
              isSaving={isSavingDraft}
              isSubmitting={isSubmitting} /> :


            <>
          {/* Separator after reading text */}
          {readingText && currentQuestionIndex === 0 &&
              <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-center shadow-md mb-6">
                <div className="flex items-center justify-center gap-2 text-white">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-base font-bold">Questions About The Reading Text</span>
                </div>
              </div>
              <div className="border-b-4 border-blue-200 mb-6" />
            </div>
              }

          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-500 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="font-bold text-white text-lg">{currentQuestionIndex + 1}</span>
              </div>
              <p
                    className="flex-1 text-base sm:text-lg text-gray-900 leading-[1.7] whitespace-pre-wrap pt-1"
                    dir={currentQuestion.question_text.match(/[א-ת]/) ? "rtl" : "ltr"}
                    style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}>

                {currentQuestion.question_text}
              </p>
            </div>
            
            {currentQuestion.question_image_url &&
                <img
                  src={currentQuestion.question_image_url}
                  alt="Question"
                  className="mt-4 rounded-xl max-w-full shadow-md border-2 border-gray-200" />

                }
          </div>

          {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 &&
              <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                  let optionText = '';
                  if (typeof option === 'object' && option !== null) {
                    if ('text' in option) {
                      optionText = String(option.text);
                    } else if ('value' in option) {
                      optionText = String(option.value);
                    } else {
                      optionText = JSON.stringify(option);
                    }
                  } else {
                    optionText = String(option || '');
                  }

                  const currentAnswer = answers[currentQuestion.question_id];
                  const isSelected = String(currentAnswer || '').trim() === optionText.trim();

                  return (
                    <button
                      key={idx}
                      onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.question_id]: optionText }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all shadow-sm ${
                      isSelected ?
                      'border-blue-600 bg-blue-50 shadow-md' :
                      'border-gray-300 hover:border-blue-400 hover:bg-gray-50'} cursor-pointer`
                      }
                      dir="ltr">

                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ?
                        'border-blue-600 bg-blue-600' :
                        'border-gray-400'}`
                        }>
                        {isSelected &&
                          <div className="w-3 h-3 bg-white rounded-full" />
                          }
                      </div>
                      <span className="text-base font-medium text-gray-900 flex-1 leading-relaxed text-left">{optionText}</span>
                    </div>
                  </button>);

                })}
            </div>
              }
            </>
            }
          </div>

          {/* Answer input area - fixed at bottom */}
          {currentQuestion.question_type !== "writing" &&
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-4 z-20">
              <div className="space-y-3 max-w-2xl mx-auto">
                {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 ?
              <div></div> :

              <Textarea
                value={answers[currentQuestion.question_id] || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.question_id]: e.target.value }))}
                placeholder="הקלד את תשובתך כאן..."
                className="w-full h-24 text-base resize-none border-2 border-gray-300 focus:border-blue-500 rounded-lg"
                dir="ltr" />

              }

                <Button
                onClick={() => handleSubmitAnswer()}
                disabled={!hasAnswered || isSubmitting} className="bg-blue-500 text-primary-foreground px-4 py-2 text-base font-bold rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-full h-14 hover:bg-blue-700 disabled:opacity-50 shadow-lg">


                  {currentQuestionIndex < currentSetQuestions.length - 1 ? 'שאלה הבאה' : 'סיים וראה תוצאות'}
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              </div>
            </div>
          }
        </motion.div>
      </div>

      {showCalculator &&
      <MathCalculator onClose={() => setShowCalculator(false)} />
      }

      {showDrawingBoard &&
      <DrawingCanvas
        onClose={() => setShowDrawingBoard(false)}
        questionText={currentQuestion.question_text} />

      }

      {/* Story Dialog */}
      <Dialog open={showStoryDialog} onOpenChange={setShowStoryDialog}>
        <DialogContent dir="ltr" className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold" dir="rtl">📖 הסיפור</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] p-4">
            <div
              className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap"
              style={{
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
              }}>

              {readingText}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStoryDialog(false)} className="w-full bg-blue-600 hover:bg-blue-700">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <RatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        onSubmitRating={handleSubmitRating} />


      {/* Continue Dialog */}
      <Dialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">סיימת את הסט! 🎉</DialogTitle>
            <DialogDescription>
              סיימת {currentSetQuestions.length} שאלות
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4 my-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {Object.values(results).filter((r) => r.isCorrect).length} / {currentSetQuestions.length}
              </div>
              <div className="text-sm text-gray-600 mb-3">תשובות נכונות</div>
              <div className="text-2xl font-bold text-gray-900 mt-3">
                {Math.round(Object.values(results).filter((r) => r.isCorrect).length / currentSetQuestions.length * 100)}%
              </div>
              <div className="text-xs text-gray-600">דרגת השליטה בנושא</div>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentSetQuestions.map((q, idx) => {
              const result = results[q.question_id];
              return (
                <div key={q.question_id} className={`p-3 rounded-lg border-2 ${
                result?.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`
                }>
                  <div className="flex items-center gap-2">
                    {result?.isCorrect ?
                    <Check className="w-5 h-5 text-green-600" /> :

                    <X className="w-5 h-5 text-red-600" />
                    }
                    <span className="font-semibold text-gray-900">שאלה {idx + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{q.question_text.substring(0, 80)}...</p>
                </div>);

            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={finishPractice}>
              סיים תרגול
            </Button>
            <Button onClick={handleContinueToNextSet} className="bg-green-600 hover:bg-green-700">
              <Trophy className="w-5 h-5 ml-2" />
              המשך לסט הבא
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">צפה בסרטון והמשך</DialogTitle>
            <DialogDescription>
              סרטון קצר של 5 שניות והמשך לתרגל
            </DialogDescription>
          </DialogHeader>

          <div className="text-center py-4">
            <AdManager onContinue={handleAdComplete}>
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="text-4xl mb-3">📺</div>
                <p className="text-gray-700">צופה בסרטון...</p>
              </div>
            </AdManager>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdDialog(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Writing Feedback Dialog */}
      <Dialog open={showWritingFeedback} onOpenChange={setShowWritingFeedback}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
              writingFeedbackData?.percentage >= 70 ? 'bg-green-500' :
              writingFeedbackData?.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`
              }>
                {Math.round(writingFeedbackData?.percentage || 0)}
              </div>
              <div className="flex-1">
                <div>הציון שלך</div>
                <div className="text-base font-normal text-gray-600">
                  {writingFeedbackData?.wordCount} מילים • {writingFeedbackData?.displayUnits} יחידות
                </div>
                {writingFeedbackData?.evaluation?.bagrut_realistic_score &&
                <div className="text-sm text-blue-600 font-semibold mt-1">
                    ציון בגרות מוערך: {writingFeedbackData.evaluation.bagrut_realistic_score}
                  </div>
                }
              </div>
            </DialogTitle>
          </DialogHeader>

          {writingFeedbackData?.evaluation &&
          <div className="space-y-4 py-4">
              {/* Opening Summary */}
              {writingFeedbackData.evaluation.opening_sentence &&
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                  <div className="text-sm font-bold mb-2">📋 סיכום ראשוני</div>
                  <div className="text-base leading-relaxed">{writingFeedbackData.evaluation.opening_sentence}</div>
                </div>
            }

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                onClick={() => setShowRewriteOptions(!showRewriteOptions)}
                variant="outline"
                className="border-2 border-purple-400 text-purple-700 hover:bg-purple-50">

                  <Wand2 className="w-4 h-4 mr-2" />
                  גרסאות משופרות
                </Button>
                <Button
                onClick={() => setShowSentenceAnalysis(!showSentenceAnalysis)}
                variant="outline"
                className="border-2 border-blue-400 text-blue-700 hover:bg-blue-50">

                  <FileText className="w-4 h-4 mr-2" />
                  ניתוח משפט-משפט
                </Button>
                <Button
                onClick={() => setShowVocabularyHelp(!showVocabularyHelp)}
                variant="outline"
                className="border-2 border-green-400 text-green-700 hover:bg-green-50">

                  <BookOpen className="w-4 h-4 mr-2" />
                  מילים ומשפטים
                </Button>
              </div>

              {/* Score Breakdown */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-300">
                <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  פירוט הציון
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">השגת המשימה</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{writingFeedbackData.evaluation.task_feedback_hebrew}</div>
                    </div>
                    <span className="text-lg font-bold text-blue-600 ml-3">{writingFeedbackData.evaluation.task_achievement}/25</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">ארגון המבנה</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{writingFeedbackData.evaluation.organization_feedback_hebrew}</div>
                    </div>
                    <span className="text-lg font-bold text-purple-600 ml-3">{writingFeedbackData.evaluation.organization}/25</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">דקדוק</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{writingFeedbackData.evaluation.grammar_feedback_hebrew}</div>
                    </div>
                    <span className="text-lg font-bold text-green-600 ml-3">{writingFeedbackData.evaluation.grammar}/25</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">אוצר מילים ואיות</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{writingFeedbackData.evaluation.vocabulary_feedback_hebrew}</div>
                    </div>
                    <span className="text-lg font-bold text-orange-600 ml-3">{writingFeedbackData.evaluation.vocabulary}/25</span>
                  </div>
                  <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-3 mt-3">
                    <span className="text-base font-bold text-white">ציון סופי</span>
                    <span className="text-2xl font-bold text-white">{writingFeedbackData.evaluation.total_score}/100</span>
                  </div>
                </div>
              </div>

              {/* Rewrite Options */}
              {showRewriteOptions &&
            <div className="space-y-3">
                  {writingFeedbackData.evaluation.rewritten_version_90_plus &&
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-300">
                      <div className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                        <Crown className="w-5 h-5" />
                        גרסה משודרגת (90+)
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-800 leading-relaxed" dir="ltr">
                        {writingFeedbackData.evaluation.rewritten_version_90_plus}
                      </div>
                    </div>
              }

                  {writingFeedbackData.evaluation.rewritten_with_connectors &&
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-300">
                      <div className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <span className="text-xl">🔗</span>
                        גרסה עם מילות קישור
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-800 leading-relaxed" dir="ltr">
                        {writingFeedbackData.evaluation.rewritten_with_connectors}
                      </div>
                    </div>
              }

                  {writingFeedbackData.evaluation.rewritten_advanced_vocabulary &&
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300">
                      <div className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        גרסה עם אוצר מילים מתקדם
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-800 leading-relaxed" dir="ltr">
                        {writingFeedbackData.evaluation.rewritten_advanced_vocabulary}
                      </div>
                    </div>
              }
                </div>
            }

              {/* Sentence Analysis */}
              {showSentenceAnalysis && writingFeedbackData.evaluation.sentence_by_sentence_analysis?.length > 0 &&
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-300">
                  <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🔍</span>
                    ניתוח משפט אחר משפט
                  </div>
                  <div className="space-y-3">
                    {writingFeedbackData.evaluation.sentence_by_sentence_analysis.map((analysis, i) =>
                <div key={i} className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="text-xs font-bold text-gray-500 mb-1">משפט {i + 1}:</div>
                        <div className="text-sm text-gray-900 mb-2" dir="ltr">{analysis.original_sentence}</div>
                        {analysis.what_is_good &&
                  <div className="text-xs text-green-700 mb-1">✓ {analysis.what_is_good}</div>
                  }
                        {analysis.what_needs_fixing &&
                  <div className="text-xs text-red-700 mb-1">✗ {analysis.what_needs_fixing}</div>
                  }
                        {analysis.improved_version &&
                  <div className="bg-green-50 rounded p-2 mt-2">
                            <div className="text-xs font-semibold text-green-900 mb-1">→ גרסה משופרת:</div>
                            <div className="text-sm text-green-800" dir="ltr">{analysis.improved_version}</div>
                          </div>
                  }
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Vocabulary and Phrases Help */}
              {showVocabularyHelp &&
            <div className="space-y-3">
                  {writingFeedbackData.evaluation.connectors_to_use?.length > 0 &&
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-300">
                      <div className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">🔗</span>
                        מילות קישור לשימוש
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {writingFeedbackData.evaluation.connectors_to_use.map((conn, i) =>
                  <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="font-bold text-purple-700" dir="ltr">{conn.connector}</div>
                            <div className="text-xs text-gray-700 mt-1">{conn.usage_hebrew}</div>
                            <div className="text-xs text-gray-600 mt-1 italic" dir="ltr">"{conn.example}"</div>
                          </div>
                  )}
                      </div>
                    </div>
              }

                  {writingFeedbackData.evaluation.advanced_vocabulary?.length > 0 &&
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300">
                      <div className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        מילים מתקדמות לשדרוג
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {writingFeedbackData.evaluation.advanced_vocabulary.map((vocab, i) =>
                  <div key={i} className="bg-white rounded-lg p-3 border border-green-200">
                            <div className="font-bold text-green-700">{vocab.word}</div>
                            <div className="text-xs text-gray-700 mt-1">{vocab.meaning_hebrew}</div>
                            <div className="text-xs text-gray-600 mt-1 italic" dir="ltr">"{vocab.example_sentence}"</div>
                          </div>
                  )}
                      </div>
                    </div>
              }

                  {writingFeedbackData.evaluation.useful_phrases?.length > 0 &&
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-300">
                      <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">💬</span>
                        ביטויים שימושיים לבגרות
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {writingFeedbackData.evaluation.useful_phrases.map((phrase, i) =>
                  <div key={i} className="bg-white rounded-lg p-2 border border-blue-200">
                            <div className="text-sm text-blue-800" dir="ltr">{phrase}</div>
                          </div>
                  )}
                      </div>
                    </div>
              }
                </div>
            }

              {/* Recurring Mistakes */}
              {writingFeedbackData.evaluation.recurring_mistakes?.length > 0 &&
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-300">
                  <div className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    טעויות שחוזרות על עצמן
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.recurring_mistakes.map((mistake, i) =>
                <div key={i} className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                            {mistake.count}x
                          </span>
                          <span className="text-sm font-bold text-red-900">{mistake.mistake_type}</span>
                        </div>
                        <div className="text-xs text-gray-700 mb-1">{mistake.explanation_hebrew}</div>
                        <div className="text-xs text-green-700 bg-green-50 rounded p-2 mt-1">
                          💡 {mistake.how_to_fix}
                        </div>
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Strengths */}
              {writingFeedbackData.evaluation.strengths?.length > 0 &&
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    נקודות חוזק
                  </div>
                  <ul className="space-y-1">
                    {writingFeedbackData.evaluation.strengths.map((strength, i) =>
                <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600">•</span>
                        <span>{strength}</span>
                      </li>
                )}
                  </ul>
                </div>
            }

              {/* Areas to Improve */}
              {writingFeedbackData.evaluation.areas_to_improve?.length > 0 &&
            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    תחומים לשיפור
                  </div>
                  <ul className="space-y-1">
                    {writingFeedbackData.evaluation.areas_to_improve.map((area, i) =>
                <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                        <span className="text-orange-600">•</span>
                        <span>{area}</span>
                      </li>
                )}
                  </ul>
                </div>
            }

              {/* Grammar Errors */}
              {writingFeedbackData.evaluation.grammar_errors?.length > 0 &&
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <div className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    שגיאות דקדוק שזוהו
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.grammar_errors.map((err, i) =>
                <div key={i} className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-sm text-red-800 font-semibold mb-1">{err.error || err}</div>
                        {err.explanation_hebrew &&
                  <div className="text-xs text-gray-700 leading-relaxed">{err.explanation_hebrew}</div>
                  }
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Spelling Errors */}
              {writingFeedbackData.evaluation.spelling_errors?.length > 0 &&
            <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-200">
                  <div className="text-sm font-bold text-pink-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">✏️</span>
                    שגיאות כתיב שזוהו
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {writingFeedbackData.evaluation.spelling_errors.map((err, i) =>
                <div key={i} className="bg-white rounded-lg p-3 border border-pink-200">
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className="text-red-600 line-through font-semibold">{err.word || err}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-semibold">{err.correction || '?'}</span>
                        </div>
                        {err.explanation_hebrew &&
                  <div className="text-xs text-gray-700">{err.explanation_hebrew}</div>
                  }
                      </div>
                )}
                  </div>
                </div>
            }

              {/* What to Do Next Time */}
              {writingFeedbackData.evaluation.what_to_do_next_time &&
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                  <div className="text-sm font-bold mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    מה לעשות בפעם הבאה
                  </div>
                  <div className="text-base leading-relaxed">{writingFeedbackData.evaluation.what_to_do_next_time}</div>
                </div>
            }

              {/* Tense Errors */}
              {writingFeedbackData.evaluation.tense_errors?.length > 0 &&
            <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                  <div className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    שגיאות זמנים (עבר/הווה/עתיד)
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.tense_errors.map((err, i) =>
                <div key={i} className="bg-white rounded-lg p-3 border border-amber-200">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-600 font-semibold text-sm">✗</span>
                          <span className="text-sm text-gray-900">{err.error || err}</span>
                        </div>
                        {err.correction &&
                  <div className="flex items-start gap-2 mb-1">
                            <span className="text-green-600 font-semibold text-sm">✓</span>
                            <span className="text-sm text-green-700 font-semibold">{err.correction}</span>
                          </div>
                  }
                        {err.explanation &&
                  <div className="text-xs text-gray-600 mt-1 pr-5">
                            💡 {err.explanation}
                          </div>
                  }
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Agreement Errors */}
              {writingFeedbackData.evaluation.agreement_errors?.length > 0 &&
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🔢</span>
                    שגיאות הסכמה (יחיד/רבים)
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.agreement_errors.map((err, i) =>
                <div key={i} className="bg-white rounded-lg p-2 border border-purple-200">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-600 font-semibold">{err.error || err}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-semibold">{err.correction || ''}</span>
                        </div>
                      </div>
                )}
                  </div>
                </div>
            }

              {/* Punctuation Errors */}
              {writingFeedbackData.evaluation.punctuation_errors?.length > 0 &&
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    שגיאות ניקוד ואותיות גדולות
                  </div>
                  <ul className="space-y-1">
                    {writingFeedbackData.evaluation.punctuation_errors.map((err, i) =>
                <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{err}</span>
                      </li>
                )}
                  </ul>
                </div>
            }
            </div>
          }

          <DialogFooter>
            <Button
              onClick={() => {
                setShowWritingFeedback(false);
                if (currentQuestionIndex < currentSetQuestions.length - 1) {
                  setCurrentQuestionIndex((prev) => prev + 1);
                } else {
                  saveWeakTopicsStats();
                  setShowSummary(true);
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold">

              {currentQuestionIndex < currentSetQuestions.length - 1 ? 'המשך לשאלה הבאה' : 'סיים וראה סיכום'}
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}