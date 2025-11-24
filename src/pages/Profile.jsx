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
  ChevronDown,
  Camera,
  Lock,
  Star,
  Share2,
  Gift,
  Copy,
  Check,
  Bell,
  Smartphone,
  MessageCircle,
  TrendingUp,
  Volume2,
  Calendar,
  Sparkles,
  RotateCcw,
  HelpCircle,
  FileText,
  ThumbsUp,
  ChevronRight,
  ChevronLeft,
  Phone,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { CardSimple, CardTitle, StatCard } from "@/components/ui/card-simple";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { differenceInDays } from "date-fns";
import { useReadinessCalculator } from "@/components/readiness/ReadinessCalculator";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  // Form states
  const [editData, setEditData] = useState({ full_name: "" });
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [contactData, setContactData] = useState({ phone: "" });
  const [planData, setPlanData] = useState({ target_score: 85, exam_date: "", selected_subject: "אנגלית", selected_units: 3 });
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(0);
  const [copied, setCopied] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Settings states
  const [settings, setSettings] = useState({
    app_notifications: true,
    whatsapp_notifications: false,
    daily_reminders: true,
    progress_updates: true,
    sounds: true
  });

  const subjects = ["מתמטיקה", "פיזיקה", "ביולוגיה", "היסטוריה", "אזרחות", "ספרות", "לשון", "אנגלית", "ערבית"];
  const cancelReasons = ["יקר מדי", "לא משתמש מספיק", "מצאתי אפליקציה אחרת", "סיימתי את הבגרות", "בעיות טכניות", "אחר"];

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
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setEditData({ full_name: currentUser.full_name || "" });
        setContactData({ phone: currentUser.phone || "" });
        setPlanData({
          target_score: currentUser.target_score || 85,
          exam_date: currentUser.exam_date || "",
          selected_subject: currentUser.selected_subject || "אנגלית",
          selected_units: currentUser.selected_units || 3
        });
        setSettings({
          app_notifications: currentUser.app_notifications !== false,
          whatsapp_notifications: currentUser.whatsapp_notifications || false,
          daily_reminders: currentUser.daily_reminders !== false,
          progress_updates: currentUser.progress_updates !== false,
          sounds: currentUser.sounds !== false
        });
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const readinessData = useReadinessCalculator(user, allTopics, practiceAttempts, examAttempts);

  // Handlers
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

  const handleSaveProfile = async () => {
    try {
      await base44.auth.updateMe(editData);
      setUser({ ...user, ...editData });
      setShowEditProfile(false);
      alert("הפרטים נשמרו בהצלחה");
    } catch (error) {
      alert("שגיאה בשמירה");
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
    alert("קישור לאיפוס סיסמה נשלח למייל שלך");
    setShowPasswordDialog(false);
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  const handleSaveContact = async () => {
    try {
      await base44.auth.updateMe({ phone: contactData.phone });
      setUser({ ...user, phone: contactData.phone });
      setShowContactDialog(false);
      alert("פרטי הקשר עודכנו");
    } catch (error) {
      alert("שגיאה בעדכון");
    }
  };

  const handleSavePlan = async () => {
    try {
      await base44.auth.updateMe(planData);
      setUser({ ...user, ...planData });
      setShowPlanDialog(false);
      alert("התוכנית האישית עודכנה");
    } catch (error) {
      alert("שגיאה בשמירה");
    }
  };

  const handleToggleSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await base44.auth.updateMe({ [key]: value });
    } catch (error) {
      console.error("Error saving setting:", error);
    }
  };

  const handleLogout = async () => {
    if (confirm("האם אתה בטוח שברצונך להתנתק?")) {
      await base44.auth.logout();
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
      alert("שגיאה בביטול המנוי");
    }
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

  const handleResetData = async () => {
    if (confirm("האם אתה בטוח? כל נתוני הלמידה שלך יימחקו לצמיתות!")) {
      try {
        await base44.auth.updateMe({
          completed_topics: [],
          weak_topics: [],
          practice_history: []
        });
        alert("הנתונים אופסו בהצלחה");
        setShowResetDialog(false);
      } catch (error) {
        alert("שגיאה באיפוס");
      }
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      alert("נא להזין משוב");
      return;
    }
    try {
      await base44.entities.UserFeedback.create({
        feedback_text: feedbackText,
        user_email: user?.email
      });
      alert("תודה על המשוב! 🙏");
      setFeedbackText("");
      setShowFeedbackDialog(false);
    } catch (error) {
      alert("שגיאה בשליחה");
    }
  };

  // UI Components
  const SettingItem = ({ icon: Icon, title, subtitle, onClick, rightElement }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 flex items-center gap-3 border border-[#E9F0FF] hover:border-[#3B82F6] transition-colors text-right"
    >
      <div className="w-10 h-10 bg-[#E9F0FF] rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#3B82F6]" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[#2B2B2B] text-[14px]">{title}</div>
        {subtitle && <div className="text-[12px] text-[#6E6E6E]">{subtitle}</div>}
      </div>
      {rightElement || <ChevronLeft className="w-5 h-5 text-[#6E6E6E]" />}
    </motion.button>
  );

  const SettingToggle = ({ icon: Icon, title, subtitle, checked, onChange }) => (
    <div className="w-full bg-white rounded-xl p-4 flex items-center gap-3 border border-[#E9F0FF]">
      <div className="w-10 h-10 bg-[#E9F0FF] rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#3B82F6]" />
      </div>
      <div className="flex-1 text-right">
        <div className="font-semibold text-[#2B2B2B] text-[14px]">{title}</div>
        {subtitle && <div className="text-[12px] text-[#6E6E6E]">{subtitle}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, color = "#3B82F6" }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h2 className="text-[15px] font-bold text-[#2B2B2B]">{title}</h2>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-24">
      {/* Header with Profile Image */}
      <div className="bg-[#3B82F6] px-5 py-5 rounded-b-[1rem]">
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
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {/* חשבון */}
        <SectionTitle icon={User} title="חשבון" />
        <div className="space-y-2">
          <SettingItem icon={Edit} title="עריכת פרופיל" subtitle="שם, תמונה" onClick={() => setShowEditProfile(true)} />
          <SettingItem icon={Lock} title="שינוי סיסמה" onClick={() => setShowPasswordDialog(true)} />
          <SettingItem icon={Phone} title="עדכון טלפון" subtitle={user?.phone || "לא הוגדר"} onClick={() => setShowContactDialog(true)} />
          <SettingItem icon={LogOut} title="התנתקות" onClick={handleLogout} />
        </div>

        {/* ניהול מנוי */}
        <SectionTitle icon={CreditCard} title="ניהול מנוי" color="#F59E0B" />
        <div className="space-y-2">
          {user?.is_premium ? (
            <>
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-900">מנוי פעיל</span>
                </div>
                <p className="text-[12px] text-amber-700">
                  {user?.subscription_type === 'yearly' ? 'מנוי שנתי' : 'מנוי חודשי'}
                </p>
              </div>
              <SettingItem icon={Settings} title="שנה תוכנית מנוי" onClick={() => setShowSubscriptionDialog(true)} />
              <SettingItem icon={Trash2} title="בטל מנוי" onClick={() => setShowCancelDialog(true)} />
            </>
          ) : (
            <Button
              onClick={() => navigate(createPageUrl("Premium"))}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-xl text-[15px]">
              <Crown className="w-4 h-4 ml-2" />
              שדרג לפרימיום
            </Button>
          )}
        </div>

        {/* הטבות */}
        <SectionTitle icon={Gift} title="הטבות" color="#10B981" />
        <div className="space-y-2">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
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
                {user?.app_rating ? <><Check className="w-4 h-4 ml-1" />דורג</> : <><Star className="w-4 h-4 ml-1" />דרג</>}
              </Button>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
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

        {/* התראות */}
        <SectionTitle icon={Bell} title="התראות" color="#EC4899" />
        <div className="space-y-2">
          <SettingToggle icon={Smartphone} title="התראות אפליקציה" checked={settings.app_notifications} onChange={(v) => handleToggleSetting('app_notifications', v)} />
          <SettingToggle icon={MessageCircle} title="התראות וואטסאפ" checked={settings.whatsapp_notifications} onChange={(v) => handleToggleSetting('whatsapp_notifications', v)} />
          <SettingToggle icon={Clock} title="תזכורות יומיות" subtitle="תזכורת ללמידה יומית" checked={settings.daily_reminders} onChange={(v) => handleToggleSetting('daily_reminders', v)} />
          <SettingToggle icon={TrendingUp} title="עדכוני התקדמות" subtitle="סיכום שבועי" checked={settings.progress_updates} onChange={(v) => handleToggleSetting('progress_updates', v)} />
          <SettingToggle icon={Volume2} title="צלילים" checked={settings.sounds} onChange={(v) => handleToggleSetting('sounds', v)} />
        </div>

        {/* תוכנית אישית */}
        <SectionTitle icon={Target} title="תוכנית אישית" color="#8B5CF6" />
        <div className="space-y-2">
          <SettingItem icon={Award} title="יעד ציון" subtitle={`${planData.target_score} נקודות`} onClick={() => setShowPlanDialog(true)} />
          <SettingItem icon={Calendar} title="תאריך בגרות" subtitle={planData.exam_date || "לא הוגדר"} onClick={() => setShowPlanDialog(true)} />
          <SettingItem icon={BookOpen} title="מקצועות" subtitle={`${planData.selected_subject} - ${planData.selected_units} יח'`} onClick={() => setShowPlanDialog(true)} />
          <SettingItem icon={Sparkles} title="המלצות AI" subtitle="התאמה אישית" onClick={() => navigate(createPageUrl("Readiness"))} />
        </div>

        {/* כללי */}
        <SectionTitle icon={Settings} title="כללי" color="#6B7280" />
        <div className="space-y-2">
          <SettingItem icon={RotateCcw} title="איפוס נתוני למידה" subtitle="מחיקת כל ההתקדמות" onClick={() => setShowResetDialog(true)} />
        </div>

        {/* מידע */}
        <SectionTitle icon={Info} title="מידע" color="#3B82F6" />
        <div className="space-y-2">
          <SettingItem icon={HelpCircle} title="אודות" subtitle="גרסה 1.0.0" onClick={() => alert("בגרות פלוס - גרסה 1.0.0")} />
          <SettingItem icon={FileText} title="תקנון" onClick={() => window.open("https://example.com/terms", "_blank")} />
          <SettingItem icon={Shield} title="פרטיות" onClick={() => window.open("https://example.com/privacy", "_blank")} />
          <SettingItem icon={MessageSquare} title="תמיכה" onClick={() => window.open("mailto:support@example.com")} />
          <SettingItem icon={ThumbsUp} title="פידבק" subtitle="עזור לנו להשתפר" onClick={() => setShowFeedbackDialog(true)} />
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת פרופיל</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center cursor-pointer shadow-md">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                  <Camera className="w-4 h-4 text-white" />
                </label>
              </div>
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">שם מלא</label>
              <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>ביטול</Button>
            <Button onClick={handleSaveProfile} className="bg-[#3B82F6]">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>שינוי סיסמה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[13px] font-semibold mb-2 block">סיסמה נוכחית</label>
              <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">סיסמה חדשה</label>
              <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">אימות סיסמה חדשה</label>
              <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>ביטול</Button>
            <Button onClick={handleChangePassword} className="bg-[#3B82F6]">שנה סיסמה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>עדכון פרטי קשר</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[13px] font-semibold mb-2 block">טלפון</label>
              <Input value={contactData.phone} onChange={(e) => setContactData({ ...contactData, phone: e.target.value })} placeholder="050-0000000" />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">אימייל</label>
              <Input value={user?.email || ""} disabled className="bg-gray-100" />
              <p className="text-[11px] text-[#6E6E6E] mt-1">לא ניתן לשנות את האימייל</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveContact} className="bg-[#3B82F6]">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>שינוי תוכנית מנוי</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="font-bold text-amber-900 mb-1">המנוי הנוכחי שלך</div>
              <div className="text-[13px] text-amber-700">
                {user?.subscription_type === 'yearly' ? 'מנוי שנתי - 299.94 ₪ לשנה' : 'מנוי חודשי - 49.99 ₪ לחודש'}
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-[14px] font-semibold">בחר תוכנית:</div>
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
                    <div className="font-bold">מנוי חודשי</div>
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
                <div className="absolute -top-2 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">הכי משתלם</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">מנוי שנתי</div>
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

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>ביטול מנוי</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-[15px]">אנחנו מצטערים לראות אותך הולך. למה אתה מבטל?</div>
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

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">איך אתה מרגיש עם האפליקציה?</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                  <Star className={`w-10 h-10 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
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
            <DialogTitle>הזמן חברים</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
              <Gift className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-900 mb-1">קבל 5 ימים ללא פרסומות!</p>
              <p className="text-[12px] text-green-700">על כל 10 חברים שיורידו את האפליקציה עם הקוד שלך</p>
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">הקוד שלך:</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono font-bold text-lg text-center">{shareCode}</div>
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

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>תוכנית אישית</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[13px] font-semibold mb-2 block">יעד ציון</label>
              <Input type="number" value={planData.target_score} onChange={(e) => setPlanData({ ...planData, target_score: parseInt(e.target.value) })} min="55" max="100" />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">תאריך בגרות</label>
              <Input type="date" value={planData.exam_date} onChange={(e) => setPlanData({ ...planData, exam_date: e.target.value })} />
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">מקצוע ראשי</label>
              <Select value={planData.selected_subject} onValueChange={(v) => setPlanData({ ...planData, selected_subject: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">יחידות</label>
              <Select value={planData.selected_units?.toString()} onValueChange={(v) => setPlanData({ ...planData, selected_units: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>ביטול</Button>
            <Button onClick={handleSavePlan} className="bg-[#3B82F6]">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Data Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">איפוס נתונים</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-[14px] text-red-800 font-semibold mb-2">⚠️ שים לב!</p>
              <p className="text-[13px] text-red-700">פעולה זו תמחק את כל נתוני הלמידה שלך כולל תרגולים, בגרויות והתקדמות. לא ניתן לשחזר!</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>ביטול</Button>
            <Button onClick={handleResetData} className="bg-red-600 hover:bg-red-700">אפס הכל</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>שלח פידבק</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="מה אתה חושב על האפליקציה? יש לך רעיונות לשיפור?"
              className="w-full h-32 p-3 border border-[#E9F0FF] rounded-xl text-[14px] resize-none focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>ביטול</Button>
            <Button onClick={handleSendFeedback} className="bg-[#3B82F6]">שלח</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}