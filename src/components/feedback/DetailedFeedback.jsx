import React, { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, BookOpen, Lightbulb, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function DetailedFeedback({ 
  isCorrect, 
  feedback, 
  question, 
  userAnswer, 
  correctAnswer,
  explanation,
  tips,
  relatedTopics,
  similarMistakes 
}) {
  const [expandedSections, setExpandedSections] = useState({
    explanation: true,
    tips: false,
    topics: false,
    mistakes: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-3">
      {/* Main Feedback */}
      <div className={`rounded-2xl p-5 border-2 ${
        isCorrect 
          ? 'bg-green-50 border-green-300' 
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {isCorrect ? (
            <CheckCircle className="w-10 h-10 text-green-600" />
          ) : (
            <XCircle className="w-10 h-10 text-red-600" />
          )}
          <div className="flex-1">
            <div className={`text-xl font-bold ${
              isCorrect ? 'text-green-800' : 'text-red-800'
            }`}>
              {isCorrect ? 'מצוין! תשובה נכונה ✓' : 'לא נכון ✗'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 mb-3">
          <div className="text-sm text-gray-700 leading-relaxed">{feedback}</div>
        </div>

        {!isCorrect && correctAnswer && (
          <div className="bg-white rounded-xl p-4">
            <div className="text-xs text-gray-600 mb-1 font-semibold">התשובה הנכונה:</div>
            <div className="text-sm text-green-700 font-semibold">{correctAnswer}</div>
          </div>
        )}
      </div>

      {/* Explanation Section */}
      {explanation && (
        <FeedbackSection
          title="הסבר מפורט"
          icon={BookOpen}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          expanded={expandedSections.explanation}
          onToggle={() => toggleSection('explanation')}
        >
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {explanation}
          </div>
        </FeedbackSection>
      )}

      {/* Tips Section */}
      {tips && tips.length > 0 && (
        <FeedbackSection
          title="טיפים ללמידה"
          icon={Lightbulb}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-50"
          borderColor="border-yellow-200"
          expanded={expandedSections.tips}
          onToggle={() => toggleSection('tips')}
        >
          <ul className="space-y-2">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-gray-700">
                <span className="text-yellow-600 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </FeedbackSection>
      )}

      {/* Related Topics */}
      {relatedTopics && relatedTopics.length > 0 && (
        <FeedbackSection
          title="נושאים קשורים לחזרה"
          icon={TrendingUp}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          expanded={expandedSections.topics}
          onToggle={() => toggleSection('topics')}
        >
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((topic, idx) => (
              <div
                key={idx}
                className="bg-white px-3 py-1.5 rounded-lg text-sm text-purple-700 font-semibold border border-purple-300"
              >
                {topic}
              </div>
            ))}
          </div>
        </FeedbackSection>
      )}

      {/* Similar Mistakes */}
      {similarMistakes && similarMistakes.length > 0 && (
        <FeedbackSection
          title="טעויות נפוצות דומות"
          icon={AlertCircle}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
          borderColor="border-orange-200"
          expanded={expandedSections.mistakes}
          onToggle={() => toggleSection('mistakes')}
        >
          <div className="space-y-3">
            {similarMistakes.map((mistake, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="text-sm font-semibold text-gray-900 mb-1">
                  {mistake.mistake}
                </div>
                <div className="text-xs text-gray-600">
                  {mistake.correction}
                </div>
              </div>
            ))}
          </div>
        </FeedbackSection>
      )}
    </div>
  );
}

function FeedbackSection({ 
  title, 
  icon: Icon, 
  iconColor, 
  bgColor, 
  borderColor, 
  expanded, 
  onToggle, 
  children 
}) {
  return (
    <div className={`rounded-xl border-2 ${borderColor} overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full ${bgColor} p-4 flex items-center justify-between hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-bold text-gray-900">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}