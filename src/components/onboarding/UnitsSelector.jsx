import React from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function UnitsSelector({ subject, selectedUnit, onSelectUnit }) {
  // Determine available units based on subject
  let units = [3, 4, 5];
  
  if (subject === "מתמטיקה" || subject === "אנגלית") {
    units = [3, 4, 5];
  } else if (subject === "לשון") {
    units = [2, 5];
  } else if (subject === "היסטוריה" || subject === "אזרחות" || subject === "ספרות") {
    units = [2, 5]; // Basic 2, Extended 5
  } else if (subject === "תנך") {
    units = [2, 3, 5]; // Basic 2, Religious 3, Extended 5
  } else {
    // Default or locked subjects (mostly 5 for sciences)
    units = [5];
  }

  // Auto-select if there's only one option and nothing is selected
  React.useEffect(() => {
    if (units.length === 1 && selectedUnit !== units[0]) {
      onSelectUnit(units[0]);
    }
  }, [units, selectedUnit, onSelectUnit]);
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-gray-900 text-center mb-2">
        כמה יחידות ב{subject}?
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {units.map((unit) => (
          <motion.button
            key={unit}
            whileHover={{ scale: 1.08, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectUnit(unit)}
            className={`p-4 rounded-2xl border-3 transition-all animate-hover-card flex flex-col items-center justify-center ${
              selectedUnit === unit
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="text-4xl font-black text-blue-600 mb-1">{unit}</div>
            <div className="text-sm font-medium text-gray-700">יחידות</div>
            {selectedUnit === unit && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-2 animate-task-bounce"
              >
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}