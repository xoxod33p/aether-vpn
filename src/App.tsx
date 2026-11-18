import React from 'react';
import { useVpnStore, NavTab } from './stores/useVpnStore';
import { DashboardPage } from './pages/DashboardPage';
import { ServersPage } from './pages/ServersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogsPage } from './pages/LogsPage';
import { LoadingSplash } from './components/common/LoadingSplash';
import {
  Shield,
  Server,
  Settings,
  Terminal,
} from 'lucide-react';

export function App() {
  const store = useVpnStore();
  const { activeTab, setActiveTab, connectionInfo, profiles } = store;

  const isConnected = connectionInfo.status === 'Connected';
  const isConnecting = connectionInfo.status === 'Connecting' || connectionInfo.status === 'Reconnecting';

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage store={store} />;
      case 'servers':
        return <ServersPage store={store} />;
      case 'settings':
        return <SettingsPage store={store} />;
      case 'logs':
        return <LogsPage store={store} />;
      default:
        return <DashboardPage store={store} />;
    }
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number }> = [
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
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <Terminal className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-neutral-100 font-sans antialiased relative select-none">
      {/* Quick Launch Splash (Fades in 300ms) */}
      <LoadingSplash />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-black relative flex flex-col">
        {renderActivePage()}
      </main>

      {/* Bottom Navigation Bar */}
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
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-mono font-bold px-1 rounded-full bg-white text-black leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-wide">{item.label}</span>

              {/* Active Underline Pill */}
              {isActive && (
                <div className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
