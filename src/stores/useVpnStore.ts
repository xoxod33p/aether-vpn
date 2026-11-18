import { useState, useEffect, useCallback } from 'react';
import {
  Profile,
  ConnectionInfo,
  ConnectionStatus,
  TrafficStats,
  AppUsage,
  AppSettings,
  Subscription,
  RoutingRule,
  DnsConfig,
  LogEntry,
  OperatingMode,
} from '../types';
import { vpnApi, isTauri } from '../services/tauriApi';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'en-US',
  startOnBoot: false,
  minimizeToTray: false,
  startMinimized: false,
  defaultMode: 'tun',
  autoReconnect: true,
  connectionTimeoutSecs: 15,
  killSwitchEnabled: false,
  dnsLeakProtection: true,
  mtu: 9000,
  enableIpv6: false,
  socksPort: 2080,
  httpPort: 2081,
  clashApiPort: 9090,
};

const DEFAULT_DNS: DnsConfig = {
  providerType: 'doh',
  primaryDns: 'https://1.1.1.1/dns-query',
  fallbackDns: 'https://8.8.8.8/dns-query',
  enableDnsRouting: true,
  preventLeak: true,
};

export type NavTab =
  | 'dashboard'
  | 'servers'
  | 'apps'
  | 'subscriptions'
  | 'routing'
  | 'dns'
  | 'traffic'
  | 'logs'
  | 'settings'
  | 'about';

export function useVpnStore() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [dnsConfig, setDnsConfig] = useState<DnsConfig>(DEFAULT_DNS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [appUsages, setAppUsages] = useState<AppUsage[]>([]);

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: 'Disconnected',
    mode: 'tun',
    activeProfileId: null,
    connectedAt: null,
    publicIp: undefined,
    location: undefined,
    errorMessage: null,
  });

  const [trafficStats, setTrafficStats] = useState<TrafficStats>({
    downloadSpeedBps: 0,
    uploadSpeedBps: 0,
    totalDownloadBytes: 0,
    totalUploadBytes: 0,
    activeConnections: 0,
    latencyMs: 0,
    timestamp: Date.now(),
  });

  const [durationSecs, setDurationSecs] = useState<number>(0);
  const [trafficHistory, setTrafficHistory] = useState<Array<{ time: string; down: number; up: number }>>([]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [savedProfiles, savedSettings, savedDns, savedRules, savedSubs, initialLogs] = await Promise.all([
          vpnApi.getProfiles().catch(() => []),
          vpnApi.getSettings().catch(() => DEFAULT_SETTINGS),
          vpnApi.getDnsConfig().catch(() => DEFAULT_DNS),
          vpnApi.getRoutingRules().catch(() => []),
          vpnApi.getSubscriptions().catch(() => []),
          vpnApi.getLogs().catch(() => []),
        ]);

        if (mounted) {
          if (savedProfiles.length > 0) {
            setProfiles(savedProfiles);
            setSelectedProfileId(savedProfiles[0].id);
          }
          if (savedSettings) setSettings(savedSettings);
          if (savedDns) setDnsConfig(savedDns);
          if (savedRules.length > 0) setRoutingRules(savedRules);
          if (savedSubs.length > 0) setSubscriptions(savedSubs);
          if (initialLogs.length > 0) setLogs(initialLogs);
        }
      } catch (e) {
        console.warn('Initial data load error:', e);
      }

      try {
        const ipInfo = await vpnApi.getRealPublicIp();
        if (mounted && ipInfo && ipInfo.ip) {
          setConnectionInfo((prev) => ({
            ...prev,
            publicIp: ipInfo.ip,
            location: {
              country: ipInfo.country,
              city: ipInfo.city,
              countryCode: ipInfo.country_code,
            },
          }));
        }
      } catch {}
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (connectionInfo.status === 'Connected') {
      timer = setInterval(() => {
        setDurationSecs((prev) => prev + 1);
      }, 1000);
    } else {
      setDurationSecs(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connectionInfo.status]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (connectionInfo.status === 'Connected') {
        try {
          const [stats, apps] = await Promise.all([
            vpnApi.getTrafficStats(),
            vpnApi.getAppUsages().catch(() => []),
          ]);
          setTrafficStats(stats);
          if (apps && apps.length > 0) {
            setAppUsages(apps);
          }

          setTrafficHistory((prev) => {
            const nowStr = new Date().toLocaleTimeString('en-US', {
              hour12: false,
              minute: '2-digit',
              second: '2-digit',
            });
            const next = [
              ...prev,
              { time: nowStr, down: stats.downloadSpeedBps, up: stats.uploadSpeedBps },
            ];
            if (next.length > 30) next.shift();
            return next;
          });
        } catch {}
      } else {
        setTrafficStats((prev) => ({
          ...prev,
          downloadSpeedBps: 0,
          uploadSpeedBps: 0,
          activeConnections: 0,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [connectionInfo.status]);

  useEffect(() => {
    const logTimer = setInterval(async () => {
      try {
        const backendLogs = await vpnApi.getLogs();
        if (backendLogs && backendLogs.length > 0) {
          setLogs(backendLogs);
        }
      } catch {}
    }, 2500);

    return () => clearInterval(logTimer);
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string, target?: string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      target: target || 'core::engine',
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 499)]);
  }, []);

  const connect = useCallback(async () => {
    const targetProfile = profiles.find((p) => p.id === selectedProfileId);
    if (!targetProfile) {
      addLog('warn', 'No server profile selected. Add or select a profile first.');
      return;
    }

    setConnectionInfo((prev) => ({
      ...prev,
      status: 'Connecting',
      errorMessage: null,
    }));

    addLog('info', `Connecting to "${targetProfile.name}" (${targetProfile.server}:${targetProfile.port}) in ${settings.defaultMode.toUpperCase()} mode...`);

    try {
      const res = await vpnApi.connect(targetProfile.id);
      setConnectionInfo({
        ...res,
        status: 'Connected',
        activeProfileId: targetProfile.id,
        connectedAt: res.connectedAt || new Date().toISOString(),
        publicIp: res.publicIp,
        location: res.location,
      });

      addLog('info', 'Secure handshake established. Virtual tunnel active.');

      setTimeout(async () => {
        try {
          const ipInfo = await vpnApi.getRealPublicIp();
          if (ipInfo && ipInfo.ip) {
            setConnectionInfo((prev) => ({
              ...prev,
              publicIp: ipInfo.ip,
              location: {
                country: ipInfo.country,
                city: ipInfo.city,
                countryCode: ipInfo.country_code,
              },
            }));
            addLog('info', `Verified VPN egress IP: ${ipInfo.ip} (${ipInfo.city}, ${ipInfo.country})`);
          }
        } catch {}
      }, 1800);
    } catch (err: any) {
      setConnectionInfo((prev) => ({
        ...prev,
        status: 'Error',
        errorMessage: err?.message || 'Connection failed',
      }));
      addLog('error', `Connection error: ${err?.message || 'Failed to start engine'}`);
    }
  }, [profiles, selectedProfileId, settings.defaultMode, addLog]);

  const disconnect = useCallback(async () => {
    setConnectionInfo((prev) => ({ ...prev, status: 'Disconnecting' }));
    addLog('info', 'Tearing down active tunnel. Restoring OS routing table and DNS...');

    try {
      const res = await vpnApi.disconnect();
      setConnectionInfo({
        ...res,
        status: 'Disconnected',
        activeProfileId: null,
        connectedAt: null,
        publicIp: undefined,
        location: undefined,
      });
      setAppUsages([]);
      addLog('info', 'Tunnel disconnected cleanly. System networking restored.');

      setTimeout(async () => {
        try {
          const ipInfo = await vpnApi.getRealPublicIp();
          if (ipInfo && ipInfo.ip) {
            setConnectionInfo((prev) => ({
              ...prev,
              publicIp: ipInfo.ip,
              location: {
                country: ipInfo.country,
                city: ipInfo.city,
                countryCode: ipInfo.country_code,
              },
            }));
          }
        } catch {}
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setConnectionInfo((prev) => ({ ...prev, status: 'Disconnected' }));
    }
  }, [addLog]);

  const testProfileLatency = useCallback(async (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;

    addLog('info', `Measuring TCP handshake latency to ${profile.server}:${profile.port}...`);
    try {
      const ping = await vpnApi.testProfileLatency(id);
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, latencyMs: ping, lastTestedAt: new Date().toISOString() } : p))
      );
      addLog('info', `Ping response from ${profile.name}: ${ping}ms`);
    } catch (e: any) {
      addLog('warn', `Latency test failed for ${profile.name}: ${e?.message || 'Timeout'}`);
    }
  }, [profiles, addLog]);

  const toggleFavorite = useCallback((id: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    try {
      await vpnApi.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedProfileId === id) {
        const remaining = profiles.filter((p) => p.id !== id);
        setSelectedProfileId(remaining.length > 0 ? remaining[0].id : '');
      }
      addLog('info', 'Profile deleted');
    } catch (e: any) {
      addLog('error', `Failed to delete profile: ${e.message}`);
    }
  }, [profiles, selectedProfileId, addLog]);

  const saveProfile = useCallback(async (profile: Profile) => {
    try {
      await vpnApi.saveProfile(profile);
      setProfiles((prev) => {
        const exists = prev.some((p) => p.id === profile.id);
        if (exists) {
          return prev.map((p) => (p.id === profile.id ? profile : p));
        } else {
          return [profile, ...prev];
        }
      });
      setSelectedProfileId(profile.id);
      addLog('info', `Saved server profile "${profile.name}"`);
    } catch (e: any) {
      addLog('error', `Failed to save profile: ${e.message}`);
    }
  }, [addLog]);

  const importProfileLink = useCallback(async (link: string) => {
    try {
      const imported = await vpnApi.importProfileLink(link);
      setProfiles((prev) => [imported, ...prev.filter((p) => p.id !== imported.id)]);
      setSelectedProfileId(imported.id);
      addLog('info', `Imported profile: ${imported.name}`);
      return imported;
    } catch (e: any) {
      addLog('error', `Failed to import link: ${e.message}`);
      throw e;
    }
  }, [addLog]);

  const updateOperatingMode = useCallback((mode: OperatingMode) => {
    setSettings((prev) => {
      const next = { ...prev, defaultMode: mode };
      vpnApi.saveSettings(next).catch(console.error);
      return next;
    });
    setConnectionInfo((prev) => ({ ...prev, mode }));
    addLog('info', `Operating mode changed to ${mode === 'tun' ? 'TUN Virtual Interface' : 'System Proxy'}`);
  }, [addLog]);

  const toggleKillSwitch = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, killSwitchEnabled: enabled };
      vpnApi.saveSettings(next).catch(console.error);
      return next;
    });
    addLog('warn', `Kill Switch ${enabled ? 'ARMED (Strict firewall rules active)' : 'DISARMED'}`);
  }, [addLog]);

  const syncCloudServers = useCallback(async (): Promise<number> => {
    try {
      addLog('info', 'Syncing free cloud servers...');
      let syncedCount = 0;
      if (isTauri()) {
        const synced = await vpnApi.syncCloudServers();
        syncedCount = synced.length;
      } else {
        const apiUrl = 'https://aether-backend-drab.vercel.app/api/configs?key=aether_sync_super_secret_key_123';
        const res = await fetch(apiUrl, {
          headers: { 'X-API-Key': 'aether_sync_super_secret_key_123' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.servers || data.configs || []);
        for (const s of list) {
          if (!s.server || !s.port) continue;
          const profile: Profile = {
            id: s.id && s.id.trim() ? s.id : `sync-${s.protocol || 'vless'}-${s.server}-${s.port}`,
            name: s.name || `Free ${s.countryCode || 'Server'} - ${s.server}`,
            protocol: s.protocol || 'vless',
            server: s.server,
            port: Number(s.port),
            uuid: s.uuid,
            password: s.password,
            username: s.username,
            cipher: s.cipher,
            tlsEnabled: s.tlsEnabled ?? s.tls_enabled ?? true,
            serverName: s.serverName || s.server_name || (s.tlsEnabled ? s.server : undefined),
            allowInsecure: s.allowInsecure ?? s.allow_insecure ?? false,
            realityPublicKey: s.realityPublicKey || s.reality_public_key,
            realityShortId: s.realityShortId || s.reality_short_id,
            transportType: s.transportType || s.transport_type || 'tcp',
            transportPath: s.transportPath || s.transport_path,
            transportHost: s.transportHost || s.transport_host,
            flow: s.flow,
            countryCode: s.countryCode || s.country_code || 'US',
            groupName: 'Free Sync',
            isFavorite: false,
            createdAt: s.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await vpnApi.saveProfile(profile);
          syncedCount++;
        }
      }
      const refreshed = await vpnApi.getProfiles();
      setProfiles(refreshed);
      if (refreshed.length > 0 && !selectedProfileId) {
        setSelectedProfileId(refreshed[0].id);
      }
      addLog('info', `Cloud sync complete: ${syncedCount} server(s) updated`);
      return syncedCount;
    } catch (e: any) {
      addLog('error', `Cloud sync failed: ${e.message}`);
      throw e;
    }
  }, [addLog, selectedProfileId]);

  const clearLogs = useCallback(async () => {
    try {
      await vpnApi.clearLogs();
      setLogs([]);
    } catch {}
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0] || null;

  return {
    activeTab,
    setActiveTab,
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    selectedProfile,
    connectionInfo,
    trafficStats,
    appUsages,
    setAppUsages,
    durationSecs,
    trafficHistory,
    subscriptions,
    setSubscriptions,
    routingRules,
    setRoutingRules,
    dnsConfig,
    setDnsConfig,
    settings,
    setSettings,
    logs,
    connect,
    disconnect,
    testProfileLatency,
    toggleFavorite,
    deleteProfile,
    saveProfile,
    importProfileLink,
    syncCloudServers,
    updateOperatingMode,
    toggleKillSwitch,
    addLog,
    clearLogs,
  };
}

export type VpnStoreType = ReturnType<typeof useVpnStore>;
