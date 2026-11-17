import React from 'react';
import {
  Shield,
  CheckCircle,
  ExternalLink,
  Code,
  Lock,
  Cpu,
  Layers,
  Heart,
} from 'lucide-react';
import { VpnStoreType } from '../stores/useVpnStore';

interface AboutPageProps {
  store: VpnStoreType;
}

export const AboutPage: React.FC<AboutPageProps> = () => {
  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4 select-none">
      {/* Brand Hero */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800/80 flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 mb-4">
          <Shield className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Aether<span className="text-cyan-400">VPN</span>
        </h1>
        <p className="text-xs text-slate-400 max-w-md mt-1">
          Modern, high-performance, cross-platform VPN and proxy client built with Rust, Tauri 2, and the sing-box universal networking engine.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 font-mono">
            v0.1.0-alpha (Phase 1)
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Core Verified
          </span>
        </div>
      </div>

      {/* Component Versions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Networking Engine</div>
          <div className="text-sm font-bold font-mono text-white mt-1">sing-box 1.9.3</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Clash API / TUN / Mixed</div>
        </div>

        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Core Runtime</div>
          <div className="text-sm font-bold font-mono text-white mt-1">Rust 1.90+</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tokio Async / Rusqlite</div>
        </div>

        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Application Shell</div>
          <div className="text-sm font-bold font-mono text-white mt-1">Tauri 2.12</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Zero-bloat IPC bridge</div>
        </div>

        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-[11px] font-semibold uppercase text-slate-400">User Interface</div>
          <div className="text-sm font-bold font-mono text-white mt-1">React 19 + TS</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tailwind CSS Obsidian</div>
        </div>
      </div>

      {/* Security Principles */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>Security & Engineering Commitments</span>
        </h3>
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>No Custom Cryptography:</strong> All TLS, WireGuard, Shadowsocks, and VLESS protocol handshakes are performed by established, audited network stacks.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Credential Sanitization:</strong> Authentication tokens, UUIDs, private keys, and passwords are automatically redacted from all diagnostic logs.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Safe Privilege Separation:</strong> Elevation is isolated to TUN network adapter initialization, avoiding unnecessary administrative execution of the application shell.
            </span>
          </li>
        </ul>
      </div>

      {/* Open Source Acknowledgments */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" />
          <span>Open Source Ecosystem</span>
        </h3>
        <p className="text-xs text-slate-400">
          AetherVPN is inspired by the capabilities of community proxy tooling including Throne, Matsuri, Nekoray, and the sing-box universal proxy platform. Built with open-source software under the MIT License.
        </p>
      </div>
    </div>
  );
};
