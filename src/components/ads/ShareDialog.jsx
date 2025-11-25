import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ShareDialog({ open, onOpenChange, referralCode, onClose }) {
  const shareUrl = `${window.location.origin}?ref=${referralCode}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("הקישור הועתק!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'בגרות פלוס - הכנה לבגרות',
          text: 'היי! בוא ללמוד איתי לבגרות עם האפליקציה הכי טובה 📚',
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Share2 className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            שתף עם חברים
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            שתף את Bagrut Plus עם 20 חברים<br />
            וקבל 5 ימים ללא פרסומות! 🎁
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-200">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-gray-700 text-sm font-semibold">
              כל חבר שילחץ על הקישור שלך = צעד קרוב יותר לבונוס!
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none truncate"
              dir="ltr"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleShare}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            <Share2 className="w-5 h-5 ml-2" />
            שתף עכשיו
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-gray-500"
          >
            אולי אחר כך
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.setItem('never_show_share_dialog', 'true');
              onClose();
            }}
            className="w-full text-gray-400 text-sm"
          >
            אל תראה לי שוב
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}