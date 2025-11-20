import React from "react";
import { CheckCircle, XCircle, AlertCircle, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function BibleAnswerFeedback({ evaluation, partId }) {
  const getResultColor = (result) => {
    switch (result) {
      case "נכון":
        return "from-green-500 to-emerald-600";
      case "חלקי":
        return "from-yellow-500 to-orange-500";
      case "שגוי":
        return "from-red-500 to-pink-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case "נכון":
        return <CheckCircle className="w-8 h-8 text-white" />;
      case "חלקי":
        return <AlertCircle className="w-8 h-8 text-white" />;
      case "שגוי":
        return <XCircle className="w-8 h-8 text-white" />;
      default:
        return <AlertCircle className="w-8 h-8 text-white" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200"
    >
      {/* Header with result */}
      <div className={`bg-gradient-to-r ${getResultColor(evaluation.result)} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              {getResultIcon(evaluation.result)}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{evaluation.result}</h3>
              <p className="text-white/90 text-sm">סעיף {partId}</p>
            </div>
          </div>
          <div className="text-left">
            <div className="text-4xl font-bold">{evaluation.score}/{evaluation.max_score}</div>
            <div className="text-sm text-white/90">{evaluation.percentage}%</div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="p-6 space-y-4">
        {/* Factual Accuracy */}
        {evaluation.factual_accuracy && (
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-900">דיוק עובדתי</span>
            </div>
            <p className="text-gray-700 text-sm">{evaluation.factual_accuracy}</p>
          </div>
        )}

        {/* Biblical Basis */}
        {evaluation.biblical_basis && (
          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-purple-900">ביסוס מהכתוב</span>
            </div>
            <p className="text-gray-700 text-sm">{evaluation.biblical_basis}</p>
          </div>
        )}

        {/* Completeness */}
        {evaluation.completeness && (
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-900">שלמות התשובה</span>
            </div>
            <p className="text-gray-700 text-sm">{evaluation.completeness}</p>
          </div>
        )}

        {/* Explanation */}
        {evaluation.explanation && (
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="font-bold text-gray-900">הסבר</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{evaluation.explanation}</p>
          </div>
        )}

        {/* Missing Elements */}
        {evaluation.missing_elements && evaluation.missing_elements.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="font-bold text-orange-900">מה חסר בתשובה</span>
            </div>
            <ul className="space-y-2">
              {evaluation.missing_elements.map((element, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-600">•</span>
                  <span>{element}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement Suggestions */}
        {evaluation.improvement_suggestions && evaluation.improvement_suggestions.length > 0 && (
          <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-indigo-900">המלצות לשיפור</span>
            </div>
            <ul className="space-y-2">
              {evaluation.improvement_suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-indigo-600">💡</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verses Referenced */}
        {evaluation.verses_referenced && evaluation.verses_referenced.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-900">פסוקים שצוינו</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {evaluation.verses_referenced.map((verse, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {verse}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}