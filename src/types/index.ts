export type ConnectionStatus =
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Reconnecting'
  | 'Disconnecting'
  | 'Error';

export type VpnProtocol =
  | 'socks5'
  | 'shadowsocks'
  | 'vless'
  | 'vmess'
  | 'trojan'
  | 'wireguard'
  | 'hysteria2';

export type OperatingMode = 'tun' | 'system_proxy';

export interface Profile {
  id: string;
  name: string;
  protocol: VpnProtocol;
  server: string;
  port: number;
  username?: string;
  password?: string;
  uuid?: string;
  cipher?: string;
  tlsEnabled?: boolean;
  serverName?: string;
  allowInsecure?: boolean;
  alpn?: string[];
  realityPublicKey?: string;
  realityShortId?: string;
  transportType?: 'tcp' | 'ws' | 'grpc' | 'http' | 'httpupgrade';
  transportPath?: string;
  transportHost?: string;
  flow?: string;
  fingerprint?: string;
  packetEncoding?: string;
  alterId?: number;
  wgPrivateKey?: string;
  wgPublicKey?: string;
  wgAddress?: string;
  wgDns?: string;
  wgMtu?: number;
  countryCode?: string;
  groupName?: string;
  isFavorite: boolean;
  latencyMs?: number | null;
  lastTestedAt?: string | null;
  subscriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionInfo {
  status: ConnectionStatus;
  mode: OperatingMode;
  activeProfileId?: string | null;
  connectedAt?: string | null;
  publicIp?: string;
  location?: {
    country: string;
    city: string;
    countryCode: string;
  };
  errorMessage?: string | null;
}

export interface TrafficStats {
  downloadSpeedBps: number;
  uploadSpeedBps: number;
  totalDownloadBytes: number;
  totalUploadBytes: number;
  activeConnections: number;
  latencyMs: number;
  timestamp: number;
}

export interface Subscription {
  id: string;
  name: string;
  url: string;
  format: 'singbox' | 'v2ray' | 'clash' | 'shadowsocks';
  autoUpdate: boolean;
  updateIntervalHours: number;
  lastUpdatedAt?: string | null;
  lastStatus: 'success' | 'failed' | 'pending' | 'idle';
  profileCount: number;
  createdAt: string;
}

export type RoutingAction = 'direct' | 'proxy' | 'block';
export type RoutingRuleType =
  | 'domain'
  | 'domain_suffix'
  | 'ip_cidr'
  | 'country'
  | 'protocol'
  | 'port';

export interface RoutingRule {
  id: string;
  name: string;
  ruleType: RoutingRuleType;
  ruleValue: string;
  action: RoutingAction;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
}

export interface DnsConfig {
  providerType: 'doh' | 'dot' | 'system' | 'custom';
  primaryDns: string;
  fallbackDns: string;
  enableDnsRouting: boolean;
  preventLeak: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  startOnBoot: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  defaultMode: OperatingMode;
  autoReconnect: boolean;
  connectionTimeoutSecs: number;
  killSwitchEnabled: boolean;
  dnsLeakProtection: boolean;
  mtu: number;
  enableIpv6: boolean;
  socksPort: number;
  httpPort: number;
  clashApiPort: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'engine';
  message: string;
  target?: string;
}

export interface AppUsage {
  processName: string;
  displayName: string;
  uploadBytes: number;
  downloadBytes: number;
  uploadSpeedBps: number;
  downloadSpeedBps: number;
  activeConnections: number;
  iconType: string;
  destinationHosts: string[];
  lastSeen: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  platform: 'windows' | 'linux' | string;
}
