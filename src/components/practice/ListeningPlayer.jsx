import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ListeningPlayer({ audioText, maxPlays = 2, onMaxPlaysReached }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!audioText) return;

    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      
      if (playCount >= maxPlays && onMaxPlaysReached) {
        onMaxPlaysReached();
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
      setIsLoading(false);
    };

    utteranceRef.current = utterance;
    setIsLoading(false);

    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioText]);

  const handlePlay = () => {
    if (playCount >= maxPlays) return;

    window.speechSynthesis.cancel();
    const newCount = playCount + 1;
    setPlayCount(newCount);
    
    if (newCount >= maxPlays && onMaxPlaysReached) {
      setTimeout(() => onMaxPlaysReached(), 1000);
    }
    
    window.speechSynthesis.speak(utteranceRef.current);
  };

  const canPlay = playCount < maxPlays;

  if (isLoading) {
    return (
      <div className="bg-white rounded-[18px] shadow-md p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2A63FF] border-t-transparent mx-auto mb-3" />
        <p className="text-gray-600 text-base">טוען קטע השמעה...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[18px] shadow-md p-[22px]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[22px] font-bold text-gray-900">🎧 קטע האזנה</h3>
        <div className="text-sm bg-[#F4F6F9] px-3 py-1 rounded-full text-gray-700 font-semibold">
          {playCount} / {maxPlays}
        </div>
      </div>

      {canPlay ? (
        <Button
          onClick={handlePlay}
          disabled={isPlaying}
          style={{ 
            backgroundColor: isPlaying ? '#8EA1C9' : '#1D49C0',
            borderRadius: '16px',
            padding: '18px',
            fontWeight: 600
          }}
          className="w-full text-white hover:opacity-90 disabled:opacity-50 text-base"
        >
          {isPlaying ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
              מנגן...
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5 ml-2" />
              {playCount === 0 ? 'השמע' : 'השמע פעם אחרונה'}
            </>
          )}
        </Button>
      ) : (
        <div className="bg-[#F4F6F9] rounded-[18px] p-5 text-center border-2 border-[#2FD4C7]">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-base font-semibold text-gray-900">סיימת את ההשמעות</p>
          <p className="text-sm text-gray-600 mt-1">עכשיו ענה על השאלות</p>
        </div>
      )}

      {canPlay && playCount > 0 && (
        <p className="text-center text-sm mt-4 text-gray-600">
          💡 עוד השמעה אחת זמינה
        </p>
      )}
    </div>
  );
}