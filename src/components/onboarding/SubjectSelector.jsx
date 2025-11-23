import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Languages, Calculator, Atom, FlaskConical, Dna, BookMarked, Lock } from "lucide-react";

const subjects = [
  { id: "אנגלית", name: "אנגלית", icon: Languages, color: "from-blue-500 to-blue-600", isLocked: false },
  { id: "מתמטיקה", name: "מתמטיקה", icon: Calculator, color: "from-purple-500 to-purple-600", isLocked: false },
  { id: "פיזיקה", name: "פיזיקה", icon: Atom, color: "from-green-500 to-emerald-600", isLocked: true },
  { id: "כימיה", name: "כימיה", icon: FlaskConical, color: "from-orange-500 to-orange-600", isLocked: true },
  { id: "ביולוגיה", name: "ביולוגיה", icon: Dna, color: "from-teal-500 to-teal-600", isLocked: true },
  { id: "ספרות", name: "ספרות", icon: BookMarked, color: "from-pink-500 to-fuchsia-600", isLocked: true }
];

export default function SubjectSelector({ selectedSubjects, onToggleSubject }) {
  return (
    <div className="space-y-3">
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
            className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between animate-hover-card ${
              isLocked
                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                : isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${isLocked ? 'from-gray-300 to-gray-400' : subject.color} flex items-center justify-center shadow-lg`}>
                {isLocked ? (
                  <Lock className="w-6 h-6 text-white" />
                ) : (
                  <Icon className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <div className={`font-bold text-lg ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
                  {subject.name}
                </div>
                {isLocked && (
                  <div className="text-xs text-gray-500 mt-0.5">בקרוב</div>
                )}
              </div>
            </div>
            {isSelected && !isLocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="animate-task-bounce"
              >
                <CheckCircle className="w-7 h-7 text-blue-600" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}