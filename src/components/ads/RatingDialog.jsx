import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RatingDialog({ open, onOpenChange, onSubmitRating, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = () => {
    onSubmitRating(rating);
    setRating(0);
    setHoveredRating(0);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onOpenChange(false);
    }
    setRating(0);
    setHoveredRating(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-3 left-3 p-1 rounded-full hover:bg-gray-100 z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-amber-100 rounded-full">
              <Star className="w-12 h-12 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            דרג את Bagrut Plus
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            האם אתה נהנה מהאפליקציה שלנו?<br />
            דירוג של 5 כוכבים יעניק לך שבוע חופשי מפרסומות!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center gap-2 py-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-amber-500 text-amber-500'
                    : 'text-gray-300'
                }`}
              />
            </motion.button>
          ))}
        </div>
        
        <p className="text-center text-sm text-gray-600 mb-4">
          {rating === 5 ? "מושלם! 🎉 תקבל שבוע חופשי מפרסומות" : 
           rating > 0 ? "הבונוס ניתן רק לדירוג 5 כוכבים ⭐" : 
           "בחר את דירוגך"}
        </p>
        
        <DialogFooter className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
          >
            שלח דירוג
          </Button>
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full"
          >
            אולי אחר כך
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.setItem('never_show_rating_dialog', 'true');
              handleClose();
            }}
            className="w-full text-gray-400 text-sm"
          >
            אל תראה לי שוב
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}