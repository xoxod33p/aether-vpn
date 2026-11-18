import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Globe,
  MessageSquare,
  Music,
  Gamepad2,
  Code,
  Terminal,
  Shield,
  Cpu,
  ArrowDown,
  ArrowUp,
  Activity,
  Wifi,
  ExternalLink,
  Filter,
  Minus,
} from 'lucide-react';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';
import { formatBytes, formatSpeed } from '../utils/formatters';

interface AppsPageProps {
  store: VpnStoreType;
}

export const AppsPage: React.FC<AppsPageProps> = ({ store }) => {
  const { appUsages, connectionInfo, trafficStats, setActiveTab } = store;
  const isConnected = connectionInfo.status === 'Connected';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'usage' | 'downSpeed' | 'upSpeed' | 'conns'>('usage');

  const filteredApps = useMemo(() => {
    let list = [...appUsages];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.displayName.toLowerCase().includes(q) ||
          a.processName.toLowerCase().includes(q) ||
          a.destinationHosts.some((h) => h.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'downSpeed') return b.downloadSpeedBps - a.downloadSpeedBps;
      if (sortBy === 'upSpeed') return b.uploadSpeedBps - a.uploadSpeedBps;
      if (sortBy === 'conns') return b.activeConnections - a.activeConnections;
      return b.downloadBytes + b.uploadBytes - (a.downloadBytes + a.uploadBytes);
    });

    return list;
  }, [appUsages, searchQuery, sortBy]);

  const maxTotalBytes = useMemo(() => {
    if (appUsages.length === 0) return 1;
    return Math.max(...appUsages.map((a) => a.downloadBytes + a.uploadBytes), 1);
  }, [appUsages]);

  const totalAppBytes = useMemo(() => {
    return appUsages.reduce((acc, a) => acc + a.downloadBytes + a.uploadBytes, 0);
  }, [appUsages]);

  const getAppIcon = (iconType: string) => {
    switch (iconType) {
      case 'browser':
        return <Globe className="w-4 h-4 text-white" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-white" />;
      case 'media':
        return <Music className="w-4 h-4 text-white" />;
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-white" />;
      case 'code':
        return <Code className="w-4 h-4 text-white" />;
      case 'terminal':
        return <Terminal className="w-4 h-4 text-white" />;
      case 'vpn':
        return <Shield className="w-4 h-4 text-white" />;
      case 'system':
        return <Cpu className="w-4 h-4 text-white" />;
      default:
        return <Layers className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 p-4 max-w-4xl mx-auto w-full select-none overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Application Usage</h2>
            {isConnected && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-black">
                {appUsages.length} Active
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time applications actively consuming VPN bandwidth and routing through the tunnel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-all font-sans"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0d0d0d] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-white/30 transition-all cursor-pointer font-sans"
            >
              <option value="usage">Highest Usage</option>
              <option value="downSpeed">Download Speed</option>
              <option value="upSpeed">Upload Speed</option>
              <option value="conns">Active Sockets</option>
            </select>
          </div>

          <button
            onClick={() => vpnApi.minimizeWindow()}
            title="Minimize to toolbar"
            className="p-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-neutral-400 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4 shrink-0">
        <div className="p-3 rounded-2xl bg-[#0d0d0d] border border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase">
            <Layers className="w-3.5 h-3.5 text-white" />
            <span>Active Apps</span>
          </div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {isConnected ? appUsages.length : 0}
          </div>
          <div className="text-[10px] text-neutral-500 truncate mt-0.5">
            Routing through VPN
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#0d0d0d] border border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase">
            <Wifi className="w-3.5 h-3.5 text-white" />
            <span>Live Speed</span>
          </div>
          <div className="text-base font-bold text-white font-mono mt-1 truncate">
            {isConnected ? formatSpeed(trafficStats.downloadSpeedBps + trafficStats.uploadSpeedBps) : '0 B/s'}
          </div>
          <div className="text-[10px] text-neutral-500 truncate mt-0.5">
            Current aggregate rate
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#0d0d0d] border border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase">
            <Activity className="w-3.5 h-3.5 text-white" />
            <span>App Payload</span>
          </div>
          <div className="text-base font-bold text-white font-mono mt-1 truncate">
            {isConnected ? formatBytes(totalAppBytes) : '0 B'}
          </div>
          <div className="text-[10px] text-neutral-500 truncate mt-0.5">
            Total session volume
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 pb-2">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-[#0d0d0d] border border-white/10 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white">VPN Tunnel Inactive</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              Connect to the VPN to inspect applications actively using your secure tunnel, per-app throughput, and destination domains.
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Go to VPN Dashboard
            </button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-[#0d0d0d] border border-white/10 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-2">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {searchQuery ? 'No Matching Applications' : 'Awaiting Application Traffic'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              {searchQuery
                ? `No applications found matching "${searchQuery}".`
                : 'Applications routing internet connections through the tunnel will appear here automatically.'}
            </p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const totalBytes = app.downloadBytes + app.uploadBytes;
            const percent = Math.min(Math.round((totalBytes / maxTotalBytes) * 100), 100);
            const isActivelyTransferring = app.downloadSpeedBps > 0 || app.uploadSpeedBps > 0;

            return (
              <div
                key={app.processName}
                className="p-3.5 rounded-2xl bg-[#0d0d0d] hover:bg-[#121212] border border-white/10 hover:border-white/20 transition-all shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                        {getAppIcon(app.iconType)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${
                          isActivelyTransferring ? 'bg-emerald-400' : 'bg-neutral-600'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {app.displayName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 border border-white/10 text-neutral-300 shrink-0">
                          {app.processName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3 text-white" />
                          <span>{formatBytes(app.downloadBytes)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3 text-neutral-400" />
                          <span>{formatBytes(app.uploadBytes)}</span>
                        </span>
                        <span className="text-neutral-500">
                          {app.activeConnections} {app.activeConnections === 1 ? 'socket' : 'sockets'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-white">
                      {formatBytes(totalBytes)}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {isActivelyTransferring ? (
                        <span className="text-emerald-400 font-semibold">
                          ↓ {formatSpeed(app.downloadSpeedBps)}
                        </span>
                      ) : (
                        <span>Idle</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-white transition-all duration-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {app.destinationHosts && app.destinationHosts.length > 0 && (
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/5 min-w-0">
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold shrink-0">
                      Routes:
                    </span>
                    <div
                      className="flex-1 flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0"
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      {app.destinationHosts.map((h) => (
                        <span
                          key={h}
                          title={h}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-black border border-white/10 text-neutral-300 shrink-0 whitespace-nowrap hover:border-white/30 transition-colors"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
