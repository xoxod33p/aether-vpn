import React from 'react';
import {
  Shield,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { VpnStoreType } from '../stores/useVpnStore';

interface AboutPageProps {
  store: VpnStoreType;
}

export const AboutPage: React.FC<AboutPageProps> = () => {
  return (
    <div className="p-4 sm:p-5 max-w-md mx-auto w-full space-y-4 select-none">
      {/* Brand Hero */}
      <div className="p-6 rounded-3xl bg-[#0d0d0d] border border-white/10 flex flex-col items-center text-center relative overflow-hidden shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/20 flex items-center justify-center text-white shadow-xl shadow-black mb-3">
          <Shield className="w-9 h-9 text-white" />
        </div>

        <h1 className="text-xl font-extrabold text-white tracking-tight">
          Aether
        </h1>
        <p className="text-xs text-neutral-400 max-w-xs mt-1">
          Modern, lightweight, cross-platform VPN &amp; proxy client designed for maximum privacy, speed, and simplicity.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-black border border-white/10 text-neutral-300 font-mono">
            v0.1.0
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-neutral-200 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Verified
          </span>
        </div>
      </div>

      {/* Security Principles */}
      <div className="p-5 rounded-2xl bg-[#0d0d0d] border border-white/10 space-y-3 shadow-lg">
        <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-white" />
          <span>Privacy &amp; Security Principles</span>
        </h3>
        <ul className="text-xs text-neutral-300 space-y-2.5 leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Logs:</strong> Your browsing activity is strictly private and never recorded or tracked.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
            <span>
              <strong>Encrypted Tunnels:</strong> All data packets are encrypted using modern cryptographic protocols.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
            <span>
              <strong>Leak Protection:</strong> Built-in safeguards protect against DNS, IPv6, and connection drops.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
