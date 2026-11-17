import React, { useState, useEffect } from 'react';

interface LoadingSplashProps {
  onFinished?: () => void;
}

export const LoadingSplash: React.FC<LoadingSplashProps> = ({ onFinished }) => {
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [statusText, setStatusText] = useState('Initializing AetherVPN Engine...');
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStatusText('Configuring TUN & Routing Tables...');
      setProgress(60);
    }, 600);

    const t2 = setTimeout(() => {
      setStatusText('Core Telemetry & Supervisor Ready');
      setProgress(100);
    }, 1200);

    const t3 = setTimeout(() => {
      setPhase('fading');
    }, 1600);

    const t4 = setTimeout(() => {
      setPhase('done');
      if (onFinished) onFinished();
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinished]);

  if (phase === 'done') {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl transition-all duration-700 select-none ${
        phase === 'fading' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-64 h-64 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glass Center Modal */}
      <div className="relative z-10 flex flex-col items-center p-8 rounded-3xl bg-[#040817]/90 border border-[#1e3a8a]/40 shadow-2xl shadow-black/90 max-w-sm w-full mx-4 text-center">
        {/* Glowing Logo Container */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-3 bg-gradient-to-tr from-blue-700/40 via-blue-500/20 to-indigo-600/30 rounded-2xl blur-lg animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#060e24] border border-[#2563eb]/40 p-2.5 flex items-center justify-center shadow-xl shadow-blue-950/60">
            <img
              src="/logo.png"
              alt="AetherVPN"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
              onError={(e) => {
                // Fallback to favicon if logo.png format fails
                (e.target as HTMLImageElement).src = '/favicon.svg';
              }}
            />
          </div>
        </div>

        {/* Title & Brand */}
        <div className="space-y-1 mb-5">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-white">Aether</h1>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600/25 text-blue-400 border border-blue-500/40 font-mono tracking-widest">
              VPN
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Sing-Box Universal Networking Core</p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full max-w-[220px] mb-3">
          <div className="w-full h-1.5 bg-[#09142e] rounded-full overflow-hidden border border-[#172a59]">
            <div
              className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-sm shadow-blue-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status text */}
        <div className="flex items-center gap-2 text-[11px] text-blue-300/80 font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};
