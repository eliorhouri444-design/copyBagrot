import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  User,
  Bell,
  Target,
  Settings as SettingsIcon,
  Info,
  ChevronLeft,
  Edit,
  Lock,
  Phone,
  Mail,
  Smartphone,
  MessageCircle,
  Clock,
  TrendingUp,
  Award,
  Calendar,
  BookOpen,
  Sparkles,
  Volume2,
  RotateCcw,
  HelpCircle,
  FileText,
  Shield,
  MessageSquare,
  ThumbsUp,
  ChevronRight,
  Star,
  Share2,
  Crown,
  CreditCard,
  Camera,
  Upload,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUpdateContact, setShowUpdateContact] = useState(false);
  const [showPersonalPlan, setShowPersonalPlan] = useState(false);
  const [showResetData, setShowResetData] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCancelSubscription, setShowCancelSubscription] = useState(false);
  
  // Form states
  const [editData, setEditData] = useState({});
  const [contactData, setContactData] = useState({ phone: "", email: "" });
  const [planData, setPlanData] = useState({ target_score: 85, exam_date: "", selected_subject: "אנגלית", selected_units: 3 });
  const [feedbackText, setFeedbackText] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [cancelReason, setCancelReason] = useState("");
  
  // Settings states
  const [settings, setSettings] = useState({
    app_notifications: true,
    whatsapp_notifications: false,
    daily_reminders: true,
    progress_updates: true,
    sounds: true
  });

  const cancelReasons = [
    "יקר מדי",
    "לא משתמש מספיק",
    "מצאתי אפליקציה אחרת",
    "סיימתי את הבגרות",
    "בעיות טכניות",
    "אחר"
  ];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setEditData({ full_name: currentUser.full_name || "" });
        setContactData({ phone: currentUser.phone || "", email: currentUser.email || "" });
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
        setProfileImage(currentUser.profile_image || null);
        setShareCount(currentUser.share_count || 0);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileImage(file_url);
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

  const handleSaveContact = async () => {
    try {
      await base44.auth.updateMe({ phone: contactData.phone });
      setUser({ ...user, phone: contactData.phone });
      setShowUpdateContact(false);
      alert("פרטי הקשר עודכנו");
    } catch (error) {
      alert("שגיאה בעדכון");
    }
  };

  const handleSavePlan = async () => {
    try {
      await base44.auth.updateMe(planData);
      setUser({ ...user, ...planData });
      setShowPersonalPlan(false);
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

  const handleResetData = async () => {
    if (confirm("האם אתה בטוח? כל נתוני הלמידה שלך יימחקו לצמיתות!")) {
      try {
        await base44.auth.updateMe({
          completed_topics: [],
          weak_topics: [],
          practice_history: []
        });
        alert("הנתונים אופסו בהצלחה");
        setShowResetData(false);
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
      setShowFeedback(false);
    } catch (error) {
      alert("שגיאה בשליחה");
    }
  };

  const handleRatingSubmit = async () => {
    if (rating < 5) {
      alert("תודה על הדירוג! רק עם 5 כוכבים תקבל יום אחד ללא פרסומות 🌟");
      setShowRating(false);
      return;
    }
    
    // Open store based on platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const storeUrl = isIOS 
      ? "https://apps.apple.com/app/YOUR_APP_ID" 
      : "https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME";
    
    window.open(storeUrl, "_blank");
    
    try {
      const adFreeUntil = new Date();
      adFreeUntil.setDate(adFreeUntil.getDate() + 1);
      
      await base44.auth.updateMe({ 
        has_rated: true,
        rating: 5,
        ad_free_until: adFreeUntil.toISOString()
      });
      setUser({ ...user, has_rated: true, rating: 5, ad_free_until: adFreeUntil.toISOString() });
      setRatingSubmitted(true);
      
      setTimeout(() => {
        setShowRating(false);
        setRatingSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving rating:", error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'בגרות פלוס',
      text: 'הצטרף לבגרות פלוס - האפליקציה הטובה ביותר להכנה לבגרות!',
      url: 'https://bagrut-plus.com'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        const newShareCount = shareCount + 1;
        setShareCount(newShareCount);
        
        await base44.auth.updateMe({ share_count: newShareCount });
        
        if (newShareCount >= 20 && !user?.share_reward_claimed) {
          const adFreeUntil = new Date();
          adFreeUntil.setDate(adFreeUntil.getDate() + 5);
          
          await base44.auth.updateMe({ 
            share_reward_claimed: true,
            ad_free_until: adFreeUntil.toISOString()
          });
          
          alert("🎉 מעולה! שיתפת ל-20 חברים וקיבלת 5 ימים ללא פרסומות!");
        }
      } else {
        // Fallback - copy link
        await navigator.clipboard.writeText(shareData.url);
        alert("הקישור הועתק! שתף עם חברים");
      }
    } catch (error) {
      console.error("Error sharing:", error);
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

      alert("המנוי בוטל בהצלחה");
      setShowCancelSubscription(false);
      setShowSubscription(false);
      
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("שגיאה בביטול המנוי");
    }
  };

  const SettingItem = ({ icon: Icon, title, subtitle, onClick, rightElement, color = "#3B82F6" }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 flex items-center gap-3 border border-[#E9F0FF] hover:border-[#3B82F6] transition-colors text-right"
    >
      <div className="w-10 h-10 bg-[#E9F0FF] rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[#2B2B2B] text-[14px]">{title}</div>
        {subtitle && <div className="text-[12px] text-[#6E6E6E]">{subtitle}</div>}
      </div>
      {rightElement || <ChevronLeft className="w-5 h-5 text-[#6E6E6E]" />}
    </motion.button>
  );

  const SettingToggle = ({ icon: Icon, title, subtitle, checked, onChange, color = "#3B82F6" }) => (
    <div className="w-full bg-white rounded-xl p-4 flex items-center gap-3 border border-[#E9F0FF]">
      <div className="w-10 h-10 bg-[#E9F0FF] rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" style={{ color }} />
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

  const StarRating = ({ value, onChange, hovered, onHover }) => (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => onHover(star)}
          onMouseLeave={() => onHover(0)}
          onClick={() => onChange(star)}
          className="p-1"
        >
          <motion.div
            animate={{
              scale: (hovered >= star || value >= star) ? [1, 1.3, 1] : 1,
              rotate: (hovered >= star || value >= star) ? [0, 10, -10, 0] : 0
            }}
            transition={{ duration: 0.3 }}
          >
            <Star
              className={`w-10 h-10 transition-all duration-200 ${
                (hovered >= star || value >= star)
                  ? "text-yellow-400 fill-yellow-400 drop-shadow-lg"
                  : "text-gray-300"
              }`}
            />
          </motion.div>
        </motion.button>
      ))}
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
      {/* Header */}
      <div className="bg-[#3B82F6] px-5 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-[18px] font-bold text-white">הגדרות</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 py-4 space-y-2">
        {/* חשבון */}
        <SectionTitle icon={User} title="חשבון" />
        <div className="space-y-2">
          <SettingItem icon={Edit} title="עריכת פרופיל" subtitle="שם, תמונה" onClick={() => setShowEditProfile(true)} />
          <SettingItem icon={Lock} title="שינוי סיסמה" onClick={() => setShowChangePassword(true)} />
          <SettingItem icon={Phone} title="עדכון טלפון/אימייל" subtitle={user?.phone || "לא הוגדר"} onClick={() => setShowUpdateContact(true)} />
        </div>

        {/* מנוי */}
        <SectionTitle icon={Crown} title="מנוי" color="#F59E0B" />
        <div className="space-y-2">
          {user?.is_premium ? (
            <SettingItem 
              icon={CreditCard} 
              title="נהל מנוי" 
              subtitle={user?.subscription_type === 'yearly' ? 'מנוי שנתי פעיל' : 'מנוי חודשי פעיל'}
              onClick={() => setShowSubscription(true)}
              color="#F59E0B"
            />
          ) : (
            <SettingItem 
              icon={Crown} 
              title="שדרג לפרימיום" 
              subtitle="גישה מלאה לכל התכונות"
              onClick={() => navigate(createPageUrl("Premium"))}
              color="#F59E0B"
            />
          )}
        </div>

        {/* התראות */}
        <SectionTitle icon={Bell} title="התראות" color="#F59E0B" />
        <div className="space-y-2">
          <SettingToggle icon={Smartphone} title="התראות אפליקציה" subtitle="קבל התראות על פעילות" checked={settings.app_notifications} onChange={(v) => handleToggleSetting('app_notifications', v)} color="#F59E0B" />
          <SettingToggle icon={MessageCircle} title="התראות וואטסאפ" subtitle="קבל הודעות בוואטסאפ" checked={settings.whatsapp_notifications} onChange={(v) => handleToggleSetting('whatsapp_notifications', v)} color="#25D366" />
          <SettingToggle icon={Clock} title="תזכורת יומית" subtitle="תזכורת ללמידה יומית" checked={settings.daily_reminders} onChange={(v) => handleToggleSetting('daily_reminders', v)} color="#3B82F6" />
          <SettingToggle icon={TrendingUp} title="עדכוני התקדמות" subtitle="סיכום שבועי" checked={settings.progress_updates} onChange={(v) => handleToggleSetting('progress_updates', v)} color="#10B981" />
        </div>

        {/* תוכנית אישית */}
        <SectionTitle icon={Target} title="תוכנית אישית" color="#10B981" />
        <div className="space-y-2">
          <SettingItem icon={Award} title="יעד ציון" subtitle={`${planData.target_score} נקודות`} onClick={() => setShowPersonalPlan(true)} color="#10B981" />
          <SettingItem icon={Calendar} title="תאריך בגרות" subtitle={planData.exam_date || "לא הוגדר"} onClick={() => setShowPersonalPlan(true)} color="#10B981" />
          <SettingItem icon={BookOpen} title="מקצועות עיקריים" subtitle={`${planData.selected_subject} - ${planData.selected_units} יח'`} onClick={() => setShowPersonalPlan(true)} color="#10B981" />
          <SettingItem icon={Sparkles} title="המלצות AI" subtitle="התאמה אישית לפי הביצועים" onClick={() => navigate(createPageUrl("Readiness"))} color="#8B5CF6" />
        </div>

        {/* כללי */}
        <SectionTitle icon={SettingsIcon} title="כללי" color="#8B5CF6" />
        <div className="space-y-2">
          <SettingToggle icon={Volume2} title="צלילים" subtitle="הפעל/כבה צלילי אפליקציה" checked={settings.sounds} onChange={(v) => handleToggleSetting('sounds', v)} color="#8B5CF6" />
          <SettingItem icon={RotateCcw} title="איפוס נתוני למידה" subtitle="מחיקת כל ההתקדמות" onClick={() => setShowResetData(true)} color="#EF4444" />
        </div>

        {/* דרג ושתף */}
        <SectionTitle icon={Star} title="דרג ושתף" color="#F59E0B" />
        <div className="space-y-2">
          <SettingItem 
            icon={Star} 
            title="דרג אותנו" 
            subtitle={user?.has_rated ? "תודה על הדירוג! ⭐" : "קבל יום ללא פרסומות עם 5 כוכבים"} 
            onClick={() => setShowRating(true)}
            color="#F59E0B"
          />
          <SettingItem 
            icon={Share2} 
            title="שתף עם חברים" 
            subtitle={`${shareCount}/20 שיתופים${shareCount >= 20 ? ' - קיבלת 5 ימים!' : ''}`}
            onClick={handleShare}
            color="#EC4899"
          />
        </div>

        {/* מידע */}
        <SectionTitle icon={Info} title="מידע" color="#EC4899" />
        <div className="space-y-2">
          <SettingItem icon={HelpCircle} title="אודות" subtitle="גרסה 1.0.0" onClick={() => alert("בגרות פלוס - גרסה 1.0.0\nפותח על ידי Base44")} color="#EC4899" />
          <SettingItem icon={FileText} title="תקנון" onClick={() => window.open("https://example.com/terms", "_blank")} color="#EC4899" />
          <SettingItem icon={Shield} title="פרטיות" onClick={() => window.open("https://example.com/privacy", "_blank")} color="#EC4899" />
          <SettingItem icon={MessageSquare} title="תמיכה" onClick={() => window.open("mailto:support@example.com")} color="#EC4899" />
          <SettingItem icon={ThumbsUp} title="פידבק" subtitle="עזור לנו להשתפר" onClick={() => setShowFeedback(true)} color="#EC4899" />
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת פרופיל</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#E9F0FF] flex items-center justify-center overflow-hidden border-4 border-[#3B82F6]">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-[#3B82F6]" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </label>
              </div>
              <p className="text-[12px] text-[#6E6E6E] mt-2">לחץ על האייקון להחלפת תמונה</p>
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

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>שינוי סיסמה</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[14px] text-[#6E6E6E] text-center">
              לשינוי סיסמה, נשלח לך קישור לאימייל שלך.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)}>ביטול</Button>
            <Button onClick={() => { alert("קישור לאיפוס סיסמה נשלח לאימייל שלך"); setShowChangePassword(false); }} className="bg-[#3B82F6]">שלח קישור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Contact Dialog */}
      <Dialog open={showUpdateContact} onOpenChange={setShowUpdateContact}>
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
              <Input value={contactData.email} disabled className="bg-gray-100" />
              <p className="text-[11px] text-[#6E6E6E] mt-1">לא ניתן לשנות את האימייל</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateContact(false)}>ביטול</Button>
            <Button onClick={handleSaveContact} className="bg-[#3B82F6]">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Personal Plan Dialog */}
      <Dialog open={showPersonalPlan} onOpenChange={setShowPersonalPlan}>
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
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
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
            <Button variant="outline" onClick={() => setShowPersonalPlan(false)}>ביטול</Button>
            <Button onClick={handleSavePlan} className="bg-[#3B82F6]">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Data Dialog */}
      <Dialog open={showResetData} onOpenChange={setShowResetData}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">איפוס נתונים</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-[14px] text-red-800 font-semibold mb-2">
                ⚠️ שים לב!
              </p>
              <p className="text-[13px] text-red-700">
                פעולה זו תמחק את כל נתוני הלמידה שלך כולל תרגולים, בגרויות והתקדמות. לא ניתן לשחזר!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetData(false)}>ביטול</Button>
            <Button onClick={handleResetData} className="bg-red-600 hover:bg-red-700">אפס הכל</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
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
            <Button variant="outline" onClick={() => setShowFeedback(false)}>ביטול</Button>
            <Button onClick={handleSendFeedback} className="bg-[#3B82F6]">שלח</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">דרג אותנו</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <AnimatePresence mode="wait">
              {ratingSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#2B2B2B] mb-2">תודה רבה!</h3>
                  <p className="text-[#6E6E6E]">קיבלת יום אחד ללא פרסומות! 🌟</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <p className="text-center text-[#6E6E6E] text-[14px]">
                    עזור לנו להשתפר! דרג אותנו עם 5 כוכבים וקבל יום אחד ללא פרסומות
                  </p>
                  
                  <StarRating
                    value={rating}
                    onChange={setRating}
                    hovered={hoveredStar}
                    onHover={setHoveredStar}
                  />
                  
                  <div className="text-center">
                    <AnimatePresence>
                      {rating > 0 && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`text-[14px] font-semibold ${rating === 5 ? 'text-green-600' : 'text-[#6E6E6E]'}`}
                        >
                          {rating === 5 ? '🎉 מעולה! לחץ לדירוג וקבל יום ללא פרסומות' : `בחרת ${rating} כוכבים`}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!ratingSubmitted && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRating(false)}>ביטול</Button>
              <Button 
                onClick={handleRatingSubmit} 
                className={`${rating === 5 ? 'bg-green-600 hover:bg-green-700' : 'bg-[#3B82F6]'}`}
                disabled={rating === 0}
              >
                {rating === 5 ? 'דרג בחנות' : 'שלח'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Management Dialog */}
      <Dialog open={showSubscription} onOpenChange={setShowSubscription}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              ניהול מנוי
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-500" />
                <div>
                  <div className="font-bold text-[#2B2B2B]">
                    {user?.subscription_type === 'yearly' ? 'מנוי שנתי' : 'מנוי חודשי'}
                  </div>
                  <div className="text-[13px] text-[#6E6E6E]">
                    {user?.subscription_type === 'yearly' ? '299.94₪ לשנה' : '49.99₪ לחודש'}
                  </div>
                </div>
              </div>
            </div>

            {user?.subscription_type === 'monthly' && (
              <Button 
                onClick={() => navigate(createPageUrl("Premium"))} 
                className="w-full bg-amber-500 hover:bg-amber-600 rounded-xl"
              >
                <Crown className="w-4 h-4 ml-2" />
                שדרג למנוי שנתי וחסוך 50%
              </Button>
            )}

            {user?.subscription_type === 'yearly' && (
              <Button 
                onClick={() => navigate(createPageUrl("Premium"))} 
                variant="outline"
                className="w-full rounded-xl"
              >
                שנה למנוי חודשי
              </Button>
            )}

            <Button 
              variant="outline" 
              className="w-full text-red-600 hover:bg-red-50 rounded-xl border-red-200"
              onClick={() => { setShowSubscription(false); setShowCancelSubscription(true); }}
            >
              ביטול מנוי
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelSubscription} onOpenChange={setShowCancelSubscription}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">ביטול מנוי</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-[14px] text-[#2B2B2B]">אנחנו מצטערים לראות אותך הולך. למה אתה מבטל?</p>
            
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger><SelectValue placeholder="בחר סיבה..." /></SelectTrigger>
              <SelectContent dir="rtl">
                {cancelReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-[13px] text-red-800">
                <strong>שים לב:</strong> לאחר הביטול תאבד גישה לכל תכונות הפרימיום כולל שאלות ללא הגבלה, בחנים מלאים וחוויה ללא פרסומות.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelSubscription(false)}>אל תבטל</Button>
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