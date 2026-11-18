import React, { useState, useEffect } from 'react';
import { useVpnStore, NavTab } from './stores/useVpnStore';
import { DashboardPage } from './pages/DashboardPage';
import { ServersPage } from './pages/ServersPage';
import { AppsPage } from './pages/AppsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogsPage } from './pages/LogsPage';
import { LoadingSplash } from './components/common/LoadingSplash';
import { UpdateModal } from './components/common/UpdateModal';
import {
  Shield,
  Server,
  Layers,
  Settings,
  Terminal,
  X,
  ArrowRight,
} from 'lucide-react';
import { vpnApi } from './services/tauriApi';
import { UpdateInfo } from './types';

export function App() {
  const store = useVpnStore();
  const { activeTab, setActiveTab, connectionInfo, profiles } = store;
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    vpnApi.checkForUpdates()
      .then((info) => {
        if (mounted && info && info.isUpdateAvailable) {
          setUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const isConnected = connectionInfo.status === 'Connected';
  const isConnecting = connectionInfo.status === 'Connecting' || connectionInfo.status === 'Reconnecting';

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage store={store} />;
      case 'servers':
        return <ServersPage store={store} />;
      case 'apps':
        return <AppsPage store={store} />;
      case 'settings':
        return (
          <SettingsPage
            store={store}
            initialUpdateInfo={updateInfo}
            onOpenUpdateModal={(info) => {
              setUpdateInfo(info);
              setIsUpdateModalOpen(true);
            }}
          />
        );
      case 'logs':
        return <LogsPage store={store} />;
      default:
        return <DashboardPage store={store} />;
    }
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number; hasDot?: boolean }> = [
    {
      id: 'dashboard',
      label: 'VPN',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: 'servers',
      label: 'Servers',
      icon: <Server className="w-4 h-4" />,
      badge: profiles.length,
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: <Layers className="w-4 h-4" />,
      badge: isConnected && store.appUsages.length > 0 ? store.appUsages.length : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      hasDot: updateInfo?.isUpdateAvailable,
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <Terminal className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-neutral-100 font-sans antialiased relative select-none">
      <LoadingSplash />

      {updateInfo?.isUpdateAvailable && !dismissedUpdate && (
        <div className="bg-[#0e0e0e] border-b border-white/10 px-3 py-1.5 flex items-center justify-between z-30 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
            <span className="text-white text-xs font-medium">
              Update Available: <span className="font-bold">{updateInfo.releaseName}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className="px-2 py-0.5 rounded-lg bg-white text-black font-bold text-[11px] hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>View Update</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDismissedUpdate(true)}
              className="text-neutral-500 hover:text-white p-0.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden bg-black relative flex flex-col">
        {renderActivePage()}
      </main>

      <nav className="h-14 border-t border-white/10 bg-black/95 backdrop-blur-md px-2 flex items-center justify-around shrink-0 z-20 shadow-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.hasDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-mono font-bold px-1 rounded-full bg-white text-black leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-wide">{item.label}</span>

              {isActive && (
                <div className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              )}
            </button>
          );
        })}
      </nav>

      {updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          isOpen={isUpdateModalOpen && Boolean(updateInfo.isUpdateAvailable)}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
