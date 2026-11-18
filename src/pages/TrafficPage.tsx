import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock,
  Radio,
  Server,
  Zap,
} from 'lucide-react';
import { VpnStoreType } from '../stores/useVpnStore';
import { formatBytes, formatSpeed, formatDuration } from '../utils/formatters';

interface TrafficPageProps {
  store: VpnStoreType;
}

export const TrafficPage: React.FC<TrafficPageProps> = ({ store }) => {
  const { trafficStats, trafficHistory, durationSecs, connectionInfo, selectedProfile } = store;
  const isConnected = connectionInfo.status === 'Connected';

  const maxBytes = Math.max(
    ...trafficHistory.map((h) => Math.max(h.down, h.up)),
    1024 * 1024 * 5
  );

  const chartWidth = 600;
  const chartHeight = 180;

  const getPoints = (key: 'down' | 'up') => {
    if (trafficHistory.length === 0) return '';
    return trafficHistory
      .map((item, index) => {
        const x = (index / Math.max(trafficHistory.length - 1, 1)) * chartWidth;
        const y = chartHeight - (item[key] / maxBytes) * (chartHeight - 30) - 15;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const downPoints = getPoints('down');
  const upPoints = getPoints('up');

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4 select-none">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-white">Real-Time Traffic Telemetry</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Live packet throughput and bandwidth metrics streamed directly from the networking core.
        </p>
      </div>

      {/* Main Real-Time Graph */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="font-bold text-xs text-white">Live Bandwidth Chart (Last 30s)</h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Down: {formatSpeed(trafficStats.downloadSpeedBps)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span>Up: {formatSpeed(trafficStats.uploadSpeedBps)}</span>
            </div>
          </div>
        </div>

        {/* SVG Chart Render */}
        <div className="w-full h-44 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 relative flex items-center justify-center overflow-hidden">
          {isConnected && trafficHistory.length > 1 ? (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight / 4} x2={chartWidth} y2={chartHeight / 4} stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="0" y1={(chartHeight * 3) / 4} x2={chartWidth} y2={(chartHeight * 3) / 4} stroke="#1e293b" strokeDasharray="4 4" />

              {/* Area Down */}
              {downPoints && (
                <polygon
                  points={`0,${chartHeight} ${downPoints} ${chartWidth},${chartHeight}`}
                  fill="url(#downGrad)"
                />
              )}

              {/* Line Down */}
              {downPoints && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={downPoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Line Up */}
              {upPoints && (
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  points={upPoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          ) : (
            <div className="text-center text-slate-500 text-xs">
              {isConnected ? 'Gathering initial traffic packets...' : 'Tunnel disconnected. Connect to view live telemetry.'}
            </div>
          )}
        </div>
      </div>

      {/* Aggregate Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Transferred</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {formatBytes(trafficStats.totalDownloadBytes)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            Download Payload
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Uploaded</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <ArrowUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {formatBytes(trafficStats.totalUploadBytes)}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            Upload Payload
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Session Uptime</span>
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {isConnected ? formatDuration(durationSecs) : '00:00:00'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Active Encrypted Tunnel
          </div>
        </div>
      </div>
    </div>
  );
};
