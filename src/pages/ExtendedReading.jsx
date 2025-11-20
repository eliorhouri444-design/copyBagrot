import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle, XCircle, Lightbulb, RefreshCw, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ExtendedReadingPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get("topicid");
  
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("intro");
  const [readingData, setReadingData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // If topic ID provided, load from database
        if (topicId) {
          await loadQuestionsFromBank(topicId, currentUser);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [topicId]);

  const displayUnits = user?.selected_units || 4;
  const targetWords = displayUnits === 5 ? 450 : 300;
  const questionsCount = displayUnits === 5 ? 12 : 8;

  const loadQuestionsFromBank = async (topicId, currentUser) => {
    setIsLoading(true);
    setCurrentScreen("loading");
    
    try {
      const questions = await base44.entities.QuestionBank.filter({
        topic_id: topicId,
        is_active: true
      });

      if (questions.length === 0) {
        throw new Error("לא נמצאו שאלות לנושא זה");
      }

      // Get reading text from first question
      const readingText = questions[0].reading_text || "";
      
      if (!readingText) {
        throw new Error("לא נמצא טקסט קריאה לנושא זה");
      }

      // Format questions
      const formattedQuestions = questions.map((q, idx) => ({
        question_number: idx + 1,
        question_text: q.question_text,
        question_type: q.question_type === "multi_choice" ? "multiple_choice" : "open",
        options: q.options || [],
        correct_answer: q.options && q.options.length > 0 ? "A" : "", // Will be loaded from SolutionBank
        explanation_hebrew: "",
        paragraph_reference: 1,
        question_id: q.question_id,
        points: q.question_type === "multi_choice" ? 1 : 2
      }));

      // Load solutions
      const solutions = await base44.entities.SolutionBank.list();
      formattedQuestions.forEach(fq => {
        const solution = solutions.find(s => s.question_id === fq.question_id);
        if (solution) {
          fq.correct_answer = solution.final_answers?.[0]?.value || "";
          fq.explanation_hebrew = solution.solution_text || "";
        }
      });

      const topicName = questions[0].topic_id?.split('_').slice(2).join(' ') || "Extended Reading";

      setReadingData({
        title: topicName,
        topic: topicName,
        passage: readingText,
        word_count: readingText.split(' ').length,
        questions: formattedQuestions,
        fromDatabase: true
      });

      setCurrentScreen("reading");
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading questions from bank:", error);
      alert("שגיאה בטעינת השאלות: " + error.message);
      setIsLoading(false);
      setCurrentScreen("intro");
    }
  };

  const generateReading = async () => {
    setIsLoading(true);
    try {
      const generated = await base44.integrations.Core.InvokeLLM({
        prompt: `Create an Extended Reading passage for Israeli high school students (${displayUnits} units level).

Requirements:
- Length: ${targetWords} words
- Divide into 3-5 clear paragraphs
- Topic: Choose from: volunteer work, technology & society, environment, education, or personal stories
- Language level: B1-B2 (${displayUnits} units)
- Include rich vocabulary but not too difficult
- Make it engaging and relevant to teenagers

Then create ${questionsCount} reading comprehension questions IN ORDER of the paragraphs:

Question types (mix them):
1. Literal Understanding (2-3 questions) - Details clearly stated
2. Vocabulary in Context (2 questions) - "In line X, the word Y means..."
3. Inference (3-4 questions) - Understanding between the lines
4. Main Idea (1-2 questions)
5. Writer's Purpose (1 question)
6. Cause & Effect (1 question)
${displayUnits === 5 ? '7. Compare & Connect (1 question)' : ''}

For each question provide:
- The question text
- 4 options (A, B, C, D)
- Correct answer (letter)
- Explanation in Hebrew why this is correct and where the clue is in the text
- Question type

IMPORTANT: Questions MUST follow the paragraph order!`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            topic: { type: "string" },
            passage: { type: "string", description: "The full text divided by paragraphs with \\n\\n" },
            word_count: { type: "number" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_number: { type: "number" },
                  question_text: { type: "string" },
                  question_type: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "string", description: "A, B, C, or D" },
                  explanation_hebrew: { type: "string" },
                  paragraph_reference: { type: "number" }
                }
              }
            },
            main_message: { type: "string", description: "המסר המרכזי של הטקסט" },
            writers_tone: { type: "string", description: "טון הכותב" },
            deeper_meaning: { type: "string", description: "משמעות עמוקה יותר" }
          }
        }
      });

      setReadingData(generated);
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating reading:", error);
      alert("שגיאה ביצירת הטקסט: " + error.message);
      setIsLoading(false);
    }
  };

  const handleCheckAnswers = async () => {
    setIsLoading(true);
    try {
      // Use the new AI-powered checking function
      const response = await base44.functions.invoke('checkExtendedReading', {
        questions: readingData.questions,
        userAnswers: userAnswers,
        readingText: readingData.passage
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.error || "שגיאה בבדיקת התשובות");
      }

      const checkedResults = response.data.results;
      setResults(checkedResults);
      setInsights(response.data.insights);

      // Generate deep insights
      const deepInsights = await base44.integrations.Core.InvokeLLM({
        prompt: `בהתבסס על הטקסט הבא:

"${readingData.passage}"

תן תובנות מעמיקות לתלמיד:

1. מה המסר המרכזי של הטקסט?
2. מה אפשר להבין "בין השורות"?
3. מה טון הכותב (hopeful, critical, neutral)?
4. מה עמדת הכותב בנושא?
5. מה מסקנה שלא כתובה מפורשות?

כתוב הכל בעברית, בצורה ברורה ופשוטה.`,
        response_json_schema: {
          type: "object",
          properties: {
            main_message: { type: "string" },
            between_the_lines: { type: "string" },
            writers_tone: { type: "string" },
            writers_position: { type: "string" },
            implicit_conclusion: { type: "string" },
            reading_tips: {
              type: "array",
              items: { type: "string" },
              description: "טיפים לקריאה טובה יותר"
            }
          }
        }
      });

      setCurrentScreen("results");
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking answers:", error);
      alert("שגיאה בבדיקת התשובות");
      setIsLoading(false);
    }
  };

  const handleStartNew = () => {
    setCurrentScreen("intro");
    setReadingData(null);
    setUserAnswers({});
    setResults(null);
    setInsights(null);
  };

  // Screen 1: Intro
  if (currentScreen === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Extended Reading Practice</h1>
            <p className="text-gray-600">תרגול הבנת נקרא מורחב - כמו בבגרות</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3">📖 מה תעשה כאן:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>תקרא טקסט ארוך ({targetWords} מילים) בנושא מעניין</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>תענה על {questionsCount} שאלות הבנה - מידע מפורש, מילים בהקשר, הסקות</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>תקבל משוב מפורט + תובנות עמוקות על הטקסט</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>תלמד איך לקרוא "בין השורות" ולהבין כוונות הכותב</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 mb-6 border-2 border-yellow-200">
            <div className="text-sm text-yellow-900">
              <span className="font-bold">💡 טיפ:</span> קח את הזמן שלך לקרוא. בבגרות אמיתית יש לך זמן!
            </div>
          </div>

          {topicId ? (
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 text-center">
              <p className="text-sm text-blue-900">
                טוען שאלות מהמאגר...
              </p>
            </div>
          ) : (
            <Button
              onClick={() => {
                generateReading();
                setCurrentScreen("loading");
              }}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-bold"
            >
              Start Reading
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          )}

          <Button
            onClick={() => navigate(createPageUrl("Practice"))}
            variant="outline"
            className="w-full mt-3"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            חזור
          </Button>
        </motion.div>
      </div>
    );
  }

  // Loading Screen
  if (currentScreen === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">יוצר טקסט מותאם אישית...</p>
          <p className="text-gray-500 text-sm mt-2">זה לוקח כ-10 שניות</p>
        </div>
      </div>
    );
  }

  // Screen 2: Reading Passage
  if (currentScreen === "reading" && readingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between text-white mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Practice"))}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">Extended Reading</h1>
              <p className="text-sm opacity-90">{readingData.topic}</p>
            </div>

            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{readingData.title}</h2>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                <span>{readingData.word_count} מילים</span>
                <span>•</span>
                <span>{questionsCount} שאלות</span>
                <span>•</span>
                <span>{displayUnits} יחידות</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-6 border border-gray-200 mb-6">
              <div 
                className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap"
                style={{ 
                  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                  direction: 'ltr',
                  textAlign: 'left'
                }}
              >
                {readingData.passage}
              </div>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 mb-6">
              <div className="text-sm text-yellow-900 flex items-start gap-2">
                <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">טיפ לפני שאתה ממשיך:</span> קרא את הטקסט שוב ושים לב לרעיונות המרכזיים בכל פסקה
                </div>
              </div>
            </div>

            <Button
              onClick={() => setCurrentScreen("questions")}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-bold"
            >
              Start Questions
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Screen 3: Questions
  if (currentScreen === "questions" && readingData) {
    const allAnswered = readingData.questions.every(q => userAnswers[q.question_number]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between text-white">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentScreen("reading")}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <div className="text-center flex-1">
              <h1 className="text-xl font-bold">Reading Comprehension</h1>
              <p className="text-sm opacity-90">
                {Object.keys(userAnswers).length} / {readingData.questions.length} נענו
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const confirmed = confirm("לראות שוב את הטקסט?");
                if (confirmed) setCurrentScreen("reading");
              }}
              className="text-white hover:bg-white/20 text-xs"
            >
              <BookOpen className="w-4 h-4 mr-1" />
              הטקסט
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 space-y-6">
          {readingData.questions.map((question, idx) => (
            <motion.div
              key={question.question_number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600">{question.question_number}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-indigo-600 mb-1">{question.question_type}</div>
                  <p className="text-base text-gray-900 leading-relaxed" dir="ltr">
                    {question.question_text}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {question.options.map((option, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = userAnswers[question.question_number] === letter;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => setUserAnswers(prev => ({ 
                        ...prev, 
                        [question.question_number]: letter 
                      }))}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          <span className="text-xs font-bold">{letter}</span>
                        </div>
                        <span className="text-sm text-gray-900" dir="ltr">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-4 z-20">
            <div className="max-w-3xl mx-auto">
              <Button
                onClick={handleCheckAnswers}
                disabled={!allAnswered || isLoading}
                className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    בודק תשובות...
                  </>
                ) : (
                  <>
                    Check Answers
                    <CheckCircle className="w-5 h-5 mr-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 4: Results & Insights
  if (currentScreen === "results" && results) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0);
    const maxPoints = results.reduce((sum, r) => sum + (r.question_type === "multiple_choice" ? 1 : 2), 0);
    const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
          <div className="text-center text-white">
            <Trophy className="w-16 h-16 mx-auto mb-3" />
            <h1 className="text-3xl font-bold mb-2">הציון שלך</h1>
            <div className="text-5xl font-bold">{percentage}%</div>
            <p className="text-sm opacity-90 mt-2">
              {totalPoints} / {maxPoints} נקודות • {correctCount} תשובות נכונות מלאות
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {/* Question Results */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">תשובות מפורטות</h2>
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.question_number}
                  className={`rounded-xl p-4 border-2 ${
                    result.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-600">{result.question_type}</span>
                        {result.status === "partial" && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">
                            חלקי - {result.points} נק'
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 mb-2" dir="ltr">{result.question_text}</div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className={result.isCorrect ? 'text-green-700' : result.status === 'partial' ? 'text-yellow-700' : 'text-red-700'}>
                            התשובה שלך: <strong>{result.userAnswer}</strong>
                          </span>
                          {!result.isCorrect && (
                            <>
                              <span className="text-gray-400">|</span>
                              <span className="text-green-700">
                                נכון: <strong>{result.correct_answer}</strong>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-1">💡 הסבר:</div>
                          <div className="text-sm text-gray-800 leading-relaxed">
                            {result.feedback || result.explanation_hebrew}
                          </div>
                        </div>

                        {result.textReference && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="text-xs font-semibold text-blue-900 mb-1">📍 היכן בטקסט:</div>
                            <div className="text-sm text-blue-800 leading-relaxed">{result.textReference}</div>
                          </div>
                        )}

                        {result.whatWasMissing && (
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                            <div className="text-xs font-semibold text-yellow-900 mb-1">⚠️ מה חסר:</div>
                            <div className="text-sm text-yellow-800">{result.whatWasMissing}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deep Insights */}
          {insights && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                תובנות מעמיקות
              </h2>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="text-sm font-bold text-blue-900 mb-2">🎯 המסר המרכזי</div>
                  <div className="text-sm text-gray-800 leading-relaxed">{insights.main_message}</div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-sm font-bold text-purple-900 mb-2">🔍 בין השורות</div>
                  <div className="text-sm text-gray-800 leading-relaxed">{insights.between_the_lines}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                    <div className="text-sm font-bold text-amber-900 mb-2">🎭 טון הכותב</div>
                    <div className="text-sm text-gray-800">{insights.writers_tone}</div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                    <div className="text-sm font-bold text-green-900 mb-2">📍 עמדת הכותב</div>
                    <div className="text-sm text-gray-800">{insights.writers_position}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border-2 border-cyan-200">
                  <div className="text-sm font-bold text-cyan-900 mb-2">💭 מסקנה משתמעת</div>
                  <div className="text-sm text-gray-800 leading-relaxed">{insights.implicit_conclusion}</div>
                </div>

                {insights.reading_tips?.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border-2 border-yellow-200">
                    <div className="text-sm font-bold text-yellow-900 mb-3 flex items-center gap-2">
                      <span className="text-xl">💡</span>
                      טיפים לקריאה מעמיקה
                    </div>
                    <ul className="space-y-2">
                      {insights.reading_tips.map((tip, i) => (
                        <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleStartNew}
              className="h-14 bg-blue-600 hover:bg-blue-700 text-lg font-bold"
            >
              <RefreshCw className="w-5 h-5 ml-2" />
              תרגול חדש
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              variant="outline"
              className="h-14 text-lg font-bold"
            >
              <ChevronRight className="w-5 h-5 ml-2" />
              חזור לתרגול
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}