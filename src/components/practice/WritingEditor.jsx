import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Send, Loader2, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function WritingEditor({ 
  prompt, 
  initialText = "", 
  minWords = 60, 
  maxWords = 300,
  onSaveDraft,
  onSubmit,
  isSaving = false,
  isSubmitting = false
}) {
  const [text, setText] = useState(initialText);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const isWithinRange = wordCount >= minWords && wordCount <= maxWords;
  const isMinimumMet = wordCount >= minWords;

  // Auto-save every 10 seconds
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    if (text.trim()) {
      const timer = setTimeout(() => {
        handleSaveDraft();
      }, 10000); // 10 seconds

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [text]);

  const handleSaveDraft = async () => {
    if (text.trim() && onSaveDraft) {
      await onSaveDraft(text, wordCount);
      setLastSaved(new Date());
    }
  };

  const handleSubmit = async () => {
    if (isMinimumMet && onSubmit) {
      await onSubmit(text, wordCount);
    }
  };

  const getWordCountColor = () => {
    if (wordCount < minWords) return "text-red-600";
    if (wordCount > maxWords) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 space-y-3 sm:space-y-4 max-w-md mx-auto"
    >
      {/* Prompt */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-blue-200">
        <div className="flex items-start gap-2 sm:gap-3">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-1" />
          <div>
            <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-1">נושא הכתיבה:</h3>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{prompt}</p>
          </div>
        </div>
      </div>

      {/* Writing Area */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing your answer here..."
          className="min-h-[250px] sm:min-h-[300px] text-sm sm:text-base leading-relaxed resize-none"
          dir="ltr"
        />
        
        {/* Word Counter */}
        <div className="flex items-center justify-between px-1 sm:px-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className={`text-xl sm:text-2xl font-bold ${getWordCountColor()}`}>
              {wordCount}
            </span>
            <span className="text-xs sm:text-sm text-gray-600">
              / {maxWords} מילים
            </span>
          </div>
          
          <div className="text-[10px] sm:text-xs text-gray-500">
            {wordCount < minWords && (
              <span className="text-red-600 font-semibold">
                דרושות עוד {minWords - wordCount}
              </span>
            )}
            {wordCount >= minWords && wordCount <= maxWords && (
              <span className="text-green-600 font-semibold">
                ✓ מתאים
              </span>
            )}
            {wordCount > maxWords && (
              <span className="text-orange-600 font-semibold">
                +{wordCount - maxWords}
              </span>
            )}
          </div>
        </div>

        {/* Last Saved */}
        {lastSaved && (
          <div className="text-xs text-gray-500 text-center">
            נשמר אוטומטית ב-{lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <Button
          onClick={handleSaveDraft}
          disabled={!text.trim() || isSaving}
          variant="outline"
          className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-bold border-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin ml-2" />
          ) : (
            <Save className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          )}
          שמור טיוטה
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isMinimumMet || isSubmitting}
          className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin ml-2" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          )}
          הגש תשובה
        </Button>
      </div>

      {/* Writing Tips */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
        <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1.5 sm:mb-2">💡 טיפים לכתיבה טובה:</h4>
        <ul className="text-[10px] sm:text-xs text-gray-700 space-y-0.5 sm:space-y-1 list-disc list-inside">
          <li>השתמש במבנה ברור: פתיחה, גוף, סיום</li>
          <li>השתמש במילות קישור (however, therefore)</li>
          <li>בדוק איות ודקדוק לפני הגשה</li>
          <li>כתוב בפסקאות - כל רעיון בפסקה נפרדת</li>
        </ul>
      </div>
    </motion.div>
  );
}