import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2,
  AlertTriangle,
  Sparkles,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function PreviewRoom({ 
  audioItem, 
  onApprove, 
  onReject, 
  onClose 
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reviewNotes, setReviewNotes] = useState("");
  const [qualityIssues, setQualityIssues] = useState([]);

  useEffect(() => {
    if (audioItem?.quality_checks?.issues) {
      setQualityIssues(audioItem.quality_checks.issues);
    }
  }, [audioItem]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
    setIsPlaying(true);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const qualityScore = audioItem?.quality_checks?.quality_score || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Preview Room</h2>
              <p className="text-sm opacity-90">בדיקת איכות האודיו</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Audio Info */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-purple-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-700 mb-1">טקסט:</div>
                <div className="text-gray-900 leading-relaxed">{audioItem.text}</div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
              <div className="text-xs text-blue-600 font-semibold mb-1">רמה</div>
              <div className="text-lg font-bold text-blue-700">{audioItem.level}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
              <div className="text-xs text-green-600 font-semibold mb-1">קול</div>
              <div className="text-lg font-bold text-green-700">{audioItem.voice}</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
              <div className="text-xs text-purple-600 font-semibold mb-1">מהירות</div>
              <div className="text-lg font-bold text-purple-700">{audioItem.speed}x</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
              <div className="text-xs text-orange-600 font-semibold mb-1">משך</div>
              <div className="text-lg font-bold text-orange-700">
                {audioItem.duration_ms ? `${(audioItem.duration_ms / 1000).toFixed(1)}s` : '-'}
              </div>
            </div>
          </div>

          {/* Quality Score */}
          {audioItem.quality_checks && (
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">ציון איכות</h3>
                <div className={`text-3xl font-bold ${getQualityColor(qualityScore)}`}>
                  {qualityScore}
                </div>
              </div>
              
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    qualityScore >= 85 ? 'bg-green-500' :
                    qualityScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${qualityScore}%` }}
                />
              </div>

              {qualityIssues.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    בעיות שזוהו:
                  </div>
                  {qualityIssues.map((issue, idx) => (
                    <div key={idx} className="text-sm text-gray-600 bg-yellow-50 rounded px-3 py-2 border border-yellow-200">
                      • {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audio Player */}
          {audioItem.audio_url && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border-2 border-purple-200">
              <audio ref={audioRef} src={audioItem.audio_url} preload="metadata" />
              
              <div className="flex items-center gap-4">
                {/* Play Button */}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 mr-1" />
                    )}
                  </Button>
                </motion.div>

                {/* Progress */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Restart */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={restart}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>

              {/* Caption Preview */}
              {audioItem.caption_url && (
                <div className="mt-4 bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      VTT/SRT ✓
                    </Badge>
                    <span className="text-xs text-gray-600">כתוביות זמינות</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                    {audioItem.caption_url}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              הערות סוקר (אופציונלי)
            </label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="הוסף הערות על איכות ההקלטה..."
              className="h-24"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => onReject(audioItem, reviewNotes)}
              variant="outline"
              className="flex-1 h-14 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold"
            >
              <XCircle className="w-5 h-5 mr-2" />
              דחה ויצור מחדש
            </Button>
            
            <Button
              onClick={() => onApprove(audioItem, reviewNotes)}
              className="flex-1 h-14 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              אשר והשתמש
            </Button>
          </div>

          {audioItem.regeneration_count > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-center">
              <div className="text-sm text-blue-700">
                <Sparkles className="w-4 h-4 inline mr-1" />
                <strong>ניסיון #{audioItem.regeneration_count + 1}</strong>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}