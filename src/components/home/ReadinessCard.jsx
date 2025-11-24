import React from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReadinessCard({ readinessPercent, daysUntilExam, targetScore }) {
  const navigate = useNavigate();

  const getReadinessColor = (percent) => {
    if (percent >= 80) return "from-green-500 to-emerald-600";
    if (percent >= 60) return "from-blue-500 to-indigo-600";
    if (percent >= 40) return "from-yellow-500 to-orange-500";
    return "from-orange-500 to-red-500";
  };

  const getReadinessEmoji = (percent) => {
    if (percent >= 80) return "🔥";
    if (percent >= 60) return "💪";
    if (percent >= 40) return "📈";
    return "🎯";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-r ${getReadinessColor(readinessPercent)} rounded-2xl shadow-xl p-6 text-white relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm font-semibold text-white/90">המצב שלך היום</div>
          <div className="text-3xl">{getReadinessEmoji(readinessPercent)}</div>
        </div>

        <div className="text-center mb-6">
          <div className="text-6xl font-black mb-2">{readinessPercent}%</div>
          <div className="text-xl font-bold">מוכנות לבגרות</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
            <Calendar className="w-6 h-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{daysUntilExam}</div>
            <div className="text-sm text-white/90">ימים לבגרות</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20">
            <Award className="w-6 h-6 mx-auto mb-2" />
            <div className="text-2xl font-bold">{targetScore}</div>
            <div className="text-sm text-white/90">ציון מטרה</div>
          </div>
        </div>

        <Button
          onClick={() => navigate(createPageUrl("Readiness"))}
          className="w-full bg-white text-blue-600 hover:bg-gray-100 h-12 text-base font-bold rounded-xl"
        >
          <Target className="w-5 h-5 ml-2" />
          עדכן תוכנית לימוד
        </Button>
      </div>
    </motion.div>
  );
}