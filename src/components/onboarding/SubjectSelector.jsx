import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Languages, Calculator, Atom, FlaskConical, Dna, BookMarked, Lock, Scroll, History, Scale, PenTool, Monitor } from "lucide-react";

const subjects = [
  { id: "מתמטיקה", name: "מתמטיקה", icon: Calculator, color: "from-purple-500 to-purple-600", isLocked: false },
  { id: "אנגלית", name: "אנגלית", icon: Languages, color: "from-blue-500 to-blue-600", isLocked: false },
  { id: "לשון", name: "לשון והבעה", icon: PenTool, color: "from-red-500 to-red-600", isLocked: false },
  { id: "היסטוריה", name: "היסטוריה", icon: History, color: "from-amber-500 to-amber-600", isLocked: false },
  { id: "אזרחות", name: "אזרחות", icon: Scale, color: "from-indigo-500 to-indigo-600", isLocked: false },
  { id: "תנך", name: "תנ\"ך", icon: Scroll, color: "from-yellow-500 to-yellow-600", isLocked: false },
  { id: "ספרות", name: "ספרות", icon: BookMarked, color: "from-pink-500 to-fuchsia-600", isLocked: false }
];

export default function SubjectSelector({ selectedSubjects, onToggleSubject }) {
  return (
    <div className="space-y-2">
      {subjects.map((subject, idx) => {
        const Icon = subject.icon;
        const isSelected = selectedSubjects.includes(subject.id);
        const isLocked = subject.isLocked;
        
        return (
          <motion.button
            key={subject.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={isLocked ? {} : { scale: 1.02, x: -4 }}
            whileTap={isLocked ? {} : { scale: 0.98 }}
            onClick={() => !isLocked && onToggleSubject(subject.id)}
            className={`w-full p-2.5 rounded-xl border-2 transition-all flex items-center justify-between animate-hover-card ${
              isLocked
                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                : isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${isLocked ? 'from-gray-300 to-gray-400' : subject.color} flex items-center justify-center shadow-md`}>
                {isLocked ? (
                  <Lock className="w-4 h-4 text-white" />
                ) : (
                  <Icon className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <div className={`font-bold text-sm ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                  {subject.name}
                </div>
                {isLocked && (
                  <div className="text-xs text-gray-500">בקרוב</div>
                )}
              </div>
            </div>
            {isSelected && !isLocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="animate-task-bounce"
              >
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}