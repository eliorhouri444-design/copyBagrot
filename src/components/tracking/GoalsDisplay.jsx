import React from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle, Zap } from "lucide-react";
import { calculateProgressPercentages } from "./GoalsTracker";

export default function GoalsDisplay({ currentProgress, goals, variant = "full" }) {
  if (!goals || !currentProgress) return null;

  const percentages = calculateProgressPercentages(currentProgress, goals);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-blue-900">יעד יומי</span>
            <span className="text-xs text-blue-700">
              {currentProgress.today_minutes} / {goals.daily_goal?.practice_minutes || 30} דקות
            </span>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentages.daily}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-green-900">יעד שבועי</span>
            <span className="text-xs text-green-700">
              {currentProgress.this_week_sessions} / {goals.weekly_goal?.practice_sessions || 4} תרגולים
            </span>
          </div>
          <div className="h-2 bg-green-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentages.weekly}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border-2 border-blue-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-blue-900">יעד יומי</span>
          <span className="text-xs text-blue-700">
            {goals.daily_goal?.practice_minutes || 30} דקות
          </span>
        </div>
        <div className="h-2.5 bg-blue-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentages.daily}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
          />
        </div>
        <div className="text-xs text-blue-700 mt-1 text-right font-semibold">
          {currentProgress.today_minutes || 0} / {goals.daily_goal?.practice_minutes || 30} דקות היום
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-green-900">יעד שבועי</span>
          <span className="text-xs text-green-700">
            {goals.weekly_goal?.practice_sessions || 4} תרגולים
          </span>
        </div>
        <div className="h-2.5 bg-green-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentages.weekly}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
          />
        </div>
        <div className="text-xs text-green-700 mt-1 text-right font-semibold">
          {currentProgress.this_week_sessions || 0} / {goals.weekly_goal?.practice_sessions || 4} תרגולים השבוע
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border-2 border-orange-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-orange-900">יעד חודשי</span>
          <span className="text-xs text-orange-700">
            {goals.monthly_goal?.practice_sessions || 16} תרגולים
          </span>
        </div>
        <div className="h-2.5 bg-orange-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentages.monthly}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
          />
        </div>
        <div className="text-xs text-orange-700 mt-1 text-right font-semibold">
          {currentProgress.this_month_sessions || 0} / {goals.monthly_goal?.practice_sessions || 16} תרגולים החודש
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border-2 border-purple-200">
        <div className="text-sm font-bold text-purple-900 mb-2">ההתקדמות הכוללת לבגרות:</div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-purple-700">תרגולים</span>
              <span className="text-xs font-bold text-purple-900">
                {currentProgress.total_practice || 0} / {goals.recommended_totals?.total_practice_before_exam || 80}
              </span>
            </div>
            <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentages.totalPractice}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-purple-700">מבחנים</span>
              <span className="text-xs font-bold text-purple-900">
                {currentProgress.total_exams || 0} / {goals.recommended_totals?.total_exams_before_exam || 15}
              </span>
            </div>
            <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentages.totalExams}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}