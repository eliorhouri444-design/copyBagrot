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
  LogOut,
  Smartphone,
  MessageCircle,
  Clock,
  TrendingUp,
  Award,
  Calendar,
  BookOpen,
  Sparkles,
  Globe,
  Moon,
  Volume2,
  RotateCcw,
  HelpCircle,
  FileText,
  Shield,
  MessageSquare,
  ThumbsUp,
  ChevronRight,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  
  // Form states
  const [editData, setEditData] = useState({});
  const [contactData, setContactData] = useState({ phone: "", email: "" });
  const [planData, setPlanData] = useState({ target_score: 85, exam_date: "", selected_subject: "אנגלית", selected_units: 3 });
  const [feedbackText, setFeedbackText] = useState("");
  
  // Settings states
  const [settings, setSettings] = useState({
    app_notifications: true,
    whatsapp_notifications: false,
    daily_reminders: true,
    progress_updates: true,
    language: "hebrew",
    dark_mode: false,
    sounds: true
  });

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
          language: currentUser.language || "hebrew",
          dark_mode: currentUser.dark_mode || false,
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

  const handleLogout = async () => {
    if (confirm("האם אתה בטוח שברצונך להתנתק?")) {
      await base44.auth.logout();
    }
  };

  const handleResetData = async () => {
    if (confirm("האם אתה בטוח? כל נתוני הלמידה שלך יימחקו לצמיתות!")) {
      try {
        // Reset user learning data
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
          <SettingItem icon={LogOut} title="התנתקות" onClick={handleLogout} />
        </div>

        {/* התראות */}
        <SectionTitle icon={Bell} title="התראות" color="#F59E0B" />
        <div className="space-y-2">
          <SettingToggle icon={Smartphone} title="התראות אפליקציה" checked={settings.app_notifications} onChange={(v) => handleToggleSetting('app_notifications', v)} />
          <SettingToggle icon={MessageCircle} title="התראות וואטסאפ" checked={settings.whatsapp_notifications} onChange={(v) => handleToggleSetting('whatsapp_notifications', v)} />
          <SettingToggle icon={Clock} title="תזכורות יומיות" subtitle="תזכורת ללמידה יומית" checked={settings.daily_reminders} onChange={(v) => handleToggleSetting('daily_reminders', v)} />
          <SettingToggle icon={TrendingUp} title="עדכוני התקדמות" subtitle="סיכום שבועי" checked={settings.progress_updates} onChange={(v) => handleToggleSetting('progress_updates', v)} />
        </div>

        {/* תוכנית אישית */}
        <SectionTitle icon={Target} title="תוכנית אישית" color="#10B981" />
        <div className="space-y-2">
          <SettingItem icon={Award} title="יעד ציון" subtitle={`${planData.target_score} נקודות`} onClick={() => setShowPersonalPlan(true)} />
          <SettingItem icon={Calendar} title="תאריך בגרות" subtitle={planData.exam_date || "לא הוגדר"} onClick={() => setShowPersonalPlan(true)} />
          <SettingItem icon={BookOpen} title="מקצועות עיקריים" subtitle={`${planData.selected_subject} - ${planData.selected_units} יח'`} onClick={() => setShowPersonalPlan(true)} />
          <SettingItem icon={Sparkles} title="המלצות AI" subtitle="התאמה אישית לפי הביצועים" onClick={() => navigate(createPageUrl("Readiness"))} />
        </div>

        {/* כללי */}
        <SectionTitle icon={SettingsIcon} title="כללי" color="#8B5CF6" />
        <div className="space-y-2">
          <SettingItem 
            icon={Globe} 
            title="שפה" 
            subtitle="עברית"
            rightElement={<span className="text-[12px] text-[#6E6E6E]">עברית</span>}
            onClick={() => {}}
          />
          <SettingToggle icon={Moon} title="מצב כהה" checked={settings.dark_mode} onChange={(v) => handleToggleSetting('dark_mode', v)} />
          <SettingToggle icon={Volume2} title="צלילים" checked={settings.sounds} onChange={(v) => handleToggleSetting('sounds', v)} />
          <SettingItem icon={RotateCcw} title="איפוס נתוני למידה" subtitle="מחיקת כל ההתקדמות" onClick={() => setShowResetData(true)} />
        </div>

        {/* מידע */}
        <SectionTitle icon={Info} title="מידע" color="#EC4899" />
        <div className="space-y-2">
          <SettingItem icon={HelpCircle} title="אודות" subtitle="גרסה 1.0.0" onClick={() => alert("בגרות פלוס - גרסה 1.0.0\nפותח על ידי Base44")} />
          <SettingItem icon={FileText} title="תקנון" onClick={() => window.open("https://example.com/terms", "_blank")} />
          <SettingItem icon={Shield} title="פרטיות" onClick={() => window.open("https://example.com/privacy", "_blank")} />
          <SettingItem icon={MessageSquare} title="תמיכה" onClick={() => window.open("mailto:support@example.com")} />
          <SettingItem icon={ThumbsUp} title="פידבק" subtitle="עזור לנו להשתפר" onClick={() => setShowFeedback(true)} />
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת פרופיל</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
    </div>
  );
}