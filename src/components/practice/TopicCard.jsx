import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function TopicCard({ topic, questionsCount, userAttempts }) {
  const navigate = useNavigate();

  const totalAttempts = userAttempts?.length || 0;
  const correctAttempts = userAttempts?.filter(a => a.percentage >= 70).length || 0;
  const avgScore = totalAttempts > 0 
    ? Math.round(userAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
    : 0;

  const totalSets = Math.ceil(questionsCount / 10);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-all"
    >
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{topic.icon || "📚"}</div>
          <div className="flex-1 text-white">
            <h3 className="font-bold text-lg">{topic.name}</h3>
            <p className="text-xs opacity-90">{questionsCount} שאלות • {totalSets} סטים</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {topic.description && (
          <p className="text-sm text-gray-600 mb-4">{topic.description}</p>
        )}

        {totalAttempts > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{totalAttempts}</div>
              <div className="text-xs text-gray-600">תרגולים</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-600">{correctAttempts}</div>
              <div className="text-xs text-gray-600">הצלחות</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-purple-600">{avgScore}%</div>
              <div className="text-xs text-gray-600">ממוצע</div>
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate(createPageUrl(`TopicPracticeNew?topicId=${topic.topic_id}&set=1`))}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white h-12 font-bold"
        >
          התחל תרגול
          <ChevronLeft className="w-5 h-5 mr-2" />
        </Button>
      </div>
    </motion.div>
  );
}