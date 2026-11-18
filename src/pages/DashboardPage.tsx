import React from 'react';
import {
  Power,
  ArrowDown,
  ArrowUp,
  Clock,
  Shield,
  ShieldAlert,
  Server,
  Activity,
  Globe,
  Radio,
  ChevronRight,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { VpnStoreType } from '../stores/useVpnStore';
import { formatSpeed, formatDuration, getProtocolBadgeColor } from '../utils/formatters';

interface DashboardPageProps {
  store: VpnStoreType;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ store }) => {
  const {
    connectionInfo,
    selectedProfile,
    trafficStats,
    durationSecs,
    connect,
    disconnect,
    setActiveTab,
    settings,
    updateOperatingMode,
  } = store;

  const isConnected = connectionInfo.status === 'Connected';
  const isConnecting = connectionInfo.status === 'Connecting' || connectionInfo.status === 'Reconnecting';
  const isDisconnecting = connectionInfo.status === 'Disconnecting';
  const isError = connectionInfo.status === 'Error';

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else if (!isConnecting && !isDisconnecting) {
      if (!selectedProfile) {
        setActiveTab('servers');
        return;
      }
      connect();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 sm:p-6 max-w-md mx-auto w-full select-none relative overflow-hidden">
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <img
          src="/logo.png"
          alt=""
          className="w-64 h-64 sm:w-72 sm:h-72 object-contain opacity-[0.06] blur-[0.5px] scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      
      <div className="flex items-center justify-between gap-2 pt-1">
        
        <div className="flex items-center bg-[#0d0d0d] p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => updateOperatingMode('tun')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.defaultMode === 'tun'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>VPN (TUN)</span>
          </button>
          <button
            onClick={() => updateOperatingMode('system_proxy')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              settings.defaultMode === 'system_proxy'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Proxy</span>
          </button>
        </div>

        
        <div
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0d0d0d] border border-white/10 text-xs font-medium cursor-pointer hover:border-white/30 transition-all"
        >
          {settings.killSwitchEnabled ? (
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-200" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-neutral-200" />
          )}
          <span className="text-[11px] text-neutral-300 font-mono">
            {settings.killSwitchEnabled ? 'Kill Switch' : 'Protected'}
          </span>
        </div>
      </div>

      
      <div className="flex flex-col items-center justify-center my-auto py-6">
        
        <div className="relative flex items-center justify-center">
          <div
            className={`absolute w-52 h-52 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              isConnected
                ? 'bg-white/20 scale-110'
                : isConnecting
                ? 'bg-white/15 scale-105 animate-pulse'
                : isError
                ? 'bg-red-500/15'
                : 'bg-white/5 scale-95'
            }`}
          />

          
          {isConnected && (
            <div className="absolute -inset-4 rounded-full border border-white/30 animate-ping pointer-events-none" />
          )}
          {isConnecting && (
            <div className="absolute -inset-4 rounded-full border border-white/30 animate-pulse pointer-events-none" />
          )}

          
          <button
            onClick={handleToggle}
            disabled={isConnecting || isDisconnecting}
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 shadow-2xl relative z-10 ${
              isConnected
                ? 'bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.4)] ring-4 ring-white/25 hover:bg-neutral-100'
                : isConnecting || isDisconnecting
                ? 'bg-neutral-800 text-neutral-200 border-2 border-white/30 cursor-wait animate-pulse'
                : isError
                ? 'bg-neutral-900 text-red-300 border border-red-500/40 hover:brightness-110'
                : 'bg-[#0d0d0d] hover:bg-[#151515] text-white border-2 border-white/20 hover:border-white/60 shadow-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-2 ring-white/5'
            }`}
          >
            <Power className="w-12 h-12 mb-1.5 transition-transform group-hover:scale-105" />
            <span className="text-xs font-bold tracking-widest uppercase">
              {isConnected
                ? 'CONNECTED'
                : isConnecting
                ? 'CONNECTING'
                : isDisconnecting
                ? 'STOPPING'
                : !selectedProfile
                ? 'CHOOSE SERVER'
                : 'CONNECT'}
            </span>
          </button>
        </div>

        
        <div className="mt-6 text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] animate-pulse'
                  : isConnecting
                  ? 'bg-neutral-400 animate-bounce'
                  : isError
                  ? 'bg-red-400'
                  : 'bg-neutral-600'
              }`}
            />
            <span className="text-sm font-bold tracking-wide text-white">
              {isConnected
                ? 'Protected & Encrypted'
                : isConnecting
                ? 'Establishing Secure Tunnel...'
                : isError
                ? 'Connection Error'
                : 'Not Connected'}
            </span>
          </div>

          
          <p className="text-xs text-neutral-400 font-mono">
            {connectionInfo.publicIp ? (
              <span>
                {connectionInfo.publicIp}
                {connectionInfo.location?.city ? ` • ${connectionInfo.location.city}, ${connectionInfo.location.countryCode}` : ''}
              </span>
            ) : (
              'IP Protected'
            )}
          </p>

          
          {connectionInfo.errorMessage && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-300 bg-red-950/60 px-3 py-1 rounded-xl border border-red-800/60">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="truncate max-w-[280px]">{connectionInfo.errorMessage}</span>
            </div>
          )}
        </div>

        
        {isConnected && (
          <div className="w-full grid grid-cols-4 gap-2 mt-6 p-3 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-xl">
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase font-semibold">
                <ArrowDown className="w-3 h-3 text-white" />
                <span>Down</span>
              </div>
              <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">
                {formatSpeed(trafficStats.downloadSpeedBps)}
              </div>
            </div>

            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase font-semibold">
                <ArrowUp className="w-3 h-3 text-neutral-300" />
                <span>Up</span>
              </div>
              <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">
                {formatSpeed(trafficStats.uploadSpeedBps)}
              </div>
            </div>

            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase font-semibold">
                <Activity className="w-3 h-3 text-neutral-300" />
                <span>Ping</span>
              </div>
              <div className="text-xs font-mono font-bold text-white mt-0.5">
                {trafficStats.latencyMs ? `${trafficStats.latencyMs} ms` : '--'}
              </div>
            </div>

            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase font-semibold">
                <Clock className="w-3 h-3 text-neutral-300" />
                <span>Time</span>
              </div>
              <div className="text-xs font-mono font-bold text-white mt-0.5">
                {formatDuration(durationSecs)}
              </div>
            </div>
          </div>
        )}
      </div>

      
      <div className="w-full pb-1">
        <div
          onClick={() => setActiveTab('servers')}
          className="group flex items-center justify-between p-3.5 rounded-2xl bg-[#0d0d0d] hover:bg-[#141414] border border-white/10 hover:border-white/30 shadow-lg cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center gap-3 min-w-0">
            
            <div className="w-10 h-10 rounded-xl bg-[#050505] border border-white/10 flex items-center justify-center text-lg shrink-0 shadow-inner">
              {selectedProfile?.countryCode === 'SG'
                ? '🇸🇬'
                : selectedProfile?.countryCode === 'US'
                ? '🇺🇸'
                : selectedProfile?.countryCode === 'DE'
                ? '🇩🇪'
                : selectedProfile?.countryCode === 'JP'
                ? '🇯🇵'
                : selectedProfile?.countryCode === 'GB'
                ? '🇬🇧'
                : '🌐'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate group-hover:text-neutral-200 transition-colors">
                  {selectedProfile?.name || 'No Server Selected'}
                </span>
                {selectedProfile?.protocol && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${getProtocolBadgeColor(
                      selectedProfile.protocol
                    )}`}
                  >
                    {selectedProfile.protocol}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
                {selectedProfile ? `${selectedProfile.server}:${selectedProfile.port}` : 'Click to pick a server'}
              </div>
            </div>
          </div>

          
          <div className="flex items-center gap-2 shrink-0">
            {selectedProfile?.latencyMs && selectedProfile.latencyMs > 0 ? (
              <span className="text-[11px] font-mono font-semibold text-neutral-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                {selectedProfile.latencyMs} ms
              </span>
            ) : null}
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
