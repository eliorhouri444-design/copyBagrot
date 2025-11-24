import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function QuickSubjects({ subjects, onSubjectClick }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">המקצועות המרכזיים שלך</h3>
      
      <div className="space-y-3">
        {subjects.map((subject, idx) => (
          <motion.button
            key={subject.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ x: -5 }}
            onClick={() => onSubjectClick(subject)}
            className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 hover:border-blue-400 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl">{subject.icon}</div>
              <div className="text-right flex-1">
                <div className="font-bold text-gray-900">{subject.name}</div>
                <div className="text-sm text-gray-600">{subject.units} יחידות</div>
                <Progress value={subject.progress} className="h-1.5 mt-2" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{subject.progress}%</div>
            </div>
            <ChevronLeft className="w-5 h-5 text-blue-400" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}