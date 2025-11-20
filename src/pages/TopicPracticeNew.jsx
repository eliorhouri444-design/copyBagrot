import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Check, X, Calculator, Pencil, Loader2, ChevronRight, Trophy, AlertCircle, Crown, BookOpen, Wand2, FileText } from "lucide-react"; // Added FileText
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
  DialogFooter
} from "@/components/ui/dialog";
import AdManager from "../components/ads/AdManager";

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

      const questionsForTopic = allQuestionsRaw.filter(q => 
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
      const isWritingTopic = questionsForTopic.some(q => q.question_type === "writing");
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

      // Check if this is listening comprehension
      const isListeningComprehension = topicId.toLowerCase().includes('listening') || 
                                       topicId.toLowerCase().includes('האזנה');
      
      if (isListeningComprehension && setQuestions[0]?.reading_text) {
        setListeningText(setQuestions[0].reading_text);
        setShowListeningIntro(true);
      } else {
        setListeningText("");
        setShowListeningIntro(false);
      }

      const session = await base44.entities.PracticeSessionNew.create({
        session_type: "topic_practice",
        subject_id: questionsForTopic[0].subject_id,
        unit_level: questionsForTopic[0].unit_level,
        topic_id: topicId,
        questions: setQuestions.map(q => q.question_id),
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

  const handleSubmitAnswer = async (providedAnswer) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const currentQuestion = currentSetQuestions[currentQuestionIndex];
    const userAnswer = (typeof providedAnswer === 'object' && providedAnswer !== null && 'text' in providedAnswer) 
      ? String(providedAnswer.text) 
      : String(providedAnswer || answers[currentQuestion.question_id] || "");

    // Moved displayUnits here to make it accessible to the AI prompt
    const displayUnits = user?.selected_units || 3;
    const targetWords = displayUnits === 4 ? 80 : displayUnits === 5 ? 100 : 80;

    try {
      // Check if this is a writing question
      if (currentQuestion.question_type === "writing") {
        console.log("🎯 Starting writing evaluation...");
        // Use AI to evaluate writing
        const wordCount = userAnswer.trim().split(/\s+/).filter(w => w).length;
        
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
        await base44.entities.AttemptNew.create({
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

        setResults(prev => ({
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
        // Regular question handling
        const solutions = await base44.entities.SolutionBank.filter({
          question_id: currentQuestion.question_id
        });

        let isCorrect = false;
        let status = "incorrect";
        let correctAnswer = "";

        if (solutions.length > 0) {
          const solution = solutions[0];
          const correctAnswers = solution.final_answers || [];
          const acceptableVariants = solution.acceptable_variants || [];

          if (correctAnswers.length > 0) {
            correctAnswer = correctAnswers[0].value || "";
          }

          const normalizedUserAnswer = userAnswer.trim().toLowerCase();
          
          isCorrect = correctAnswers.some(ans => 
            ans.value?.toLowerCase() === normalizedUserAnswer
          ) || acceptableVariants.some(variant => 
            variant.toLowerCase() === normalizedUserAnswer
          );

          status = isCorrect ? "correct" : "incorrect";
        }

        await base44.entities.AttemptNew.create({
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

        setResults(prev => ({
          ...prev,
          [currentQuestion.question_id]: { isCorrect, status, correctAnswer, userAnswer }
        }));
      }

      // מעבר ישיר לשאלה הבאה או לסיכום
      setIsSubmitting(false);
      if (currentQuestionIndex < currentSetQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        saveWeakTopicsStats();
        setShowSummary(true);
      }
    } catch (error) {
      console.error("❌ Error submitting answer:", error);
      alert(`שגיאה בבדיקת התשובה: ${error.message}\n\nנסה שוב או פנה לתמיכה.`);
      setIsSubmitting(false);
    }
  };

  const saveWeakTopicsStats = async () => {
    try {
      const wrongQuestions = currentSetQuestions.filter(q => {
        const result = results[q.question_id];
        return result && !result.isCorrect;
      });

      if (wrongQuestions.length === 0) return;

      const topicPerformance = {
        topic_id: topicId,
        subject_id: currentSetQuestions[0].subject_id,
        unit_level: currentSetQuestions[0].unit_level,
        total_questions: currentSetQuestions.length,
        correct_answers: Object.values(results).filter(r => r.isCorrect).length,
        wrong_answers: wrongQuestions.length,
        accuracy_percent: Math.round((Object.values(results).filter(r => r.isCorrect).length / currentSetQuestions.length) * 100)
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
    const isWritingTopic = currentSetQuestions.some(q => q.question_type === "writing");
    const questionsPerSet = isWritingTopic ? WRITING_QUESTIONS_PER_SET : QUESTIONS_PER_SET;
    const nextSetStartIndex = (nextSet - 1) * questionsPerSet;
    
    if (nextSetStartIndex >= allQuestions.length) {
      finishPractice();
      return;
    }

    const isPremium = user?.is_premium;
    
    if (!isPremium && setNumber >= FREE_USER_MAX_SETS) {
      setShowAdDialog(true);
      return;
    }

    if (!isPremium) {
      setShowAdConfirmDialog(true);
    } else {
      // Reset state and navigate
      setAnswers({});
      setResults({});
      setCurrentQuestionIndex(0);
      setShowReadingText(true);
      window.location.href = createPageUrl(`TopicPracticeNew?topicid=${encodeURIComponent(topicId)}&set=${nextSet}`);
    }
  };

  const handleConfirmWatchAd = () => {
    setShowAdConfirmDialog(false);
    setShowAdDialog(true);
  };

  const handleAdComplete = () => {
    setShowAdDialog(false);
    const nextSet = setNumber + 1;
    setAnswers({});
    setResults({});
    setCurrentQuestionIndex(0);
    setShowReadingText(true);
    window.location.href = createPageUrl(`TopicPracticeNew?topicid=${encodeURIComponent(topicId)}&set=${nextSet}`);
  };

  const finishPractice = async () => {
    if (sessionId) {
      const correctCount = Object.values(results).filter(r => r.isCorrect).length;
      const totalQuestions = Object.keys(results).length;
      const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

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
      </div>
    );
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
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            חזור לתרגול
          </Button>
        </div>
      </div>
    );
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
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            חזור לתרגול
          </Button>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"
          >
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
                  {Object.values(results).filter(r => r.isCorrect).length} / {currentSetQuestions.length}
                </div>
                <div className="text-sm text-gray-600 mt-2">תשובות נכונות</div>
                <div className="text-3xl font-bold text-gray-900 mt-3">
                  {Math.round((Object.values(results).filter(r => r.isCorrect).length / currentSetQuestions.length) * 100)}%
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
              {currentSetQuestions.map((q, idx) => {
                const result = results[q.question_id];
                return (
                  <div key={idx} className={`rounded-xl p-4 border-2 ${
                    q.question_type === "writing" 
                      ? 'bg-blue-50 border-blue-300' 
                      : result?.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      {q.question_type === "writing" ? (
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {Math.round(result?.percentage || 0)}
                        </div>
                      ) : result?.isCorrect ? (
                        <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">שאלה {idx + 1}</div>
                        <div className="text-sm text-gray-700 mb-2">{q.question_text.substring(0, 80)}...</div>

                        {q.question_type === "writing" && result?.writingEvaluation ? (
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

                            {result.writingEvaluation.strengths?.length > 0 && (
                              <div className="bg-white rounded-lg p-3 border border-green-200">
                                <div className="text-xs font-bold text-green-900 mb-1">✅ נקודות חוזק:</div>
                                <ul className="text-sm text-gray-700 list-disc list-inside">
                                  {result.writingEvaluation.strengths.map((strength, i) => (
                                    <li key={i}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {result.writingEvaluation.areas_to_improve?.length > 0 && (
                              <div className="bg-white rounded-lg p-3 border border-orange-200">
                                <div className="text-xs font-bold text-orange-900 mb-1">🎯 תחומים לשיפור:</div>
                                <ul className="text-sm text-gray-700 list-disc list-inside">
                                  {result.writingEvaluation.areas_to_improve.map((area, i) => (
                                    <li key={i}>{area}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Corrected: grammar_errors items are objects, not strings */}
                            {result.writingEvaluation.grammar_errors?.length > 0 && (
                              <div className="bg-white rounded-lg p-3 border border-red-200">
                                <div className="text-xs font-bold text-red-900 mb-1">⚠️ שגיאות דקדוק:</div>
                                <ul className="text-sm text-gray-700 list-disc list-inside">
                                  {result.writingEvaluation.grammar_errors.map((err, i) => (
                                    <li key={i}>{err.error || JSON.stringify(err)}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {result.writingEvaluation.suggestions && (
                              <div className="bg-white rounded-lg p-3 border border-blue-200">
                                <div className="text-xs font-bold text-blue-900 mb-1">💡 הצעות:</div>
                                <div className="text-sm text-gray-700">{result.writingEvaluation.suggestions}</div>
                              </div>
                            )}
                          </div>
                        ) : !result?.isCorrect && q.question_type !== "writing" && (
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleContinueToNextSet} className="w-full bg-blue-600 hover:bg-blue-700">
                המשך לסט הבא
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
              <Button onClick={finishPractice} variant="outline" className="w-full">
                סיים וחזור לתרגול
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentSetQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / currentSetQuestions.length) * 100;
  const hasAnswered = !!answers[currentQuestion.question_id];
  const displayUnits = user?.selected_units || 3; // Moved displayUnits to a higher scope

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
              className="text-white hover:bg-white/20 h-9 w-9"
            >
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
            className="space-y-4"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white text-center">
              <div className="text-5xl mb-3">🎧</div>
              <h2 className="text-2xl font-bold mb-2">Listen Carefully</h2>
              <p className="text-indigo-100">שים לב - תוכל לשמוע את הקטע מספר פעמים</p>
            </div>

            <ListeningPlayer audioText={listeningText} />

            <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-indigo-200">
              <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                הוראות חשובות:
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3 bg-indigo-50 rounded-lg p-3">
                  <span className="text-indigo-600 font-bold text-lg flex-shrink-0">1</span>
                  <span className="font-medium">האזן לקטע השמיעה לפחות <strong>פעמיים</strong> לפני שתתחיל לענות</span>
                </li>
                <li className="flex items-start gap-3 bg-purple-50 rounded-lg p-3">
                  <span className="text-purple-600 font-bold text-lg flex-shrink-0">2</span>
                  <span className="font-medium">לאחר מכן תענה על <strong>{currentSetQuestions.length} שאלות</strong> על הקטע</span>
                </li>
                <li className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                  <span className="text-blue-600 font-bold text-lg flex-shrink-0">3</span>
                  <span className="font-medium">תוכל <strong>להאזין שוב</strong> בכל שלב תוך כדי השאלות</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => setShowListeningIntro(false)}
              className="w-full h-14 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-base sm:text-lg font-bold rounded-xl shadow-lg"
            >
              ✓ התחל לענות על השאלות
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    );
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
              className="text-white hover:bg-white/20 h-9 w-9"
            >
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
            className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto"
          >
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

            <div className="p-5 sm:p-6">
              <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 sm:p-5 border border-gray-200">
                <div 
                  className="text-[15px] sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap text-left"
                  style={{ 
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                    direction: 'ltr'
                  }}
                >
                  {readingText}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 pt-0">
              <Button
                onClick={() => setShowReadingText(false)}
                className="w-full h-12 sm:h-14 bg-green-600 hover:bg-green-700 text-base sm:text-lg font-bold rounded-xl shadow-md"
              >
                יאללה לקרוא - המשך לשאלות
                <ChevronLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col max-w-md mx-auto">
      <div className="bg-blue-600 p-3 sm:p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3 sm:mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Practice"))}
            className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>

          <div className="text-center flex-1">
            <h1 className="text-base sm:text-xl font-bold">{topicName}</h1>
            <p className="text-xs sm:text-sm opacity-90">סט {setNumber} • שאלה {currentQuestionIndex + 1} מתוך {currentSetQuestions.length}</p>
          </div>

          {readingText && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowStoryDialog(true)}
              className="text-white hover:bg-white/20"
            >
              <BookOpen className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="bg-white/20 rounded-full h-1.5 sm:h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-white"
          />
        </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-3">
        {/* Story panel on the right (if exists) */}
        <Dialog open={showStoryDialog} onOpenChange={setShowStoryDialog}>
          <DialogContent dir="rtl" className="sm:max-w-screen-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" /> הסיפור
              </DialogTitle>
              <DialogDescription>
                חזור לטקסט המקורי שלפני השאלות
              </DialogDescription>
            </DialogHeader>
            <div className="p-2 sm:p-4">
              <div
                className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap text-left"
                style={{
                  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                  direction: 'ltr'
                }}
              >
                {readingText}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowStoryDialog(false)}>
                חזור לשאלות
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Listening player if listening topic - always visible during questions */}
        {isListeningTopic && listeningText && (
          <div className="mb-3 sticky top-0 z-10">
            <ListeningPlayer audioText={listeningText} />
          </div>
        )}

        {/* Main question area */}
        <motion.div
          key={currentQuestion.question_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden max-h-full"
        >
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-3 sm:pb-4 pt-6 sm:pt-8">
          {currentQuestion.question_type === "writing" ? (
            <WritingEditor
              prompt={currentQuestion.question_text}
              initialText={answers[currentQuestion.question_id] || ""}
              minWords={user?.selected_units === 4 ? 60 : user?.selected_units === 5 ? 80 : 60}
              maxWords={user?.selected_units === 4 ? 100 : user?.selected_units === 5 ? 120 : 100}
              onSaveDraft={(text, wordCount) => {
                setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: text }));
                handleSaveWritingDraft(text, wordCount);
              }}
              onSubmit={(text, wordCount) => {
                setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: text }));
                handleSubmitAnswer(text);
              }}
              isSaving={isSavingDraft}
              isSubmitting={isSubmitting}
            />
          ) : (
            <>
          {/* Separator after reading text */}
          {readingText && currentQuestionIndex === 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-center shadow-md mb-6">
                <div className="flex items-center justify-center gap-2 text-white">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-base font-bold">Questions About The Reading Text</span>
                </div>
              </div>
              <div className="border-b-4 border-blue-200 mb-6" />
            </div>
          )}

          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-blue-600">{currentQuestionIndex + 1}</span>
            </div>
            <div className="flex-1">
              <p
                className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap"
                dir={currentQuestion.question_text.match(/[א-ת]/) ? "rtl" : "ltr"}
                style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}
              >
                {currentQuestion.question_text}
              </p>
              
              {currentQuestion.question_image_url && (
                <img
                  src={currentQuestion.question_image_url}
                  alt="Question"
                  className="mt-4 rounded-lg max-w-full"
                />
              )}
            </div>
          </div>

          {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => {
                const optionText = (typeof option === 'object' && option !== null && 'text' in option) 
                  ? option.text 
                  : String(option);
                const currentAnswer = answers[currentQuestion.question_id];
                const isSelected = String(currentAnswer) === optionText;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: optionText }))}
                    className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    } cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
            </>
          )}
          </div>

          {/* Answer input area - fixed at bottom */}
          {currentQuestion.question_type !== "writing" && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-3 sm:p-4 z-20">
              <div className="max-w-md mx-auto space-y-2 sm:space-y-3">
                {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "multi_choice") && currentQuestion.options?.length > 0 ? (
                  <div className="text-center text-sm text-gray-600">
                    בחר תשובה למעלה ↑
                  </div>
                ) : (
                  <Textarea
                    value={answers[currentQuestion.question_id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: e.target.value }))}
                    placeholder="הקלד את תשובתך כאן..."
                    className="w-full h-28 text-base resize-none"
                  />
                )}

                <Button
                  onClick={() => handleSubmitAnswer()}
                  disabled={!hasAnswered || isSubmitting}
                  className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl shadow-lg"
                >
                  {currentQuestionIndex < currentSetQuestions.length - 1 ? 'שאלה הבאה' : 'סיים וראה תוצאות'}
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {showCalculator && (
        <MathCalculator onClose={() => setShowCalculator(false)} />
      )}

      {showDrawingBoard && (
        <DrawingCanvas 
          onClose={() => setShowDrawingBoard(false)} 
          questionText={currentQuestion.question_text}
        />
      )}

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
              }}
            >
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

      {/* Rest of the dialogs remain the same */}
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
                {Object.values(results).filter(r => r.isCorrect).length} / {currentSetQuestions.length}
              </div>
              <div className="text-sm text-gray-600 mb-3">תשובות נכונות</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((Object.values(results).filter(r => r.isCorrect).length / currentSetQuestions.length) * 100)}%
              </div>
              <div className="text-xs text-gray-600">דרגת השליטה בנושא</div>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentSetQuestions.map((q, idx) => {
              const result = results[q.question_id];
              return (
                <div key={q.question_id} className={`p-3 rounded-lg border-2 ${
                  result?.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {result?.isCorrect ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold text-gray-900">שאלה {idx + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{q.question_text.substring(0, 80)}...</p>
                </div>
              );
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

      <Dialog open={showAdConfirmDialog} onOpenChange={setShowAdConfirmDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">המשך לסט הבא</DialogTitle>
            <DialogDescription>
              כדי להמשיך לסט הבא, נדרש לצפות בסרטון קצר
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">📺</div>
              <p className="text-gray-700 text-sm">
                צפה בסרטון קצר והמשך לתרגל עוד {QUESTIONS_PER_SET} שאלות
              </p>
              <p className="text-xs text-gray-500">
                או שדרג לפרימיום לתרגול ללא הגבלה
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button
              onClick={handleConfirmWatchAd}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              צפה בסרטון והמשך
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
            >
              <Crown className="w-4 h-4 ml-2" />
              שדרג לפרימיום
            </Button>
            <Button variant="outline" onClick={finishPractice} className="w-full">
              סיים תרגול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>המשך לסט הבא</DialogTitle>
            <DialogDescription>
              {setNumber >= FREE_USER_MAX_SETS ? 
                `הגעת למגבלה של ${FREE_USER_MAX_SETS} סטים חינמיים` : 
                'צפה בסרטון כדי להמשיך'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="text-center py-4">
            {setNumber >= FREE_USER_MAX_SETS ? (
              <>
                <p className="text-gray-700 mb-4">
                  שדרג לפרימיום כדי לתרגל ללא הגבלה
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("Premium"))}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500"
                >
                  <Crown className="w-4 h-4 ml-2" />
                  שדרג עכשוב
                </Button>
              </>
            ) : (
              <AdManager onContinue={handleAdComplete}>
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="text-4xl mb-3">📺</div>
                  <p className="text-gray-700">צופה בסרטון...</p>
                </div>
              </AdManager>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={finishPractice}>
              סיים תרגול
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
                writingFeedbackData?.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {Math.round(writingFeedbackData?.percentage || 0)}
              </div>
              <div className="flex-1">
                <div>הציון שלך</div>
                <div className="text-base font-normal text-gray-600">
                  {writingFeedbackData?.wordCount} מילים • {writingFeedbackData?.displayUnits} יחידות
                </div>
                {writingFeedbackData?.evaluation?.bagrut_realistic_score && (
                  <div className="text-sm text-blue-600 font-semibold mt-1">
                    ציון בגרות מוערך: {writingFeedbackData.evaluation.bagrut_realistic_score}
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {writingFeedbackData?.evaluation && (
            <div className="space-y-4 py-4">
              {/* Opening Summary */}
              {writingFeedbackData.evaluation.opening_sentence && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                  <div className="text-sm font-bold mb-2">📋 סיכום ראשוני</div>
                  <div className="text-base leading-relaxed">{writingFeedbackData.evaluation.opening_sentence}</div>
                </div>
              )}

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => setShowRewriteOptions(!showRewriteOptions)}
                  variant="outline"
                  className="border-2 border-purple-400 text-purple-700 hover:bg-purple-50"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  גרסאות משופרות
                </Button>
                <Button
                  onClick={() => setShowSentenceAnalysis(!showSentenceAnalysis)}
                  variant="outline"
                  className="border-2 border-blue-400 text-blue-700 hover:bg-blue-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  ניתוח משפט-משפט
                </Button>
                <Button
                  onClick={() => setShowVocabularyHelp(!showVocabularyHelp)}
                  variant="outline"
                  className="border-2 border-green-400 text-green-700 hover:bg-green-50"
                >
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
              {showRewriteOptions && (
                <div className="space-y-3">
                  {writingFeedbackData.evaluation.rewritten_version_90_plus && (
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-300">
                      <div className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                        <Crown className="w-5 h-5" />
                        גרסה משודרגת (90+)
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-800 leading-relaxed" dir="ltr">
                        {writingFeedbackData.evaluation.rewritten_version_90_plus}
                      </div>
                    </div>
                  )}

                  {writingFeedbackData.evaluation.rewritten_with_connectors && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-300">
                      <div className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <span className="text-xl">🔗</span>
                        גרסה עם מילות קישור
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-800 leading-relaxed" dir="ltr">
                        {writingFeedbackData.evaluation.rewritten_with_connectors}
                      </div>
                    </div>
                  )}

                  {writingFeedbackData.evaluation.rewritten_advanced_vocabulary && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300">
                      <div className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        גרסה עם אוצר מילים מתקדם
                      </div>
                      <div className="bg-white rounded-lg p-3 text-sm text-gray-800 leading-relaxed" dir="ltr">
                        {writingFeedbackData.evaluation.rewritten_advanced_vocabulary}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sentence Analysis */}
              {showSentenceAnalysis && writingFeedbackData.evaluation.sentence_by_sentence_analysis?.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-300">
                  <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🔍</span>
                    ניתוח משפט אחר משפט
                  </div>
                  <div className="space-y-3">
                    {writingFeedbackData.evaluation.sentence_by_sentence_analysis.map((analysis, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="text-xs font-bold text-gray-500 mb-1">משפט {i + 1}:</div>
                        <div className="text-sm text-gray-900 mb-2" dir="ltr">{analysis.original_sentence}</div>
                        {analysis.what_is_good && (
                          <div className="text-xs text-green-700 mb-1">✓ {analysis.what_is_good}</div>
                        )}
                        {analysis.what_needs_fixing && (
                          <div className="text-xs text-red-700 mb-1">✗ {analysis.what_needs_fixing}</div>
                        )}
                        {analysis.improved_version && (
                          <div className="bg-green-50 rounded p-2 mt-2">
                            <div className="text-xs font-semibold text-green-900 mb-1">→ גרסה משופרת:</div>
                            <div className="text-sm text-green-800" dir="ltr">{analysis.improved_version}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vocabulary and Phrases Help */}
              {showVocabularyHelp && (
                <div className="space-y-3">
                  {writingFeedbackData.evaluation.connectors_to_use?.length > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-300">
                      <div className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">🔗</span>
                        מילות קישור לשימוש
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {writingFeedbackData.evaluation.connectors_to_use.map((conn, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="font-bold text-purple-700" dir="ltr">{conn.connector}</div>
                            <div className="text-xs text-gray-700 mt-1">{conn.usage_hebrew}</div>
                            <div className="text-xs text-gray-600 mt-1 italic" dir="ltr">"{conn.example}"</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {writingFeedbackData.evaluation.advanced_vocabulary?.length > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300">
                      <div className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        מילים מתקדמות לשדרוג
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {writingFeedbackData.evaluation.advanced_vocabulary.map((vocab, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-green-200">
                            <div className="font-bold text-green-700">{vocab.word}</div>
                            <div className="text-xs text-gray-700 mt-1">{vocab.meaning_hebrew}</div>
                            <div className="text-xs text-gray-600 mt-1 italic" dir="ltr">"{vocab.example_sentence}"</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {writingFeedbackData.evaluation.useful_phrases?.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-300">
                      <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">💬</span>
                        ביטויים שימושיים לבגרות
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {writingFeedbackData.evaluation.useful_phrases.map((phrase, i) => (
                          <div key={i} className="bg-white rounded-lg p-2 border border-blue-200">
                            <div className="text-sm text-blue-800" dir="ltr">{phrase}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recurring Mistakes */}
              {writingFeedbackData.evaluation.recurring_mistakes?.length > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-300">
                  <div className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    טעויות שחוזרות על עצמן
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.recurring_mistakes.map((mistake, i) => (
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
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {writingFeedbackData.evaluation.strengths?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    נקודות חוזק
                  </div>
                  <ul className="space-y-1">
                    {writingFeedbackData.evaluation.strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas to Improve */}
              {writingFeedbackData.evaluation.areas_to_improve?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    תחומים לשיפור
                  </div>
                  <ul className="space-y-1">
                    {writingFeedbackData.evaluation.areas_to_improve.map((area, i) => (
                      <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                        <span className="text-orange-600">•</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grammar Errors */}
              {writingFeedbackData.evaluation.grammar_errors?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <div className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    שגיאות דקדוק שזוהו
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.grammar_errors.map((err, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-sm text-red-800 font-semibold mb-1">{err.error || err}</div>
                        {err.explanation_hebrew && (
                          <div className="text-xs text-gray-700 leading-relaxed">{err.explanation_hebrew}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spelling Errors */}
              {writingFeedbackData.evaluation.spelling_errors?.length > 0 && (
                <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-200">
                  <div className="text-sm font-bold text-pink-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">✏️</span>
                    שגיאות כתיב שזוהו
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {writingFeedbackData.evaluation.spelling_errors.map((err, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-pink-200">
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className="text-red-600 line-through font-semibold">{err.word || err}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-semibold">{err.correction || '?'}</span>
                        </div>
                        {err.explanation_hebrew && (
                          <div className="text-xs text-gray-700">{err.explanation_hebrew}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What to Do Next Time */}
              {writingFeedbackData.evaluation.what_to_do_next_time && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                  <div className="text-sm font-bold mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    מה לעשות בפעם הבאה
                  </div>
                  <div className="text-base leading-relaxed">{writingFeedbackData.evaluation.what_to_do_next_time}</div>
                </div>
              )}

              {/* Tense Errors */}
              {writingFeedbackData.evaluation.tense_errors?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                  <div className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    שגיאות זמנים (עבר/הווה/עתיד)
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.tense_errors.map((err, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-amber-200">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-red-600 font-semibold text-sm">✗</span>
                          <span className="text-sm text-gray-900">{err.error || err}</span>
                        </div>
                        {err.correction && (
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-green-600 font-semibold text-sm">✓</span>
                            <span className="text-sm text-green-700 font-semibold">{err.correction}</span>
                          </div>
                        )}
                        {err.explanation && (
                          <div className="text-xs text-gray-600 mt-1 pr-5">
                            💡 {err.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agreement Errors */}
              {writingFeedbackData.evaluation.agreement_errors?.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🔢</span>
                    שגיאות הסכמה (יחיד/רבים)
                  </div>
                  <div className="space-y-2">
                    {writingFeedbackData.evaluation.agreement_errors.map((err, i) => (
                      <div key={i} className="bg-white rounded-lg p-2 border border-purple-200">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-600 font-semibold">{err.error || err}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-semibold">{err.correction || ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Punctuation Errors */}
              {writingFeedbackData.evaluation.punctuation_errors?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    שגיאות ניקוד ואותיות גדולות
                  </div>
                  <ul className="space-y-1">
                    {writingFeedbackData.evaluation.punctuation_errors.map((err, i) => (
                      <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => {
                setShowWritingFeedback(false);
                if (currentQuestionIndex < currentSetQuestions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1);
                } else {
                  saveWeakTopicsStats();
                  setShowSummary(true);
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold"
            >
              {currentQuestionIndex < currentSetQuestions.length - 1 ? 'המשך לשאלה הבאה' : 'סיים וראה סיכום'}
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}