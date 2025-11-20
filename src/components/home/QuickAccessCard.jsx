import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function QuickAccessCard({ icon: Icon, title, description, color, onClick, compact }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-gradient-to-br ${color} rounded-2xl shadow-md cursor-pointer text-white ${
        compact ? 'p-4 h-36' : 'p-6'
      } flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <Icon className={`${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
        <ChevronLeft className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} opacity-70`} />
      </div>
      
      <div className="flex-1 flex flex-col justify-center text-center">
        <h3 className={`font-bold mb-1 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
        
        <p className={`text-white/90 ${compact ? 'text-[10px] line-clamp-2' : 'text-xs'}`}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}