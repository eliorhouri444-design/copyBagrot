
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Save, Loader2, Brain, Sparkles, 
  AlertCircle, Eye, RefreshCw, Crown, FileText, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

export default function AdminSmartTutorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  // טען משתמש
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error:", error);
        navigate(createPageUrl("Home"));
      }
    };
    loadUser();
  }, [navigate]);

  // שלוף הגדרות נוכחיות
  const { data: settings, isLoading } = useQuery({
    queryKey: ['tutor-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.TutorSettings.list();
      return allSettings.find(s => s.setting_key === 'global_instructions');
    }
  });

  // טען את ההוראות כשה-settings נטענים
  useEffect(() => {
    if (settings?.instructions) {
      setInstructions(settings.instructions);
    }
  }, [settings]);

  // שמירת הגדרות
  const saveMutation = useMutation({
    mutationFn: async (newInstructions) => {
      if (settings?.id) {
        // עדכון קיים
        return await base44.entities.TutorSettings.update(settings.id, {
          instructions: newInstructions,
          last_updated_by: user?.email
        });
      } else {
        // יצירה חדשה
        return await base44.entities.TutorSettings.create({
          setting_key: 'global_instructions',
          instructions: newInstructions,
          is_active: true,
          last_updated_by: user?.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tutor-settings']);
      alert("✅ ההוראות נשמרו בהצלחה!\n\nהמורה החכם יפעל לפי ההוראות האלה עכשיו.");
    },
    onError: (error) => {
      console.error("Error:", error);
      alert("שגיאה בשמירת ההוראות. נסה שוב.");
    }
  });

  const handleSave = () => {
    if (!instructions.trim()) {
      alert("נא למלא הוראות למורה החכם");
      return;
    }
    saveMutation.mutate(instructions);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Home"))}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="text-white hover:bg-white/20"
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'עריכה' : 'תצוגה מקדימה'}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white/30 shadow-xl">
              <Settings className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">הגדרות המורה החכם</h1>
            <p className="text-white/90 text-sm">קבע איך המורה החכם יענה לכל התלמידים</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* אזהרת מנהלים */}
        <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>שים לב:</strong> ההוראות שתגדיר כאן ישפיעו על כל התלמידים באפליקציה!
            המורה החכם יפעל לפי ההוראות האלה בכל שיחה.
          </AlertDescription>
        </Alert>

        {/* נתוני מצב */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border-2 border-blue-200 p-6"
          >
            <Brain className="w-8 h-8 text-blue-600 mb-2" />
            <div className="text-3xl font-bold text-blue-600">
              {settings?.instructions ? 'פעיל' : 'לא מוגדר'}
            </div>
            <div className="text-sm text-gray-600">סטטוס</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border-2 border-green-200 p-6"
          >
            <FileText className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-green-600">
              {instructions.length.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">תווים</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border-2 border-purple-200 p-6"
          >
            <Crown className="w-8 h-8 text-purple-600 mb-2" />
            <div className="text-3xl font-bold text-purple-600">
              {settings?.last_updated_by ? 
                new Date(settings.updated_date).toLocaleDateString('he-IL') : 
                '-'
              }
            </div>
            <div className="text-sm text-gray-600">עודכן לאחרונה</div>
          </motion.div>
        </div>

        {/* עורך ההוראות */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-7 h-7" />
              הוראות גלובליות למורה החכם
            </h2>
            <p className="text-white/90 text-sm mt-1">
              כתוב כאן איך המורה החכם צריך להתנהג, לענות ולהסביר
            </p>
          </div>

          <div className="p-8">
            {/* דוגמאות */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                דוגמאות להוראות:
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div>💡 <strong>סגנון:</strong> "תמיד תן הסברים פשוטים וברורים עם דוגמאות מהחיים"</div>
                <div>💡 <strong>פורמט:</strong> "השתמש בטבלאות, רשימות וכותרות ברורות"</div>
                <div>💡 <strong>עידוד:</strong> "תמיד עודד את התלמיד ותן לו תחושה שהוא יכול"</div>
                <div>💡 <strong>דוגמאות:</strong> "תן לפחות 2-3 דוגמאות לכל מושג"</div>
                <div>💡 <strong>פתרון בעיות:</strong> "פרק כל בעיה לשלבים קטנים וברורים"</div>
                <div>💡 <strong>טון:</strong> "דבר בטון ידידותי, כמו מורה פרטי סבלני ואכפתי"</div>
              </div>
            </div>

            {/* שדה ההוראות */}
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-3">
                ההוראות למורה החכם:
              </label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="דוגמה להנחיות טובות:

היה מורה פרטי מעולה - טבעי, ידידותי ומועיל.

סגנון:
• דבר בצורה טבעית וידידותית
• תמיד תן הסברים פשוטים עם דוגמאות
• פרק בעיות מורכבות לשלבים קטנים
• עודד ותמוך בתלמיד

פורמט:
• השתמש בכותרות, רשימות ובולד
• תן סיכום קצר בסוף כשזה מתאים
• הוסף טיפים ודרכי זכירה

עידוד:
• תמיד עודד את התלמיד
• חגוג הצלחות קטנות
• תן ביטחון שהוא יכול להצליח

תרגול:
• הציע תרגול קצר להמשך (2-3 שאלות)
• תן פידבק בונה
• התאם את הרמה לתלמיד

זכור: אתה כאן כדי לעזור, לא כדי למלא טפסים!
תהיה גמיש, טבעי ושימושי - בדיוק כמו ChatGPT 🚀"
                className="h-[500px] resize-none text-base font-mono"
                dir="rtl"
                disabled={previewMode}
              />
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>{instructions.length.toLocaleString()} תווים</span>
                <span>ההוראות האלה ישמשו בכל שיחה עם המורה החכם</span>
              </div>
            </div>

            {/* תצוגה מקדימה */}
            {previewMode && instructions && (
              <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  תצוגה מקדימה - כך זה ייראה למורה החכם:
                </h3>
                <div className="bg-white rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-900 border-2 border-green-100">
                  {instructions}
                </div>
              </div>
            )}

            {/* הסברים */}
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
              <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                איך זה עובד?
              </h3>
              <div className="text-sm text-purple-800 space-y-2">
                <div>✅ <strong>1.</strong> אתה כותב את ההוראות פה</div>
                <div>✅ <strong>2.</strong> ההוראות נשמרות במערכת</div>
                <div>✅ <strong>3.</strong> בכל שיחה עם המורה החכם - המערכת מוסיפה את ההוראות האלה</div>
                <div>✅ <strong>4.</strong> המורה החכם עוקב אחרי ההוראות במדויק</div>
                <div>✅ <strong>5.</strong> כל התלמידים מקבלים את אותו סגנון הוראה</div>
              </div>
            </div>

            {/* כפתורי פעולה */}
            <div className="mt-8 flex gap-4">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isLoading || !instructions.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-14 text-lg font-bold"
              >
                {saveMutation.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    שמור הוראות
                  </>
                )}
              </Button>

              <Button
                onClick={() => setInstructions(settings?.instructions || "")}
                variant="outline"
                disabled={saveMutation.isLoading}
                className="h-14"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                אפס
              </Button>
            </div>

            {/* אזהרה */}
            {instructions !== settings?.instructions && (
              <div className="mt-4">
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900 text-sm">
                    יש שינויים שלא נשמרו! לחץ על "שמור הוראות" כדי להחיל אותם.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* פרטי עדכון אחרון */}
            {settings && (
              <div className="mt-6 text-center text-sm text-gray-500">
                <div>עודכן לאחרונה: {new Date(settings.updated_date).toLocaleString('he-IL')}</div>
                {settings.last_updated_by && (
                  <div>על ידי: {settings.last_updated_by}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
