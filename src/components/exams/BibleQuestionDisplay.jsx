import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BibleQuestionDisplay({ 
  question, 
  onSubmitAnswer, 
  isSubmitting,
  readingText 
}) {
  const [answers, setAnswers] = useState({});
  const [showReading, setShowReading] = useState(false);

  const handleAnswerChange = (partId, value) => {
    setAnswers(prev => ({ ...prev, [partId]: value }));
  };

  const handleSubmit = () => {
    // Collect all answers from parts
    const allAnswers = question.parts?.map(part => ({
      part_id: part.part_id,
      answer: answers[part.part_id] || "",
      question_text: part.text,
      source_verses: part.source_verses || question.source_verses,
      correct_answer: part.correct_answer,
      max_points: part.points,
      requires_biblical_basis: part.requires_biblical_basis !== false
    })) || [];

    onSubmitAnswer(allAnswers);
  };

  const allAnswered = question.parts?.every(part => answers[part.part_id]?.trim()) || false;

  return (
    <div className="space-y-6">
      {/* Reading Text Toggle */}
      {readingText && (
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <Button
            onClick={() => setShowReading(!showReading)}
            variant="ghost"
            className="w-full flex items-center justify-between hover:bg-blue-100"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-900">
                {showReading ? 'הסתר קטע מקראי' : 'הצג קטע מקראי'}
              </span>
            </div>
            <span className="text-sm text-blue-600">
              {question.source_verses || 'טקסט מקור'}
            </span>
          </Button>

          <AnimatePresence>
            {showReading && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-right">
                    {readingText}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Main Question */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-blue-600">{question.question_number}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {question.question_text}
            </h3>
            {question.chapter && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>{question.chapter}</span>
                {question.source_verses && (
                  <span className="text-blue-600">• {question.source_verses}</span>
                )}
              </div>
            )}
            <div className="mt-2 text-sm text-gray-500">
              סה"כ: {question.points} נקודות
            </div>
          </div>
        </div>

        {/* Parts (Sections) */}
        {question.parts && question.parts.length > 0 && (
          <div className="space-y-6">
            {question.parts.map((part, idx) => (
              <motion.div
                key={part.part_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-purple-600">{part.part_id}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium mb-2">{part.text}</p>
                    {part.source_verses && (
                      <div className="text-xs text-blue-600 mb-2">
                        📖 {part.source_verses}
                      </div>
                    )}
                    {part.requires_biblical_basis !== false && (
                      <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 inline-flex items-center gap-1 mb-3">
                        <Sparkles className="w-3 h-3" />
                        <span>נדרש ביסוס מהכתוב</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mb-3">
                      {part.points} נקודות
                    </div>
                  </div>
                </div>

                <Textarea
                  value={answers[part.part_id] || ""}
                  onChange={(e) => handleAnswerChange(part.part_id, e.target.value)}
                  placeholder="כתוב את תשובתך כאן... (ציין פסוקים במידת הצורך)"
                  className="w-full min-h-[120px] text-base resize-none"
                  dir="rtl"
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-bold rounded-xl disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2" />
                בודק תשובות...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 ml-2" />
                שלח לבדיקה
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}