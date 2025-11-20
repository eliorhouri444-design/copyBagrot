import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function ReadingTextPanel({ text, open, onClose }) {
  if (!text) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto"
            dir="rtl"
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-4 shadow-md z-10">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-xl font-bold">טקסט הקריאה</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div
                className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap"
                dir="ltr"
                style={{ fontFamily: "'Segoe UI', -apple-system, sans-serif" }}
              >
                {text}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4">
              <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700">
                חזור לשאלות
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}