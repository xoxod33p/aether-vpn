import React from 'react';
import { useVpnStore } from './stores/useVpnStore';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { ServersPage } from './pages/ServersPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { RoutingPage } from './pages/RoutingPage';
import { DnsPage } from './pages/DnsPage';
import { TrafficPage } from './pages/TrafficPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { LoadingSplash } from './components/common/LoadingSplash';

export function App() {
  const store = useVpnStore();

  const renderActivePage = () => {
    switch (store.activeTab) {
      case 'dashboard':
        return <DashboardPage store={store} />;
      case 'servers':
        return <ServersPage store={store} />;
      case 'subscriptions':
        return <SubscriptionsPage store={store} />;
      case 'routing':
        return <RoutingPage store={store} />;
      case 'dns':
        return <DnsPage store={store} />;
      case 'traffic':
        return <TrafficPage store={store} />;
      case 'logs':
        return <LogsPage store={store} />;
      case 'settings':
        return <SettingsPage store={store} />;
      case 'about':
        return <AboutPage store={store} />;
      default:
        return <DashboardPage store={store} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans antialiased relative">
      {/* Launch Loading Splash Overlay */}
      <LoadingSplash />

      {/* Sidebar Navigation */}
      <Sidebar store={store} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Topbar store={store} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-black via-[#04091a] to-black">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default App;
