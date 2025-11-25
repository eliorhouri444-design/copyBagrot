import React, { useState, useRef, useEffect } from "react";
import { Volume2 } from "lucide-react";
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
      <div className="bg-blue-50 rounded-2xl shadow-lg p-4 sm:p-6 text-center border-2 border-blue-200">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-gray-600">טוען קטע השמעה...</p>
      </div>);

  }

  return (
    <div className="bg-blue-50 rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-blue-200">
      <div className="flex items-center justify-center mb-4 sm:mb-6">
        <div className="bg-blue-500 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">🎧 קטע האזנה</h3>
        <div className="inline-block bg-white px-4 py-2 rounded-full border-2 border-blue-300">
          <span className="text-blue-500 text-sm font-bold">
            {playCount} / {maxPlays} השמעות
          </span>
        </div>
      </div>

      {canPlay ?
      <Button
        onClick={handlePlay}
        disabled={isPlaying} className="bg-blue-500 text-white px-4 py-2 text-base font-bold rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-full h-12 sm:h-14 hover:bg-blue-700 sm:text-lg disabled:opacity-50 shadow-md">


          {isPlaying ?
        <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
              מנגן...
            </> :

        <>
              <Volume2 className="w-5 h-5 ml-2" />
              {playCount === 0 ? 'השמע את הקטע' : 'השמע שוב (פעם אחרונה)'}
            </>
        }
        </Button> :

      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 sm:p-6 text-center">
          <div className="text-4xl sm:text-5xl mb-3">✅</div>
          <p className="text-base sm:text-lg font-bold text-green-800 mb-1">סיימת את ההשמעות</p>
          <p className="text-xs sm:text-sm text-green-700">עכשיו ענה על השאלות</p>
        </div>
      }

      {canPlay && playCount > 0 &&
      <p className="text-center text-xs sm:text-sm mt-4 text-gray-600">
          💡 נותרה עוד השמעה אחת
        </p>
      }
    </div>);

}