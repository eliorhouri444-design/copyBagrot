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
  Trash2,
  Shield,
  CreditCard,
  Clock,
  Edit,
  Award,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Camera,
  Lock,
  Star,
  Share2,
  Gift,
  Copy,
  Check } from
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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_image: file_url });
      setUser({ ...user, profile_image: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("שגיאה בהעלאת התמונה");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert("הסיסמאות אינן תואמות");
      return;
    }
    if (passwordData.new.length < 6) {
      alert("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    alert("בקשה לשינוי סיסמה נשלחה למייל שלך");
    setShowPasswordDialog(false);
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  const handleRating = async () => {
    if (rating === 0) return;
    try {
      const adFreeUntil = new Date();
      adFreeUntil.setDate(adFreeUntil.getDate() + 1);
      await base44.auth.updateMe({ 
        app_rating: rating,
        ad_free_until: adFreeUntil.toISOString()
      });
      setUser({ ...user, app_rating: rating, ad_free_until: adFreeUntil.toISOString() });
      alert("תודה על הדירוג! 🎉 קיבלת יום אחד ללא פרסומות");
      setShowRatingDialog(false);
    } catch (error) {
      console.error("Error saving rating:", error);
    }
  };

  const shareCode = user?.email?.split('@')[0]?.toUpperCase() || "BAGRUT";
  
  const handleCopyShareLink = () => {
    const shareLink = `https://bagrut-plus.app/invite/${shareCode}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'בגרות פלוס',
      text: `הצטרף לבגרות פלוס עם הקוד שלי: ${shareCode} וקבל גישה לאלפי שאלות תרגול!`,
      url: `https://bagrut-plus.app/invite/${shareCode}`
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyShareLink();
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
      <div className="bg-[#3B82F6] mb-6 px-5 py-5 rounded-[4px_4px_8px_8px] from-blue-500 to-indigo-500">
        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
                disabled={uploadingImage}
              />
              {uploadingImage ? (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3 text-[#3B82F6]" />
              )}
            </label>
          </div>
          
          <div className="flex-1">
            <h1 className="text-[16px] font-bold text-white">{user?.full_name || 'תלמיד'}</h1>
            <p className="text-[11px] text-white/90">{displaySubject} • {displayUnits} יחידות</p>
            {user?.is_premium && (
              <div className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
                <Crown className="w-3 h-3" />
                פרימיום
              </div>
            )}
          </div>
          
          <button onClick={() => setIsEditing(true)} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
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

        {/* ניהול מנוי */}
        <CardSimple delay={0.15}>
          <CardTitle icon={CreditCard}>ניהול מנוי</CardTitle>
          
          {user?.is_premium ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-900">מנוי פעיל</span>
                </div>
                <p className="text-[12px] text-amber-700">
                  {user?.subscription_type === 'yearly' ? 'מנוי שנתי' : 'מנוי חודשי'}
                </p>
              </div>
              
              <Button
                variant="outline"
                className="w-full justify-start rounded-lg h-11 border-2 border-[#E9F0FF] text-[#3B82F6] text-[14px]"
                onClick={() => setShowSubscriptionDialog(true)}>
                <Settings className="w-4 h-4 ml-2" />
                שנה תוכנית מנוי
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start rounded-lg h-11 border-2 border-red-100 text-red-600 text-[14px]"
                onClick={() => setShowCancelDialog(true)}>
                <Trash2 className="w-4 h-4 ml-2" />
                בטל מנוי
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-[#6E6E6E]">שדרג לפרימיום וקבל גישה בלתי מוגבלת</p>
              <Button
                onClick={() => navigate(createPageUrl("Premium"))}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-[14px] text-[15px]">
                <Crown className="w-4 h-4 ml-2" />
                שדרג לפרימיום
              </Button>
            </div>
          )}
        </CardSimple>

        {/* דרג וקבל + שתף חברים */}
        <CardSimple delay={0.2}>
          <CardTitle icon={Gift}>הטבות</CardTitle>
          
          <div className="space-y-3">
            {/* דירוג */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-purple-900 text-[14px] mb-0.5">דרג אותנו</div>
                  <div className="text-[12px] text-purple-700">קבל יום אחד ללא פרסומות</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowRatingDialog(true)}
                  disabled={user?.app_rating}
                  className="bg-purple-600 hover:bg-purple-700 text-white h-9 px-4">
                  {user?.app_rating ? (
                    <>
                      <Check className="w-4 h-4 ml-1" />
                      דורג
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 ml-1" />
                      דרג
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* שיתוף */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-green-900 text-[14px] mb-0.5">הזמן חברים</div>
                  <div className="text-[12px] text-green-700">על כל 10 חברים - 5 ימים ללא פרסומות</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white h-9 px-4">
                  <Share2 className="w-4 h-4 ml-1" />
                  שתף
                </Button>
              </div>
            </div>
          </div>
        </CardSimple>

        {/* הגדרות */}
        <CardSimple delay={0.25}>
          <CardTitle icon={Settings}>הגדרות חשבון</CardTitle>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start rounded-lg h-12 border-2 border-[#E9F0FF] text-[#3B82F6] text-[15px]"
              onClick={() => setIsEditing(true)}>
              <Edit className="w-5 h-5 ml-3" />
              ערוך פרטים
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-lg h-12 border-2 border-[#E9F0FF] text-[#3B82F6] text-[15px]"
              onClick={() => setShowPasswordDialog(true)}>
              <Lock className="w-5 h-5 ml-3" />
              שינוי סיסמה
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
              שינוי תוכנית מנוי
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="font-bold text-amber-900 mb-1 text-[15px]">המנוי הנוכחי שלך</div>
              <div className="text-[13px] text-amber-700">
                {user?.subscription_type === 'yearly' ? 'מנוי שנתי - 299.94 ₪ לשנה' : 'מנוי חודשי - 49.99 ₪ לחודש'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[14px] font-semibold text-[#2B2B2B]">בחר תוכנית:</div>
              
              <button 
                onClick={async () => {
                  await base44.auth.updateMe({ subscription_type: 'monthly' });
                  setUser({ ...user, subscription_type: 'monthly' });
                  setShowSubscriptionDialog(false);
                  alert("התוכנית שונתה למנוי חודשי");
                }}
                className={`w-full p-4 rounded-xl border-2 text-right transition-all ${user?.subscription_type === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#2B2B2B]">מנוי חודשי</div>
                    <div className="text-[12px] text-gray-600">49.99 ₪ לחודש</div>
                  </div>
                  {user?.subscription_type === 'monthly' && <Check className="w-5 h-5 text-blue-600" />}
                </div>
              </button>
              
              <button 
                onClick={async () => {
                  await base44.auth.updateMe({ subscription_type: 'yearly' });
                  setUser({ ...user, subscription_type: 'yearly' });
                  setShowSubscriptionDialog(false);
                  alert("התוכנית שונתה למנוי שנתי - חסכת 50%!");
                }}
                className={`w-full p-4 rounded-xl border-2 text-right transition-all relative ${user?.subscription_type === 'yearly' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                <div className="absolute -top-2 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  הכי משתלם
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#2B2B2B]">מנוי שנתי</div>
                    <div className="text-[12px] text-gray-600">299.94 ₪ לשנה (25 ₪/חודש)</div>
                    <div className="text-[11px] text-green-600 font-semibold">חיסכון של 50%!</div>
                  </div>
                  {user?.subscription_type === 'yearly' && <Check className="w-5 h-5 text-amber-600" />}
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px]">
              <Lock className="w-5 h-5 text-[#3B82F6]" />
              שינוי סיסמה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">סיסמה נוכחית</label>
              <Input 
                type="password" 
                value={passwordData.current} 
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} 
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">סיסמה חדשה</label>
              <Input 
                type="password" 
                value={passwordData.new} 
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} 
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">אימות סיסמה חדשה</label>
              <Input 
                type="password" 
                value={passwordData.confirm} 
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>ביטול</Button>
            <Button onClick={handleChangePassword} className="bg-[#3B82F6]">שנה סיסמה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[18px]">איך אתה מרגיש עם האפליקציה?</DialogTitle>
          </DialogHeader>

          <div className="py-6">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110">
                  <Star 
                    className={`w-10 h-10 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-[13px] text-gray-600">
              {rating === 0 && "לחץ על הכוכבים לדירוג"}
              {rating === 1 && "אוי, מצטערים לשמוע 😢"}
              {rating === 2 && "ננסה להשתפר 💪"}
              {rating === 3 && "תודה! 😊"}
              {rating === 4 && "מעולה! 🎉"}
              {rating === 5 && "וואו, תודה רבה! 🌟"}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRatingDialog(false)}>ביטול</Button>
            <Button onClick={handleRating} disabled={rating === 0} className="bg-purple-600 hover:bg-purple-700">
              שלח דירוג וקבל יום ללא פרסומות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px]">
              <Share2 className="w-5 h-5 text-green-600" />
              הזמן חברים
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
              <Gift className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-900 mb-1">קבל 5 ימים ללא פרסומות!</p>
              <p className="text-[12px] text-green-700">על כל 10 חברים שיורידו את האפליקציה עם הקוד שלך</p>
            </div>

            <div>
              <label className="text-[13px] font-semibold mb-2 block text-[#2B2B2B]">הקוד שלך:</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono font-bold text-lg text-center">
                  {shareCode}
                </div>
                <Button onClick={handleCopyShareLink} variant="outline" className="h-auto">
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="text-center text-[12px] text-gray-500">
              חברים שהוזמנו: {user?.referral_count || 0} / 10
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleShare} className="w-full bg-green-600 hover:bg-green-700">
              <Share2 className="w-4 h-4 ml-2" />
              שתף עכשיו
            </Button>
          </DialogFooter>
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