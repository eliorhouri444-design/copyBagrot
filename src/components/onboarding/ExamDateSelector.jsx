import React from "react";
import { motion } from "framer-motion";
import { Calendar, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ExamDateSelector({ subject, examDate, onDateChange }) {
  const calculateDaysLeft = () => {
    if (!examDate) return null;
    const date = new Date(examDate);
    const today = new Date();
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  const daysLeft = calculateDaysLeft();
  const isUrgent = daysLeft !== null && daysLeft <= 30;
  const isVeryUrgent = daysLeft !== null && daysLeft <= 14;
  
  return (
    <div className="space-y-1.5">
      <div className="bg-blue-50 rounded-xl p-2.5 border-2 border-blue-200 animate-hover-card">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          <Calendar className="w-3.5 h-3.5 inline ml-1 text-blue-600" />
          מתי הבגרות ב{subject}?
        </label>
        <Input
          type="date"
          value={examDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full h-9 text-sm"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      {daysLeft !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-2.5 border-2 text-center animate-task-bounce ${
            isVeryUrgent
              ? 'bg-red-50 border-red-300'
              : isUrgent
                ? 'bg-orange-50 border-orange-300'
                : 'bg-green-50 border-green-300'
          }`}
        >
          {isVeryUrgent && <AlertTriangle className="w-4 h-4 text-red-600 mx-auto mb-1" />}
          <div className={`text-2xl font-black mb-0.5 ${
            isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-green-600'
          }`}>
            {daysLeft}
          </div>
          <div className="text-xs text-gray-700 font-medium">
            {daysLeft === 1 ? 'יום' : 'ימים'} עד הבגרות
          </div>
          {isVeryUrgent && (
            <div className="text-xs text-red-700 font-bold mt-0.5">
              ⚠️ זמן קצר! תכנית אינטנסיבית
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}