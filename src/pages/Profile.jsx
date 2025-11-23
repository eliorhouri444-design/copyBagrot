import React, { useState, useEffect } from "react";
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
  Sparkles // Added Sparkles import
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { calculateCurrentProgress, calculateRecommendedGoals } from "@/components/tracking/GoalsTracker";
import GoalsDisplay from "@/components/tracking/GoalsDisplay";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const [studyGoals, setStudyGoals] = useState(null);
  const [timeUntilExam, setTimeUntilExam] = useState(null);

  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

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

  const { data: practiceAttempts = [] } = useQuery({
    queryKey: ['practice-attempts-profile'],
    queryFn: () => base44.entities.PracticeAttempt.list("-created_date", 50),
    staleTime: 5 * 60 * 1000,
    enabled: !!user
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts-profile'],
    queryFn: () => base44.entities.ExamAttempt.list("-created_date", 50),
    staleTime: 5 * 60 * 1000,
    enabled: !!user
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
          phone: currentUser.phone || "",
          notifications_enabled: currentUser.notifications_enabled !== false
        });

        await loadStudyGoals(currentUser);

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

  const loadStudyGoals = async (currentUser) => {
    try {
      const goals = await base44.entities.StudyGoals.filter({
        subject: currentUser.selected_subject,
        created_by: currentUser.email
      });

      if (goals.length > 0) {
        setStudyGoals(goals[0]);
      }
    } catch (error) {
      console.error("Error loading study goals:", error);
    }
  };

  const currentSubject = user?.selected_subject || "מתמטיקה";
  const currentStats = React.useMemo(() => {
    const subjectPractice = practiceAttempts.filter(attemptItem => attemptItem.subject === currentSubject);
    const subjectExams = examAttempts.filter(attemptItem => attemptItem.subject === currentSubject);

    return {
      practiceCount: subjectPractice.length,
      examCount: subjectExams.length,
      avgScore: subjectExams.length > 0
        ? (subjectExams.reduce((sum, examItem) => sum + (examItem.score_percent || 0), 0) / subjectExams.length).toFixed(1)
        : 0
    };
  }, [practiceAttempts, examAttempts, currentSubject]);

  const handleSaveProfile = async () => {
    try {
      await base44.auth.updateMe(editData);
      setUser({ ...user, ...editData });
      setIsEditing(false);
      alert("הפרטים נשמרו בהצלחה");

      if (editData.selected_subject !== user.selected_subject) {
        await loadStudyGoals({ ...user, ...editData });
      }
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

  const weeklyProgress = studyGoals?.weekly_goal?.hours > 0
    ? Math.min(100, ((studyGoals.current_progress?.this_week_sessions || 0) / (studyGoals.weekly_goal?.practice_sessions || 4)) * 100)
    : 0;

  const subject = user?.selected_subject || "מתמטיקה";
  const units = user?.selected_units || 3;
  const topics = []; // Placeholder for topics, as they are not fetched in this component context

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-[2rem] p-4 shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="text-right flex-1">
              <h1 className="text-base font-bold text-white">הפרופיל שלי</h1>
              <p className="text-xs text-white/90">{user?.full_name || 'תלמיד'}</p>
            </div>
            {!user?.is_premium && (
              <button
                onClick={() => navigate(createPageUrl("Premium"))}
                className="flex items-center gap-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-2 py-1 rounded-full transition-colors"
              >
                <span className="text-xs font-bold text-white">שדרג לפרימיום</span>
                <Crown className="w-3 h-3 text-white" />
              </button>
            )}
          </div>

          {timeUntilExam !== null && timeUntilExam >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 bg-white/20 backdrop-blur-sm rounded-xl p-2.5 border-2 border-white/30"
            >
              <div className="flex items-center justify-center gap-2 text-white">
                <Clock className="w-4 h-4" />
                <div className="text-center">
                  <div className="text-xl font-black">{timeUntilExam} ימים</div>
                  <div className="text-[10px] opacity-90">עד הבגרות ב{currentSubject}</div>
                </div>
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 space-y-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1 text-right">
                <h2 className="text-xl font-bold">המקצוע שלי</h2>
                <p className="text-sm opacity-90">{user?.selected_subject || "מתמטיקה"} - {user?.selected_units || 3} יחידות</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="text-white hover:bg-white/20"
              >
                <Edit className="w-4 h-4 mr-2" />
                ערוך
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{currentStats.practiceCount}</div>
                <div className="text-xs text-gray-600">תרגולים</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <FileCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{currentStats.examCount}</div>
                <div className="text-xs text-gray-600">מבחנים</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{currentStats.avgScore}%</div>
                <div className="text-xs text-gray-600">ממוצע</div>
              </div>
            </div>
          </div>
        </motion.div>

        {studyGoals && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex-1 text-right">
                  <h2 className="text-xl font-bold">היעדים שלי</h2>
                  <p className="text-sm opacity-90">התקדמות לקראת הבגרות</p>
                </div>
                <Target className="w-8 h-8" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border-2 border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-blue-900">יעד יומי</span>
                  <span className="text-xs text-blue-700">
                    {studyGoals.daily_goal?.practice_minutes || 30} דקות
                  </span>
                </div>
                <div className="h-2.5 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((studyGoals.current_progress?.today_minutes || 0) / (studyGoals.daily_goal?.practice_minutes || 30)) * 100)}%`
                    }}
                  />
                </div>
                <div className="text-xs text-blue-700 mt-1 text-right font-semibold">
                  {studyGoals.current_progress?.today_minutes || 0} / {studyGoals.daily_goal?.practice_minutes || 30} דקות היום
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-green-900">יעד שבועי</span>
                  <span className="text-xs text-green-700">
                    {studyGoals.weekly_goal?.practice_sessions || 4} תרגולים
                  </span>
                </div>
                <div className="h-2.5 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
                <div className="text-xs text-green-700 mt-1 text-right font-semibold">
                  {studyGoals.current_progress?.this_week_sessions || 0} / {studyGoals.weekly_goal?.practice_sessions || 4} תרגולים השבוע
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border-2 border-orange-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-orange-900">יעד חודשי</span>
                  <span className="text-xs text-orange-700">
                    {studyGoals.monthly_goal?.practice_sessions || 16} תרגולים
                  </span>
                </div>
                <div className="h-2.5 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((studyGoals.current_progress?.this_month_sessions || 0) / (studyGoals.monthly_goal?.practice_sessions || 16)) * 100)}%`
                    }}
                  />
                </div>
                <div className="text-xs text-orange-700 mt-1 text-right font-semibold">
                  {studyGoals.current_progress?.this_month_sessions || 0} / {studyGoals.monthly_goal?.practice_sessions || 16} תרגולים החודש
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border-2 border-purple-200">
                <div className="text-sm font-bold text-purple-900 mb-2">ההתקדמות הכוללת לבגרות:</div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-purple-700">תרגולים</span>
                      <span className="text-xs font-bold text-purple-900">
                        {studyGoals.current_progress?.total_practice || 0} / {studyGoals.recommended_totals?.total_practice_before_exam || 80}
                      </span>
                    </div>
                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, ((studyGoals.current_progress?.total_practice || 0) / (studyGoals.recommended_totals?.total_practice_before_exam || 80)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-purple-700">מבחנים</span>
                      <span className="text-xs font-bold text-purple-900">
                        {studyGoals.current_progress?.total_exams || 0} / {studyGoals.recommended_totals?.total_exams_before_exam || 15}
                      </span>
                    </div>
                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, ((studyGoals.current_progress?.total_exams || 0) / (studyGoals.recommended_totals?.total_exams_before_exam || 15)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {user?.is_premium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-4 shadow-2xl"
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
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl shadow-2xl p-4"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">הגדרות חשבון</h2>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start rounded-2xl"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="w-5 h-5 ml-3" />
              ערוך פרטים אישיים
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start rounded-2xl"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 ml-3" />
              התנתק
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:bg-red-50 border-red-200 rounded-2xl"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="w-5 h-5 ml-3" />
              מחק חשבון
            </Button>
          </div>
        </motion.div>
      </div>

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
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
              >
                שדרג למנוי שנתי וחסוך 50 אחוזים
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full text-red-600 hover:bg-red-50"
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