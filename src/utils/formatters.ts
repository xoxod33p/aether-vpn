export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0.00 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  const val = (bytesPerSec / Math.pow(k, i)).toFixed(2);
  return `${val} ${sizes[i] || 'MB/s'}`;
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function getProtocolBadgeColor(protocol: string): string {
  switch (protocol.toLowerCase()) {
    case 'vless':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'vmess':
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    case 'trojan':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'shadowsocks':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'wireguard':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'hysteria2':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'socks5':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    default:
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  }
}
