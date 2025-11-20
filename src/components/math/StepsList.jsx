
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Calculator,
  Sparkles,
  Target
} from "lucide-react";


import StepValidator from "./StepValidator";

export default function StepsList({ steps, verification, alternativeMethods }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [validations, setValidations] = useState({});

  const ruleColors = {
    'factor_quadratic': 'bg-purple-100 text-purple-900',
    'zero_product': 'bg-blue-100 text-blue-900',
    'derivative': 'bg-green-100 text-green-900',
    'integral': 'bg-orange-100 text-orange-900',
    'substitution': 'bg-pink-100 text-pink-900',
    'default': 'bg-gray-100 text-gray-900'
  };

  const getRuleColor = (ruleName) => {
    if (!ruleName) return ruleColors.default;
    const key = Object.keys(ruleColors).find(k => ruleName.toLowerCase().includes(k));
    return ruleColors[key] || ruleColors.default;
  };

  const handleValidationComplete = (stepIndex, validation) => {
    setValidations(prev => ({
      ...prev,
      [stepIndex]: validation
    }));
  };

  if (!steps || steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">אין צעדים להצגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Steps List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            צעדי הפתרון ({steps.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-100">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                className="w-full text-right"
              >
                <div className="flex items-start gap-3">
                  {/* Step Number */}
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {step.step_number || idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Rule Badge */}
                    {step.rule_name && (
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold mb-2 ${getRuleColor(step.rule_name)}`}>
                        <Calculator className="w-3 h-3" />
                        {step.rule_name}
                      </div>
                    )}

                    {/* Description */}
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      {step.description}
                    </div>

                    {/* Calculation Preview */}
                    {step.calculation && (
                      <div className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded mt-1">
                        {step.calculation.substring(0, 60)}...
                      </div>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <div className="flex-shrink-0 pt-1">
                    {expandedStep === idx ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedStep === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 mr-11"
                  >
                    <div className="space-y-3">
                      {/* Full Calculation */}
                      {step.calculation && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                          <div className="text-xs font-bold text-indigo-900 mb-1">📐 חישוב:</div>
                          <div className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                            {step.calculation}
                          </div>
                        </div>
                      )}

                      {/* Formula Used */}
                      {step.formula_used && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-bold text-purple-900 mb-1">🔢 נוסחה:</div>
                          <div className="text-sm text-gray-800 font-mono">
                            {step.formula_used}
                          </div>
                        </div>
                      )}

                      {/* Why This Step */}
                      {step.why_this_step && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="text-xs font-bold text-yellow-900 mb-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            למה עושים זאת:
                          </div>
                          <div className="text-sm text-gray-700">
                            {step.why_this_step}
                          </div>
                        </div>
                      )}

                      {/* Result of Step */}
                      {step.result_of_step && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-bold text-green-900 mb-1">➡️ תוצאת ביניים:</div>
                          <div className="text-sm font-bold text-gray-900 font-mono">
                            {step.result_of_step}
                          </div>
                        </div>
                      )}
                      
                      {/* ✅ Step Validation */}
                      <div className="pt-3 border-t border-gray-200">
                        <StepValidator
                          step={step}
                          onValidationComplete={(validation) => handleValidationComplete(idx, validation)}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Alternative Methods */}
      {alternativeMethods && alternativeMethods.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-lg font-bold">
                  שיטות פתרון נוספות ({alternativeMethods.length})
                </span>
              </div>
              {showAlternatives ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {showAlternatives && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="divide-y divide-gray-100"
              >
                {alternativeMethods.map((method, idx) => (
                  <div key={idx} className="p-4">
                    <div className="text-sm font-bold text-gray-900 mb-2">
                      {idx + 1}. {method.method_name}
                    </div>
                    <div className="text-sm text-gray-700 mb-3">
                      {method.brief_explanation}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {method.pros && (
                        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                          <div className="text-xs font-bold text-green-900 mb-1">✅ יתרונות:</div>
                          <div className="text-xs text-green-700">{method.pros}</div>
                        </div>
                      )}
                      
                      {method.cons && (
                        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                          <div className="text-xs font-bold text-red-900 mb-1">⚠️ חסרונות:</div>
                          <div className="text-xs text-red-700">{method.cons}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
