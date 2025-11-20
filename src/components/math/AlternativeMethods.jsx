import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AlternativeMethods({ methods, onSelectMethod }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  if (!methods || methods.length === 0) {
    return null;
  }

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'easier': 'bg-green-100 text-green-800',
      'same': 'bg-blue-100 text-blue-800',
      'harder': 'bg-orange-100 text-orange-800'
    };
    return colors[difficulty] || colors.same;
  };

  const getRecommendationBadge = (recommended) => {
    if (recommended) {
      return (
        <div className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-full text-xs font-bold">
          <Sparkles className="w-3 h-3" />
          מומלץ
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white hover:from-amber-600 hover:to-orange-600 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">
                שיטות פתרון נוספות
              </div>
              <div className="text-sm opacity-90">
                {methods.length} דרכים שונות לפתור
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <ChevronDown className="w-6 h-6" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="divide-y divide-gray-100"
          >
            {methods.map((method, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-bold text-gray-900">
                        {idx + 1}. {method.method_name}
                      </h4>
                      {getRecommendationBadge(method.recommended)}
                      <div className={`text-xs px-2 py-1 rounded-full font-bold ${getDifficultyColor(method.difficulty_level)}`}>
                        {method.difficulty_level === 'easier' ? 'קל יותר' : 
                         method.difficulty_level === 'harder' ? 'קשה יותר' : 'באותה רמה'}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      {method.brief_explanation}
                    </p>

                    {method.when_to_use && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-blue-900">מתי להשתמש:</span>
                        </div>
                        <p className="text-xs text-blue-800">{method.when_to_use}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {method.pros && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="text-xs font-bold text-green-900 mb-1">✅ יתרונות:</div>
                          <p className="text-xs text-green-700">{method.pros}</p>
                        </div>
                      )}
                      
                      {method.cons && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                          <div className="text-xs font-bold text-red-900 mb-1">⚠️ חסרונות:</div>
                          <p className="text-xs text-red-700">{method.cons}</p>
                        </div>
                      )}
                    </div>

                    {method.example_steps && method.example_steps.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="text-xs font-bold text-purple-900 mb-2">
                          📝 צעדים ראשוניים:
                        </div>
                        <ol className="list-decimal list-inside text-xs text-gray-700 space-y-1">
                          {method.example_steps.map((exampleStep, stepIdx) => (
                            <li key={stepIdx}>{exampleStep}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

                {onSelectMethod && (
                  <Button
                    onClick={() => {
                      setSelectedMethod(method);
                      onSelectMethod(method);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-10"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    פתור בשיטה זו
                  </Button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}