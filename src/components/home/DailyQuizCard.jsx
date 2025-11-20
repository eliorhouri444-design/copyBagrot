import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DailyQuizCard({ onStart, completed, score }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 shadow-lg text-white"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold">התרגול היומי</h3>
        </div>
        {completed && (
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">{score}%</span>
          </div>
        )}
      </div>
      
      <p className="text-purple-100 mb-4 text-sm">
        {completed 
          ? "כל הכבוד! השלמת את הבחינה היומית 🎉"
          : "מבחנים על החומר של הבגרות או בחינות לבחירתך"}
      </p>
      
      <Button 
        onClick={onStart}
        className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold h-12 rounded-xl"
        disabled={completed}
      >
        {completed ? (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            הושלם
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2" />
            התחל בחינה
          </>
        )}
      </Button>
    </motion.div>
  );
}