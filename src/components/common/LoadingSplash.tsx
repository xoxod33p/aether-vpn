import React, { useState, useEffect } from 'react';

interface LoadingSplashProps {
  onFinished?: () => void;
}

export const LoadingSplash: React.FC<LoadingSplashProps> = ({ onFinished }) => {
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [statusText, setStatusText] = useState('Initializing Aether...');
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const tProgress = setTimeout(() => {
      setProgress(85);
      setStatusText('Ready');
    }, 180);

    const t1 = setTimeout(() => {
      setPhase('fading');
    }, 380);

    const t2 = setTimeout(() => {
      setPhase('done');
      if (onFinished) onFinished();
    }, 680);

    return () => {
      clearTimeout(tProgress);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinished]);

  if (phase === 'done') {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl transition-all duration-700 select-none ${
        phase === 'fading' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 shadow-2xl shadow-black max-w-sm w-full mx-4 text-center">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl animate-location-beacon" />
          <div className="relative w-20 h-20 rounded-2xl bg-black border border-white/20 p-2.5 flex items-center justify-center shadow-xl shadow-black">
            <img
              src="/logo.png"
              alt="Aether"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.svg';
              }}
            />
          </div>
        </div>

        <div className="space-y-1 mb-5">
          <h1 className="text-xl font-bold tracking-wider text-white">Aether</h1>
          <p className="text-xs text-neutral-400 font-medium">Fast &amp; Secure Desktop Client</p>
        </div>

        <div className="w-full max-w-[220px] mb-3">
          <div className="w-full h-1 bg-[#161616] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-300 font-mono">
          <div className="relative flex items-center justify-center w-2 h-2">
            <div className="absolute w-full h-full rounded-full bg-white animate-location-beacon" />
            <div className="relative w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};
