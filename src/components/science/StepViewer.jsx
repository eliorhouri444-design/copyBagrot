import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StepViewer({ steps, subjectColor = "from-purple-500 to-blue-600" }) {
  const [expandedSteps, setExpandedSteps] = useState(new Set([0]));

  const toggleStep = (index) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const expandAll = () => {
    setExpandedSteps(new Set(steps.map((_, idx) => idx)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">שלבי הפתרון</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={expandAll}>
            <ChevronDown className="w-4 h-4 mr-1" />
            הרחב הכל
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll}>
            <ChevronUp className="w-4 h-4 mr-1" />
            כווץ הכל
          </Button>
        </div>
      </div>

      {steps.map((step, idx) => {
        const isExpanded = expandedSteps.has(idx);
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`bg-gradient-to-r ${subjectColor} bg-opacity-10 rounded-xl border-2 border-purple-200 overflow-hidden`}
          >
            <button
              onClick={() => toggleStep(idx)}
              className="w-full p-4 flex items-center gap-4 hover:bg-white/50 transition-colors"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${subjectColor} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                {step.number || idx + 1}
              </div>
              <div className="flex-1 text-right">
                <div className="font-bold text-gray-900 text-lg">{step.title}</div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4"
              >
                <div className="bg-white rounded-lg p-4 space-y-3">
                  {step.explanation && (
                    <div className="text-gray-700 leading-relaxed">
                      {step.explanation}
                    </div>
                  )}

                  {step.physics_explanation && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="text-xs font-bold text-green-900 mb-1 flex items-center gap-1">
                        <Lightbulb className="w-4 h-4" />
                        הסבר פיזיקלי:
                      </div>
                      <div className="text-sm text-gray-700">{step.physics_explanation}</div>
                    </div>
                  )}

                  {step.chemistry_concept && (
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <div className="text-xs font-bold text-orange-900 mb-1">🧪 מושג כימי:</div>
                      <div className="text-sm text-gray-700">{step.chemistry_concept}</div>
                    </div>
                  )}

                  {step.biological_explanation && (
                    <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                      <div className="text-xs font-bold text-pink-900 mb-1">🧬 הסבר ביולוגי:</div>
                      <div className="text-sm text-gray-700">{step.biological_explanation}</div>
                    </div>
                  )}

                  {step.formula && (
                    <div className="bg-blue-50 rounded-lg p-3 font-mono text-sm text-blue-900 border border-blue-200">
                      <div className="text-xs text-blue-700 mb-1">נוסחה:</div>
                      {step.formula}
                    </div>
                  )}

                  {step.calculation && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800">
                      <div className="text-xs text-gray-600 mb-1">חישוב:</div>
                      <div className="whitespace-pre-wrap">{step.calculation}</div>
                    </div>
                  )}

                  {step.result && (
                    <div className="bg-green-100 rounded-lg p-3 font-bold text-green-900 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      ➜ {step.result}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}