import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Calendar, Zap, BarChart3, Users } from "lucide-react";

const styles = [
  { 
    id: "daily_consistent", 
    label: "מעט כל יום", 
    emoji: "📅",
    description: "15-30 דקות קבועות בכל יום",
    icon: Calendar
  },
  { 
    id: "intensive_days", 
    label: "ימים מרוכזים", 
    emoji: "⚡",
    description: "2-3 פעמים בשבוע, מפגשים ארוכים",
    icon: Zap
  },
  { 
    id: "simulation_focused", 
    label: "סימולציות בסוף", 
    emoji: "🎯",
    description: "למידה רגילה + בחינות מלאות לקראת הסוף",
    icon: BarChart3
  },
  { 
    id: "balanced", 
    label: "שילוב של הכל", 
    emoji: "🔄",
    description: "חומר חדש + חזרות + סימולציות",
    icon: Users
  }
];

export default function LearningStyleSelector({ selectedStyle, onSelectStyle }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {styles.map((style, idx) => {
        const Icon = style.icon;
        return (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectStyle(style.id)}
            className={`p-3 rounded-xl border-2 transition-all text-right animate-hover-card ${
              selectedStyle === style.id
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="text-2xl mb-1">{style.emoji}</div>
            <div className="font-bold text-gray-900 text-xs mb-0.5">{style.label}</div>
            <div className="text-xs text-gray-600 leading-tight">{style.description}</div>
            {selectedStyle === style.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-1.5 animate-task-bounce"
              >
                <CheckCircle className="w-4 h-4 text-blue-600 mx-auto" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}