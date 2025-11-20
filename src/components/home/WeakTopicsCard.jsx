import { Crown, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function WeakTopicsCard({ isPremium, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-[#ffffff] p-6 rounded-2xl shadow-md cursor-pointer border-2 border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">נושאים לשיפור</h3>
        <ChevronLeft className="w-5 h-5 text-gray-400" />
      </div>
      
      {isPremium ? (
        <p className="text-gray-700 text-sm">
          צפה בנושאים שכדאי לחזק על פי הביצועים שלך
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-600 text-sm">תכונה בלעדית למנויי פרימיום</p>
          <Button 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-10 rounded-xl flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>שדרג עכשיו</span>
          </Button>
        </div>
      )}
    </motion.div>
  );
}