import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Repeat, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BrowserTTS({
  text,
  playLimit = 2,
  onPlayCountChange,
  initialRate = 1.0,
  allowSpeedControl = true,
  minSpeed = 0.9,
  maxSpeed = 1.5,
  speedStep = 0.1
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(initialRate);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const utteranceRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      return () => {
        window.speechSynthesis.cancel();
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, []);

  const handlePlay = () => {
    if (!text || text.trim() === '') {
      alert('אין טקסט להקראה');
      return;
    }

    if (playCount >= playLimit) {
      alert(`הגעת למגבלת ההשמעות (${playLimit})`);
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('הדפדפן שלך לא תומך בהקראת טקסט');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    if (window.speechSynthesis.paused && utteranceRef.current) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      startProgressSimulation();
      return;
    }

    setIsLoading(true);
    window.speechSynthesis.cancel();

    const newCount = playCount + 1;
    setPlayCount(newCount);
    if (onPlayCountChange) {
      onPlayCountChange(newCount);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = currentSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setProgress(0);
      startProgressSimulation();
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
      setIsLoading(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.startsWith('en-'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const startProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const estimatedDuration = (text.split(' ').length / (currentSpeed * 2.5)) * 1000;
    const updateInterval = 100;
    const incrementPerUpdate = (100 / estimatedDuration) * updateInterval;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + incrementPerUpdate;
        if (next >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          return 100;
        }
        return next;
      });
    }, updateInterval);
  };

  const speedOptions = [];
  for (let s = minSpeed; s <= maxSpeed; s += speedStep) {
    speedOptions.push(Number(s.toFixed(1)));
  }

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6 shadow-xl border-2 border-blue-200">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Volume2 className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">הקראת טקסט</h3>
        </div>
        <p className="text-sm text-blue-600 font-medium">
          {playCount}/{playLimit} השמעות
        </p>
      </div>

      {/* Play Button - Center */}
      <div className="flex justify-center mb-6">
        <Button
          onClick={handlePlay}
          disabled={(playCount >= playLimit && !isPlaying) || isLoading}
          className={`w-20 h-20 rounded-full shadow-2xl transition-all ${
            (playCount >= playLimit && !isPlaying) || isLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-110'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-10 h-10 text-white" />
          ) : (
            <Play className="w-10 h-10 text-white mr-1" />
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Speed Control - Slider with Dots */}
      {allowSpeedControl && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">מהירות:</span>
            <div className="flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-full">
              <Repeat className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-700">{currentSpeed}x</span>
            </div>
          </div>

          {/* Speed Slider */}
          <div className="relative px-3">
            <input
              type="range"
              min={minSpeed}
              max={maxSpeed}
              step={speedStep}
              value={currentSpeed}
              onChange={(e) => setCurrentSpeed(Number(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100}%, #dbeafe ${((currentSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100}%, #dbeafe 100%)`
              }}
            />
            {/* Speed Dots */}
            <div className="flex justify-between mt-2">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setCurrentSpeed(speed)}
                  className={`flex flex-col items-center transition-all ${
                    currentSpeed === speed ? 'scale-110' : 'scale-100'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full transition-all ${
                    currentSpeed === speed 
                      ? 'bg-blue-600 scale-150' 
                      : 'bg-blue-300 hover:bg-blue-400'
                  }`} />
                  <span className={`text-[10px] mt-1 font-medium ${
                    currentSpeed === speed ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {speed}x
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Remaining Plays Warning */}
      {playCount >= playLimit && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-semibold">
            הגעת למספר המקסימלי של השמעות
          </p>
        </div>
      )}

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          transition: all 0.2s;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          transition: all 0.2s;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
        }
      `}</style>
    </div>
  );
}