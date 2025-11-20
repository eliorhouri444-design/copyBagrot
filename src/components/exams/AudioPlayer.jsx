
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Repeat, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrowserTTS from "./BrowserTTS";

export default function AudioPlayer({
  audioUrl,
  audioText,
  captionUrl,
  playLimit = 2,
  rate = 1.0,
  allowSpeedControl = true,
  minSpeed = 0.9,
  maxSpeed = 1.5,
  speedStep = 0.1,
  onPlayCountChange
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(rate);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("");
  
  const audioRef = useRef(null);
  const trackRef = useRef(null);

  const hasValidAudio = audioUrl && audioUrl.startsWith('http') && !audioUrl.includes('example.com');

  useEffect(() => {
    if (hasValidAudio && audioRef.current) {
      audioRef.current.playbackRate = currentSpeed;
    }
  }, [currentSpeed, hasValidAudio]);

  useEffect(() => {
    if (!hasValidAudio || !captionUrl) return;

    const loadCaptions = async () => {
      try {
        const response = await fetch(captionUrl);
        const vttText = await response.text();
        
        const blob = new Blob([vttText], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        if (trackRef.current) {
          trackRef.current.src = url;
        }
      } catch (error) {
        console.error('Error loading captions:', error);
      }
    };

    loadCaptions();
  }, [captionUrl, hasValidAudio]);

  const handlePlay = () => {
    if (playCount >= playLimit) {
      alert(`הגעת למגבלת ההשמעות (${playLimit})`);
      return;
    }

    if (!hasValidAudio) {
      return;
    }

    if (audioRef.current) {
      if (audioRef.current.paused) {
        if (audioRef.current.currentTime === 0 || audioRef.current.currentTime >= audioRef.current.duration) {
          const newCount = playCount + 1;
          setPlayCount(newCount);
          if (onPlayCountChange) {
            onPlayCountChange(newCount);
          }
        }
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      if (trackRef.current && trackRef.current.track && trackRef.current.track.activeCues) {
        const cues = trackRef.current.track.activeCues;
        if (cues.length > 0) {
          setCurrentCaption(cues[0].text);
        } else {
          setCurrentCaption("");
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speedOptions = [];
  for (let speedValue = minSpeed; speedValue <= maxSpeed; speedValue += speedStep) {
    speedOptions.push(Number(speedValue.toFixed(1)));
  }

  if (!hasValidAudio && !audioText) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-semibold">לא זמין קובץ אודיו או טקסט</p>
      </div>
    );
  }

  if (!hasValidAudio && audioText) {
    return (
      <BrowserTTS
        text={audioText}
        playLimit={playLimit}
        onPlayCountChange={onPlayCountChange}
        initialRate={rate}
        allowSpeedControl={allowSpeedControl}
        minSpeed={minSpeed}
        maxSpeed={maxSpeed}
        speedStep={speedStep}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6 shadow-xl border-2 border-blue-200">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      >
        {captionUrl && (
          <track
            ref={trackRef}
            kind="captions"
            srcLang="en"
            label="English"
            default
          />
        )}
      </audio>

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
          disabled={playCount >= playLimit && !isPlaying}
          className={`w-20 h-20 rounded-full shadow-2xl transition-all ${
            playCount >= playLimit && !isPlaying
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-110'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-10 h-10 text-white" />
          ) : (
            <Play className="w-10 h-10 text-white mr-1" />
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Speed Control - Slider with Dots */}
      {allowSpeedControl && (
        <div className="mb-6">
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
              {speedOptions.map((speedValue) => (
                <button
                  key={speedValue}
                  onClick={() => setCurrentSpeed(speedValue)}
                  className={`flex flex-col items-center transition-all ${
                    currentSpeed === speedValue ? 'scale-110' : 'scale-100'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full transition-all ${
                    currentSpeed === speedValue 
                      ? 'bg-blue-600 scale-150' 
                      : 'bg-blue-300 hover:bg-blue-400'
                  }`} />
                  <span className={`text-[10px] mt-1 font-medium ${
                    currentSpeed === speedValue ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {speedValue}x
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Captions Display */}
      {showCaptions && currentCaption && (
        <div className="bg-white rounded-xl p-4 border-2 border-blue-200 text-center">
          <p className="text-sm text-gray-800" dir="ltr">{currentCaption}</p>
        </div>
      )}

      {/* Remaining Plays Warning */}
      {playCount >= playLimit && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center mt-4">
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
