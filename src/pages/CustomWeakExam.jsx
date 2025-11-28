import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Zap, Brain, BookOpen, CheckCircle, XCircle, ChevronLeft, Trophy, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomWeakExamPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState([]);
  const [moduleInfo, setModuleInfo] = useState(null);

  useEffect(() => {
    loadUserAndQuestions();
  }, []);

  const loadUserAndQuestions = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // קבל את פרטי המודול מ-sessionStorage (מגיע רק מהכפתור ב-ModuleCarousel)
      const moduleId = sessionStorage.getItem('weakTopicsModule');
      const moduleEntity = sessionStorage.getItem('weakTopicsModuleEntity');
      const moduleTitle = sessionStorage.getItem('weakTopicsModuleTitle');

      // נקה את ה-sessionStorage
      sessionStorage.removeItem('weakTopicsModule');
      sessionStorage.removeItem('weakTopicsModuleEntity');
      sessionStorage.removeItem('weakTopicsModuleTitle');

      // נקה גם ערכים ישנים אם קיימים
      sessionStorage.removeItem('weakExamSource');
      sessionStorage.removeItem('weakExamModule');
      sessionStorage.removeItem('weakExamModuleEntity');

      if (!moduleId) {
        // אם אין מודול - חזור לדף הבגרויות
        console.log('No module specified, redirecting to Exams');
        navigate(createPageUrl("Exams"));
        return;
      }

      setModuleInfo({ id: moduleId, entity: moduleEntity, title: moduleTitle });

      // קבל את כל הניסיונות של המשתמש במודול הזה
      const examAttempts = await base44.entities.ExamAttempt.list("-created_date", 500);

      // סנן לפי משתמש, מקצוע, יחידות ומודול
      const userModuleAttempts = examAttempts.filter((a) => {
        if (a.created_by !== currentUser.email) return false;
        if (a.subject !== currentUser.selected_subject) return false;
        if (parseInt(a.unit_level) !== parseInt(currentUser.selected_units)) return false;

        // בדוק התאמה למודול
        if (a.module_id === moduleId) return true;
        if (moduleId === 'A' && a.exam_type === 'module_a') return true;
        if (moduleId === 'B' && a.exam_type === 'module_b') return true;
        if (moduleId === 'C' && a.exam_type === 'module_c') return true;
        if (moduleEntity === 'ModuleAExam' && a.exam_type === 'module_a') return true;
        if (moduleEntity === 'ModuleBExam' && a.exam_type === 'module_b') return true;
        if (moduleEntity === 'ModuleCExam' && a.exam_type === 'module_c') return true;

        return false;
      });

      console.log(`📊 Found ${userModuleAttempts.length} attempts for module ${moduleId}`);

      // === ניתוח נושאים חלשים מכל הבגרויות במודול ===
      const topicErrorStats = {};

      userModuleAttempts.forEach((attempt) => {
        if (attempt.answers && Array.isArray(attempt.answers)) {
          attempt.answers.forEach((answer, idx) => {
            // קבל את הנושא מהתשובה
            const topicKey = answer.topic || answer.topic_key || answer.topic_id || `שאלה_${idx + 1}`;

            if (!topicErrorStats[topicKey]) {
              topicErrorStats[topicKey] = {
                topic: topicKey,
                totalQuestions: 0,
                wrongAnswers: 0,
                questions: [] // שומר את כל השאלות הלא נכונות בנושא
              };
            }

            topicErrorStats[topicKey].totalQuestions++;

            if (!answer.is_correct) {
              topicErrorStats[topicKey].wrongAnswers++;
              topicErrorStats[topicKey].questions.push({
                exam_id: attempt.exam_id,
                question_index: idx,
                answer: answer
              });
            }
          });
        }
      });

      // חשב אחוז שגיאות לכל נושא ומיין מהחלש ביותר
      const sortedWeakTopics = Object.values(topicErrorStats).
      map((t) => ({
        ...t,
        errorRate: t.totalQuestions > 0 ? t.wrongAnswers / t.totalQuestions * 100 : 0
      })).
      filter((t) => t.wrongAnswers > 0) // רק נושאים עם שגיאות
      .sort((a, b) => b.errorRate - a.errorRate); // מיון לפי אחוז שגיאות

      console.log('📊 Weak topics found:', sortedWeakTopics.map((t) => `${t.topic}: ${Math.round(t.errorRate)}%`));
      setWeakTopics(sortedWeakTopics.slice(0, 5)); // שמור עד 5 נושאים חלשים להצגה

      // טען את כל המבחנים כדי לקבל את השאלות
      const [genericExams, moduleAExams, moduleBExams, moduleCExams] = await Promise.all([
      base44.entities.GenericExam.list(),
      base44.entities.ModuleAExam.list(),
      base44.entities.ModuleBExam.list(),
      base44.entities.ModuleCExam.list()]
      );

      const allExams = [...genericExams, ...moduleAExams, ...moduleBExams, ...moduleCExams];

      // === בנה שאלות מהנושאים החלשים ===
      const weakQuestions = [];
      const usedQuestionKeys = new Set(); // למנוע כפילויות

      // עבור על הנושאים החלשים ביותר וקח שאלות מהם
      sortedWeakTopics.forEach((topicInfo) => {
        topicInfo.questions.forEach((qInfo) => {
          const questionKey = `${qInfo.exam_id}_${qInfo.question_index}`;
          if (usedQuestionKeys.has(questionKey)) return;

          const exam = allExams.find((e) => e.id === qInfo.exam_id);
          if (exam && exam.questions && exam.questions[qInfo.question_index]) {
            const question = exam.questions[qInfo.question_index];
            weakQuestions.push({
              ...question,
              reading_text: question.reading_text || exam.reading_text,
              exam_id: qInfo.exam_id,
              exam_title: exam.title || 'מבחן בגרות',
              question_number: qInfo.question_index + 1,
              _metadata: {
                topic: topicInfo.topic,
                topicErrorRate: topicInfo.errorRate,
                failures: topicInfo.wrongAnswers,
                from_weak_topic: true
              }
            });
            usedQuestionKeys.add(questionKey);
          }
        });
      });

      // מיין לפי אחוז השגיאות של הנושא (נושאים חלשים יותר קודם)
      const sortedQuestions = weakQuestions.
      sort((a, b) => (b._metadata?.topicErrorRate || 0) - (a._metadata?.topicErrorRate || 0)).
      slice(0, 20); // עד 20 שאלות

      console.log('📝 Built weak topics exam with', sortedQuestions.length, 'questions');
      setQuestions(sortedQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnswer = async () => {
    if (!userAnswer.trim() || isChecking) return;

    setIsChecking(true);
    const question = questions[currentIndex];

    try {
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strict exam checker.

Question: ${question.question_text}
Correct Answer: ${question.correct_answer || "Check based on question"}
Answer Given: ${userAnswer}

Evaluate if the answer is correct. Be strict but fair.
IMPORTANT: In your Hebrew feedback, do NOT refer to "the student" or any person. Focus only on the answer itself (e.g., "התשובה לא נכונה כי..." instead of "הסטודנט טעה...").

Return JSON:`,
        response_json_schema: {
          type: "object",
          properties: {
            is_correct: { type: "boolean" },
            score: { type: "number" },
            feedback_hebrew: { type: "string" }
          }
        }
      });

      setIsCorrect(aiResponse.is_correct);
      setFeedback(aiResponse.feedback_hebrew);
      setShowResult(true);

      setAnswers((prev) => ({
        ...prev,
        [question.id || currentIndex]: {
          correct: aiResponse.is_correct,
          score: aiResponse.score,
          userAnswer
        }
      }));
    } catch (error) {
      console.error("Error checking answer:", error);
      setFeedback("שגיאה בבדיקת התשובה");
      setShowResult(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setShowResult(false);
      setIsCorrect(false);
      setFeedback("");
      setAudioPlayed(false);
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = () => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentIndex].id || currentIndex]: { correct: false, score: 0, userAnswer: "" }
    }));
    handleNext();
  };

  const handleAudioPlay = () => {
    const question = questions[currentIndex];
    if (question?.audio_url) {
      const audio = new Audio(question.audio_url);
      audio.play();
      audio.onended = () => {
        setAudioPlayed(true);
      };
      setCurrentAudio(audio);
    }
  };

  useEffect(() => {
    setAudioPlayed(false);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
  }, [currentIndex]);

  // מסך טעינה
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center">

          <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">בונה בגרות על נושאים חלשים...</h3>
          <p className="text-gray-600 font-semibold">
            {moduleInfo?.title ? `מנתח נושאים ב${moduleInfo.title}` : 'מחפש נושאים חלשים'}
          </p>
        </motion.div>
      </div>);

  }

  // אין שאלות - אין נושאים חלשים
  if (!user || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md">

          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {moduleInfo?.title ? `אין נושאים חלשים ב${moduleInfo.title}` : 'אין נושאים חלשים'}
          </h3>
          <p className="text-gray-600 mb-6">
            לא נמצאו טעויות בבגרויות קודמות במודול הזה. המשך לתרגל כדי לשפר עוד יותר!
          </p>
          <Button
            onClick={() => navigate(createPageUrl("Exams"))}
            className="w-full h-12 bg-blue-500 hover:bg-[#2086b1]">

            חזרה לבגרויות
          </Button>
        </motion.div>
      </div>);

  }

  // מסך סיכום
  if (showSummary) {
    const correctCount = Object.values(answers).filter((a) => a.correct).length;
    const totalAnswered = Object.keys(answers).length;
    const avgScore = totalAnswered > 0 ?
    Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0) / totalAnswered :
    0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">

          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">סיימת!</h2>
            <p className="text-gray-600">
              {moduleInfo?.title ? `בגרות נושאים חלשים - ${moduleInfo.title}` : 'בגרות על נושאים חלשים'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-blue-500">
            <div className="text-center">
              <div className="text-6xl font-black text-blue-600 mb-2">
                {correctCount} / {totalAnswered}
              </div>
              <div className="text-sm text-gray-600 mb-4">תשובות נכונות</div>
              <div className="text-4xl font-bold text-gray-900">
                {Math.round(avgScore)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">ציון ממוצע</div>
            </div>
          </div>

          {/* הצגת הנושאים החלשים שעבדנו עליהם */}
          {weakTopics.length > 0 &&
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
              <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                נושאים שתורגלו
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.slice(0, 3).map((topic, idx) =>
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-medium">

                    {topic.topic}
                  </span>
              )}
              </div>
            </div>
          }

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-blue-500 hover:bg-[#2086b1] text-lg font-bold shadow-lg">

              <Zap className="w-5 h-5 ml-2" />
              נסה שוב
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2">

              חזרה לבגרויות
            </Button>
          </div>
        </motion.div>
      </div>);

  }

  const question = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length * 100;
  const hasAudio = question.audio_url || question.topic_id?.includes('listening');
  const canAnswer = !hasAudio || audioPlayed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex flex-col">
      <div className="bg-blue-500 p-4 shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between text-white mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Exams"))}
            className="text-white hover:bg-white/20">

            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold">
                {moduleInfo?.title ? `בגרות נושאים חלשים - ${moduleInfo.title}` : 'בגרות על נושאים חלשים'}
              </h1>
              <Crown className="w-5 h-5 text-yellow-300" />
            </div>
            <p className="text-sm opacity-90">
              שאלה {currentIndex + 1} / {questions.length}
              {weakTopics.length > 0 && ` • ${weakTopics.length} נושאים חלשים`}
            </p>
          </div>

          <div className="w-10" />
        </div>

        <Progress value={progress} className="h-2 bg-white/20 [&>div]:bg-white" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">

          <div className="bg-[#ffffff] p-6 rounded-t-3xl from-blue-50 to-indigo-50 border-b-2 border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 font-medium">
                  שאלה {question.question_number} מ{question.exam_title}
                </div>
                <div className="text-xs text-blue-600">⚡ נושא חלש שדורש חיזוק</div>
              </div>
            </div>

            {/* הצגת הנושא החלש */}
            {question._metadata &&
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 mb-3 border-2 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <div className="text-xs font-bold text-blue-900">למה השאלה הזו?</div>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  בנושא <span className="font-bold text-blue-700">{question._metadata.topic}</span> יש לך {Math.round(question._metadata.topicErrorRate)}% שגיאות - יותר משאר הנושאים בשאלון הזה. לכן אני מתמקד איתך בתרגול נושא זה.
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">
                    {question._metadata.topic}
                  </span>
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                    {question._metadata.failures} טעויות
                  </span>
                </div>
              </div>
            }

            {question.reading_text &&
            <div className="bg-blue-50 rounded-xl p-4 mb-4 border-2 border-blue-500">
                <div className="text-xs font-bold text-blue-900 mb-2">📖 טקסט הקריאה:</div>
                <div className="text-sm text-gray-800 leading-relaxed max-h-48 overflow-y-auto">
                  {question.reading_text}
                </div>
              </div>
            }

            <div className="bg-white rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">שאלה:</h3>
              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {question.question_text}
              </p>
            </div>

            {hasAudio &&
            <div className="mt-4 bg-white rounded-xl p-4 border-2 border-blue-500">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🎧</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">קטע האזנה</div>
                    <div className="text-xs text-gray-600">
                      {audioPlayed ? '✅ הושמע' : 'השמע את הקטע לפני המענה'}
                    </div>
                  </div>
                  <Button
                  onClick={handleAudioPlay}
                  className="bg-[#2086b1] hover:bg-blue-700"
                  disabled={audioPlayed}>

                    {audioPlayed ? 'הושמע' : 'השמע'}
                  </Button>
                </div>
              </div>
            }
          </div>

          <div className="p-6 pt-0">
            {!showResult ?
            <div className="space-y-4">
                {!canAnswer &&
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 mb-4 text-center">
                    <div className="text-blue-800 font-bold mb-1">🎧 השמע את הקטע תחילה</div>
                    <div className="text-sm text-blue-600">לפני שתענה על השאלה, עליך להאזין לקטע</div>
                  </div>
              }
                
                <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder={canAnswer ? "הקלד את תשובתך..." : "האזן לקטע תחילה..."}
                className="w-full h-32 p-4 text-base border-2 border-blue-500 focus:border-blue-500 rounded-2xl resize-none"
                autoFocus={canAnswer}
                disabled={isChecking || !canAnswer} />


                <div className="flex gap-3">
                  <Button
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim() || isChecking || !canAnswer}
                  className="flex-1 h-14 bg-blue-500 hover:bg-[#2086b1] text-lg font-bold shadow-lg disabled:opacity-50">

                    {isChecking ? 'בודק...' : 'בדוק'}
                    <CheckCircle className="w-5 h-5 mr-2" />
                  </Button>
                  <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="px-6 h-14 text-lg font-semibold border-2">

                    דלג
                  </Button>
                </div>
              </div> :

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4">

                <div className={`rounded-2xl p-6 border-2 ${
              isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`
              }>
                  <div className="flex items-center gap-3 mb-3">
                    {isCorrect ?
                  <CheckCircle className="w-10 h-10 text-green-600" /> :

                  <XCircle className="w-10 h-10 text-red-600" />
                  }
                    <div className="flex-1">
                      <div className={`text-xl font-bold ${
                    isCorrect ? 'text-green-800' : 'text-red-800'}`
                    }>
                        {isCorrect ? 'מצוין! תשובה נכונה' : 'לא נכון'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4">
                    <div className="text-sm text-gray-700 leading-relaxed">{feedback}</div>
                  </div>
                </div>

                <Button
                onClick={handleNext}
                className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xl font-bold shadow-lg">

                  {currentIndex < questions.length - 1 ? 'השאלה הבאה' : 'סיים'}
                  <ChevronLeft className="w-6 h-6 mr-2" />
                </Button>
              </motion.div>
            }
          </div>
        </motion.div>
      </div>
    </div>);

}