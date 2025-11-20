import { motion } from "framer-motion";

export default function OnboardingSlide({ icon: Icon, title, description, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
    >
      <div 
        className={`w-32 h-32 rounded-3xl flex items-center justify-center mb-8 shadow-lg ${color}`}
        style={{ 
          background: `linear-gradient(135deg, ${color.replace('bg-', '')} 0%, ${color.replace('bg-', '').replace('500', '400')} 100%)` 
        }}
      >
        <Icon className="w-16 h-16 text-white" strokeWidth={1.5} />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        {title}
      </h2>
      
      <p className="text-lg text-gray-600 leading-relaxed max-w-sm">
        {description}
      </p>
    </motion.div>
  );
}