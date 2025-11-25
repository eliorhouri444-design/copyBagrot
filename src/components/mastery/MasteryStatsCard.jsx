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
      {/* מד מוכנות ראשי */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }} className="bg-blue-500 p-3 rounded-xl border-2 border-red-200">


        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Target className={`w-4 h-4 ${getScoreColor(mainScore)}`} />
            <span className="text-[#ffffff] font-bold">
              {isTopic ? "מוכנות בנושא" : "מוכנות בשאלון"}
            </span>
          </div>
          <span className="text-[#ffffff] font-bold">
            {mainScore}%
          </span>
        </div>
        
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${mainScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${getProgressColor(mainScore)}`} />

        </div>
      </motion.div>

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