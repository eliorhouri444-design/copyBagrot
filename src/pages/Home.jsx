import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Target, BookOpen, PlayCircle, CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [practiceAttempts, setPracticeAttempts] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (!currentUser.subject_selected) {
        navigate(createPageUrl("Onboarding"));
        return;
      }

      const subject = currentUser.selected_subject || 'אנגלית';
      const units = parseInt(currentUser.selected_units || 3);

      const [allTopics, allAttempts, allExamAttempts] = await Promise.all([
        base44.entities.TopicNew.list(),
        base44.entities.AttemptNew.list("-created_date", 2000),
        base44.entities.ExamAttempt.list("-created_date", 100)
      ]);

      const relevantTopics = allTopics.filter(
        t => t.subject_id === subject && parseInt(t.unit_level) === units && t.is_active
      );
      setTopics(relevantTopics);

      const userAttempts = allAttempts.filter(
        a => a.created_by === currentUser.email && 
             a.subject_id === subject && 
             parseInt(a.unit_level) === units
      );
      setPracticeAttempts(userAttempts);

      const userExamAttempts = allExamAttempts.filter(
        e => e.subject === subject && parseInt(e.unit_level) === units
      );
      setExamAttempts(userExamAttempts);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const readinessData = useReadinessCalculator(user, topics, practiceAttempts, examAttempts);

  const daysUntilExam = user?.exam_date 
    ? Math.max(0, Math.ceil((new Date(user.exam_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : 90;

  const dailyTasks = useMemo(() => {
    if (!readinessData) return [];
    return [
      { id: "practice", title: `לפתור ${readinessData.daily.questions} שאלות` },
      { id: "learn", title: `ללמוד ${readinessData.daily.topics} נושאים` },
      { id: "review", title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות` }
    ];
  }, [readinessData]);

  const lastActivity = useMemo(() => {
    if (practiceAttempts.length === 0 && examAttempts.length === 0) return null;
    const lastPractice = practiceAttempts[0];
    const lastExam = examAttempts[0];
    const mostRecent = !lastExam || (lastPractice && new Date(lastPractice.created_date) > new Date(lastExam.created_date))
      ? { type: 'practice', topic: topics.find(t => t.topic_id === lastPractice?.topic_id)?.name || 'תרגול' }
      : { type: 'exam', topic: 'בגרות מלאה' };
    return mostRecent;
  }, [practiceAttempts, examAttempts, topics]);

  const toggleTask = (taskId) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter(t => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 mb-6">
        <div className="text-center">
          <h1 className="text-[18px] font-bold text-white mb-0.5">שלום, {user?.full_name?.split(' ')[0] || 'תלמיד'}! 👋</h1>
          <p className="text-[12px] text-white/80">{user?.selected_subject} • {user?.selected_units} יחידות</p>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* מה המצב שלך */}
        <CardSimple delay={0.05}>
          <CardTitle>מה המצב שלך</CardTitle>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatCard value={`${readinessData?.scores.overall || 0}%`} label="מוכנות" color="#1E4BA1" />
            <StatCard value={daysUntilExam} label="ימים לבגרות" color="#9333EA" />
            <StatCard value={user?.target_score || 85} label="ציון מטרה" color="#10B981" />
          </div>

          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#112D57]"
          >
            {showDetails ? 'הסתר פירוט' : 'ראה פירוט'}
            <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </Button>

          {showDetails && readinessData && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                <div className="text-sm text-[#6E6E6E] mb-1">שליטה</div>
                <div className="text-2xl font-black text-[#1E4BA1]">{readinessData.scores.mastery}%</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                <div className="text-sm text-[#6E6E6E] mb-1">תרגול</div>
                <div className="text-2xl font-black text-[#9333EA]">{readinessData.scores.practice}%</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                <div className="text-sm text-[#6E6E6E] mb-1">בגרויות</div>
                <div className="text-2xl font-black text-[#10B981]">{readinessData.scores.exams}%</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                <div className="text-sm text-[#6E6E6E] mb-1">מהירות</div>
                <div className="text-2xl font-black text-[#F59E0B]">{readinessData.scores.speed}%</div>
              </div>
            </div>
          )}
        </CardSimple>

        {/* מה לעשות היום */}
        {dailyTasks.length > 0 && (
          <CardSimple delay={0.1}>
            <CardTitle>מה לעשות היום</CardTitle>
            
            <div className="space-y-2 mb-4">
              {dailyTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    completedTasks.includes(task.id)
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-white border-[#E9F0FF]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      completedTasks.includes(task.id)
                        ? 'bg-green-500 border-green-500' 
                        : 'bg-white border-[#1E4BA1]'
                    }`}>
                      {completedTasks.includes(task.id) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-[15px] font-semibold ${
                      completedTasks.includes(task.id) ? 'text-green-800 line-through' : 'text-[#2B2B2B]'
                    }`}>
                      {task.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(createPageUrl("Practice"))}
              className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]"
            >
              התחל עכשיו
            </Button>
          </CardSimple>
        )}

        {/* המשך מאיפה שהפסקת */}
        {lastActivity && (
          <CardSimple delay={0.15}>
            <div className="mb-3">
              <div className="text-[13px] text-[#6E6E6E] mb-1">התחלת</div>
              <div className="text-[18px] font-bold text-[#2B2B2B]">{lastActivity.topic}</div>
              <div className="text-[13px] text-[#6E6E6E]">המשך עכשיו</div>
            </div>

            <Button
              onClick={() => {
                if (lastActivity.type === 'practice') {
                  navigate(createPageUrl("Practice"));
                } else {
                  navigate(createPageUrl("Exams"));
                }
              }}
              className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]"
            >
              <PlayCircle className="w-5 h-5 ml-2" />
              המשך
            </Button>
          </CardSimple>
        )}

        {/* מקצועות */}
        <CardSimple delay={0.2}>
          <CardTitle>המקצועות שלי</CardTitle>
          
          <div className="bg-white rounded-lg p-4 border border-[#E9F0FF] mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-[15px] text-[#2B2B2B]">{user?.selected_subject || 'אנגלית'}</div>
                <div className="text-[13px] text-[#6E6E6E]">{user?.selected_units || 3} יחידות</div>
              </div>
              <div className="text-3xl font-black text-[#1E4BA1]">
                {readinessData?.scores.overall || 0}%
              </div>
            </div>
            <Progress value={readinessData?.scores.overall || 0} className="h-2" />
          </div>

          <Button
            onClick={() => navigate(createPageUrl("SubjectSelection"))}
            variant="outline"
            className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#112D57]"
          >
            ראה כל המקצועות
          </Button>
        </CardSimple>
      </div>
    </div>
  );
}