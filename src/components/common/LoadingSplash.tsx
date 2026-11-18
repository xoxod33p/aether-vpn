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

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <img
            src="/logo.png"
            alt="Aether"
            className="w-24 h-24 object-contain relative z-10 drop-shadow-[0_0_24px_rgba(255,255,255,0.35)]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/favicon.svg';
            }}
          />
        </div>

        <div className="space-y-1 mb-6">
          <h1 className="text-xl font-bold tracking-wider text-white">Aether</h1>
          <p className="text-xs text-neutral-400 font-medium">Fast &amp; Secure Desktop Client</p>
        </div>

        <div className="w-52 mb-4">
          <div className="w-full h-1 bg-[#161616] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-300 font-mono">
          <div className="relative flex items-center justify-center w-2 h-2">
            <div className="relative w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
};
