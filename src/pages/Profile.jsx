import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Settings,
  TrendingUp,
  Target,
  BookOpen,
  FileCheck,
  Crown,
  LogOut,
  Trash2,
  Shield,
  CreditCard,
  Clock,
  Flame,
  Edit,
  Award,
  MessageSquare,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Star,
  Brain,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { differenceInDays } from "date-fns";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [timeUntilExam, setTimeUntilExam] = useState(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completedTasks, setCompletedTasks] = useState([]);

  const subjects = [
    "מתמטיקה", "פיזיקה", "ביולוגיה", "היסטוריה",
    "אזרחות", "ספרות", "לשון", "אנגלית", "ערבית"
  ];

  const cancelReasons = [
    "יקר מדי",
    "לא משתמש מספיק",
    "מצאתי אפליקציה אחרת",
    "סיימתי את הבגרות",
    "הבעיות הטכניות",
    "אחר"
  ];

  const displaySubject = user?.selected_subject || "אנגלית";
  const displayUnits = parseInt(user?.selected_units || 3);

  const { data: practiceAttempts = [] } = useQuery({
    queryKey: ['practice-attempts-profile', user?.email],
    queryFn: async () => {
      const attempts = await base44.entities.AttemptNew.list("-created_date", 1000);
      return attempts.filter(a => a.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: []
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts-profile', user?.email],
    queryFn: async () => {
      const attempts = await base44.entities.ExamAttempt.list("-created_date", 100);
      return attempts.filter(a => a.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: []
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['topics-profile', displaySubject, displayUnits],
    queryFn: async () => {
      const topics = await base44.entities.TopicNew.list();
      return topics.filter(t => t.subject_id === displaySubject && t.unit_level === displayUnits && t.is_active);
    },
    enabled: !!user,
    initialData: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setEditData({
          full_name: currentUser.full_name || "",
          exam_date: currentUser.exam_date || "",
          selected_subject: currentUser.selected_subject || "מתמטיקה",
          selected_units: currentUser.selected_units || 3,
          target_score: currentUser.target_score || 85,
          phone: currentUser.phone || "",
          notifications_enabled: currentUser.notifications_enabled !== false
        });

        if (currentUser.exam_date) {
          const days = differenceInDays(new Date(currentUser.exam_date), new Date());
          setTimeUntilExam(days);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const readinessData = useReadinessCalculator(user, allTopics, practiceAttempts, examAttempts);

  const weekData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAttempts = practiceAttempts.filter(a => 
        a.created_date?.startsWith(dateStr)
      );
      
      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('he-IL', { weekday: 'short' }),
        minutes: dayAttempts.length * 2
      });
    }
    return last7Days;
  }, [practiceAttempts]);

  const dailyTasks = useMemo(() => {
    if (!readinessData) return [];

    return [
      {
        id: "learn",
        title: "ללמוד: " + (allTopics[0]?.name || "נושא חדש"),
        completed: completedTasks.includes("learn")
      },
      {
        id: "practice",
        title: `לפתור: ${readinessData.daily.questions} שאלות`,
        completed: completedTasks.includes("practice")
      },
      {
        id: "review",
        title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות`,
        completed: completedTasks.includes("review")
      },
      {
        id: "exam",
        title: "סימולציה קצרה: 15 דקות",
        completed: completedTasks.includes("exam")
      }
    ];
  }, [readinessData, allTopics, completedTasks]);

  const achievements = useMemo(() => {
    const streakDays = (() => {
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const hasActivity = practiceAttempts.some(a => a.created_date?.startsWith(dateStr));
        if (hasActivity) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      return streak;
    })();

    const improvements = [];
    if (streakDays >= 3) improvements.push({ icon: "🔥", text: `${streakDays} ימים רצופים` });
    if (practiceAttempts.length >= 100) improvements.push({ icon: "💯", text: "100 שאלות נענו" });
    if (examAttempts.some(e => e.is_completed)) improvements.push({ icon: "🎓", text: "בגרות ראשונה הושלמה" });
    
    const last30Days = practiceAttempts.filter(a => {
      const date = new Date(a.created_date);
      const now = new Date();
      return (now - date) / (1000 * 60 * 60 * 24) <= 30;
    });
    const prev30Days = practiceAttempts.filter(a => {
      const date = new Date(a.created_date);
      const now = new Date();
      const daysAgo = (now - date) / (1000 * 60 * 60 * 24);
      return daysAgo > 30 && daysAgo <= 60;
    });
    
    if (last30Days.length > 0 && prev30Days.length > 0) {
      const last30Accuracy = last30Days.filter(a => a.status === 'correct').length / last30Days.length * 100;
      const prev30Accuracy = prev30Days.filter(a => a.status === 'correct').length / prev30Days.length * 100;
      const improvement = last30Accuracy - prev30Accuracy;
      if (improvement >= 15) {
        improvements.push({ icon: "📈", text: `שיפור של ${Math.round(improvement)}% בחודש האחרון` });
      }
    }

    return improvements;
  }, [practiceAttempts, examAttempts]);

  const recentMistakes = useMemo(() => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const weekMistakes = practiceAttempts.filter(a => 
      a.status === "incorrect" && new Date(a.created_date) >= last7Days
    );

    const topicCounts = {};
    weekMistakes.forEach(mistake => {
      const topic = mistake.topic_id || 'unknown';
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    const mostCommon = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      total: weekMistakes.length,
      weakestTopic: mostCommon ? mostCommon[0] : null,
      weakestCount: mostCommon ? mostCommon[1] : 0
    };
  }, [practiceAttempts]);

  const handleSaveProfile = async () => {
    try {
      await base44.auth.updateMe(editData);
      setUser({ ...user, ...editData });
      setIsEditing(false);
      alert("הפרטים נשמרו בהצלחה");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("שגיאה בשמירת הפרטים");
    }
  };

  const handleLogout = async () => {
    if (confirm("האם אתה בטוח שברצונך להתנתק?")) {
      await base44.auth.logout();
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("אזהרה! פעולה זו תמחק את כל הנתונים שלך ולא ניתן לשחזר אותם. האם אתה בטוח?")) {
      alert("פעולה זו דורשת אישור נוסף. אנא צור קשר עם התמיכה.");
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason) {
      alert("נא לבחור סיבה לביטול");
      return;
    }

    try {
      await base44.auth.updateMe({
        is_premium: false,
        subscription_cancelled: true,
        cancel_reason: cancelReason,
        cancel_date: new Date().toISOString()
      });

      alert("המנוי בוטל. נשמח לראותך שוב!");
      setShowCancelDialog(false);

      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("שגיאה בביטול המנוי");
    }
  };

  const toggleTask = (taskId) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter(t => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      {/* כותרת עליונה */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-white">{user?.full_name || 'תלמיד'}</h1>
                <p className="text-sm text-white/90">
                  תלמיד בבגרות {displaySubject} • {displayUnits} יחידות
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 space-y-6 pb-4">
        {/* מדד מוכנות לבגרות */}
        {readinessData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">מדד מוכנות לבגרות</h3>
                <Target className="w-6 h-6" />
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-3">
                <div className="text-center">
                  <div className="text-5xl font-black mb-2">{readinessData.scores.overall}%</div>
                  <div className="text-sm opacity-90">Ready Score</div>
                </div>
                <Progress value={readinessData.scores.overall} className="h-2.5 bg-white/30 mt-3" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <div className="opacity-90">המטרה שלך:</div>
                  <div className="font-bold text-lg">{user?.target_score || 85}+</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <div className="opacity-90">נשארו:</div>
                  <div className="font-bold text-lg">{readinessData.timeline.daysUntilExam} ימים</div>
                </div>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData.scores.mastery, fill: "#3B82F6" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData.scores.mastery}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700">📘 שליטה בחומר</div>
              </div>

              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData.scores.practice, fill: "#8B5CF6" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData.scores.practice}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700">📝 תרגול</div>
              </div>

              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData.scores.exams, fill: "#10B981" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData.scores.exams}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700">🎓 בגרויות</div>
              </div>

              <div className="text-center">
                <ResponsiveContainer width="100%" height={100}>
                  <RadialBarChart 
                    innerRadius="60%" 
                    outerRadius="100%" 
                    data={[{ value: readinessData.scores.speed, fill: "#F59E0B" }]}
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-900">
                      {readinessData.scores.speed}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-sm font-semibold text-gray-700">⚡ מהירות</div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <Button
                onClick={() => navigate(createPageUrl("Readiness"))}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl"
              >
                <Target className="w-4 h-4 ml-2" />
                עדכון תוכנית לימוד
              </Button>
            </div>
          </motion.div>
        )}

        {/* התקדמות במקצועות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            ההתקדמות שלי במקצועות
          </h3>

          <div className="space-y-3">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{displaySubject}</div>
                    <div className="text-xs text-gray-600">{displayUnits} יחידות</div>
                  </div>
                </div>
                <div className="text-3xl font-black text-blue-600">
                  {readinessData?.scores.overall || 0}%
                </div>
              </div>
              <Progress value={readinessData?.scores.overall || 0} className="h-2 mb-2" />
              <Button
                onClick={() => navigate(createPageUrl("Practice"))}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                המשך לתרגל
              </Button>
            </div>
          </div>
        </motion.div>

        {/* היום שלך - משימות מותאמות אישית */}
        {dailyTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600" />
                היום שלך
              </h3>
              <div className="text-sm text-gray-600">
                {completedTasks.length} / {dailyTasks.length}
              </div>
            </div>

            <div className="space-y-2">
              {dailyTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    task.completed 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-blue-50 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      task.completed 
                        ? 'bg-green-500 border-green-500' 
                        : 'bg-white border-blue-400'
                    }`}>
                      {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`font-semibold ${
                      task.completed ? 'text-green-800 line-through' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              לחץ על משימה כדי לסמן כבוצע ✓
            </div>
          </motion.div>
        )}

        {/* כרטיס "טעויות אחרונות" */}
        {recentMistakes.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-gray-900">טעויות אחרונות</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200 text-center">
                <div className="text-4xl font-black text-red-600 mb-1">{recentMistakes.total}</div>
                <div className="text-sm text-gray-700">טעויות השבוע</div>
              </div>
              
              {recentMistakes.weakestTopic && (
                <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="text-xs text-gray-600 mb-1">הנושא החלש:</div>
                  <div className="font-bold text-orange-900 text-sm leading-tight">
                    {allTopics.find(t => t.topic_id === recentMistakes.weakestTopic)?.name || recentMistakes.weakestTopic}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">{recentMistakes.weakestCount} טעויות</div>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                if (user?.is_premium) {
                  navigate(createPageUrl("CustomWeakPractice"));
                } else {
                  navigate(createPageUrl("Premium"));
                }
              }}
              className={`w-full h-12 ${
                user?.is_premium 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
                  : 'bg-gray-400'
              } text-white font-bold rounded-xl`}
            >
              {user?.is_premium ? '🔥 לפתור טעויות עכשיו' : '👑 שדרג לפרימיום'}
            </Button>
          </motion.div>
        )}

        {/* בגרויות שביצעת */}
        {examAttempts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">בגרויות שביצעת</h3>
            </div>

            <div className="space-y-2 mb-4">
              {examAttempts.slice(0, 5).map((exam, idx) => (
                <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-gray-600">בגרות</div>
                      <div className="font-bold text-gray-900 text-sm">
                        {exam.exam_type || exam.module_id || 'סימולציה'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">ציון</div>
                      <div className={`text-2xl font-black ${
                        exam.score_percent >= 80 ? 'text-green-600' :
                        exam.score_percent >= 60 ? 'text-blue-600' :
                        'text-orange-600'
                      }`}>
                        {Math.round(exam.score_percent || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">תאריך</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(exam.created_date).toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl"
            >
              <FileCheck className="w-5 h-5 ml-2" />
              בצע בגרות מלאה
            </Button>
          </motion.div>
        )}

        {/* גרף זמן לימוד שבועי */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">זמן לימוד השבוע</h3>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #E5E7EB', 
                  borderRadius: '12px',
                  direction: 'rtl'
                }}
                formatter={(value) => [`${value} דקות`]}
              />
              <Bar dataKey="minutes" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 text-center">
            <div className="inline-block bg-blue-50 rounded-xl px-4 py-2 border-2 border-blue-200">
              <span className="text-sm text-gray-600">השבוע למדת: </span>
              <span className="text-2xl font-black text-blue-600">
                {weekData.reduce((sum, d) => sum + d.minutes, 0)}
              </span>
              <span className="text-sm text-gray-600"> דקות</span>
            </div>
          </div>
        </motion.div>

        {/* הישגים */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-gray-900">הישגים</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement, idx) => (
                <div key={idx} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-sm font-bold text-gray-900">{achievement.text}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* הודעות אישיות מהרובוט */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-5 border-2 border-indigo-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">הודעה אחרונה מהרובוט</h3>
          </div>

          <div className="bg-white rounded-xl p-4 border-2 border-indigo-200">
            <p className="text-gray-900 font-semibold leading-relaxed">
              {(() => {
                const todayMinutes = weekData[weekData.length - 1]?.minutes || 0;
                const yesterdayMinutes = weekData[weekData.length - 2]?.minutes || 0;
                
                if (yesterdayMinutes === 0) {
                  return "אתמול למדת 0 דקות. בוא נחזור לקצב היום! 🚀";
                } else if (yesterdayMinutes >= 20) {
                  return `אתמול למדת ${yesterdayMinutes} דקות — יפה מאוד! כדי לשמור על הקצב, נסה להשלים ${readinessData?.daily.studyMinutes || 30} דקות נוספות היום. 💪`;
                } else {
                  return `אתמול למדת ${yesterdayMinutes} דקות. כדי להשיג את היעד שלך, עליך לתרגל ${readinessData?.daily.studyMinutes || 30} דקות ביום. 📚`;
                }
              })()}
            </p>
          </div>
        </motion.div>

        {/* אזור אישי והגדרות */}
        {user?.is_premium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-600" />
                  המנוי שלי
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {user.subscription_type === 'yearly' ? 'מנוי שנתי' : 'מנוי חודשי'}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubscriptionDialog(true)}
              >
                נהל
              </Button>
            </div>

            <div className="bg-white rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">מנוי פעיל</div>
                  <div className="text-xs text-gray-600">גישה מלאה לכל התכונות</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-5"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            הגדרות חשבון
          </h2>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl h-12 border-2"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-5 h-5 ml-3" />
              ערוך פרטים אישיים
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-xl h-12 border-2"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 ml-3" />
              התנתק
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:bg-red-50 border-2 border-red-200 rounded-xl h-12"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="w-5 h-5 ml-3" />
              מחק חשבון
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>ערוך פרטים אישיים</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">שם מלא</label>
              <Input
                value={editData.full_name}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                placeholder="שם מלא"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">מקצוע ראשי</label>
              <Select
                value={editData.selected_subject}
                onValueChange={(value) => setEditData({ ...editData, selected_subject: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">רמת יחידות</label>
              <Select
                value={editData.selected_units?.toString()}
                onValueChange={(value) => setEditData({ ...editData, selected_units: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">ציון מטרה</label>
              <Input
                type="number"
                value={editData.target_score}
                onChange={(e) => setEditData({ ...editData, target_score: parseInt(e.target.value) })}
                min="55"
                max="100"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">תאריך בגרות</label>
              <Input
                type="date"
                value={editData.exam_date}
                onChange={(e) => setEditData({ ...editData, exam_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveProfile} className="bg-blue-600">
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              ניהול מנוי
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="font-bold text-gray-900 mb-2">המנוי הנוכחי שלך</div>
              <div className="text-sm text-gray-700">
                {user?.subscription_type === 'yearly' ? 'מנוי שנתי - 299.94 שקל לשנה' : 'מנוי חודשי - 49.99 שקל לחודש'}
              </div>
            </div>

            {user?.subscription_type === 'monthly' && (
              <Button
                onClick={() => navigate(createPageUrl("Premium"))}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl"
              >
                שדרג למנוי שנתי וחסוך 50%
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full text-red-600 hover:bg-red-50 rounded-2xl"
              onClick={() => {
                setShowSubscriptionDialog(false);
                setShowCancelDialog(true);
              }}
            >
              ביטול מנוי
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>ביטול מנוי</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-700">
              אנחנו מצטערים לראות אותך הולך. למה אתה מבטל?
            </div>

            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סיבה..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {cancelReasons.map(reason => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-900">
                <strong>שים לב:</strong> לאחר הביטול תאבד גישה לכל תכונות הפרימיום
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              אל תבטל
            </Button>
            <Button
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700"
              disabled={!cancelReason}
            >
              בטל מנוי
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}