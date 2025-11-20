import { Check, X, AlertCircle, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function AnswerFeedback({ result, onNext, onShowSolution }) {
  const statusConfig = {
    correct: {
      icon: Check,
      color: 'green',
      bgClass: 'bg-green-50 border-green-200',
      title: '✅ תשובה נכונה!',
      iconClass: 'text-green-600'
    },
    partial: {
      icon: AlertCircle,
      color: 'yellow',
      bgClass: 'bg-yellow-50 border-yellow-200',
      title: '⚠️ תשובה חלקית',
      iconClass: 'text-yellow-600'
    },
    incorrect: {
      icon: X,
      color: 'red',
      bgClass: 'bg-red-50 border-red-200',
      title: '❌ תשובה שגויה',
      iconClass: 'text-red-600'
    }
  };

  const config = statusConfig[result.status] || statusConfig.incorrect;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Main Result */}
      <div className={`rounded-xl p-6 border-2 ${config.bgClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Icon className={`w-8 h-8 ${config.iconClass}`} />
            <span className="font-bold text-xl">{config.title}</span>
          </div>
          <div className="text-3xl font-black">
            {result.score}/{result.max_score}
          </div>
        </div>

        <div className="text-gray-900 leading-relaxed">
          {result.feedback}
        </div>

        {/* Percentage */}
        <div className="mt-4 bg-white rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">ציון באחוזים:</span>
            <span className="text-2xl font-black">{result.percentage}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${result.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${
                result.status === 'correct' ? 'from-green-500 to-emerald-500' :
                result.status === 'partial' ? 'from-yellow-500 to-orange-500' :
                'from-red-500 to-pink-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Breakdown by Parts */}
      {result.breakdown && result.breakdown.length > 0 && (
        <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold">פירוט ניקוד</h3>
          </div>

          <div className="space-y-3">
            {result.breakdown.map((part, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">סעיף {part.part_id}</span>
                  <span className="font-bold text-lg">{part.score}/{part.max_score}</span>
                </div>
                <div className="text-sm text-gray-700 mb-2">{part.feedback}</div>
                
                {part.criteria_met && part.criteria_met.length > 0 && (
                  <div className="text-xs">
                    <div className="text-green-700">✓ {part.criteria_met.join(', ')}</div>
                  </div>
                )}
                
                {part.criteria_missed && part.criteria_missed.length > 0 && (
                  <div className="text-xs text-red-700">
                    ✗ {part.criteria_missed.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {result.status !== 'correct' && onShowSolution && (
          <Button
            onClick={onShowSolution}
            variant="outline"
            className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            הצג פתרון מלא
          </Button>
        )}
        <Button
          onClick={onNext}
          className={`flex-1 h-12 font-bold ${
            result.status === 'correct' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
              : 'bg-gradient-to-r from-blue-600 to-purple-600'
          } text-white`}
        >
          {result.status === 'correct' ? '🎉 המשך' : 'נסה שוב / המשך'}
        </Button>
      </div>
    </motion.div>
  );
}