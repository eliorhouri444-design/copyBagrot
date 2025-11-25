import React from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// כרטיס סטטיסטיקות מאוחד לנושא או שאלון
export default function MasteryStatsCard({ mastery, type = "topic" }) {
  if (!mastery) return null;

  const isTopic = type === "topic";
  const mainScore = isTopic ? mastery.subjectMastery : mastery.examMastery;

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-blue-50 border-blue-200";
    if (score >= 40) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  const getProgressColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white rounded-xl p-3 space-y-2.5">
      {/* מד מוכנות ראשי - עיצוב כמו בקרוסלה */}
      <div className="bg-[#F5F8FF] rounded-xl p-2.5 border border-[#E9F0FF]">
        <div className="flex justify-center items-center mb-1.5">
          <span className="text-[17px] font-bold text-[#3B82F6]">{mainScore}%</span>
        </div>
        <div className="text-[11px] font-semibold text-center text-[#2B2B2B] mb-1.5">
          {isTopic ? "התקדמות" : "מוכנות בשאלון"}
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${mainScore}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-[#3B82F6] rounded-full" />
        </div>
        <p className="text-[10px] text-[#6E6E6E] text-center mt-1">
          {mastery.uniqueAnswered || mastery.attemptsCount || 0} / {mastery.totalQuestions || mastery.questionsCount || 0} שאלות נענו
        </p>
      </div>

      {/* סטטיסטיקות מפורטות */}
      {isTopic ?
      // סטטיסטיקות נושא
      <>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
              <div className="text-[16px] font-bold text-green-600">{mastery.correct}</div>
              <div className="text-[9px] text-gray-600">נכונות</div>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
              <div className="text-[16px] font-bold text-red-600">{mastery.wrong}</div>
              <div className="text-[9px] text-gray-600">שגויות</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-200">
              <div className="text-[16px] font-bold text-orange-600">{mastery.partial}</div>
              <div className="text-[9px] text-gray-600">חלקיות</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
              <div className="text-[14px] font-bold text-blue-600">{mastery.attemptsCount}</div>
              <div className="text-[9px] text-gray-600">ניסיונות</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200">
              <div className="text-[14px] font-bold text-purple-600">{mastery.correctPercentage}%</div>
              <div className="text-[9px] text-gray-600">אחוז הצלחה</div>
            </div>
          </div>

          {/* אזורים חלשים */}
          {mastery.weakAreas && mastery.weakAreas.length > 0 &&
        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[10px] font-bold text-red-700">
                  {mastery.weakAreas.length} שאלות לחזרה
                </span>
              </div>
            </div>
        }
        </> :

      // סטטיסטיקות שאלון
      <>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
              <div className="text-[16px] font-bold text-blue-600">{mastery.completedExams}</div>
              <div className="text-[9px] text-gray-600">בגרויות</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
              <div className="text-[16px] font-bold text-green-600">{mastery.passedExams}</div>
              <div className="text-[9px] text-gray-600">עברו</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-200">
              <div className="text-[16px] font-bold text-purple-600">{mastery.averageExamScore}</div>
              <div className="text-[9px] text-gray-600">ממוצע</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
              <div className="text-[14px] font-bold text-amber-600">{mastery.bestScore}</div>
              <div className="text-[9px] text-gray-600">הכי גבוה</div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-2 text-center border border-cyan-200">
              <div className="text-[14px] font-bold text-cyan-600">{mastery.lastScore}</div>
              <div className="text-[9px] text-gray-600">אחרון</div>
            </div>
          </div>

          {/* נושאים חלשים מהבגרויות */}
          {mastery.examWeakAreas && mastery.examWeakAreas.length > 0 &&
        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[10px] font-bold text-red-700">
                  נושאים לשיפור: {mastery.examWeakAreas.slice(0, 2).join(", ")}
                </span>
              </div>
            </div>
        }
        </>
      }
    </div>);

}