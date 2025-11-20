import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Volume2, Plus, Save, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import ListeningPlayer from "@/components/practice/ListeningPlayer";

export default function AdminListeningManagerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("אנגלית");
  const [selectedUnits, setSelectedUnits] = useState(3);
  
  const [formData, setFormData] = useState({
    title: "",
    audio_text: "",
    topic_id: "",
    voice_type: "female",
    speed: 1.0
  });

  const [previewText, setPreviewText] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }

        setSelectedSubject(currentUser?.selected_subject || "אנגלית");
        setSelectedUnits(currentUser?.selected_units || 3);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: audioTexts = [] } = useQuery({
    queryKey: ['audio-texts', selectedSubject, selectedUnits],
    queryFn: async () => {
      const all = await base44.entities.AudioText.list();
      return all.filter(a => 
        a.subject_id === selectedSubject && 
        a.unit_level === selectedUnits &&
        a.is_active === true
      );
    }
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics-listening', selectedSubject, selectedUnits],
    queryFn: async () => {
      const allQuestions = await base44.entities.QuestionBank.list();
      const listeningQuestions = allQuestions.filter(q => 
        q.subject_id === selectedSubject &&
        q.unit_level === selectedUnits &&
        (q.topic_id?.includes('listening') || q.topic_id?.includes('האזנה'))
      );
      
      const topicIds = [...new Set(listeningQuestions.map(q => q.topic_id))];
      return topicIds.map(id => ({ topic_id: id, name: id }));
    }
  });

  const handleSave = async () => {
    if (!formData.audio_text || !formData.topic_id) {
      alert("נא למלא טקסט ונושא");
      return;
    }

    try {
      const audioTextData = {
        text_id: `audio_${Date.now()}`,
        subject_id: selectedSubject,
        unit_level: selectedUnits,
        topic_id: formData.topic_id,
        audio_text: formData.audio_text,
        title: formData.title,
        voice_type: formData.voice_type,
        speed: parseFloat(formData.speed),
        language: "en-US",
        is_active: true
      };

      await base44.entities.AudioText.create(audioTextData);
      
      queryClient.invalidateQueries(['audio-texts']);
      
      alert("קטע ההאזנה נשמר בהצלחה! ✅");
      
      setFormData({
        title: "",
        audio_text: "",
        topic_id: "",
        voice_type: "female",
        speed: 1.0
      });
    } catch (error) {
      console.error("Error saving:", error);
      alert("שגיאה בשמירה: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק קטע זה?")) return;

    try {
      await base44.entities.AudioText.delete(id);
      queryClient.invalidateQueries(['audio-texts']);
      alert("נמחק בהצלחה");
    } catch (error) {
      console.error("Error deleting:", error);
      alert("שגיאה במחיקה");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <div className="bg-indigo-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        <h1 className="text-3xl font-bold text-white mb-2">ניהול קטעי האזנה</h1>
        <p className="text-white/80">הוסף טקסט והמערכת תיצור אודיו אוטומטית</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Subject selector */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">מקצוע</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="אנגלית">אנגלית</SelectItem>
                  <SelectItem value="מתמטיקה">מתמטיקה</SelectItem>
                  <SelectItem value="פיזיקה">פיזיקה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">יחידות</label>
              <Select value={selectedUnits.toString()} onValueChange={(v) => setSelectedUnits(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 יחידות</SelectItem>
                  <SelectItem value="4">4 יחידות</SelectItem>
                  <SelectItem value="5">5 יחידות</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Add new audio text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-indigo-600" />
            הוסף קטע האזנה חדש
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">כותרת הקטע</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="לדוגמה: Shopping at the supermarket"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">נושא (Topic ID)</label>
              <Select 
                value={formData.topic_id} 
                onValueChange={(v) => setFormData({...formData, topic_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר נושא" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(t => (
                    <SelectItem key={t.topic_id} value={t.topic_id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                טקסט לקטע השמיעה (באנגלית)
              </label>
              <Textarea
                value={formData.audio_text}
                onChange={(e) => setFormData({...formData, audio_text: e.target.value})}
                className="h-40"
                placeholder="Sarah went to the supermarket yesterday. She bought apples, bananas, and milk..."
              />
              <p className="text-xs text-gray-500 mt-1">
                מילים: {formData.audio_text.split(' ').filter(w => w).length} | 
                זמן משוער: ~{Math.ceil(formData.audio_text.split(' ').length / 2.5)} שניות
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">סוג קול</label>
                <Select 
                  value={formData.voice_type} 
                  onValueChange={(v) => setFormData({...formData, voice_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">נשי</SelectItem>
                    <SelectItem value="male">גברי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">מהירות</label>
                <Select 
                  value={formData.speed.toString()} 
                  onValueChange={(v) => setFormData({...formData, speed: parseFloat(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.75">איטי (0.75x)</SelectItem>
                    <SelectItem value="1.0">רגיל (1.0x)</SelectItem>
                    <SelectItem value="1.25">מהיר (1.25x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.audio_text && (
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <h4 className="font-bold text-blue-900 mb-2">🎧 תצוגה מקדימה:</h4>
                <ListeningPlayer audioText={formData.audio_text} />
              </div>
            )}

            <Button
              onClick={handleSave}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-bold"
            >
              <Save className="w-5 h-5 ml-2" />
              שמור קטע האזנה
            </Button>
          </div>
        </motion.div>

        {/* Existing audio texts */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">קטעי האזנה קיימים</h2>
          
          {audioTexts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Volume2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>עדיין לא נוספו קטעי האזנה</p>
            </div>
          ) : (
            <div className="space-y-4">
              {audioTexts.map((audio) => (
                <div key={audio.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{audio.title || audio.text_id}</h3>
                      <p className="text-xs text-gray-500">
                        {audio.topic_id} • {audio.voice_type === 'male' ? 'קול גברי' : 'קול נשי'} • מהירות {audio.speed}x
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(audio.id)}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
                    {audio.audio_text}
                  </div>

                  <ListeningPlayer audioText={audio.audio_text} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-blue-900 mb-3">💡 איך זה עובד?</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li><strong>1.</strong> הוסף טקסט באנגלית בשדה "טקסט לקטע השמיעה"</li>
            <li><strong>2.</strong> בחר קול (גברי/נשי) ומהירות</li>
            <li><strong>3.</strong> שמור - המערכת תיצור אודיו אוטומטית</li>
            <li><strong>4.</strong> הטקסט יופיע בתרגול עם נגן שמע</li>
            <li><strong>5.</strong> התלמידים יוכלו להאזין ולענות על שאלות</li>
          </ol>
        </div>
      </div>
    </div>
  );
}