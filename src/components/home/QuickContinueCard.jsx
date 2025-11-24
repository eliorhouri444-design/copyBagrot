import React from "react";
import { motion } from "framer-motion";
import { Play, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickContinueCard({ lastActivity, onContinue }) {
  if (!lastActivity) {
    return null;
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white cursor-pointer"
      onClick={onContinue}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
          <Play className="w-8 h-8" />
        </div>
        
        <div className="flex-1">
          <div className="text-xl font-bold mb-1">המשך מאיפה שהפסקת</div>
          <div className="text-sm text-white/90">
            {lastActivity.type === 'practice' ? '📚 תרגול' : '📝 בגרות'}: {lastActivity.topic}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-white/80">
            <Clock className="w-4 h-4" />
            <span>עדכון אחרון: {lastActivity.timeAgo}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}