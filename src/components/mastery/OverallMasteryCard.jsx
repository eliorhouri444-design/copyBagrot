import React from "react";
import { motion } from "framer-motion";
import { Target, BookOpen, FileText, TrendingUp } from "lucide-react";

// כרטיס מוכנות כללית לדף הבית
export default function OverallMasteryCard({ overallMastery, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-lg animate-pulse">
        <div className="h-20 bg-gray-200 rounded-xl mb-3" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 bg-gray-200 rounded-lg" />
          <div className="h-16 bg-gray-200 rounded-lg" />
          <div className="h-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const { totalTopicMastery, examsMastery, readinessScore } = overallMastery;

  const getScoreColor = (score) => {
    if (score >= 80) return { text: "text-green-600", bg: "from-green-500 to-emerald-600" };
    if (score >= 60) return { text: "text-blue-600", bg: "from-blue-500 to-indigo-600" };
    if (score >= 40) return { text: "text-orange-500", bg: "from-orange-500 to-amber-600" };
    return { text: "text-red-500", bg: "from-red-500 to-rose-600" };
  };

  const readinessColors = getScoreColor(readinessScore);

  const getReadinessMessage = (score) => {
    if (score >= 90) return "מוכן לבגרות! 🎯";
    if (score >= 75) return "בדרך הנכונה 💪";
    if (score >= 50) return "ממשיכים להתקדם 📈";
    if (score >= 25) return "בתחילת הדרך 🚀";
    return "בוא נתחיל! 📚";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      {/* מד מוכנות כללי */}
      <div className={`bg-gradient-to-r ${readinessColors.bg} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5" />
              <span className="text-sm font-bold opacity-90">מוכנות לבגרות</span>
            </div>
            <div className="text-3xl font-black">{readinessScore}%</div>
            <div className="text-sm opacity-90">{getReadinessMessage(readinessScore)}</div>
          </div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"
          >
            <TrendingUp className="w-8 h-8" />
          </motion.div>
        </div>

        {/* פס התקדמות */}
        <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${readinessScore}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      {/* מדדים מפורטים */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* מוכנות בנושאים */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-gray-600">נושאים</div>
                <div className="text-lg font-bold text-purple-600">{totalTopicMastery}%</div>
              </div>
            </div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalTopicMastery}%` }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-full bg-purple-500 rounded-full"
              />
            </div>
          </motion.div>

          {/* מוכנות בשאלונים */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-gray-600">בגרויות</div>
                <div className="text-lg font-bold text-blue-600">{examsMastery}%</div>
              </div>
            </div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${examsMastery}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}