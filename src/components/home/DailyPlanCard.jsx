import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, Target, BookOpen, RotateCcw, FileCheck, Play } from "lucide-react";
import { CardSimple, CardTitle } from "@/components/ui/card-simple";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function DailyPlanCard({
  readinessData,
  topics = [],
  modules = [],
  practiceAttempts = [],
  examAttempts = [],
  isPremium = false,
  completedTasks = [],
  onToggleTask
}) {
  const navigate = useNavigate();

  // חישוב התקדמות יומית מתוך הניסיונות של היום
  const todayProgress = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // שאלות שנפתרו היום
    const todayPractice = practiceAttempts.filter(a => 
      a.created_date && a.created_date.startsWith(today)
    );
    const questionsToday = todayPractice.length;
    
    // נושאים שתורגלו היום (ייחודיים)
    const uniqueTopicsToday = new Set(todayPractice.map(a => a.topic_id).filter(Boolean));
    const topicsToday = uniqueTopicsToday.size;
    
    // טעויות שנחזרו היום (שאלות שנענו נכון אחרי שהיו שגויות)
    const incorrectQuestionIds = new Set(
      practiceAttempts.filter(a => a.status === "incorrect").map(a => a.question_id)
    );
    const reviewedToday = todayPractice.filter(a => 
      a.status === "correct" && incorrectQuestionIds.has(a.question_id)
    ).length;
    
    // בחינות שבוצעו היום
    const examsToday = examAttempts.filter(e => 
      e.created_date && e.created_date.startsWith(today) && e.is_completed
    ).length;
    
    return { questionsToday, topicsToday, reviewedToday, examsToday };
  }, [practiceAttempts, examAttempts]);

  // חישוב המשימות היומיות הדינמיות עם התקדמות
  const dailyTasks = useMemo(() => {
    if (!readinessData) return { tasks: [], solveQuestions: 0, learnTopics: 0, fixErrors: 0, examsToday: 0 };

    const daysUntilExam = readinessData.timeline?.daysUntilExam || 90;
    const errorCount = readinessData.current?.errorCount || 0;
    const weakTopicsCount = readinessData.remaining?.weakTopics || 0;
    const remainingQuestions = readinessData.remaining?.practice || 0;

    // SolveQuestions = RemainingQuestions / DaysUntilExam
    const solveQuestionsTarget = Math.max(
      readinessData.daily?.questions || 10,
      Math.ceil(remainingQuestions / Math.max(1, daysUntilExam))
    );

    // LearnTopics = WeakTopicsCount / DaysUntilExam * 2
    const learnTopicsTarget = weakTopicsCount > 0 
      ? Math.max(1, Math.ceil((weakTopicsCount / Math.max(1, daysUntilExam)) * 2))
      : readinessData.daily?.topics || 1;

    // FixErrors = TotalErrors / 3
    const fixErrorsTarget = Math.max(3, Math.ceil(errorCount / 3));

    // ExamsToday: אם DaysToExam <= 3 → 1 סימולציה חובה, אם <= 7 → כל 2 ימים
    let examsTodayTarget = 0;
    if (daysUntilExam <= 3) {
      examsTodayTarget = 1;
    } else if (daysUntilExam <= 7) {
      examsTodayTarget = daysUntilExam % 2 === 0 ? 1 : 0;
    } else {
      examsTodayTarget = readinessData.daily?.examsPerWeek > 0 ? (daysUntilExam % 3 === 0 ? 1 : 0) : 0;
    }

    // חישוב כמה נשאר לבצע
    const remainingQuestionsTodo = Math.max(0, solveQuestionsTarget - todayProgress.questionsToday);
    const remainingTopicsTodo = Math.max(0, learnTopicsTarget - todayProgress.topicsToday);
    const remainingReviewTodo = Math.max(0, fixErrorsTarget - todayProgress.reviewedToday);
    const remainingExamsTodo = Math.max(0, examsTodayTarget - todayProgress.examsToday);

    const tasks = [
      { 
        id: "practice", 
        type: "practice",
        title: remainingQuestionsTodo > 0 
          ? `לפתור ${remainingQuestionsTodo} שאלות` 
          : `✓ פתרת ${todayProgress.questionsToday} שאלות`,
        description: remainingQuestionsTodo > 0 
          ? `פתרת ${todayProgress.questionsToday}/${solveQuestionsTarget}` 
          : "יעד יומי הושלם!",
        target: solveQuestionsTarget,
        current: todayProgress.questionsToday,
        remaining: remainingQuestionsTodo,
        isCompleted: remainingQuestionsTodo === 0,
        icon: Target
      },
      { 
        id: "learn", 
        type: "learn",
        title: remainingTopicsTodo > 0 
          ? `ללמוד ${remainingTopicsTodo} נושאים` 
          : `✓ תרגלת ${todayProgress.topicsToday} נושאים`,
        description: remainingTopicsTodo > 0 
          ? `תרגלת ${todayProgress.topicsToday}/${learnTopicsTarget}` 
          : "יעד יומי הושלם!",
        target: learnTopicsTarget,
        current: todayProgress.topicsToday,
        remaining: remainingTopicsTodo,
        isCompleted: remainingTopicsTodo === 0,
        icon: BookOpen
      },
      { 
        id: "review", 
        type: "review",
        title: remainingReviewTodo > 0 
          ? `לחזור על ${remainingReviewTodo} טעויות` 
          : `✓ חזרת על ${todayProgress.reviewedToday} טעויות`,
        description: remainingReviewTodo > 0 
          ? `חזרת ${todayProgress.reviewedToday}/${fixErrorsTarget}` 
          : "יעד יומי הושלם!",
        target: fixErrorsTarget,
        current: todayProgress.reviewedToday,
        remaining: remainingReviewTodo,
        isCompleted: remainingReviewTodo === 0,
        icon: RotateCcw
      }
    ];

    if (examsTodayTarget > 0) {
      tasks.push({
        id: "exam",
        type: "exam",
        title: remainingExamsTodo > 0 
          ? `לבצע ${remainingExamsTodo} סימולציה` 
          : `✓ ביצעת ${todayProgress.examsToday} סימולציות`,
        description: remainingExamsTodo > 0 
          ? `ביצעת ${todayProgress.examsToday}/${examsTodayTarget}` 
          : "יעד יומי הושלם!",
        target: examsTodayTarget,
        current: todayProgress.examsToday,
        remaining: remainingExamsTodo,
        isCompleted: remainingExamsTodo === 0,
        icon: FileCheck
      });
    }

    return { 
      tasks, 
      solveQuestions: solveQuestionsTarget, 
      learnTopics: learnTopicsTarget, 
      fixErrors: fixErrorsTarget, 
      examsToday: examsTodayTarget 
    };
  }, [readinessData, todayProgress]);

  // חישוב נושאים מומלצים לתרגול + אחוז בקיאות כולל
  const { recommendedTopics, overallTopicMastery } = useMemo(() => {
    if (!topics || topics.length === 0) return { recommendedTopics: [], overallTopicMastery: 0 };

    const topicStats = {};
    practiceAttempts.forEach((attempt) => {
      const topicId = attempt.topic_id;
      if (!topicId) return;
      if (!topicStats[topicId]) topicStats[topicId] = { total: 0, correct: 0 };
      topicStats[topicId].total++;
      if (attempt.status === "correct") topicStats[topicId].correct++;
    });

    const allTopicsWithStats = topics.map((topic) => {
      const stats = topicStats[topic.topic_id];
      let status = "not_started";
      let accuracy = 0;
      if (stats) {
        accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
        if (accuracy < 50) status = "weak";
        else if (stats.total < 10) status = "in_progress";
        else status = "mastered";
      }
      return { ...topic, status, stats, accuracy };
    });

    // חישוב אחוז בקיאות כולל בנושאים
    const topicsWithAttempts = allTopicsWithStats.filter(t => t.stats && t.stats.total > 0);
    const totalMastery = topicsWithAttempts.length > 0
      ? Math.round(topicsWithAttempts.reduce((sum, t) => sum + t.accuracy, 0) / topicsWithAttempts.length)
      : 0;

    const recommended = allTopicsWithStats
      .filter((t) => t.status !== "mastered")
      .sort((a, b) => {
        if (a.status === "weak" && b.status !== "weak") return -1;
        if (b.status === "weak" && a.status !== "weak") return 1;
        if (a.status === "not_started" && b.status === "in_progress") return -1;
        return 0;
      })
      .slice(0, 3);

    return { recommendedTopics: recommended, overallTopicMastery: totalMastery };
  }, [topics, practiceAttempts]);

  // חישוב שאלונים מומלצים + אחוז בקיאות כולל בשאלונים
  const { recommendedExams, overallExamMastery } = useMemo(() => {
    if (!modules || modules.length === 0) return { recommendedExams: [], overallExamMastery: 0 };

    const moduleAttempts = {};
    examAttempts.forEach((attempt) => {
      const moduleId = attempt.module_id;
      if (!moduleId) return;
      if (!moduleAttempts[moduleId]) moduleAttempts[moduleId] = { total: 0, avgScore: 0, scores: [] };
      moduleAttempts[moduleId].total++;
      moduleAttempts[moduleId].scores.push(attempt.score_percent || 0);
    });

    Object.keys(moduleAttempts).forEach((moduleId) => {
      const scores = moduleAttempts[moduleId].scores;
      moduleAttempts[moduleId].avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
    });

    const allModulesWithStats = modules.map((module) => {
      const stats = moduleAttempts[module.id];
      let status = "not_started";
      if (stats) {
        if (stats.avgScore < 56) status = "required";
        else if (stats.total < 3) status = "started";
        else status = "passed";
      }
      return { ...module, status, stats };
    });

    // חישוב אחוז בקיאות כולל בשאלונים
    const modulesWithAttempts = allModulesWithStats.filter(m => m.stats && m.stats.total > 0);
    const totalExamMastery = modulesWithAttempts.length > 0
      ? Math.round(modulesWithAttempts.reduce((sum, m) => sum + m.stats.avgScore, 0) / modulesWithAttempts.length)
      : 0;

    const recommended = allModulesWithStats
      .filter((m) => m.status !== "passed")
      .sort((a, b) => {
        if (a.status === "required" && b.status !== "required") return -1;
        if (b.status === "required" && a.status !== "required") return 1;
        return 0;
      })
      .slice(0, 3);

    return { recommendedExams: recommended, overallExamMastery: totalExamMastery };
  }, [modules, examAttempts]);

  // חישוב התקדמות אוטומטית מהמשימות
  const completedCount = dailyTasks.tasks.filter(t => t.isCompleted).length;
  const totalTasks = dailyTasks.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleTaskClick = (task) => {
    // ניווט לפי סוג המשימה
    if (task.type === "practice") {
      if (recommendedTopics.length > 0) {
        navigate(`${createPageUrl("TopicPracticeNew")}?topicid=${encodeURIComponent(recommendedTopics[0].topic_id)}&set=1`);
      } else {
        navigate(createPageUrl("Practice"));
      }
    } else if (task.type === "learn") {
      if (recommendedTopics.length > 0) {
        navigate(`${createPageUrl("TopicPracticeNew")}?topicid=${encodeURIComponent(recommendedTopics[0].topic_id)}&set=1`);
      } else {
        navigate(createPageUrl("Practice"));
      }
    } else if (task.type === "review") {
      navigate(createPageUrl("CustomWeakPractice"));
    } else if (task.type === "exam") {
      if (recommendedExams.length > 0) {
        sessionStorage.setItem('selectedModuleId', recommendedExams[0].id);
        navigate(createPageUrl("Exams"));
      } else {
        navigate(createPageUrl("Exams"));
      }
    }
  };

  const handleStartTasks = () => {
    // מתחיל במשימה הראשונה שלא הושלמה
    const firstIncomplete = dailyTasks.tasks.find(t => !t.isCompleted);
    if (firstIncomplete) {
      handleTaskClick(firstIncomplete);
    } else if (recommendedTopics.length > 0) {
      navigate(`${createPageUrl("TopicPracticeNew")}?topicid=${encodeURIComponent(recommendedTopics[0].topic_id)}&set=1`);
    } else {
      navigate(createPageUrl("Practice"));
    }
  };

  const handleTopicClick = (topic) => {
    navigate(`${createPageUrl("TopicPracticeNew")}?topicid=${encodeURIComponent(topic.topic_id)}&set=1`);
  };

  const handleExamClick = (module) => {
    sessionStorage.setItem('selectedModuleId', module.id);
    navigate(createPageUrl("Exams"));
  };

  const getStatusBadge = (status, type = "topic") => {
    const badges = {
      not_started: { text: "טרם התחיל", bg: "bg-gray-100 text-gray-600" },
      in_progress: { text: "בתהליך", bg: "bg-blue-100 text-blue-600" },
      weak: { text: "חלש", bg: "bg-red-100 text-red-600" },
      started: { text: "התחיל", bg: "bg-blue-100 text-blue-600" },
      required: { text: "נדרש", bg: "bg-red-100 text-red-600" }
    };
    return badges[status] || badges.not_started;
  };

  return (
    <div className="space-y-4">
      {/* משימות היום */}
      <CardSimple delay={0.15}>
        <div className="flex items-center justify-between mb-3">
          <CardTitle icon={CheckCircle}>משימות היום</CardTitle>
          <div className="text-[12px] text-[#6E6E6E]">{completedCount}/{totalTasks}</div>
        </div>

        <div className="space-y-2 mb-3">
          {dailyTasks.tasks.map((task, idx) => {
            const Icon = task.icon;
            const isCompleted = task.isCompleted;
            const progressPct = task.target > 0 ? Math.min(100, Math.round((task.current / task.target) * 100)) : 0;

            return (
              <div
                key={task.id}
                onClick={() => !isCompleted && handleTaskClick(task)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-[#E9F0FF] hover:border-[#3B82F6] cursor-pointer'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-[#3B82F6]'
                }`}>
                  {isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                
                <Icon className={`w-4 h-4 flex-shrink-0 ${
                  isCompleted ? 'text-green-600' : 'text-[#3B82F6]'
                }`} />
                
                <div className="flex-1">
                  <div className={`text-[13px] font-semibold ${
                    isCompleted ? 'text-green-700' : 'text-[#2B2B2B]'
                  }`}>
                    {task.title}
                  </div>
                  <div className="text-[11px] text-[#6E6E6E]">{task.description}</div>
                  {/* Progress bar for each task */}
                  {!isCompleted && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#3B82F6] rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {!isCompleted && <Play className="w-4 h-4 text-[#3B82F6]" />}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <Progress value={progressPercent} className="h-2" />
          <div className="text-[11px] text-[#6E6E6E] mt-1 text-center">
            הושלמו {completedCount} מתוך {totalTasks} משימות
          </div>
        </div>

        <Button
          onClick={handleStartTasks}
          className="w-full h-11 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[14px]"
        >
          <Play className="w-4 h-4 ml-2" />
          התחל משימות היום
        </Button>
      </CardSimple>

      {/* נושאים לתרגול */}
      {recommendedTopics.length > 0 && (
        <CardSimple delay={0.2}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-[14px] font-bold text-[#2B2B2B]">נושאים לתרגול</h3>
            </div>
            <div className="bg-[#F5F8FF] px-3 py-1 rounded-full border border-[#E9F0FF]">
              <span className="text-[13px] font-bold text-[#3B82F6]">{overallTopicMastery}%</span>
              <span className="text-[11px] text-[#6E6E6E] mr-1">בקיאות</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {recommendedTopics.map((topic) => {
              const badge = getStatusBadge(topic.status);
              
              return (
                <button
                  key={topic.topic_id}
                  onClick={() => handleTopicClick(topic)}
                  className="w-full bg-white rounded-xl p-3 border transition-all text-right flex items-center justify-between border-[#E9F0FF] hover:border-[#3B82F6] hover:shadow-md"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                      {topic.icon || "📚"}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-[#2B2B2B]">{topic.name}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-[#3B82F6]" />
                </button>
              );
            })}
          </div>
        </CardSimple>
      )}

      {/* שאלונים לבגרות */}
      {recommendedExams.length > 0 && (
        <CardSimple delay={0.25}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-[14px] font-bold text-[#2B2B2B]">שאלונים לבגרות</h3>
            </div>
            <div className="bg-[#F5F8FF] px-3 py-1 rounded-full border border-[#E9F0FF]">
              <span className="text-[13px] font-bold text-[#3B82F6]">{overallExamMastery}%</span>
              <span className="text-[11px] text-[#6E6E6E] mr-1">בקיאות</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {recommendedExams.map((module) => {
              const badge = getStatusBadge(module.status, "exam");
              
              return (
                <button
                  key={module.id}
                  onClick={() => handleExamClick(module)}
                  className="w-full bg-white rounded-xl p-3 border transition-all text-right flex items-center justify-between border-[#E9F0FF] hover:border-[#3B82F6] hover:shadow-md"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-8 h-8 bg-gradient-to-r ${module.color || 'from-blue-500 to-blue-600'} rounded-lg flex items-center justify-center text-white text-[11px] font-bold`}>
                      {module.id}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-[#2B2B2B]">{module.title}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-[#3B82F6]" />
                </button>
              );
            })}
          </div>
        </CardSimple>
      )}
    </div>
  );
}