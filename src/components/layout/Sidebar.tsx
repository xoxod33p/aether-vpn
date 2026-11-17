import React from 'react';
import {
  LayoutDashboard,
  Server,
  Rss,
  Split,
  Globe,
  Activity,
  Terminal,
  Settings,
  Info,
  Shield,
  Radio,
} from 'lucide-react';
import { NavTab, VpnStoreType } from '../../stores/useVpnStore';

interface SidebarProps {
  store: VpnStoreType;
}

export const Sidebar: React.FC<SidebarProps> = ({ store }) => {
  const { activeTab, setActiveTab, connectionInfo, settings, updateOperatingMode } = store;

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'servers', label: 'Servers', icon: <Server className="w-3.5 h-3.5" />, badge: store.profiles.length },
    { id: 'subscriptions', label: 'Subscriptions', icon: <Rss className="w-3.5 h-3.5" />, badge: store.subscriptions.length },
    { id: 'routing', label: 'Routing', icon: <Split className="w-3.5 h-3.5" /> },
    { id: 'dns', label: 'DNS', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'traffic', label: 'Traffic Monitor', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'about', label: 'About', icon: <Info className="w-3.5 h-3.5" /> },
  ];

  const isConnected = connectionInfo.status === 'Connected';
  const isConnecting = connectionInfo.status === 'Connecting' || connectionInfo.status === 'Reconnecting';

  return (
    <aside className="w-48 bg-black border-r border-[#152347] flex flex-col justify-between select-none shrink-0">
      {/* Brand Header */}
      <div>
        <div className="h-12 flex items-center px-3.5 gap-2.5 border-b border-[#152347] bg-[#050b1a]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-800 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-900/40 text-white shrink-0 ring-1 ring-blue-500/30">
            <Shield className="w-4 h-4 text-blue-100" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm tracking-tight text-white">Aether</span>
              <span className="text-blue-400 font-semibold text-[10px] px-1 py-0.2 rounded bg-blue-950/90 border border-blue-800/80">VPN</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>sing-box Core</span>
            </div>
          </div>
        </div>

        {/* Operating Mode Selector */}
        <div className="p-2">
          <div className="bg-[#050b18] p-0.5 rounded-lg border border-[#172a59] flex text-[11px]">
            <button
              onClick={() => updateOperatingMode('tun')}
              className={`flex-1 py-1 px-1 rounded-md font-medium transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                settings.defaultMode === 'tun'
                  ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-sm shadow-blue-950'
                  : 'text-slate-400 hover:text-blue-200'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              <span>TUN</span>
            </button>
            <button
              onClick={() => updateOperatingMode('system_proxy')}
              className={`flex-1 py-1 px-1 rounded-md font-medium transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                settings.defaultMode === 'system_proxy'
                  ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-sm shadow-blue-950'
                  : 'text-slate-400 hover:text-blue-200'
              }`}
            >
              <Globe className="w-2.5 h-2.5" />
              <span>Proxy</span>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-1.5 space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-950/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#091533]/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-[#091533] text-slate-400 border border-[#142757]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Connection Status Footprint */}
      <div className="p-2 border-t border-[#152347] bg-black">
        <div className="bg-[#060d21] rounded-lg p-2 border border-[#152757]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-400">Tunnel</span>
            <div className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : isConnecting
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
              <span
                className={`text-[10px] font-semibold ${
                  isConnected
                    ? 'text-emerald-400'
                    : isConnecting
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {connectionInfo.status}
              </span>
            </div>
          </div>
          {isConnected && store.selectedProfile && (
            <div className="text-[10px] text-blue-200 truncate font-mono">
              {store.selectedProfile.name}
            </div>
          )}
          {settings.killSwitchEnabled && (
            <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
              <Shield className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">Kill Switch Armed</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
