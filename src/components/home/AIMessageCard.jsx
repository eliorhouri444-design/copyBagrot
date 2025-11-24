import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";

export default function AIMessageCard({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-5 border-2 border-purple-200 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-purple-200/30 rounded-full -translate-x-16 -translate-y-16" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-pink-200/30 rounded-full translate-x-12 translate-y-12" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="font-bold text-gray-900">הרובוט החכם שלך 🤖</div>
        </div>

        <p className="text-gray-800 leading-relaxed">
          {message || "היי! היום אתה צריך להשלים תרגול של 20 שאלות כדי להתקרב למטרה שלך: ציון 85+ באנגלית."}
        </p>
      </div>
    </motion.div>
  );
}