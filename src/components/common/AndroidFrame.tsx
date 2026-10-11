import React, { useState, useEffect } from 'react';
import { Smartphone, Maximize2, Wifi, Battery, Signal } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children }) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070A10] flex flex-col items-center justify-center sm:p-4 text-slate-100">
      {/* Floating View Switcher for Desktop Preview */}
      <div className="hidden sm:flex items-center space-x-2 fixed top-3 right-4 z-50 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md text-xs">
        <span className="text-slate-400 font-medium">Layout:</span>
        <button
          onClick={() => setIsPhoneFrame(true)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition ${
            isPhoneFrame
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android Phone</span>
        </button>
        <button
          onClick={() => setIsPhoneFrame(false)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition ${
            !isPhoneFrame
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Full Width</span>
        </button>
      </div>

      {/* Frame Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          isPhoneFrame
            ? 'max-w-[420px] h-[100dvh] sm:h-[844px] sm:rounded-[44px] sm:border-[8px] sm:border-slate-800/90 sm:shadow-[0_0_50px_rgba(0,180,255,0.12)] overflow-hidden relative bg-[#0B0F19]'
            : 'max-w-2xl min-h-screen bg-[#0B0F19] relative'
        }`}
      >
        {/* Android Punch Hole & Status Bar */}
        <div className="bg-[#0B0F19] px-6 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300 select-none z-30 shrink-0">
          <span>{currentTime || '18:50'}</span>

          {/* Android Camera Punch Hole */}
          <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800 shadow-inner" />

          <div className="flex items-center space-x-1.5 text-slate-400">
            <Signal className="w-3 h-3 text-slate-300" />
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <div className="flex items-center">
              <span className="text-[10px] mr-0.5">92%</span>
              <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
          </div>
        </div>

        {/* Inner Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  );
};
