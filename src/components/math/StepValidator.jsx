import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, X, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function StepValidator({ step, onValidationComplete }) {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState(null);

  const validateStep = async () => {
    setIsValidating(true);

    try {
      const result = await base44.functions.invoke('validateStep', {
        step: step,
        checkMethod: 'thorough'
      });

      if (result.data?.success) {
        setValidation(result.data.validation);
        if (onValidationComplete) {
          onValidationComplete(result.data.validation);
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  if (!validation) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={validateStep}
        disabled={isValidating}
        className="h-8 text-xs"
      >
        {isValidating ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            בודק...
          </>
        ) : (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            אמת שלב
          </>
        )}
      </Button>
    );
  }

  const isValid = validation.is_correct && validation.confidence >= 80;
  const hasWarnings = validation.warnings && validation.warnings.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={`mt-2 rounded-lg p-3 border-2 ${
        isValid && !hasWarnings
          ? 'bg-green-50 border-green-300'
          : hasWarnings
          ? 'bg-yellow-50 border-yellow-300'
          : 'bg-red-50 border-red-300'
      }`}
    >
      <div className="flex items-start gap-2">
        {isValid && !hasWarnings ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : hasWarnings ? (
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        ) : (
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 text-sm">
          <div className="font-bold mb-1">
            {isValid && !hasWarnings
              ? '✅ השלב נכון'
              : hasWarnings
              ? '⚠️ יש שיפורים אפשריים'
              : '❌ יש בעיה בשלב זה'
            }
          </div>

          {validation.explanation && (
            <div className="text-gray-700 mb-2">
              {validation.explanation}
            </div>
          )}

          {validation.warnings && validation.warnings.length > 0 && (
            <div className="bg-white rounded p-2 mt-2">
              <div className="text-xs font-bold text-yellow-900 mb-1">⚡ אזהרות:</div>
              <ul className="list-disc list-inside text-xs text-gray-700">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.suggestions && validation.suggestions.length > 0 && (
            <div className="bg-white rounded p-2 mt-2">
              <div className="text-xs font-bold text-blue-900 mb-1">💡 הצעות:</div>
              <ul className="list-disc list-inside text-xs text-gray-700">
                {validation.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <div className="text-xs text-gray-600">
              ודאות: {validation.confidence}%
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={validateStep}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              בדוק שוב
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}