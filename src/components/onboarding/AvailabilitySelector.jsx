import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";

const timeOptions = [
  { id: "15min", label: "15 דקות ביום", minutes: 15, emoji: "🕐", questions: "10-15 שאלות" },
  { id: "30min", label: "30 דקות ביום", minutes: 30, emoji: "🕕", questions: "20-25 שאלות" },
  { id: "45min", label: "45 דקות ביום", minutes: 45, emoji: "⏰", questions: "30-40 שאלות" },
  { id: "1hour", label: "שעה ביום", minutes: 60, emoji: "⌛", questions: "40-50 שאלות" },
  { id: "2hours", label: "שעתיים ביום", minutes: 120, emoji: "⏳", questions: "60-80 שאלות" }
];

export default function AvailabilitySelector({ selectedTime, onSelectTime }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {timeOptions.map((time, idx) => (
        <motion.button
          key={time.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectTime(time.id)}
          className={`p-3 rounded-xl border-2 transition-all animate-hover-card ${
            selectedTime === time.id
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="text-2xl mb-1">{time.emoji}</div>
          <div className="font-bold text-gray-900 text-xs mb-0.5">{time.label}</div>
          <div className="text-xs text-gray-600">{time.questions}</div>
          {selectedTime === time.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-1.5 animate-task-bounce"
            >
              <CheckCircle className="w-4 h-4 text-blue-600 mx-auto" />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}