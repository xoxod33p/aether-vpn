import React from 'react';
import {
  Power,
  ArrowDown,
  ArrowUp,
  Clock,
  Shield,
  Server,
  Activity,
  Globe,
  Radio,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { VpnStoreType } from '../stores/useVpnStore';
import { formatBytes, formatSpeed, formatDuration, getProtocolBadgeColor } from '../utils/formatters';

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
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4 select-none">
      {/* Top Banner / Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Large Connect / Disconnect Card */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between items-center relative overflow-hidden">
          {/* Ambient Glows */}
          <div
            className={`absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              isConnected
                ? 'bg-emerald-500/20'
                : isConnecting
                ? 'bg-amber-500/20'
                : 'bg-cyan-500/10'
            }`}
          />
          <div
            className={`absolute -bottom-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              isConnected
                ? 'bg-cyan-500/20'
                : isConnecting
                ? 'bg-amber-500/10'
                : 'bg-blue-500/10'
            }`}
          />

          {/* Mode Pill Header */}
          <div className="w-full flex justify-between items-center z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Mode
              </span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono font-medium">
                {settings.defaultMode === 'tun' ? 'TUN' : 'System Proxy'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Protocol:</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-md font-mono uppercase font-semibold border ${
                  selectedProfile
                    ? getProtocolBadgeColor(selectedProfile.protocol)
                    : 'text-slate-400 bg-slate-800/60 border-slate-700'
                }`}
              >
                {selectedProfile?.protocol || 'None'}
              </span>
            </div>
          </div>

          {/* Connect Button Centerpiece */}
          <div className="my-4 flex flex-col items-center z-10">
            <div className="relative group">
              {/* Pulsing Outer Rings */}
              {isConnected && (
                <div className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
              )}
              {isConnecting && (
                <div className="absolute -inset-3 rounded-full bg-amber-500/20 animate-pulse pointer-events-none" />
              )}

              <button
                onClick={handleToggle}
                disabled={isConnecting || isDisconnecting}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl relative cursor-pointer active:scale-95 ${
                  isConnected
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:brightness-110'
                    : isConnecting || isDisconnecting
                    ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 text-white shadow-amber-500/30 cursor-wait'
                    : isError
                    ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/30'
                    : 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110'
                }`}
              >
                <Power className="w-10 h-10 mb-0.5" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  {isConnected
                    ? 'Disconnect'
                    : isConnecting
                    ? 'Connecting'
                    : isDisconnecting
                    ? 'Stopping'
                    : !selectedProfile
                    ? 'Select Server'
                    : 'Connect'}
                </span>
              </button>
            </div>

            {/* Connection Status Label */}
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                      : isConnecting
                      ? 'bg-amber-400 animate-bounce'
                      : isError
                      ? 'bg-rose-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-sm font-semibold text-white tracking-wide">
                  {connectionInfo.status}
                </span>
              </div>
              {connectionInfo.errorMessage && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/40 px-2.5 py-0.5 rounded-lg border border-rose-900/40">
                  <AlertCircle className="w-3 h-3" />
                  <span>{connectionInfo.errorMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Session Timer & Latency Footer */}
          <div className="w-full grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-3 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Uptime</div>
                <div className="text-xs font-mono font-bold text-white">
                  {isConnected ? formatDuration(durationSecs) : '00:00:00'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Latency</div>
                <div className="text-xs font-mono font-bold text-white">
                  {isConnected ? `${trafficStats.latencyMs} ms` : '-- ms'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info Stack */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Active Server Card */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Selected Endpoint</span>
              </div>
              <button
                onClick={() => setActiveTab('servers')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-medium cursor-pointer"
              >
                <span>Change</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {selectedProfile ? (
              <div className="space-y-3">
                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">
                        {selectedProfile.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {selectedProfile.server}:{selectedProfile.port}
                      </div>
                    </div>
                    <span className="text-base">
                      {selectedProfile.countryCode === 'DE' ? '🇩🇪' : selectedProfile.countryCode === 'JP' ? '🇯🇵' : selectedProfile.countryCode === 'GB' ? '🇬🇧' : selectedProfile.countryCode === 'SG' ? '🇸🇬' : '🇺🇸'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">Region Group:</span>
                    <span className="text-slate-200 font-medium">
                      {selectedProfile.groupName || 'Default'}
                    </span>
                  </div>
                </div>

                {/* Public Geo IP Card */}
                <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Public IP
                      </div>
                      <div className="text-xs font-mono font-bold text-white">
                        {connectionInfo.publicIp || 'Detecting...'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Location
                    </div>
                    <div className="text-xs font-medium text-slate-200">
                      {connectionInfo.location?.city
                        ? `${connectionInfo.location.city}, ${connectionInfo.location.country}`
                        : 'Detecting...'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-2 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                <Server className="w-6 h-6 text-slate-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-300">No Servers Configured</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 max-w-xs">
                    Add a server manually or import a subscription link.
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('servers')}
                  className="mt-1 px-3 py-1 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-medium hover:bg-cyan-600/30 transition-all cursor-pointer"
                >
                  Configure Server
                </button>
              </div>
            )}
          </div>

          {/* Quick Kill Switch Card */}
          <div className="glass-panel rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  settings.killSwitchEnabled
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-white">
                  Firewall Kill Switch
                </div>
                <div className="text-[11px] text-slate-400">
                  {settings.killSwitchEnabled
                    ? 'Blocking all leaks if tunnel drops'
                    : 'Disabled. Non-VPN traffic allowed'}
                </div>
              </div>
            </div>

            <button
              onClick={() => store.toggleKillSwitch(!settings.killSwitchEnabled)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                settings.killSwitchEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-0.5 ${
                  settings.killSwitchEnabled ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Live Telemetry Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Download Speed */}
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Download</span>
            <div className="w-6 h-6 rounded-md bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <ArrowDown className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            {formatSpeed(trafficStats.downloadSpeedBps)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span>Total:</span>
            <span className="text-slate-200 font-semibold">{formatBytes(trafficStats.totalDownloadBytes)}</span>
          </div>
        </div>

        {/* Upload Speed */}
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Upload</span>
            <div className="w-6 h-6 rounded-md bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <ArrowUp className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            {formatSpeed(trafficStats.uploadSpeedBps)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span>Total:</span>
            <span className="text-slate-200 font-semibold">{formatBytes(trafficStats.totalUploadBytes)}</span>
          </div>
        </div>

        {/* Active Connections */}
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Active Sockets</span>
            <div className="w-6 h-6 rounded-md bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <Radio className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            {trafficStats.activeConnections}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 truncate">
            <span>sing-box routed sockets</span>
          </div>
        </div>

        {/* DNS Leak Status */}
        <div className="glass-card rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase text-slate-400">DNS Protection</span>
            <div className="w-6 h-6 rounded-md bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
              <Shield className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-emerald-400 tracking-tight">
            Protected
          </div>
          <div className="mt-1 text-[10px] text-slate-400 truncate">
            <span>DoH: Cloudflare 1.1.1.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
