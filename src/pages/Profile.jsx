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
  ChevronDown } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
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
  "אזרחות", "ספרות", "לשון", "אנגלית", "ערבית"];


  const cancelReasons = [
  "יקר מדי",
  "לא משתמש מספיק",
  "מצאתי אפליקציה אחרת",
  "סיימתי את הבגרות",
  "הבעיות הטכניות",
  "אחר"];


  const displaySubject = user?.selected_subject || "אנגלית";
  const displayUnits = parseInt(user?.selected_units || 3);

  const { data: practiceAttempts = [] } = useQuery({
    queryKey: ['practice-attempts-profile', user?.email],
    queryFn: async () => {
      const attempts = await base44.entities.AttemptNew.list("-created_date", 1000);
      return attempts.filter((a) => a.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: []
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts-profile', user?.email],
    queryFn: async () => {
      const attempts = await base44.entities.ExamAttempt.list("-created_date", 100);
      return attempts.filter((a) => a.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: []
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['topics-profile', displaySubject, displayUnits],
    queryFn: async () => {
      const topics = await base44.entities.TopicNew.list();
      return topics.filter((t) => t.subject_id === displaySubject && t.unit_level === displayUnits && t.is_active);
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
      const dayAttempts = practiceAttempts.filter((a) => a.created_date?.startsWith(dateStr));
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
    { id: "review", title: `לחזור על ${readinessData.daily.reviewMistakes} טעויות` }];

  }, [readinessData]);

  const achievements = useMemo(() => {
    const streakDays = (() => {
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const hasActivity = practiceAttempts.some((a) => a.created_date?.startsWith(dateStr));
        if (hasActivity) streak++;else
        if (i > 0) break;
      }
      return streak;
    })();

    const improvements = [];
    if (streakDays >= 3) improvements.push({ icon: "🔥", text: `${streakDays} ימים רצופים` });
    if (practiceAttempts.length >= 100) improvements.push({ icon: "💯", text: "100 שאלות נענו" });
    if (examAttempts.some((e) => e.is_completed)) improvements.push({ icon: "🎓", text: "בגרות ראשונה" });

    return improvements;
  }, [practiceAttempts, examAttempts]);

  const recentMistakes = useMemo(() => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const weekMistakes = practiceAttempts.filter((a) =>
    a.status === "incorrect" && new Date(a.created_date) >= last7Days
    );

    const topicCounts = {};
    weekMistakes.forEach((mistake) => {
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
      setCompletedTasks(completedTasks.filter((t) => t !== taskId));
    } else {
      setCompletedTasks([...completedTasks, taskId]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E4BA1]" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-[#3B82F6] mb-6 px-5 py-3 rounded-[4px_4px_14px_14px] from-blue-500 to-indigo-500 flex items-center justify-between">
        <div className="text-right flex-1">
          <h1 className="text-[16px] font-bold text-white">{user?.full_name || 'תלמיד'}</h1>
          <p className="text-[11px] text-white/90">{displaySubject} • {displayUnits} יחידות</p>
        </div>
        <button onClick={() => setIsEditing(true)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="px-5 space-y-6">
        {/* המנוי שלי */}
        {user?.is_premium ?
        <CardSimple delay={0.05}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="text-base font-bold text-[#2B2B2B]">המנוי שלי</h3>
              </div>
              <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSubscriptionDialog(true)}
              className="h-8 text-[12px] text-[#3B82F6] hover:bg-[#E9F0FF]">

                נהל
              </Button>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
              <div className="text-[13px] text-[#6E6E6E] mb-1">סוג מנוי</div>
              <div className="text-[15px] font-bold text-[#2B2B2B]">
                {user?.subscription_type === 'yearly' ? 'מנוי שנתי' : 'מנוי חודשי'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#E9F0FF] mt-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E9F0FF] rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <div className="font-bold text-[15px] text-[#2B2B2B]">מנוי פעיל</div>
                <div className="text-[13px] text-[#6E6E6E]">גישה מלאה לכל התכונות</div>
              </div>
            </div>
          </CardSimple> :

        <CardSimple delay={0.05}>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-[#3B82F6]" />
              <h3 className="text-base font-bold text-[#2B2B2B]">שדרג לפרימיום</h3>
            </div>
            <p className="text-[13px] text-[#6E6E6E] mb-3">גישה בלתי מוגבלת לכל התכונות</p>
            <Button
            onClick={() => navigate(createPageUrl("Premium"))}
            className="w-full h-12 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-[14px] text-[15px]">

              <Crown className="w-4 h-4 ml-2" />
              שדרג עכשיו
            </Button>
          </CardSimple>
        }

        {/* הדרך שלך לבגרות */}
        {readinessData &&
        <CardSimple delay={0.05}>
            <CardTitle>הדרך שלך לבגרות</CardTitle>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <StatCard value={`${readinessData.scores.mastery}%`} label="שליטה בחומר" color="#3B82F6" />
              <StatCard value={`${readinessData.scores.practice}%`} label="תרגול" color="#3B82F6" />
              <StatCard value={`${readinessData.scores.exams}%`} label="בגרויות" color="#3B82F6" />
            </div>

            <Button
            onClick={() => setShowDetailsView(!showDetailsView)}
            variant="outline"
            className="w-full h-10 text-[13px] rounded-[14px] border-2 border-[#E9F0FF] text-[#3B82F6]">

              {showDetailsView ? 'הסתר פירוט' : 'ראה פירוט'}
              <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showDetailsView ? 'rotate-180' : ''}`} />
            </Button>

            {showDetailsView &&
          <div className="space-y-2 mt-3">
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">שליטה בחומר</span>
                    <span className="text-2xl font-black text-[#3B82F6]">{readinessData.scores.mastery}%</span>
                  </div>
                  <Progress value={readinessData.scores.mastery} className="h-2 mt-2" />
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">תרגול</span>
                    <span className="text-2xl font-black text-[#3B82F6]">{readinessData.scores.practice}%</span>
                  </div>
                  <Progress value={readinessData.scores.practice} className="h-2 mt-2" />
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">בגרויות</span>
                    <span className="text-2xl font-black text-[#3B82F6]">{readinessData.scores.exams}%</span>
                  </div>
                  <Progress value={readinessData.scores.exams} className="h-2 mt-2" />
                </div>
                <div className="bg-white rounded-lg p-3 border border-[#E9F0FF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-[#2B2B2B]">מהירות</span>
                    <span className="text-2xl font-black text-[#3B82F6]">{readinessData.scores.speed}%</span>
                  </div>
                  <Progress value={readinessData.scores.speed} className="h-2 mt-2" />
                </div>
              </div>
          }
          </CardSimple>
        }

        {/* הגדרות */}
        <CardSimple delay={0.4}>
          <CardTitle icon={Settings}>הגדרות חשבון</CardTitle>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start rounded-lg h-12 border-2 border-[#E9F0FF] text-[#3B82F6] text-[15px]"
              onClick={() => navigate(createPageUrl("Settings"))}>

              <Settings className="w-5 h-5 ml-3" />
              כל ההגדרות
            </Button>



            <Button
              variant="outline"
              className="w-full justify-start rounded-lg h-12 border-2 border-[#E9F0FF] text-[#3B82F6] text-[15px]"
              onClick={handleLogout}>

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
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <Button onClick={handleSaveProfile} className="bg-[#3B82F6]">שמור</Button>
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

            {user?.subscription_type === 'monthly' &&
            <Button onClick={() => navigate(createPageUrl("Premium"))} className="w-full bg-[#F59E0B] rounded-[14px]">
                שדרג למנוי שנתי וחסוך 50%
              </Button>
            }

            <Button variant="outline" className="w-full text-red-600 hover:bg-red-50 rounded-[14px]" onClick={() => {setShowSubscriptionDialog(false);setShowCancelDialog(true);}}>
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
                {cancelReasons.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
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
    </div>);

}