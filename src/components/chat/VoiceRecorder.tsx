import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 30, 60, 25, 45, 70, 30, 20]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // quiet
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // quiet
      }
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setRecordedBlob(null);
    setDuration(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analysis for live waveform animation
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const bars = Array.from(dataArray.slice(0, 12)).map((v) => Math.max(12, (v / 255) * 100));
              setAudioLevels(bars);
              animationFrameRef.current = requestAnimationFrame(updateLevels);
            }
          };
          updateLevels();
        }
      } catch (e) {
        console.warn('Audio visualization not supported:', e);
      }

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setIsRecording(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? t('micPermissionDenied')
          : err.message || t('errorOccurred')
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePreview = () => {
    if (!recordedBlob) return;

    if (!previewAudioRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPlayingPreview(true)).catch(console.error);
    }
  };

  const handleSend = async () => {
    if (isRecording) {
      stopRecording();
      // wait short tick for onstop
      setTimeout(async () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await onSend(blob, Math.max(1, duration));
        }
      }, 300);
      return;
    }

    if (recordedBlob) {
      await onSend(recordedBlob, Math.max(1, duration));
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#0D1527] border-t border-blue-500/30 p-3 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
      {errorMessage ? (
        <div className="flex flex-col items-center py-4 px-3 text-center space-y-3">
          <AlertCircle className="w-9 h-9 text-rose-400" />
          <p className="text-xs text-rose-200">{errorMessage}</p>
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              onClick={startRecording}
              className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          {/* Waveform / Meter visualizer */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-sm font-mono font-bold text-slate-200">
                {formatSeconds(duration)}
              </span>
            </div>

            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center space-x-1 h-8">
              {audioLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-gradient-to-t from-blue-500 to-cyan-300 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.min(100, Math.max(15, lvl))}%`,
                  }}
                />
              ))}
            </div>

            <span className="text-[11px] font-medium text-slate-400">
              {isRecording ? t('recordingVoice') : t('voiceMessage')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition border border-slate-700/60 active:scale-95"
              title={t('cancel')}
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 flex items-center justify-center border border-amber-500/40 transition active:scale-95"
                  title="Pause/Review"
                >
                  <Square className="w-4 h-4 fill-amber-400" />
                </button>
              ) : recordedBlob ? (
                <button
                  onClick={togglePreview}
                  className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 flex items-center justify-center border border-cyan-500/40 transition active:scale-95"
                  title="Play"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-5 h-5 fill-cyan-300" />
                  ) : (
                    <Play className="w-5 h-5 fill-cyan-300 ml-0.5" />
                  )}
                </button>
              ) : null}

              <button
                onClick={handleSend}
                disabled={duration === 0 && !recordedBlob}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                title={t('send')}
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
