import React, { useState, useRef } from 'react';
import {
  Terminal,
  Search,
  Trash2,
  Copy,
  Check,
  ArrowUp,
  X,
} from 'lucide-react';
import { LogEntry } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';

interface LogsPageProps {
  store: VpnStoreType;
}

export const LogsPage: React.FC<LogsPageProps> = ({ store }) => {
  const { logs, clearLogs } = store;
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = [...logs]
    .filter((log) => {
      const matchesLevel =
        levelFilter === 'all' ||
        log.level === levelFilter ||
        (levelFilter === 'info' && log.level === 'engine');

      const matchesSearch =
        searchTerm === '' ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.target && log.target.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesLevel && matchesSearch;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleCopy = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.target || 'core'}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const scrollToTop = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatLogMessage = (msg: string) => {
    const singboxRegex = /^[+\-]\d{4}\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(INFO|WARN|ERROR|FATAL)\s+(\[[^\]]+\]\s+)?(.*)$/i;
    const match = msg.match(singboxRegex);
    let cleaned = match ? (match[3] || msg) : msg;
    return cleaned.replace(/sing-box|singbox|xray/gi, 'vpn');
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-5 max-w-md mx-auto w-full select-none">
      
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-white" />
          <h2 className="text-base font-bold text-white">Logs</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/20 font-mono font-bold">
            {filteredLogs.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={clearLogs}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-neutral-300 hover:text-red-400 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      
      <div className="flex items-center gap-2 mb-3 shrink-0">
        
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter logs..."
            className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        
        <div className="flex bg-[#0d0d0d] p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
          {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-2 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                levelFilter === lvl
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto bg-black border border-white/10 rounded-2xl p-3 font-mono text-[11px] leading-relaxed space-y-1.5"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-neutral-600 py-16">No logs recorded yet</div>
        ) : (
          filteredLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
              hour12: true,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const displayLevel = log.level.toUpperCase();
            const cleanMessage = formatLogMessage(log.message);

            return (
              <div
                key={log.id}
                className="flex items-start gap-1.5 break-all py-0.5 border-b border-neutral-900 last:border-b-0 hover:bg-neutral-900/50 rounded px-1 transition-colors"
              >
                
                <span className="text-neutral-500 shrink-0 select-none text-[10px]">
                  {time}
                </span>

                
                <span
                  className={`uppercase font-bold shrink-0 text-[9px] px-1.5 py-0.2 rounded border ${
                    log.level === 'error'
                      ? 'text-red-400 bg-red-950/40 border-red-800/40'
                      : log.level === 'warn'
                      ? 'text-amber-300 bg-amber-950/40 border-amber-800/40'
                      : 'text-neutral-200 bg-white/10 border-white/20'
                  }`}
                >
                  {displayLevel}
                </span>

                
                {log.target && (
                  <span className="text-neutral-500 shrink-0 text-[10px]">
                    [{log.target.replace(/sing-box|singbox|xray/gi, 'core')}]
                  </span>
                )}

                
                <span
                  className={`flex-1 ${
                    log.level === 'error'
                      ? 'text-red-300 font-semibold'
                      : log.level === 'warn'
                      ? 'text-amber-200'
                      : 'text-neutral-300'
                  }`}
                >
                  {cleanMessage}
                </span>
              </div>
            );
          })
        )}
      </div>

      
      <div className="flex justify-between items-center pt-2 shrink-0 text-[10px] text-neutral-500 font-mono">
        <span>Showing {filteredLogs.length} events</span>
        <button
          onClick={scrollToTop}
          className="flex items-center gap-1 text-neutral-400 hover:text-white px-2 py-1 rounded-lg bg-[#0d0d0d] border border-white/10 cursor-pointer transition-colors"
        >
          <ArrowUp className="w-3 h-3" />
          <span>Jump to Top</span>
        </button>
      </div>
    </div>
  );
};
