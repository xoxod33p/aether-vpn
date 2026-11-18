import React, { useState, useEffect } from 'react';

interface LoadingSplashProps {
  onFinished?: () => void;
}

export const LoadingSplash: React.FC<LoadingSplashProps> = ({ onFinished }) => {
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [statusText, setStatusText] = useState('Initializing AetherVPN...');
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('fading');
    }, 350);

    const t2 = setTimeout(() => {
      setPhase('done');
      if (onFinished) onFinished();
    }, 650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinished]);

  if (phase === 'done') {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl transition-all duration-700 select-none ${
        phase === 'fading' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Center Modal */}
      <div className="relative z-10 flex flex-col items-center p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 shadow-2xl shadow-black max-w-sm w-full mx-4 text-center">
        {/* Glowing Logo Container */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-3 bg-white/10 rounded-2xl blur-lg" />
          <div className="relative w-20 h-20 rounded-2xl bg-black border border-white/20 p-2.5 flex items-center justify-center shadow-xl shadow-black">
            <img
              src="/logo.png"
              alt="AetherVPN"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
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
          </div>
          <p className="text-xs text-neutral-400 font-medium">Fast &amp; Secure Desktop Client</p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full max-w-[220px] mb-3">
          <div className="w-full h-1.5 bg-[#181818] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,255,255,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status text */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-300 font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};
