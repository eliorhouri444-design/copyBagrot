import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Settings,
  Target,
  BookOpen,
  FileCheck,
  Crown,
  LogOut,
  Trash2,
  Shield,
  CreditCard,
  Clock,
  Edit,
  Award,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
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
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  const [showDetailsView, setShowDetailsView] = useState(false);

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
      const dayAttempts = practiceAttempts.filter(a => a.created_date?.startsWith(dateStr));
      last7Days.push({
        day: date.toLocaleDateString('he-IL', { weekday: 'short' }),
        minutes: dayAttempts.length * 2
      });
    }
    return last7Days;
  }, [practiceAttempts]);

  const dailyTasks = useMemo(() => {
    if (!readinessData) return [];
    return [
      { id: "practice", title: `לפתור ${readinessData.daily.questions} שאלות` },
      { id: "learn", title: `ללמוד ${readinessData.daily.topics} נושאים` },
      { id: "review", title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות` }
    ];
  }, [readinessData]);

  const achievements = useMemo(() => {
    const streakDays = (() => {
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const hasActivity = practiceAttempts.some(a => a.created_date?.startsWith(dateStr));
        if (hasActivity) streak++;
        else if (i > 0) break;
      }
      return streak;
    })();

    const improvements = [];
    if (streakDays >= 3) improvements.push({ icon: "🔥", text: `${streakDays} ימים רצופים` });
    if (practiceAttempts.length >= 100) improvements.push({ icon: "💯", text: "100 שאלות נענו" });
    if (examAttempts.some(e => e.is_completed)) improvements.push({ icon: "🎓", text: "בגרות ראשונה" });

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

    const mostCommon = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: weekMistakes.length,
      weakestTopic: mostCommon ? mostCommon[0] : null
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-[#112D57] p-6 mb-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-white mb-1">{user?.full_name || 'תלמיד'}</h1>
          <p className="text-[13px] text-white/80">תלמיד בבגרות {displaySubject} • {displayUnits} יחידות</p>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="text-white hover:bg-white/20 mt-3 text-[13px]"
          >
            <Settings className="w-4 h-4 ml-2" />
            הגדרות
          </Button>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* הדרך שלך לבגרות */}
        {readinessData && (
          <CardSimple delay={0.05}>
            <CardTitle>הדרך שלך לבגרות</CardTitle>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <StatCard value={`${readinessData.scores.mastery}%`} label="שליטה בחומר" color="#1E4BA1" />
              <StatCard value={`${readinessData.scores.practice}%`} label="תרגול" color="#9333EA" />
              <StatCard value={`${readinessData.scores.exams}%`} label="בגרויות" color="#10B981" />
            </div>

            <Button
              onClick={() => setShowDetailsView(!showDetailsView)}
              variant="outline"
              className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#112D57]"
            >
              {showDetailsView ? 'הסתר פירוט' : 'ראה פירוט'}
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showDetailsView ? 'rotate-180' : ''}`} />
            </Button>

            {showDetailsView && (
              <div className="space-y-2 mt-3">
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">שליטה בחומר</span>
                    <span className="text-2xl font-black text-[#1E4BA1]">{readinessData.scores.mastery}%</span>
                  </div>
                  <Progress value={readinessData.scores.mastery} className="h-2 mt-2" />
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">תרגול</span>
                    <span className="text-2xl font-black text-[#9333EA]">{readinessData.scores.practice}%</span>
                  </div>
                  <Progress value={readinessData.scores.practice} className="h-2 mt-2" />
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">בגרויות</span>
                    <span className="text-2xl font-black text-[#10B981]">{readinessData.scores.exams}%</span>
                  </div>
                  <Progress value={readinessData.scores.exams} className="h-2 mt-2" />
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">מהירות</span>
                    <span className="text-2xl font-black text-[#F59E0B]">{readinessData.scores.speed}%</span>
                  </div>
                  <Progress value={readinessData.scores.speed} className="h-2 mt-2" />
                </div>
              </div>
            )}
          </CardSimple>
        )}

        {/* משימות היום */}
        {dailyTasks.length > 0 && (
          <CardSimple delay={0.1}>
            <CardTitle>היום שלך</CardTitle>
            
            <div className="space-y-2 mb-3">
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

            <div className="text-center text-[13px] text-[#6E6E6E]">
              לחץ על משימה לסימון ✓
            </div>
          </CardSimple>
        )}

        {/* טעויות */}
        {recentMistakes.total > 0 && (
          <CardSimple delay={0.15}>
            <CardTitle icon={AlertTriangle}>טעויות אחרונות</CardTitle>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-lg p-4 border-2 border-red-200 text-center">
                <div className="text-4xl font-black text-red-600 mb-1">{recentMistakes.total}</div>
                <div className="text-[13px] text-[#6E6E6E]">טעויות השבוע</div>
              </div>
              
              {recentMistakes.weakestTopic && (
                <div className="bg-white rounded-lg p-4 border-2 border-orange-200 text-center">
                  <div className="text-[13px] text-[#6E6E6E] mb-1">הנושא החלש</div>
                  <div className="font-bold text-orange-900 text-[15px] leading-tight">
                    {allTopics.find(t => t.topic_id === recentMistakes.weakestTopic)?.name || 'נושא'}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => navigate(user?.is_premium ? createPageUrl("CustomWeakPractice") : createPageUrl("Premium"))}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-[14px] text-[15px]"
            >
              🔥 לפתור טעויות
            </Button>
          </CardSimple>
        )}

        {/* בגרויות */}
        {examAttempts.length > 0 && (
          <CardSimple delay={0.2}>
            <CardTitle icon={FileCheck}>בגרויות שביצעת</CardTitle>

            <div className="space-y-2 mb-3">
              {examAttempts.slice(0, 3).map((exam, idx) => (
                <div key={idx} className="bg-white border border-[#E9F0FF] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[15px] text-[#2B2B2B]">
                        {exam.exam_type || 'בגרות'}
                      </div>
                      <div className="text-[13px] text-[#6E6E6E]">
                        {new Date(exam.created_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className={`text-3xl font-black ${
                      exam.score_percent >= 80 ? 'text-green-600' :
                      exam.score_percent >= 60 ? 'text-[#1E4BA1]' : 'text-orange-600'
                    }`}>
                      {Math.round(exam.score_percent || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(createPageUrl("Exams"))}
              className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-[14px] text-[15px]"
            >
              <FileCheck className="w-5 h-5 ml-2" />
              בצע בגרות חדשה
            </Button>
          </CardSimple>
        )}

        {/* זמן לימוד */}
        <CardSimple delay={0.25}>
          <CardTitle icon={Clock}>זמן לימוד השבוע</CardTitle>

          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '2px solid #E9F0FF', borderRadius: '12px', direction: 'rtl', fontSize: '12px' }}
                formatter={(value) => [`${value} דקות`]}
              />
              <Bar dataKey="minutes" fill="#1E4BA1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="text-center mt-3">
            <span className="text-[13px] text-[#6E6E6E]">השבוע: </span>
            <span className="text-2xl font-black text-[#1E4BA1]">
              {weekData.reduce((sum, d) => sum + d.minutes, 0)}
            </span>
            <span className="text-[13px] text-[#6E6E6E]"> דקות</span>
          </div>
        </CardSimple>

        {/* הישגים */}
        {achievements.length > 0 && (
          <CardSimple delay={0.3}>
            <CardTitle icon={Award}>הישגים</CardTitle>

            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement, idx) => (
                <div key={idx} className="bg-white border-2 border-[#E9F0FF] rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-[13px] font-bold text-[#2B2B2B]">{achievement.text}</div>
                </div>
              ))}
            </div>
          </CardSimple>
        )}

        {/* הודעה מהרובוט */}
        <CardSimple delay={0.35}>
          <CardTitle icon={MessageSquare}>הודעה מהרובוט</CardTitle>

          <div className="bg-white rounded-lg p-4 border border-[#E9F0FF]">
            <p className="text-[#2B2B2B] font-semibold text-[15px] leading-relaxed">
              {(() => {
                const todayMinutes = weekData[weekData.length - 1]?.minutes || 0;
                if (todayMinutes === 0 && readinessData) {
                  return `היום אתה צריך ${readinessData.daily.questions} שאלות כדי להתקדם לקראת ${user?.target_score || 85}+`;
                }
                return `כל הכבוד! תמשיך כך להצליח 💪`;
              })()}
            </p>
          </div>
        </CardSimple>

        {/* הגדרות */}
        <CardSimple delay={0.4}>
          <CardTitle icon={Settings}>הגדרות חשבון</CardTitle>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start rounded-lg h-12 border-2 border-[#E9F0FF] text-[#112D57] text-[15px]"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-5 h-5 ml-3" />
              ערוך פרטים
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-lg h-12 border-2 border-[#E9F0FF] text-[#112D57] text-[15px]"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 ml-3" />
              התנתק
            </Button>
          </div>
        </CardSimple>
      </div>

      {/* Dialogs */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px]">ערוך פרטים אישיים</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">שם מלא</label>
              <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
            </div>

            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">מקצוע ראשי</label>
              <Select value={editData.selected_subject} onValueChange={(value) => setEditData({ ...editData, selected_subject: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">רמת יחידות</label>
              <Select value={editData.selected_units?.toString()} onValueChange={(value) => setEditData({ ...editData, selected_units: parseInt(value) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">ציון מטרה</label>
              <Input type="number" value={editData.target_score} onChange={(e) => setEditData({ ...editData, target_score: parseInt(e.target.value) })} min="55" max="100" />
            </div>

            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">תאריך בגרות</label>
              <Input type="date" value={editData.exam_date} onChange={(e) => setEditData({ ...editData, exam_date: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>ביטול</Button>
            <Button onClick={handleSaveProfile} className="bg-[#1E4BA1]">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px]">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              ניהול מנוי
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-[#F5F8FF] rounded-lg p-4 border border-[#E9F0FF]">
              <div className="font-bold text-[#2B2B2B] mb-2 text-[15px]">המנוי הנוכחי שלך</div>
              <div className="text-[13px] text-[#6E6E6E]">
                {user?.subscription_type === 'yearly' ? 'מנוי שנתי - 299.94 ₪' : 'מנוי חודשי - 49.99 ₪'}
              </div>
            </div>

            {user?.subscription_type === 'monthly' && (
              <Button onClick={() => navigate(createPageUrl("Premium"))} className="w-full bg-[#F59E0B] rounded-[14px]">
                שדרג למנוי שנתי וחסוך 50%
              </Button>
            )}

            <Button variant="outline" className="w-full text-red-600 hover:bg-red-50 rounded-[14px]" onClick={() => { setShowSubscriptionDialog(false); setShowCancelDialog(true); }}>
              ביטול מנוי
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px]">ביטול מנוי</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-[15px] text-[#2B2B2B]">אנחנו מצטערים לראות אותך הולך. למה אתה מבטל?</div>

            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger><SelectValue placeholder="בחר סיבה..." /></SelectTrigger>
              <SelectContent dir="rtl">
                {cancelReasons.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-[13px] text-red-900"><strong>שים לב:</strong> לאחר הביטול תאבד גישה לכל תכונות הפרימיום</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>אל תבטל</Button>
            <Button onClick={handleCancelSubscription} className="bg-red-600 hover:bg-red-700" disabled={!cancelReason}>בטל מנוי</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}