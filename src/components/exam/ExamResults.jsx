import React from "react";
import { motion } from "framer-motion";
import { Trophy, Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExamResults({ results, exam, onExit }) {
  if (!results) return null;

  const isPassed = results.percentage >= (exam.passing_grade || 56);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isPassed ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isPassed ? 'עברת! 🎉' : 'לא עברת'}
          </h2>
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {results.percentage}%
          </div>
          <p className="text-gray-600">
            {results.correctCount} מתוך {results.totalQuestions} תשובות נכונות
          </p>
        </div>

        {/* Questions Breakdown */}
        <div className="space-y-3 mb-6">
          {results.detailedResults.map((result, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 border-2 ${
                result.isCorrect
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.isCorrect ? (
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <div className="font-bold text-gray-900 mb-1">שאלה {result.questionNumber}</div>
                  <div className="text-sm text-gray-700 mb-3">
                    {String(result.questionText).substring(0, 100)}...
                  </div>

                  {!result.isCorrect && (
                    <div className="space-y-2 mt-3">
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-xs text-gray-600 mb-1">התשובה שלך:</div>
                        <div className="text-sm font-semibold text-red-700" dir="ltr">
                          {result.userAnswer || "לא נענה"}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="text-xs text-gray-600 mb-1">התשובה הנכונה:</div>
                        <div className="text-sm font-semibold text-green-700" dir="ltr">
                          {result.correctAnswer}
                        </div>
                      </div>
                      {result.explanation && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <div className="text-xs text-blue-900 mb-1">💡 הסבר:</div>
                          <div className="text-sm text-blue-800">{result.explanation}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Exit Button */}
        <Button onClick={onExit} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
          חזור למבחנים
          <ChevronRight className="w-5 h-5 mr-2" />
        </Button>
      </motion.div>
    </div>
  );
}