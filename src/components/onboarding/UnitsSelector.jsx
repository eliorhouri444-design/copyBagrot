import React from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function UnitsSelector({ subject, selectedUnit, onSelectUnit }) {
  const units = [3, 4, 5];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-gray-900 text-center mb-4">
        כמה יחידות ב{subject}?
      </h3>
      
      <div className="grid grid-cols-3 gap-4">
        {units.map((unit) =>
        <motion.button
          key={unit}
          whileHover={{ scale: 1.08, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectUnit(unit)} className="bg-slate-100 p-8 rounded-2xl border-3 transition-all animate-hover-card flex flex-col items-center justify-center border-gray-200 hover:border-blue-300">






            <div className="text-4xl font-black text-blue-600 mb-2">{unit}</div>
            <div className="text-sm font-medium text-gray-700">יחידות</div>
            {selectedUnit === unit &&
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-2 animate-task-bounce">

                <CheckCircle className="w-5 h-5 text-blue-600 mx-auto" />
              </motion.div>
          }
          </motion.button>
        )}
      </div>
    </div>);

}