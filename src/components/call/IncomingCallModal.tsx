import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#131D36] to-[#0B0F19] border border-blue-500/30 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        {/* Call Type Badge */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-300 text-xs font-semibold mb-6">
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span>{isVideo ? 'Apèl Videyo k ap antre...' : 'Apèl Vwa k ap antre...'}</span>
        </div>

        {/* Ringing Avatar Animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
          <div className="absolute -inset-3 rounded-full bg-indigo-500/20 animate-pulse" />
          <Avatar
            src={incomingCall.caller.avatarUrl}
            name={incomingCall.caller.displayName}
            size="xl"
            className="relative z-10"
          />
        </div>

        {/* Caller Info */}
        <h2 className="text-lg font-extrabold text-white mb-0.5">
          {incomingCall.caller.displayName}
        </h2>
        <p className="text-xs text-slate-400 mb-8">@{incomingCall.caller.username}</p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-8 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={declineCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition active:scale-90"
              title="Refize"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-rose-300">Refize</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition active:scale-90 animate-bounce"
              title="Aksepte"
            >
              <Phone className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-semibold text-emerald-300">Aksepte</span>
          </div>
        </div>
      </div>
    </div>
  );
};
