import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isMyMessage?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isMyMessage = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Audio play failed:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Waveform static bar heights simulation
  const bars = [25, 45, 80, 55, 30, 70, 95, 40, 60, 85, 35, 65, 90, 50, 30, 75, 45, 20];

  return (
    <div
      className={`flex items-center space-x-3 p-2 rounded-2xl min-w-[210px] max-w-[270px] ${
        isMyMessage
          ? 'bg-blue-700/30 border border-blue-400/20'
          : 'bg-slate-800/60 border border-slate-700/40'
      }`}
    >
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition active:scale-95 shadow-md ${
          isMyMessage
            ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center space-y-1">
        {/* Waveform Scrubber */}
        <div className="relative h-6 flex items-center">
          <div className="w-full flex items-center justify-between space-x-0.5">
            {bars.map((height, i) => {
              const barPercent = (i / bars.length) * 100;
              const isPassed = progressPercent >= barPercent;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-colors duration-150 ${
                    isPassed
                      ? isMyMessage
                        ? 'bg-cyan-300'
                        : 'bg-blue-400'
                      : isMyMessage
                      ? 'bg-blue-400/30'
                      : 'bg-slate-600'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono font-medium text-slate-300">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center space-x-1">
            <Volume2 className="w-2.5 h-2.5 text-slate-400" />
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
