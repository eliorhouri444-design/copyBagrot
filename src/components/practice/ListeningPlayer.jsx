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
    setPlayCount(prev => prev + 1);
    window.speechSynthesis.speak(utteranceRef.current);
  };

  const canPlay = playCount < maxPlays;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-3" />
        <p className="text-sm">טוען קטע השמעה...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">🎧 קטע האזנה</h3>
        <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
          {playCount} / {maxPlays} השמעות
        </div>
      </div>

      {canPlay ? (
        <Button
          onClick={handlePlay}
          disabled={isPlaying}
          className="w-full h-14 bg-white text-purple-600 hover:bg-gray-100 font-bold text-base disabled:opacity-50"
        >
          {isPlaying ? (
            <>
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin ml-2" />
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
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-sm font-semibold">סיימת את ההשמעות</p>
          <p className="text-xs opacity-80 mt-1">עכשיו ענה על השאלות</p>
        </div>
      )}

      {canPlay && playCount > 0 && (
        <p className="text-center text-sm mt-4 text-white/80">
          💡 עוד השמעה אחת זמינה
        </p>
      )}
    </div>
  );
}