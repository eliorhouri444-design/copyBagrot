import React from "react";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function LockedFeatureCard({ 
  title = "פיצ'ר למנויי פרימיום בלבד",
  description = "קבל תוכנית מלאה, בגרויות, בוחן חכם, תרגול ללא הגבלה וניתוח טעויות.",
  icon: Icon = Lock,
  compact = false,
  className = ""
}) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-amber-900">{title}</div>
            <div className="text-[11px] text-amber-700 truncate">{description}</div>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("Premium"))}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 text-[11px] font-bold rounded-lg flex-shrink-0"
          >
            <Crown className="w-3 h-3 ml-1" />
            שדרג
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border-2 border-amber-200 text-center ${className}`}
    >
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-amber-600" />
      </div>
      
      <h3 className="text-[16px] font-bold text-amber-900 mb-2">{title}</h3>
      <p className="text-[13px] text-amber-700 mb-4 leading-relaxed">{description}</p>
      
      <Button
        onClick={() => navigate(createPageUrl("Premium"))}
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white h-12 text-[14px] font-bold rounded-xl"
      >
        <Crown className="w-5 h-5 ml-2" />
        שדרג עכשיו
      </Button>
    </motion.div>
  );
}

// קומפוננט להצגת טעימה נעולה (preview)
export function LockedPreview({ 
  children, 
  isPremium, 
  title = "פיצ'ר פרימיום",
  showPreview = true 
}) {
  const navigate = useNavigate();

  if (isPremium) {
    return children;
  }

  return (
    <div className="relative">
      {showPreview && (
        <div className="opacity-40 pointer-events-none">
          {children}
        </div>
      )}
      
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center bg-gradient-to-t from-white via-white/90 to-transparent`}>
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-[13px] font-bold text-amber-900 mb-2">{title}</p>
          <Button
            onClick={() => navigate(createPageUrl("Premium"))}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white h-9 px-4 text-[12px] font-bold rounded-lg"
          >
            <Crown className="w-4 h-4 ml-1" />
            שדרג לפרימיום
          </Button>
        </div>
      </div>
    </div>
  );
}

// קומפוננט להצגת הודעת שדרוג
export function PremiumUpsell({ 
  message,
  compact = false,
  className = ""
}) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <button
        onClick={() => navigate(createPageUrl("Premium"))}
        className={`flex items-center gap-2 text-amber-700 hover:text-amber-800 transition-colors ${className}`}
      >
        <Crown className="w-4 h-4" />
        <span className="text-[12px] font-semibold">{message}</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-amber-50 border border-amber-200 rounded-xl p-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Crown className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-[12px] text-amber-800 flex-1">{message}</p>
        <Button
          onClick={() => navigate(createPageUrl("Premium"))}
          size="sm"
          variant="ghost"
          className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 h-8 px-3 text-[11px] font-bold"
        >
          שדרג
        </Button>
      </div>
    </motion.div>
  );
}