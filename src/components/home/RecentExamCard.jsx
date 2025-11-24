import React from "react";
import { motion } from "framer-motion";
import { FileCheck, ChevronLeft, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecentExamCard({ lastExam, onViewResults, onNewExam }) {
  if (!lastExam) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-100 text-center">
        <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-4">עדיין לא פתרת בגרויות</p>
        <Button onClick={onNewExam} className="bg-blue-600 hover:bg-blue-700 h-12 w-full">
          פתור בגרות ראשונה
        </Button>
      </div>
    );
  }

  const passed = lastExam.score >= 56;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-blue-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
        <div>
          <h3 className="text-base font-bold">בגרות אחרונה</h3>
          <p className="text-sm text-white/90">{lastExam.timeAgo}</p>
        </div>
        <FileCheck className="w-6 h-6" />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-600">ציון שהשגת</div>
            <div className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {lastExam.score}
            </div>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <Trophy className={`w-7 h-7 ${passed ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={onViewResults}
            variant="outline"
            className="w-full h-10 border-2 border-blue-200"
          >
            הצג תוצאות מלאות
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Button>
          
          <Button
            onClick={onNewExam}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold"
          >
            בצע בגרות חדשה
          </Button>
        </div>
      </div>
    </div>
  );
}