import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Target } from "lucide-react";

const goals = [
  { 
    id: "pass", 
    label: "לעבור את המבחן", 
    score: "56+", 
    emoji: "✅", 
    description: "תכנית בסיסית שתעזור לך לעבור",
    factor: 1.0
  },
  { 
    id: "good", 
    label: "ציון טוב", 
    score: "70-84", 
    emoji: "👍", 
    description: "תכנית מאוזנת לציון טוב",
    factor: 1.2
  },
  { 
    id: "excellence", 
    label: "מצוינות", 
    score: "85+", 
    emoji: "⭐", 
    description: "תכנית אינטנסיבית למצוינות",
    factor: 1.35
  }
];

export default function GoalSelector({ selectedGoal, onSelectGoal }) {
  return (
    <div className="space-y-3">
      {goals.map((goal, idx) => (
        <motion.button
          key={goal.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ scale: 1.02, x: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectGoal(goal.id)}
          className={`w-full p-3 rounded-2xl border-2 transition-all flex items-center justify-between animate-hover-card ${
            selectedGoal === goal.id
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-3 text-right">
            <div className="text-3xl">{goal.emoji}</div>
            <div>
              <div className="font-bold text-gray-900 text-base">{goal.label}</div>
              <div className="text-xs text-gray-600">{goal.score} • {goal.description}</div>
            </div>
          </div>
          {selectedGoal === goal.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="animate-task-bounce"
            >
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}