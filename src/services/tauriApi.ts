import { Profile, ConnectionInfo, TrafficStats, AppUsage, AppSettings, Subscription, RoutingRule, DnsConfig, LogEntry } from '../types';

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.error(`[TauriIPC] ${cmd} failed:`, err);
      if (fallback !== undefined) return fallback;
      throw err;
    }
  } else {
    if (fallback !== undefined) return fallback;
    throw new Error(`Tauri environment not available for ${cmd}`);
  }
}

export interface PublicIpInfo {
  ip: string;
  country: string;
  city: string;
  country_code: string;
  org?: string;
}

export interface DnsLeakResult {
  tested: boolean;
  resolver_ip: string;
  resolver_geo: string;
  resolvers_found: string[];
  leak_detected: boolean;
}

export const vpnApi = {
  connect: async (profileId: string): Promise<ConnectionInfo> => {
    return safeInvoke<ConnectionInfo>('connect_vpn', { profileId }, {
      status: 'Connected',
      mode: 'tun',
      activeProfileId: profileId,
      connectedAt: new Date().toISOString(),
      publicIp: undefined,
      location: undefined,
    });
  },

  disconnect: async (): Promise<ConnectionInfo> => {
    return safeInvoke<ConnectionInfo>('disconnect_vpn', {}, {
      status: 'Disconnected',
      mode: 'tun',
      activeProfileId: null,
      connectedAt: null,
      publicIp: undefined,
      location: undefined,
    });
  },

  getConnectionStatus: async (): Promise<ConnectionInfo> => {
    return safeInvoke<ConnectionInfo>('get_connection_status', {}, {
      status: 'Disconnected',
      mode: 'tun',
      activeProfileId: null,
      connectedAt: null,
      publicIp: undefined,
      location: undefined,
    });
  },

  getTrafficStats: async (): Promise<TrafficStats> => {
    return safeInvoke<TrafficStats>('get_traffic_stats', {}, {
      downloadSpeedBps: 0,
      uploadSpeedBps: 0,
      totalDownloadBytes: 0,
      totalUploadBytes: 0,
      activeConnections: 0,
      latencyMs: 0,
      timestamp: Date.now(),
    });
  },

  getAppUsages: async (): Promise<AppUsage[]> => {
    return safeInvoke<AppUsage[]>('get_app_usages', {}, []);
  },

  getRealPublicIp: async (): Promise<PublicIpInfo> => {
    return safeInvoke<PublicIpInfo>('get_real_public_ip');
  },

  runDnsLeakTest: async (): Promise<DnsLeakResult> => {
    return safeInvoke<DnsLeakResult>('run_dns_leak_test');
  },

  getProfiles: async (): Promise<Profile[]> => {
    return safeInvoke<Profile[]>('get_profiles', {}, []);
  },

  saveProfile: async (profile: Profile): Promise<Profile> => {
    return safeInvoke<Profile>('save_profile', { profile }, profile);
  },

  deleteProfile: async (id: string): Promise<void> => {
    return safeInvoke<void>('delete_profile', { id });
  },

  testProfileLatency: async (id: string): Promise<number> => {
    return safeInvoke<number>('test_profile_latency', { id });
  },

  importProfileLink: async (link: string): Promise<Profile> => {
    return safeInvoke<Profile>('import_profile_link', { link });
  },

  getSubscriptions: async (): Promise<Subscription[]> => {
    return safeInvoke<Subscription[]>('get_subscriptions', {}, []);
  },

  saveSubscription: async (subscription: Subscription): Promise<Subscription> => {
    return safeInvoke<Subscription>('save_subscription', { subscription }, subscription);
  },

  updateSubscription: async (id: string): Promise<Profile[]> => {
    return safeInvoke<Profile[]>('update_subscription', { id }, []);
  },

  deleteSubscription: async (id: string): Promise<void> => {
    return safeInvoke<void>('delete_subscription', { id });
  },

  getRoutingRules: async (): Promise<RoutingRule[]> => {
    return safeInvoke<RoutingRule[]>('get_routing_rules', {}, []);
  },

  saveRoutingRule: async (rule: RoutingRule): Promise<RoutingRule> => {
    return safeInvoke<RoutingRule>('save_routing_rule', { rule }, rule);
  },

  deleteRoutingRule: async (id: string): Promise<void> => {
    return safeInvoke<void>('delete_routing_rule', { id });
  },

  getDnsConfig: async (): Promise<DnsConfig> => {
    return safeInvoke<DnsConfig>('get_dns_config', {}, {
      providerType: 'doh',
      primaryDns: 'https://1.1.1.1/dns-query',
      fallbackDns: 'https://8.8.8.8/dns-query',
      enableDnsRouting: true,
      preventLeak: true,
    });
  },

  saveDnsConfig: async (config: DnsConfig): Promise<DnsConfig> => {
    return safeInvoke<DnsConfig>('save_dns_config', { config }, config);
  },

  getSettings: async (): Promise<AppSettings> => {
    return safeInvoke<AppSettings>('get_settings', {}, {
      theme: 'dark',
      language: 'en-US',
      startOnBoot: false,
      minimizeToTray: true,
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
    });
  },

  saveSettings: async (settings: AppSettings): Promise<AppSettings> => {
    return safeInvoke<AppSettings>('save_settings', { settings }, settings);
  },

  getLogs: async (): Promise<LogEntry[]> => {
    return safeInvoke<LogEntry[]>('get_logs', {}, []);
  },

  clearLogs: async (): Promise<void> => {
    return safeInvoke<void>('clear_logs', {});
  },
};
