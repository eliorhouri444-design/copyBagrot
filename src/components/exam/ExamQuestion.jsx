import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

export default function ExamQuestion({ question, questionNumber, userAnswer, onAnswerChange }) {
  if (!question) return null;

  const questionText = typeof question.question_text === 'string' 
    ? question.question_text 
    : (question.question_text?.text || question.text || "");

  const isMultipleChoice = question.question_type === "multiple_choice" || 
                          question.question_type === "multi_choice";
  const options = question.options || [];

  return (
    <motion.div
      key={questionNumber}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl shadow-lg p-5 mb-24"
    >
      {/* Question Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-white">{questionNumber}</span>
        </div>
        <div className="flex-1">
          {question.hebrew_hint && (
            <div className="text-sm text-blue-600 font-semibold mb-2">
              💡 {question.hebrew_hint}
            </div>
          )}
          <p
            className="text-lg text-gray-900 leading-relaxed"
            dir="ltr"
            style={{ fontFamily: "'Segoe UI', -apple-system, sans-serif" }}
          >
            {questionText}
          </p>
          {question.question_image_url && (
            <img
              src={question.question_image_url}
              alt="Question"
              className="mt-4 rounded-lg max-w-full"
            />
          )}
          {question.points && (
            <div className="mt-2 text-sm text-gray-500">
              ({question.points} נקודות)
            </div>
          )}
        </div>
      </div>

      {/* Answer Input */}
      {isMultipleChoice && options.length > 0 ? (
        <div className="space-y-3">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onAnswerChange(option)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                userAnswer === option
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  userAnswer === option
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {userAnswer === option && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-base text-gray-900" dir="ltr">{option}</span>
              </div>
            </button>
          ))}
        </div>
      ) : question.question_type === "writing" ? (
        <Textarea
          value={userAnswer || ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Write your answer here..."
          className="w-full min-h-[200px] text-base"
          dir="ltr"
        />
      ) : (
        <Input
          value={userAnswer || ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer..."
          className="w-full h-12 text-base"
          dir="ltr"
        />
      )}
    </motion.div>
  );
}