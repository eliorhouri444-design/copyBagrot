import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Grid3x3, AlertCircle, FileCheck } from "lucide-react";

export default function QuickNav({ onNavigate }) {
  const items = [
    { id: "practice", icon: BookOpen, label: "תרגול מהיר", color: "from-blue-500 to-blue-600" },
    { id: "subjects", icon: Grid3x3, label: "מקצועות", color: "from-purple-500 to-purple-600" },
    { id: "mistakes", icon: AlertCircle, label: "טעויות", color: "from-orange-500 to-red-600" },
    { id: "exams", icon: FileCheck, label: "בגרויות", color: "from-green-500 to-emerald-600" }
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item, idx) => {
        const Icon = item.icon;
        
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(item.id)}
            className="flex flex-col items-center gap-2"
          >
            <div className={`w-full aspect-square bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 text-center">{item.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}