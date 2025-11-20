import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ListeningPlayer({ audioText, onReady }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);
  const synthRef = useRef(null);

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
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      utterance.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
      };

      synthRef.current = utterance;
      
      // Estimate duration (rough)
      const words = audioText.split(' ').length;
      const estimatedDuration = words / 2.5; // ~2.5 words per second
      setDuration(estimatedDuration);
      setIsLoading(false);
      
      if (onReady) onReady();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (synthRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, [audioText, onReady]);

  const togglePlayPause = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (currentTime === 0) {
        speechSynthesis.speak(synthRef.current);
      } else {
        speechSynthesis.resume();
      }
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    speechSynthesis.cancel();
    setCurrentTime(0);
    setIsPlaying(false);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg">🎧 קטע ההאזנה</h3>
          <p className="text-xs text-gray-600">האזן בעיון ואז ענה על השאלות</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 mb-4 border border-blue-200">
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={handleRestart}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={currentTime === 0 && !isPlaying}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            onClick={togglePlayPause}
            size="lg"
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white mr-1" />
            )}
          </Button>

          <div className="text-sm text-gray-600 font-mono min-w-[60px] text-center">
            {formatTime(duration)}
          </div>
        </div>

        <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: isPlaying ? '100%' : '0%' }}
            transition={{ duration: duration, ease: "linear" }}
            className="h-full bg-blue-600"
          />
        </div>
      </div>

      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <p className="text-xs text-amber-900 text-center">
          💡 <strong>טיפ:</strong> האזן לקטע לפחות פעמיים לפני שאתה עונה על השאלות
        </p>
      </div>
    </motion.div>
  );
}