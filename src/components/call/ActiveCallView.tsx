import React, { useRef, useEffect } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const ActiveCallView: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local media stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote media stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';
  const isConnected = activeCall.status === 'connected';

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A10] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-cyan-300 border border-blue-500/40">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">
              {activeCall.otherUser.displayName}
            </h3>
            <p className="text-[10px] text-cyan-400 font-mono">
              {isConnected ? formatDuration(callDuration) : 'Apèl ap sonnen...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-700/60 text-[10px] text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Chifre P2P</span>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {isVideo ? (
          /* Video Call View */
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            {/* Remote Fullscreen Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Fallback if remote stream has no video yet */}
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10">
                <Avatar
                  src={activeCall.otherUser.avatarUrl}
                  name={activeCall.otherUser.displayName}
                  size="xl"
                  className="mb-3"
                />
                <p className="text-xs text-slate-400 font-medium">
                  {isConnected ? 'Kamera lòt itilizatè a fèmen' : 'Koneksyon ap etabli...'}
                </p>
              </div>
            )}

            {/* Local Video Picture-in-Picture (PIP) */}
            <div className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-500/50 bg-slate-900 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[10px]">
                  <VideoOff className="w-5 h-5 mb-1" />
                  <span>Kamera Off</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Audio Call View */
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-blue-500/10 animate-ping" />
              <div className="absolute -inset-8 rounded-full bg-indigo-500/10 animate-pulse" />
              <Avatar
                src={activeCall.otherUser.avatarUrl}
                name={activeCall.otherUser.displayName}
                size="xl"
                className="relative z-10 w-28 h-28 text-3xl shadow-2xl shadow-blue-500/30"
              />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white">
                {activeCall.otherUser.displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                @{activeCall.otherUser.username}
              </p>
              <div className="inline-flex items-center space-x-1.5 mt-3 px-3 py-1 rounded-full bg-blue-900/40 text-cyan-300 border border-blue-500/30 text-xs font-mono font-bold">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isConnected ? formatDuration(callDuration) : 'Ap rele...'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Action Controls Bar */}
      <div className="z-20 p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-center justify-center space-x-5">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`w-13 h-13 rounded-full flex items-center justify-center transition active:scale-95 border ${
            isMuted
              ? 'bg-rose-600/30 text-rose-300 border-rose-500/50'
              : 'bg-slate-800/80 text-white hover:bg-slate-700 border-slate-700/60'
          }`}
          title={isMuted ? 'Retire Mute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle Button (for video calls) */}
        {isVideo && (
          <>
            <button
              onClick={toggleVideo}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition active:scale-95 border ${
                isVideoOff
                  ? 'bg-rose-600/30 text-rose-300 border-rose-500/50'
                  : 'bg-slate-800/80 text-white hover:bg-slate-700 border-slate-700/60'
              }`}
              title={isVideoOff ? 'Limen Kamera' : 'Fèmen Kamera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Switch Camera Button */}
            <button
              onClick={switchCamera}
              className="w-13 h-13 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700/60 flex items-center justify-center transition active:scale-95"
              title="Chanje Kamera Devan/Dèyè"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 transition active:scale-90"
          title="Fini Apèl la"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
