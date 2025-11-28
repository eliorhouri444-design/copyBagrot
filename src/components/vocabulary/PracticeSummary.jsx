import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function PracticeSummary({ results, onRetry, onHome, onPracticeWeak }) {
  const { total, correct, incorrect, accuracy, weakWords = [] } = results;

  const getGradeColor = () => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeMessage = () => {
    if (accuracy >= 80) return 'מצוין!';
    if (accuracy >= 60) return 'טוב, אבל יש מה לשפר';
    return 'צריך עוד תרגול';
  };

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className={`text-5xl font-bold mb-2 ${getGradeColor()}`}>
          {accuracy}%
        </div>
        <div className="text-gray-600 mb-4">{getGradeMessage()}</div>
        
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{correct}</span>
            </div>
            <div className="text-xs text-gray-500">נכון</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <XCircle className="w-5 h-5" />
              <span className="text-2xl font-bold">{incorrect}</span>
            </div>
            <div className="text-xs text-gray-500">שגוי</div>
          </div>
        </div>
      </div>

      {/* Weak Words */}
      {weakWords.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-orange-800">מילים לחיזוק ({weakWords.length})</h3>
          </div>
          <div className="space-y-2">
            {weakWords.slice(0, 5).map((word, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white rounded-lg p-3">
                <span className="font-medium text-gray-900">{word.english_answer}</span>
                <span className="text-gray-600">{word.hebrew_word}</span>
              </div>
            ))}
            {weakWords.length > 5 && (
              <div className="text-sm text-orange-700 text-center">
                ועוד {weakWords.length - 5} מילים...
              </div>
            )}
          </div>
          
          {onPracticeWeak && (
            <Button
              onClick={onPracticeWeak}
              className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <AlertTriangle className="w-4 h-4 ml-2" />
              תרגל מילים חלשות
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onRetry}
          variant="outline"
          className="flex-1 h-12"
        >
          <RotateCcw className="w-4 h-4 ml-2" />
          נסה שוב
        </Button>
        <Button
          onClick={onHome}
          className="flex-1 h-12 bg-[#2086b1] hover:bg-blue-700 text-white"
        >
          <Home className="w-4 h-4 ml-2" />
          חזור
        </Button>
      </div>
    </div>
  );
}