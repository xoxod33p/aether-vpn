import React, { useState } from 'react';
import {
  Terminal,
  Search,
  Filter,
  Trash2,
  Download,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  Lock,
} from 'lucide-react';
import { LogEntry } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';

interface LogsPageProps {
  store: VpnStoreType;
}

export const LogsPage: React.FC<LogsPageProps> = ({ store }) => {
  const { logs, clearLogs } = store;

  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'engine'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target && log.target.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const handleExport = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.target || 'core'}] ${l.message}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-vpn-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40';
      case 'warn':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      case 'error':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
      case 'engine':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4 select-none">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Diagnostics & Engine Logs</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Sensitive tokens, keys, and credentials are automatically redacted</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 text-xs font-medium hover:bg-slate-800 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        {/* Level Filters */}
        <div className="flex items-center gap-1.5">
          {(['all', 'info', 'warn', 'error', 'engine'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-medium uppercase font-mono transition-all ${
                levelFilter === lvl
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Terminal View */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 h-[480px] overflow-y-auto font-mono text-xs space-y-1.5">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-900/60 transition-colors"
            >
              <span className="text-slate-500 text-[11px] select-none whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>

              <span
                className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border whitespace-nowrap ${getLevelBadge(
                  log.level
                )}`}
              >
                {log.level}
              </span>

              {log.target && (
                <span className="text-slate-400 text-[11px] whitespace-nowrap select-none">
                  [{log.target}]
                </span>
              )}

              <span className="text-slate-200 select-text flex-1 break-all">
                {log.message}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">
            No log entries match the current filter.
          </div>
        )}
      </div>
    </div>
  );
};
