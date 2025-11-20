import { Button } from "@/components/ui/button";
import { Star, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AdInfoDialog({ open, onOpenChange, onWatchAd, onRate, hasRated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Play className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎓 לפני שמתחילים את השאלון הבא
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-4 space-y-4">
            <p className="leading-relaxed">
              כדי לתמוך באפליקציה ולאפשר המשך שימוש חינמי,
              תצטרך לצפות בסרטון קצר של חצי דקה לפני תחילת השאלון.
            </p>
            
            {!hasRated && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                <p className="text-amber-900 font-semibold mb-2">
                  💡 רוצה שבוע שלם בלי פרסומות?
                </p>
                <p className="text-amber-800 text-sm">
                  דרג אותנו ב־⭐⭐⭐⭐⭐ וקבל 7 ימים חופשיים מפרסומות!
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={onWatchAd}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg"
          >
            <Play className="w-5 h-5 ml-2" />
            צפה בסרטון והתחל
          </Button>
          
          {!hasRated && (
            <Button
              onClick={onRate}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-lg"
            >
              <Star className="w-5 h-5 ml-2" />
              דרג וקבל שבוע חינם
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full h-12"
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}