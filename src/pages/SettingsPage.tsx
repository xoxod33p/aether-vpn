import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  Globe,
  Radio,
  Zap,
  Terminal,
  Check,
  Power,
  RotateCcw,
  Download,
  RefreshCw,
  ExternalLink,
  Key,
  Cloud,
  Database,
  Laptop,
  Copy,
} from 'lucide-react';
import { AppSettings, OperatingMode, UpdateInfo, Profile } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';

interface SettingsPageProps {
  store: VpnStoreType;
  initialUpdateInfo?: UpdateInfo | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ store, initialUpdateInfo }) => {
  const { settings, setSettings, toggleKillSwitch, updateOperatingMode, setActiveTab, saveProfile } = store;
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(initialUpdateInfo || null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const [syncApiUrl, setSyncApiUrl] = useState(() => localStorage.getItem('aether_sync_api_url') || '');
  const [syncApiKey, setSyncApiKey] = useState(() => localStorage.getItem('aether_sync_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string>('');
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  useEffect(() => {
    let mounted = true;
    vpnApi.getDeviceId()
      .then((id) => {
        if (mounted && id) setDeviceId(id);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      vpnApi.saveSettings(next).catch(console.error);
      return next;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1200);
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const info = await vpnApi.checkForUpdates();
      setUpdateInfo(info);
      if (!info.isUpdateAvailable) {
        setUpdateStatus('You are running the latest version.');
        setTimeout(() => setUpdateStatus(null), 3000);
      }
    } catch (e: any) {
      setUpdateStatus(e.message || 'Check failed.');
      setTimeout(() => setUpdateStatus(null), 3000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    setIsInstallingUpdate(true);
    setUpdateStatus('Backing up database and initiating download...');
    try {
      const res = await vpnApi.downloadAndInstallUpdate(updateInfo.downloadUrl);
      setUpdateStatus(res);
    } catch (e: any) {
      setUpdateStatus(e.message || 'Failed to install update.');
      setIsInstallingUpdate(false);
    }
  };

  const handleSyncServers = async () => {
    if (!syncApiUrl.trim()) {
      setSyncError('Please enter a valid Backend API URL');
      setTimeout(() => setSyncError(null), 3000);
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const targetUrl = new URL(syncApiUrl.trim());
      if (syncApiKey.trim() && !targetUrl.searchParams.has('key')) {
        targetUrl.searchParams.set('key', syncApiKey.trim());
      }
      const res = await fetch(targetUrl.toString(), {
        headers: syncApiKey.trim() ? { 'X-API-Key': syncApiKey.trim() } : {},
      });
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.servers || data.configs || []);
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('No server configurations found in response');
      }

      let count = 0;
      for (const s of list) {
        if (!s.server || !s.port) continue;
        const profile: Profile = {
          id: s.id || `sync-${s.protocol || 'vless'}-${s.server}-${s.port}`,
          name: s.name || `Free ${s.countryCode || 'Server'} - ${s.server}`,
          protocol: s.protocol || 'vless',
          server: s.server,
          port: Number(s.port),
          uuid: s.uuid,
          password: s.password,
          username: s.username,
          cipher: s.cipher,
          tlsEnabled: s.tlsEnabled ?? true,
          serverName: s.serverName || s.server,
          allowInsecure: s.allowInsecure ?? false,
          realityPublicKey: s.realityPublicKey,
          realityShortId: s.realityShortId,
          transportType: s.transportType || 'tcp',
          transportPath: s.transportPath,
          transportHost: s.transportHost,
          flow: s.flow,
          countryCode: s.countryCode || 'US',
          groupName: 'Free Sync',
          isFavorite: false,
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveProfile(profile);
        count++;
      }
      setSyncSuccess(`Synced ${count} free servers`);
      setTimeout(() => setSyncSuccess(null), 3500);
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed');
      setTimeout(() => setSyncError(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-5 max-w-md mx-auto w-full select-none overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-white" />
          <h2 className="text-base font-bold text-white">Settings</h2>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/20 animate-fade">
            <Check className="w-3 h-3" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-white" />
            <span>Security & Privacy</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white">Kill Switch</div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Block all network traffic immediately if VPN drops
              </p>
            </div>
            <button
              onClick={() => toggleKillSwitch(!settings.killSwitchEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.killSwitchEnabled ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.killSwitchEnabled ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">DNS Leak Protection</div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Force encrypted DNS resolution via secure tunnel
              </p>
            </div>
            <button
              onClick={() => handleToggle('dnsLeakProtection', !settings.dnsLeakProtection)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.dnsLeakProtection ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.dnsLeakProtection ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Auto Reconnect</div>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Automatically restore VPN on unexpected disconnect
              </p>
            </div>
            <button
              onClick={() => handleToggle('autoReconnect', !settings.autoReconnect)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.autoReconnect ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.autoReconnect ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Laptop className="w-3.5 h-3.5 text-white" />
              <span>Device Identification</span>
            </div>
            {copiedDeviceId && (
              <span className="text-[10px] font-semibold text-neutral-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/20 animate-fade">
                Copied!
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white">Unique Device ID</div>
              <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate select-all">
                {deviceId || 'Detecting hardware ID...'}
              </p>
            </div>
            <button
              onClick={() => {
                if (deviceId) {
                  navigator.clipboard.writeText(deviceId);
                  setCopiedDeviceId(true);
                  setTimeout(() => setCopiedDeviceId(false), 2000);
                }
              }}
              title="Copy Device ID"
              className="p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-neutral-500">
            Hardware-bound unique identifier for this PC. Each machine generates a distinct permanent ID.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Software Updates</span>
            </div>
            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate || isInstallingUpdate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-[11px] font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Checking...' : 'Check Now'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xs font-semibold text-white">Installed Client</div>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">AetherVPN v0.1.3</p>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${updateInfo?.isUpdateAvailable ? 'bg-white text-black font-bold' : 'bg-white/10 text-neutral-300'}`}>
              {updateInfo?.isUpdateAvailable ? `v${updateInfo.latestVersion} Available` : 'Up to Date'}
            </span>
          </div>

          {updateInfo?.isUpdateAvailable && (
            <div className="pt-2.5 border-t border-white/10 space-y-2.5">
              <div className="text-xs text-neutral-300 bg-[#141414] p-3 rounded-xl border border-white/10">
                <div className="font-semibold text-white">{updateInfo.releaseName}</div>
                {updateInfo.releaseNotes && (
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-3 whitespace-pre-line font-sans">
                    {updateInfo.releaseNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {updateInfo.downloadUrl ? (
                  <button
                    onClick={handleInstallUpdate}
                    disabled={isInstallingUpdate}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isInstallingUpdate ? 'Installing...' : `Update Now ${updateInfo.assetSize ? `(${Math.round(updateInfo.assetSize / (1024 * 1024))} MB)` : ''}`}</span>
                  </button>
                ) : null}

                <a
                  href={updateInfo.releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
                  title="View on GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {updateStatus && (
            <p className="text-[11px] text-neutral-300 font-mono bg-[#161616] p-2 rounded-lg border border-white/10">{updateStatus}</p>
          )}

          <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-neutral-500">
            <Database className="w-3 h-3 text-neutral-400 shrink-0" />
            <span>Database persistence guaranteed. Your servers and credentials will never be reset on update.</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Cloud className="w-3.5 h-3.5 text-white" />
              <span>Cloud Server Sync</span>
            </div>
            {syncSuccess && (
              <span className="text-[10px] font-semibold text-neutral-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/20">
                {syncSuccess}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Backend API URL</label>
              <input
                type="text"
                value={syncApiUrl}
                onChange={(e) => {
                  setSyncApiUrl(e.target.value);
                  localStorage.setItem('aether_sync_api_url', e.target.value);
                }}
                placeholder="https://your-api.vercel.app/api/configs"
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">Sync Authentication Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={syncApiKey}
                  onChange={(e) => {
                    setSyncApiKey(e.target.value);
                    localStorage.setItem('aether_sync_api_key', e.target.value);
                  }}
                  placeholder="Enter secret sync key"
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-1.5 pr-8 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-neutral-500">Imports free configs without modifying custom servers</span>
            <button
              onClick={handleSyncServers}
              disabled={isSyncing || !syncApiUrl}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {syncError && (
            <p className="text-[11px] text-red-400 font-mono">{syncError}</p>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-white/10 shadow-lg space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-white" />
            <span>Connection & System</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white">Default Operating Mode</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {settings.defaultMode === 'tun' ? 'Full System Virtual Network Card' : 'System Proxy Mode'}
              </p>
            </div>
            <button
              onClick={() => updateOperatingMode(settings.defaultMode === 'tun' ? 'system_proxy' : 'tun')}
              className="px-2.5 py-1 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              {settings.defaultMode === 'tun' ? 'VPN (TUN)' : 'Proxy'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Start on Boot</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Launch AetherVPN when system starts
              </p>
            </div>
            <button
              onClick={() => handleToggle('startOnBoot', !settings.startOnBoot)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.startOnBoot ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.startOnBoot ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div>
              <div className="text-xs font-semibold text-white">Minimize to System Tray</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Keep running in background when closed
              </p>
            </div>
            <button
              onClick={() => handleToggle('minimizeToTray', !settings.minimizeToTray)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                settings.minimizeToTray ? 'bg-white' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                  settings.minimizeToTray ? 'bg-black translate-x-5' : 'bg-neutral-400 translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('logs')}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0d0d0d] hover:bg-[#161616] border border-white/10 text-xs font-medium text-neutral-300 hover:text-white cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-white" />
            <span>Open Connection Logs</span>
          </div>
          <span className="text-neutral-500 text-xs">&rarr;</span>
        </div>

        <div className="pt-2 pb-4 text-center text-neutral-500 text-[11px]">
          <p className="font-semibold text-neutral-400">AetherVPN v0.1.3</p>
          <p className="text-[10px] mt-0.5 text-neutral-500">Secure &bull; Encrypted &bull; Private</p>
        </div>
      </div>
    </div>
  );
};
