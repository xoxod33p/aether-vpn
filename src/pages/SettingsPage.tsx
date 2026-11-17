import React from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Wifi,
  Sliders,
  Bell,
  RefreshCw,
  Cpu,
  Save,
  Check,
} from 'lucide-react';
import { AppSettings, OperatingMode } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';

interface SettingsPageProps {
  store: VpnStoreType;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ store }) => {
  const { settings, setSettings, addLog } = store;

  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handleUpdate = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      vpnApi.saveSettings(next).catch(console.error);
      return next;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  return (
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4 select-none">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Client Preferences</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure system startup, connection defaults, virtual MTU, and firewall leak rules.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40 animate-fade">
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-cyan-400" />
          <span>General Settings</span>
        </h3>

        <div className="divide-y divide-slate-800/60 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-semibold">Start with Operating System</div>
              <div className="text-slate-400 text-[11px]">Launch AetherVPN automatically on system boot</div>
            </div>
            <button
              onClick={() => handleUpdate('startOnBoot', !settings.startOnBoot)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.startOnBoot ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                  settings.startOnBoot ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-semibold">Minimize to System Tray</div>
              <div className="text-slate-400 text-[11px]">Keep active in background when window is closed</div>
            </div>
            <button
              onClick={() => handleUpdate('minimizeToTray', !settings.minimizeToTray)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.minimizeToTray ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                  settings.minimizeToTray ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-semibold">Start Minimized</div>
              <div className="text-slate-400 text-[11px]">Launch silently into system tray on boot</div>
            </div>
            <button
              onClick={() => handleUpdate('startMinimized', !settings.startMinimized)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.startMinimized ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                  settings.startMinimized ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Networking & Engine Defaults */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          <span>Networking & Engine Defaults</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
              Default Connection Mode
            </label>
            <select
              value={settings.defaultMode}
              onChange={(e) => handleUpdate('defaultMode', e.target.value as OperatingMode)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="tun">TUN Virtual Network Interface (Full Device Routing)</option>
              <option value="system_proxy">System Proxy (HTTP & SOCKS5 Hook)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
              Interface MTU
            </label>
            <input
              type="number"
              value={settings.mtu}
              onChange={(e) => handleUpdate('mtu', parseInt(e.target.value) || 9000)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
              Handshake Timeout (seconds)
            </label>
            <input
              type="number"
              value={settings.connectionTimeoutSecs}
              onChange={(e) =>
                handleUpdate('connectionTimeoutSecs', parseInt(e.target.value) || 15)
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
              Clash REST API Port
            </label>
            <input
              type="number"
              value={settings.clashApiPort}
              onChange={(e) =>
                handleUpdate('clashApiPort', parseInt(e.target.value) || 9090)
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <div className="text-slate-200 font-semibold">Automatic Reconnect</div>
            <div className="text-slate-400 text-[11px]">Re-establish tunnel if network fluctuates or drops</div>
          </div>
          <button
            onClick={() => handleUpdate('autoReconnect', !settings.autoReconnect)}
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              settings.autoReconnect ? 'bg-cyan-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                settings.autoReconnect ? 'left-4.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Security & Leak Shield */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Security & Leak Hardening</span>
        </h3>

        <div className="divide-y divide-slate-800/60 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-semibold">Firewall Kill Switch</div>
              <div className="text-slate-400 text-[11px]">
                Drop non-VPN outbound traffic via OS packet filter if connection drops unexpectedly
              </div>
            </div>
            <button
              onClick={() => handleUpdate('killSwitchEnabled', !settings.killSwitchEnabled)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.killSwitchEnabled ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                  settings.killSwitchEnabled ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-semibold">DNS Leak Protection</div>
              <div className="text-slate-400 text-[11px]">
                Force all resolver packets exclusively through encrypted DoH/DoT upstream
              </div>
            </div>
            <button
              onClick={() => handleUpdate('dnsLeakProtection', !settings.dnsLeakProtection)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.dnsLeakProtection ? 'bg-cyan-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                  settings.dnsLeakProtection ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
