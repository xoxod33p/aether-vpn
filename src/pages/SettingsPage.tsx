import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  Globe,
  Radio,
  Zap,
  Terminal,
  Check,
  Power,
  RotateCcw,
} from 'lucide-react';
import { AppSettings, OperatingMode } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';

interface SettingsPageProps {
  store: VpnStoreType;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ store }) => {
  const { settings, setSettings, toggleKillSwitch, updateOperatingMode, setActiveTab } = store;
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      vpnApi.saveSettings(next).catch(console.error);
      return next;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1200);
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-5 max-w-md mx-auto w-full select-none overflow-y-auto">
      
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-white" />
          <h2 className="text-base font-bold text-white">Settings</h2>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/20 animate-fade">
            <Check className="w-3 h-3" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        
        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-white" />
            <span>Security & Privacy</span>
          </div>

          
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white">Kill Switch</div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Block all traffic if VPN connection drops
              </p>
            </div>
            <button
              onClick={() => toggleKillSwitch(!settings.killSwitchEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.killSwitchEnabled ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.killSwitchEnabled ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">DNS Leak Protection</div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Enforce encrypted DNS over HTTPS (Cloudflare 1.1.1.1)
              </p>
            </div>
            <button
              onClick={() => handleToggle('dnsLeakProtection', !settings.dnsLeakProtection)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.dnsLeakProtection ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.dnsLeakProtection ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Disable IPv6 on VPN</div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Stops ISP IPv6 leaks and connection timeouts
              </p>
            </div>
            <button
              onClick={() => handleToggle('enableIpv6', !settings.enableIpv6)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                !settings.enableIpv6 ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  !settings.enableIpv6 ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        
        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-white" />
            <span>Default Operating Mode</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            
            <div
              onClick={() => updateOperatingMode('tun')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                settings.defaultMode === 'tun'
                  ? 'bg-neutral-900 border-white text-white shadow-md shadow-black'
                  : 'bg-black border-white/10 text-neutral-400 hover:border-white/30'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-white" />
                <span>VPN (TUN)</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 leading-tight">
                Virtual adapter routing all apps & games
              </p>
            </div>

            
            <div
              onClick={() => updateOperatingMode('system_proxy')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                settings.defaultMode === 'system_proxy'
                  ? 'bg-neutral-900 border-white text-white shadow-md shadow-black'
                  : 'bg-black border-white/10 text-neutral-400 hover:border-white/30'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-white" />
                <span>System Proxy</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 leading-tight">
                HTTP & SOCKS5 proxy via Windows settings
              </p>
            </div>
          </div>
        </div>

        
        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>Connection & App</span>
          </div>

          
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white">Auto Reconnect</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Automatically restore tunnel if disconnected
              </p>
            </div>
            <button
              onClick={() => handleToggle('autoReconnect', !settings.autoReconnect)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.autoReconnect ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.autoReconnect ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Start on Boot</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Launch AetherVPN when Windows starts
              </p>
            </div>
            <button
              onClick={() => handleToggle('startOnBoot', !settings.startOnBoot)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.startOnBoot ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.startOnBoot ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Minimize to System Tray</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Keep running in background when closed
              </p>
            </div>
            <button
              onClick={() => handleToggle('minimizeToTray', !settings.minimizeToTray)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.minimizeToTray ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.minimizeToTray ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        
        <div
          onClick={() => setActiveTab('logs')}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0d0d0d] hover:bg-[#161616] border border-white/10 text-xs font-medium text-neutral-300 hover:text-white cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-white" />
            <span>Open Connection Logs</span>
          </div>
          <span className="text-neutral-500 text-xs">&rarr;</span>
        </div>

        
        <div className="pt-2 pb-4 text-center text-neutral-500 text-[11px]">
          <p className="font-semibold text-neutral-400">AetherVPN v0.1.3</p>
          <p className="text-[10px] mt-0.5 text-neutral-500">Secure &bull; Encrypted &bull; Private</p>
        </div>
      </div>
    </div>
  );
};
