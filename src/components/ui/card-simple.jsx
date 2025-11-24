import React from "react";
import { motion } from "framer-motion";

export function CardSimple({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-[#F5F8FF] rounded-xl p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-5 h-5 text-[#112D57]" />}
      <h3 className="text-base font-bold text-[#2B2B2B]">{children}</h3>
    </div>
  );
}

export function StatCard({ value, label, color = "#1E4BA1" }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-black mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-[#6E6E6E]">{label}</div>
    </div>
  );
}