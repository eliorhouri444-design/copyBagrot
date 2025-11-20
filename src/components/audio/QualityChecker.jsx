import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

// פונקציה לבדיקת איכות אודיו
export const analyzeAudioQuality = async (audioUrl, text, durationMs) => {
  const issues = [];
  let qualityScore = 100;

  // בדיקה 1: משך קצר מדי
  const expectedDuration = text.split(' ').length * 600; // 600ms per word average
  if (durationMs < expectedDuration * 0.5) {
    issues.push("🚨 המשך קצר מדי - ייתכן שהאודיו לא נוצר כראוי");
    qualityScore -= 30;
  }

  // בדיקה 2: משך ארוך מדי (שקטים)
  if (durationMs > expectedDuration * 2) {
    issues.push("⏸️ משך ארוך מדי - ייתכן ששיש שקטים ארוכים");
    qualityScore -= 20;
  }

  // בדיקה 3: טקסט ארוך מדי לרמה נמוכה
  const wordCount = text.split(' ').length;
  if (wordCount > 50 && text.includes('A2')) {
    issues.push("📊 טקסט ארוך מדי לרמת A2 - שקול לפצל");
    qualityScore -= 10;
  }

  // בדיקה 4: מהירות קיצונית
  const actualSpeed = (wordCount * 60000) / durationMs; // words per minute
  if (actualSpeed > 180) {
    issues.push("⚡ מהירות דיבור גבוהה מדי");
    qualityScore -= 15;
  } else if (actualSpeed < 100) {
    issues.push("🐌 מהירות דיבור נמוכה מדי");
    qualityScore -= 15;
  }

  return {
    quality_score: Math.max(0, qualityScore),
    issues,
    long_silences: durationMs > expectedDuration * 1.8,
    too_short: durationMs < expectedDuration * 0.5,
    distortion_detected: false // Would need actual audio analysis
  };
};

// פונקציה ליצירת קובץ VTT
export const generateVTTCaption = (text, durationMs) => {
  const words = text.split(' ');
  const msPerWord = durationMs / words.length;
  
  let vtt = "WEBVTT\n\n";
  let currentTime = 0;
  
  // יצירת קפשנים לכל משפט (כ-10 מילים)
  for (let i = 0; i < words.length; i += 10) {
    const chunk = words.slice(i, i + 10).join(' ');
    const startMs = currentTime;
    const endMs = currentTime + (msPerWord * Math.min(10, words.length - i));
    
    vtt += `${formatVTTTime(startMs)} --> ${formatVTTTime(endMs)}\n`;
    vtt += `${chunk}\n\n`;
    
    currentTime = endMs;
  }
  
  return vtt;
};

const formatVTTTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// קומפוננטה להצגת סטטוס איכות
export function QualityIndicator({ qualityChecks }) {
  if (!qualityChecks) return null;

  const score = qualityChecks.quality_score || 0;
  const hasIssues = qualityChecks.issues?.length > 0;

  return (
    <div className="inline-flex items-center gap-2">
      {score >= 85 ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : score >= 70 ? (
        <AlertTriangle className="w-4 h-4 text-yellow-600" />
      ) : (
        <XCircle className="w-4 h-4 text-red-600" />
      )}
      <span className={`text-xs font-bold ${
        score >= 85 ? 'text-green-600' :
        score >= 70 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {score}
      </span>
      {hasIssues && (
        <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-full font-semibold">
          {qualityChecks.issues.length}
        </span>
      )}
    </div>
  );
}