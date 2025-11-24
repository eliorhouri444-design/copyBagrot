import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export default function WeeklyProgressChart({ weekData }) {
  const maxMinutes = Math.max(...weekData.map(d => d.minutes), 1);

  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const totalMinutes = weekData.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">התקדמות השבוע</h3>
        <TrendingUp className="w-5 h-5 text-blue-600" />
      </div>

      <div className="flex items-end justify-between gap-2 h-32 mb-4">
        {weekData.map((day, idx) => {
          const heightPercent = (day.minutes / maxMinutes) * 100;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg min-h-[4px] relative group"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {day.minutes} דקות
                </div>
              </motion.div>
              <div className="text-xs font-semibold text-gray-600">{days[idx]}</div>
            </div>
          );
        })}
      </div>

      <div className="text-center bg-blue-50 rounded-xl p-3">
        <span className="text-sm text-gray-700">
          השבוע למדת <span className="font-bold text-blue-600">{totalMinutes} דקות</span>
        </span>
      </div>
    </div>
  );
}