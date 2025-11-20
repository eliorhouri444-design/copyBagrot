
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Play, Check, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateVTTCaption } from "./QualityChecker";

const VOICES = {
  "Rachel": "21m00Tcm4TlvDq8ikWAM",
  "Bella": "EXAVITQu4vr4xnSDxMaL",
  "Emily": "LcfcDJNUP1GQjkzn1xUU",
  "Drew": "29vD33N1CtxCmqQRPOHJ",
  "Paul": "5Q0t7uMcjvnagumLfvZi",
  "Clyde": "2EiwWnXFnvU5JabPnv8n",
};

/**
 * קומפוננטה חכמה שזוהה טקסט בשאלות ומציעה ליצור אודיו אוטומטית
 * @param {Array} questions - רשימת השאלות
 * @param {Function} onAudioCreated - callback כשאודיו נוצר
 */
export default function SmartAudioDetector({ questions = [], onAudioCreated }) {
  const queryClient = useQueryClient();
  const [detectedTexts, setDetectedTexts] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedText, setSelectedText] = useState(null);
  const [isElevenLabsConnected, setIsElevenLabsConnected] = useState(false);
  
  const [audioSettings, setAudioSettings] = useState({
    text: "",
    voice: "Rachel",
    speed: 0.85,
    level: "B1",
    repeats: 2
  });

  // בדיקה אם ElevenLabs מחובר
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await base44.integrations.ElevenLabs.GenerateSpeech({
          text: "test",
          voice_id: "test"
        });
        setIsElevenLabsConnected(true);
      } catch {
        setIsElevenLabsConnected(false);
      }
    };
    checkConnection();
  }, []);

  // זיהוי אוטומטי של טקסטים אנגליים בשאלות
  useEffect(() => {
    if (!questions || questions.length === 0) return;

    const detected = [];
    questions.forEach((q, idx) => {
      // בדיקה אם זו שאלת listening
      if (q.question_type === 'listening' && !q.audio_url) {
        // אם יש transcript - השתמש בו
        if (q.audio_transcript) {
          detected.push({
            questionId: q.id,
            questionIndex: idx,
            text: q.audio_transcript,
            source: 'transcript',
            confidence: 'high'
          });
        }
        // אחרת, נסה לזהות טקסט אנגלי בשאלה
        else if (q.question_text) {
          const englishText = extractEnglishText(q.question_text);
          if (englishText && englishText.length > 10) {
            detected.push({
              questionId: q.id,
              questionIndex: idx,
              text: englishText,
              source: 'question',
              confidence: 'medium'
            });
          }
        }
      }
    });

    setDetectedTexts(detected);
  }, [questions]);

  const extractEnglishText = (text) => {
    // מחפש טקסט באנגלית (לא עברית)
    const englishPattern = /[A-Za-z\s\.,!?'"()-]+/g;
    const matches = text.match(englishPattern);
    if (!matches) return "";
    
    const joined = matches.join(' ').trim();
    // מוודא שיש לפחות 50% אותיות אנגליות
    const englishChars = (joined.match(/[A-Za-z]/g) || []).length;
    if (englishChars / joined.length > 0.5) {
      return joined;
    }
    return "";
  };

  const createAudioMutation = useMutation({
    mutationFn: async ({ text, questionId }) => {
      // שלב 1: יצירת AudioText
      const estimatedDuration = Math.floor(text.split(' ').length * 600 / (audioSettings.speed || 1));
      
      const audioText = await base44.entities.AudioText.create({
        text: text,
        level: audioSettings.level,
        voice: audioSettings.voice,
        speed: audioSettings.speed,
        repeats: audioSettings.repeats,
        status: "draft",
        subject: "אנגלית",
        units: 3,
        topic: "listening",
        duration_ms: estimatedDuration,
        audio_url: "",
        accent: "US",
        engine: "browser_tts"
      });

      // שלב 2: עיבוד האודיו
      await base44.entities.AudioText.update(audioText.id, {
        status: "processing"
      });

      let audioUrl = null;

      if (isElevenLabsConnected) {
        try {
          const voiceId = VOICES[audioSettings.voice];
          const response = await base44.integrations.ElevenLabs.GenerateSpeech({
            text: text,
            voice_id: voiceId,
            stability: 0.5,
            similarity_boost: 0.75
          });
          if (response?.audio_url) audioUrl = response.audio_url;
        } catch (e) {
          console.log('ElevenLabs failed, using Browser TTS');
        }
      }

      // יצירת VTT
      const vttContent = generateVTTCaption(text, estimatedDuration);
      const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
      const vttFile = new File([vttBlob], `caption_${audioText.id}.vtt`, { type: 'text/vtt' });
      const { file_url: vttUrl } = await base44.integrations.Core.UploadFile({ file: vttFile });

      // עדכון AudioText
      await base44.entities.AudioText.update(audioText.id, {
        status: "approved",
        audio_url: audioUrl || "",
        caption_url: vttUrl,
        duration_ms: estimatedDuration
      });

      // קישור לשאלה
      await base44.entities.PracticeQuestion.update(questionId, {
        audio_url: audioUrl || "",
        caption_url: vttUrl,
        audio_transcript: text,
        audio_play_limit: audioSettings.repeats
      });

      return audioText;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['practice-questions']);
      setShowCreateDialog(false);
      setSelectedText(null);
      if (onAudioCreated) onAudioCreated();
      alert('הקלטה נוצרה וקושרה לשאלה! ✅');
    },
    onError: (error) => {
      alert('שגיאה ביצירת האודיו: ' + error.message);
    }
  });

  const handleCreateAudio = (detectedItem) => {
    setSelectedText(detectedItem);
    setAudioSettings({
      ...audioSettings,
      text: detectedItem.text
    });
    setShowCreateDialog(true);
  };

  const handlePreviewAudio = () => {
    if (!audioSettings.text) return;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioSettings.text);
      utterance.rate = audioSettings.speed;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (detectedTexts.length === 0) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">זיהוי אוטומטי של טקסטים להאזנה</h3>
            <p className="text-sm text-gray-600">נמצאו {detectedTexts.length} שאלות ללא אודיו</p>
          </div>
        </div>

        <div className="space-y-3">
          {detectedTexts.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-purple-400 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">
                    שאלה #{item.questionIndex + 1} • {item.source === 'transcript' ? 'מתוך תמלול' : 'זוהה בשאלה'}
                  </div>
                  <div className="text-sm text-gray-900 mb-2" dir="ltr">
                    {item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text}
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.confidence === 'high' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.confidence === 'high' ? 'דיוק גבוה ✓' : 'דיוק בינוני'}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {item.text.split(' ').length} מילים
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateAudio(item)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  צור אודיו
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              יצירת אודיו אוטומטית
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-green-700 mb-2">✓ טקסט שזוהה:</div>
              <Textarea
                value={audioSettings.text}
                onChange={(e) => setAudioSettings({ ...audioSettings, text: e.target.value })}
                className="h-32 bg-white"
                dir="ltr"
              />
              <div className="text-xs text-gray-600 mt-2">
                {audioSettings.text.split(' ').length} מילים • ~{Math.floor(audioSettings.text.split(' ').length * 0.6 / audioSettings.speed)}s
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  קול
                </label>
                <Select value={audioSettings.voice} onValueChange={(v) => setAudioSettings({ ...audioSettings, voice: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rachel">🇺🇸 Rachel - נשי צעיר ⭐</SelectItem>
                    <SelectItem value="Bella">🇺🇸 Bella - נשי מקצועי</SelectItem>
                    <SelectItem value="Emily">🇺🇸 Emily - נשי ברור</SelectItem>
                    <SelectItem value="Drew">🇺🇸 Drew - גברי צעיר</SelectItem>
                    <SelectItem value="Paul">🇺🇸 Paul - גברי בוגר</SelectItem>
                    <SelectItem value="Clyde">🇬🇧 Clyde - גברי UK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  רמה
                </label>
                <Select value={audioSettings.level} onValueChange={(v) => setAudioSettings({ ...audioSettings, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A2">A2 - בסיסי</SelectItem>
                    <SelectItem value="B1">B1 - בינוני</SelectItem>
                    <SelectItem value="B2">B2 - מתקדם</SelectItem>
                    <SelectItem value="C1">C1 - גבוה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  מהירות ({audioSettings.speed}x)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.2"
                  step="0.05"
                  value={audioSettings.speed}
                  onChange={(e) => setAudioSettings({ ...audioSettings, speed: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>איטי</span>
                  <span>רגיל</span>
                  <span>מהיר</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  חזרות
                </label>
                <Select 
                  value={audioSettings.repeats.toString()} 
                  onValueChange={(v) => setAudioSettings({ ...audioSettings, repeats: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">פעם אחת</SelectItem>
                    <SelectItem value="2">פעמיים</SelectItem>
                    <SelectItem value="3">3 פעמים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handlePreviewAudio}
              variant="outline"
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              שמע תצוגה מקדימה
            </Button>

            <div className={`border-2 rounded-xl p-4 ${
              isElevenLabsConnected 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="text-sm">
                {isElevenLabsConnected ? (
                  <>
                    <strong>✓ ElevenLabs מחובר:</strong> האודיו יהיה באיכות גבוהה עם קול אנושי טבעי
                  </>
                ) : (
                  <>
                    <strong>⚠️ Browser TTS:</strong> האודיו ישתמש בקולות הדפדפן (איכות בסיסית)
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={createAudioMutation.isPending}
            >
              ביטול
            </Button>
            <Button
              onClick={() => {
                if (selectedText) {
                  createAudioMutation.mutate({
                    text: audioSettings.text,
                    questionId: selectedText.questionId
                  });
                }
              }}
              disabled={!audioSettings.text || createAudioMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createAudioMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  יוצר אודיו...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  אשר ויצור אודיו
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
