import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Clock, BookHeart, ChevronRight, ChevronLeft, CheckCircle, X, Award, Type, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

export default function ExamLiteraturePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [exam, setExam] = useState(null);
  const [examError, setExamError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [wordCounts, setWordCounts] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [score, setScore] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (!examId) {
        setExamError('No exam ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const u = await base44.auth.me();
        setUser(u);

        const e = await base44.entities.GenericExam.get(examId);
        setExam(e);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading exam:", error);
        setExamError(error.message || 'Failed to load exam');
        setIsLoading(false);
      }
    };
    loadData();
  }, [examId]);

  useEffect(() => {
    if (exam && examStarted && !examFinished && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1 || (handleSubmit(), 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [exam, examStarted, examFinished, timeLeft]);

  const handleStartExam = () => {
    setExamStarted(true);
    setTimeLeft(exam.duration_minutes * 60);
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setUserAnswers(prev => ({ ...prev, [questionNumber]: answer }));
    const words = answer.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCounts(prev => ({ ...prev, [questionNumber]: words }));
  };

  const handleSubmit = async () => {
    try {
      let totalScore = 0, earnedScore = 0;
      const results = exam.questions.map(questionItem => {
        const userAnswer = userAnswers[questionItem.question_number] || '';
        
        let isCorrect = userAnswer.length > 50;
        const wordCount = wordCounts[questionItem.question_number] || 0;
        let pointsAwarded = 0;
        
        if (wordCount >= 100) pointsAwarded = questionItem.points;
        else if (wordCount >= 50) pointsAwarded = Math.floor(questionItem.points * 0.7);
        else if (wordCount >= 20) pointsAwarded = Math.floor(questionItem.points * 0.4);
        
        totalScore += questionItem.points;
        earnedScore += pointsAwarded;

        return {
          question_number: questionItem.question_number,
          user_answer: userAnswer,
          correct_answer: questionItem.correct_answer,
          is_correct: pointsAwarded >= questionItem.points * 0.6,
          points_awarded: pointsAwarded,
          explanation: questionItem.explanation,
          word_count: wordCount
        };
      });

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
        earned_points: earnedScore
      });

      setScore({ total: totalScore, earned: earnedScore, percent: scorePercent, results });
      setExamFinished(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Error state - no exam ID
  if (!examId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">לא נמצא מזהה מבחן</h1>
          <Button onClick={() => navigate(createPageUrl("Exams"))}>חזרה למבחנים</Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מבחן ספרות...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (examError || !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">מבחן לא נמצא</h1>
          <p className="text-gray-600 mb-6">{examError || 'המבחן שחיפשת לא קיים'}</p>
          <Button onClick={() => navigate(createPageUrl("Exams"))}>חזרה למבחנים</Button>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Exams"))} className="mb-4">
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center">
                <BookHeart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-gray-600">{exam.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 text-center border-2 border-blue-500">
                <Clock className="w-6 h-6 text-pink-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{exam.duration_minutes}</div>
                <div className="text-xs">דקות</div>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl p-4 text-center border-2 border-blue-500">
                <Award className="w-6 h-6 text-rose-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{exam.total_points}</div>
                <div className="text-xs">נקודות</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center border-2 border-blue-500">
                <Type className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{exam.questions.length}</div>
                <div className="text-xs">שאלות</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-4 border-2 border-blue-500 mb-6">
              <div className="text-sm text-gray-700">
                <strong className="text-pink-900">מבחן ספרות:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• ניתוח טקסטים ספרותיים</li>
                  <li>• כתיבה מורחבת</li>
                  <li>• ספירת מילים אוטומטית</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleStartExam}
              className="w-full h-16 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xl font-bold rounded-2xl"
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-3xl shadow-2xl p-8 mb-6 ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}>
            <div className="text-center text-white">
              <motion.div initial={{scale:0}} animate={{scale:1}}>
                {passed ? <CheckCircle className="w-24 h-24 mx-auto mb-4" /> : <X className="w-24 h-24 mx-auto mb-4" />}
              </motion.div>
              <h1 className="text-5xl font-bold mb-2">{Math.round(score.percent)}</h1>
              <p className="text-2xl">{passed ? 'מצוין!' : 'המשך להתאמן'}</p>
              <p className="text-lg opacity-90">{score.earned} / {score.total} נקודות</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">משוב על התשובות</h2>
            <div className="space-y-6">
              {score.results.map((result, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border-2 ${result.is_correct ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex justify-between mb-4">
                    <div className="text-xl font-bold">שאלה {result.question_number}</div>
                    <div className="text-2xl font-bold text-pink-600">{result.points_awarded}/{exam.questions[idx].points} נק'</div>
                  </div>

                  <div className="bg-white rounded-xl p-4 mb-3">
                    <div className="text-gray-800 whitespace-pre-wrap">{exam.questions[idx].question_text}</div>
                  </div>

                  <div className="bg-pink-50 p-4 rounded-xl mb-3">
                    <div className="text-sm font-semibold mb-2">התשובה שלך ({result.word_count} מילים):</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result.user_answer || 'לא נענה'}</div>
                  </div>

                  {result.explanation && (
                    <div className="bg-white p-4 rounded-xl border-2 border-blue-500">
                      <div className="text-sm font-semibold mb-2 text-pink-900">💡 הסבר ודוגמה:</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{result.explanation}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <Button onClick={() => navigate(createPageUrl("Exams"))} variant="outline" className="flex-1 h-14">חזרה</Button>
              <Button onClick={() => window.location.reload()} className="flex-1 h-14 bg-gradient-to-r from-pink-600 to-rose-600">נסה שוב</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;
  const currentWordCount = wordCounts[question.question_number] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-xl">
                <Clock className="w-5 h-5 text-pink-600" />
                <span className="font-bold text-xl">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl">
                <Type className="w-5 h-5 text-purple-600" />
                <span className="font-bold">{currentWordCount} מילים</span>
              </div>
            </div>
            <div className="text-sm">שאלה <span className="font-bold text-lg text-pink-600">{currentQuestion+1}</span> / {exam.questions.length}</div>
          </div>
          <Progress value={progress} className="h-2 mt-3 [&>div]:bg-white" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion} initial={{opacity:0}} animate={{opacity:1}} className="bg-white rounded-2xl shadow-xl p-6 mb-4">
            <div className="flex justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  {question.question_number}
                </div>
                <div className="text-sm text-gray-600">{question.topic || 'ספרות'}</div>
              </div>
              <div className="bg-pink-100 px-4 py-2 rounded-xl">
                <span className="text-pink-900 font-bold text-lg">{question.points} נק'</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-6 mb-6 border-2 border-blue-500">
              <div className="text-lg text-gray-900 whitespace-pre-wrap leading-relaxed">{question.question_text}</div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-blue-500">
              <div className="text-sm font-semibold mb-3 flex justify-between">
                <span>כתוב תשובה מפורטת:</span>
                <span className={`${currentWordCount < 50 ? 'text-red-600' : currentWordCount < 100 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {currentWordCount} מילים
                </span>
              </div>
              <Textarea
                value={userAnswers[question.question_number] || ''}
                onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                placeholder="כתוב ניתוח מעמיק ומפורט..."
                className="w-full h-64 text-base leading-relaxed"
              />
              <div className="text-xs text-gray-500 mt-2">מומלץ לכתוב לפחות 100 מילים לתשובה מלאה</div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <Button onClick={() => setCurrentQuestion(p => Math.max(0,p-1))} disabled={currentQuestion===0} variant="outline" className="flex-1 h-14">
            <ChevronRight className="w-6 h-6 ml-2" /> הקודם
          </Button>
          {currentQuestion === exam.questions.length-1 ? (
            <Button onClick={handleSubmit} className="flex-1 h-14 bg-gradient-to-r from-green-600 to-emerald-600">סיים מבחן</Button>
          ) : (
            <Button onClick={() => setCurrentQuestion(p => p+1)} className="flex-1 h-14 bg-gradient-to-r from-pink-600 to-rose-600">
              הבא <ChevronLeft className="w-6 h-6 mr-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}