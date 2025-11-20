import { ChevronLeft, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function RecentExamsCard({ onClick, isPremium }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-md p-6 cursor-pointer text-white"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">מבחנים לשיפור</h3>
        <Target className="w-6 h-6" />
      </div>
      
      <p className="text-white/90 text-sm mb-4">
        מבחן מותאם אישית לנושאים שצריכים שיפור
      </p>

      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>צור מבחן מותאם</span>
        <ChevronLeft className="w-4 h-4" />
      </div>
    </motion.div>
  );
}