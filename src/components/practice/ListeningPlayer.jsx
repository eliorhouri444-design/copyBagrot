import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ListeningPlayer({ audioText, maxPlays = 2, onMaxPlaysReached }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playCount, setPlayCount] = useState(0);
  const synthRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!audioText) return;

    // Use Web Speech API for TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Try to use a good voice
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsLoading(false);
        
        // Start time tracking
        const startTime = Date.now();
        intervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          setCurrentTime(elapsed);
        }, 100);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(duration);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Increment play count when audio finishes
        setPlayCount(prev => {
          const newCount = prev + 1;
          if (newCount >= maxPlays && onMaxPlaysReached) {
            onMaxPlaysReached();
          }
          return newCount;
        });
      };

      utterance.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };

      synthRef.current = utterance;
      
      // Estimate duration (rough)
      const words = audioText.split(' ').length;
      const estimatedDuration = words / 2.5; // ~2.5 words per second
      setDuration(estimatedDuration);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    return () => {
      if (synthRef.current) {
        speechSynthesis.cancel();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [audioText]);

  const togglePlayPause = () => {
    if (!synthRef.current || playCount >= maxPlays) return;

    if (isPlaying) {
      speechSynthesis.pause();
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      if (currentTime === 0 || !speechSynthesis.speaking) {
        speechSynthesis.speak(synthRef.current);
      } else {
        speechSynthesis.resume();
      }
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    if (playCount >= maxPlays) return;
    
    speechSynthesis.cancel();
    setCurrentTime(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center border-2 border-blue-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">מכין את קטע השמיעה...</p>
      </div>
    );
  }

  const hasReachedLimit = playCount >= maxPlays;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r rounded-2xl p-5 border-2 shadow-lg ${
        hasReachedLimit 
          ? 'from-gray-100 to-gray-200 border-gray-300' 
          : 'from-blue-50 to-indigo-50 border-blue-200'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          hasReachedLimit ? 'bg-gray-400' : 'bg-blue-600'
        }`}>
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            🎧 קטע ההאזנה
            {hasReachedLimit && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                הסתיימו ההשמעות
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-600">
            {hasReachedLimit ? 'שוב לא ניתן להאזין' : `נותרו ${maxPlays - playCount} השמעות`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 mb-4 border border-blue-200">
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={handleRestart}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={hasReachedLimit || (currentTime === 0 && !isPlaying)}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            onClick={togglePlayPause}
            size="lg"
            className={`h-14 w-14 rounded-full ${
              hasReachedLimit 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={hasReachedLimit}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white mr-1" />
            )}
          </Button>

          <div className="text-sm text-gray-600 font-mono min-w-[60px] text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div
            animate={{ width: `${(currentTime / duration) * 100}%` }}
            className={hasReachedLimit ? 'h-full bg-gray-400' : 'h-full bg-blue-600'}
          />
        </div>

        <div className="mt-3 text-center">
          <span className={`text-lg font-bold ${hasReachedLimit ? 'text-red-600' : 'text-blue-600'}`}>
            {playCount} / {maxPlays} השמעות
          </span>
        </div>
      </div>

      <div className={`rounded-lg p-3 border ${
        hasReachedLimit 
          ? 'bg-red-50 border-red-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <p className="text-xs text-center font-medium">
          {hasReachedLimit ? (
            <>
              <span className="text-red-900">🔒 <strong>לא ניתן להאזין יותר</strong> - עבור לשאלות</span>
            </>
          ) : (
            <>
              <span className="text-amber-900">💡 <strong>טיפ:</strong> האזן לקטע פעמיים לפני שאתה עובר לשאלות</span>
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}