import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Globe,
  Wifi,
  Zap,
} from 'lucide-react';
import { VpnStoreType } from '../../stores/useVpnStore';

interface TopbarProps {
  store: VpnStoreType;
}

export const Topbar: React.FC<TopbarProps> = ({ store }) => {
  const {
    activeTab,
    connectionInfo,
    settings,
    toggleKillSwitch,
    trafficStats,
    selectedProfile,
  } = store;

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Network Dashboard';
      case 'servers':
        return 'Proxy & VPN Servers';
      case 'subscriptions':
        return 'Subscription Providers';
      case 'routing':
        return 'Visual Routing Rules';
      case 'dns':
        return 'DNS & Leak Protection';
      case 'traffic':
        return 'Real-Time Traffic Telemetry';
      case 'logs':
        return 'Diagnostics & Engine Logs';
      case 'settings':
        return 'Client Preferences';
      case 'about':
        return 'About AetherVPN';
      default:
        return 'Dashboard';
    }
  };

  const isConnected = connectionInfo.status === 'Connected';

  return (
    <header className="h-12 bg-black/90 border-b border-[#152347] px-4 flex items-center justify-between backdrop-blur-md select-none shrink-0">
      {/* Title */}
      <div>
        <h1 className="text-sm font-semibold text-white tracking-tight leading-none">
          {getPageTitle()}
        </h1>
        <p className="text-[10px] text-blue-300/70 mt-0.5 leading-none font-mono">
          sing-box &bull; {settings.defaultMode === 'tun' ? 'TUN Interface' : 'System Proxy'}
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Latency Indicator */}
        {isConnected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#060d21] border border-[#172a59] text-[11px] font-mono shadow-sm">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">{trafficStats.latencyMs} ms</span>
          </div>
        )}

        {/* Public IP & Geo */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#060d21] border border-[#172a59] text-[11px] font-mono shadow-sm">
          <Globe className="w-3 h-3 text-blue-400" />
          <span className="text-blue-100 font-medium">
            {connectionInfo.publicIp || 'Detecting...'}
          </span>
          {connectionInfo.location && (
            <span className="text-[10px] px-1 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/80">
              {connectionInfo.location.countryCode} &bull; {connectionInfo.location.city}
            </span>
          )}
        </div>

        {/* Kill Switch Toggle */}
        <button
          onClick={() => toggleKillSwitch(!settings.killSwitchEnabled)}
          title={settings.killSwitchEnabled ? 'Kill Switch Armed (Traffic blocked on disconnect)' : 'Kill Switch Disarmed'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 border cursor-pointer ${
            settings.killSwitchEnabled
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-950/40'
              : 'bg-[#060d21] border-[#172a59] text-slate-400 hover:text-blue-200 hover:bg-[#0c183a]'
          }`}
        >
          {settings.killSwitchEnabled ? (
            <ShieldAlert className="w-3 h-3 text-amber-400" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-blue-400/70" />
          )}
          <span>Kill Switch</span>
        </button>

        {/* Quick Protocol Badge */}
        {selectedProfile && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-700/60 text-[10px] font-mono text-blue-300 uppercase shadow-sm">
            <Zap className="w-2.5 h-2.5 text-blue-400" />
            <span>{selectedProfile.protocol}</span>
          </div>
        )}
      </div>
    </header>
  );
};
