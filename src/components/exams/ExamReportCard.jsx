import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Target, 
  Award,
  AlertCircle,
  BarChart3,
  Zap,
  Brain,
  Trophy,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ExamReportCard({ report, onStartPractice, onViewDetails }) {
  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 56) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 85) return "from-green-50 to-emerald-50 border-green-200";
    if (score >= 70) return "from-blue-50 to-cyan-50 border-blue-200";
    if (score >= 56) return "from-orange-50 to-amber-50 border-orange-200";
    return "from-red-50 to-rose-50 border-red-200";
  };

  const getScoreIcon = (score) => {
    if (score >= 85) return Trophy;
    if (score >= 70) return Award;
    if (score >= 56) return CheckCircle;
    return AlertCircle;
  };

  const ScoreIcon = getScoreIcon(report.overall_score);

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
      {/* Header with Score */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${getScoreBgColor(report.overall_score)} border-b-2 p-8 text-center relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full translate-y-12 -translate-x-12" />
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="relative z-10"
        >
          <ScoreIcon className={`w-20 h-20 ${getScoreColor(report.overall_score)} mx-auto mb-4`} />
          <h2 className="text-5xl font-bold text-gray-900 mb-2">
            {Math.round(report.overall_score)}%
          </h2>
          <p className="text-lg text-gray-700 font-semibold">
            {report.overall_score >= 85 ? "🎉 מצוין!" : 
             report.overall_score >= 70 ? "👏 טוב מאוד!" : 
             report.overall_score >= 56 ? "✅ עברת!" : 
             "💪 המשך להתאמן!"}
          </p>
        </motion.div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 grid grid-cols-3 gap-4"
      >
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center border-2 border-blue-200">
          <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-900">{report.duration_minutes}</div>
          <div className="text-xs text-blue-700 font-medium">דקות</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 text-center border-2 border-green-200">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">
            {report.correct_answers}/{report.total_questions}
          </div>
          <div className="text-xs text-green-700 font-medium">נכונות</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 text-center border-2 border-purple-200">
          <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-900">
            {Math.round(report.time_per_question_avg || 0)}
          </div>
          <div className="text-xs text-purple-700 font-medium">שניות/שאלה</div>
        </div>
      </motion.div>

      {/* Topics Breakdown */}
      {report.topics_breakdown && report.topics_breakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="px-6 pb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-lg">פירוט לפי נושאים</h3>
          </div>
          
          <div className="space-y-3">
            {report.topics_breakdown.map((topic, idx) => {
              const percentage = Math.round((topic.correct_count / topic.questions_count) * 100);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 text-sm">{topic.topic}</span>
                    <span className={`text-lg font-bold ${getScoreColor(percentage)}`}>
                      {percentage}%
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{topic.correct_count}/{topic.questions_count} נכונות</span>
                    <span>⏱ {topic.time_spent}s</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Strengths */}
      {report.strengths && report.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="px-6 pb-4"
        >
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-900 text-lg">💪 נקודות חוזק</h3>
            </div>
            <div className="space-y-2">
              {report.strengths.map((strength, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <span className="font-semibold text-gray-900">{strength.topic}</span>
                  <span className="text-green-600 font-bold">{Math.round(strength.score)}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Weaknesses */}
      {report.weaknesses && report.weaknesses.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="px-6 pb-4"
        >
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-900 text-lg">🎯 נקודות לשיפור</h3>
            </div>
            <div className="space-y-2">
              {report.weaknesses.map((weakness, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{weakness.topic}</span>
                    <span className="text-red-600 font-bold">{Math.round(weakness.score)}%</span>
                  </div>
                  {weakness.questions_missed && weakness.questions_missed.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {weakness.questions_missed.length} שאלות להתמקד בהן
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Comparison to Previous */}
      {report.comparison_to_previous && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="px-6 pb-4"
        >
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-900 text-lg">📈 השוואה למבחן קודם</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${report.comparison_to_previous.score_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {report.comparison_to_previous.score_change >= 0 ? '+' : ''}{Math.round(report.comparison_to_previous.score_change)}%
                </div>
                <div className="text-xs text-gray-600">שינוי בציון</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${report.comparison_to_previous.time_change <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {report.comparison_to_previous.time_change >= 0 ? '+' : ''}{Math.round(report.comparison_to_previous.time_change)}m
                </div>
                <div className="text-xs text-gray-600">שינוי בזמן</div>
              </div>
            </div>

            {report.comparison_to_previous.improved_topics && report.comparison_to_previous.improved_topics.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-green-700 mb-1">✨ שיפור ב:</div>
                <div className="flex flex-wrap gap-1">
                  {report.comparison_to_previous.improved_topics.map((topic, idx) => (
                    <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Badges Earned */}
      {report.badges_earned && report.badges_earned.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="px-6 pb-4"
        >
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-5 border-2 border-yellow-200">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-yellow-900 text-lg">🏆 תגים חדשים!</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {report.badges_earned.map((badge, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1 + idx * 0.1, type: "spring" }}
                  className="bg-white rounded-xl p-3 text-center shadow-md"
                >
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <div className="text-xs font-bold text-gray-900">{badge.title}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="p-6 space-y-3 border-t-2 border-gray-100"
      >
        {report.recommended_topics && report.recommended_topics.length > 0 && (
          <Button
            onClick={() => onStartPractice(report.recommended_topics)}
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <Target className="w-5 h-5" />
            <span>התחל תרגול מיוחד</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}

        <Button
          onClick={onViewDetails}
          variant="outline"
          className="w-full h-12 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold rounded-xl"
        >
          צפה בפירוט מלא
        </Button>
      </motion.div>
    </div>
  );
}