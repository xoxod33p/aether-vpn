import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  Globe,
  Radio,
  Zap,
  Check,
  Power,
  RotateCcw,
  Download,
  RefreshCw,
  ExternalLink,
  Laptop,
  Copy,
} from 'lucide-react';
import { AppSettings, OperatingMode, UpdateInfo } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';

interface SettingsPageProps {
  store: VpnStoreType;
  initialUpdateInfo?: UpdateInfo | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ store, initialUpdateInfo }) => {
  const { settings, setSettings, toggleKillSwitch, updateOperatingMode, setActiveTab } = store;
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(initialUpdateInfo || null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">AetherVPN v{updateInfo?.currentVersion || '0.1.5'}</p>
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

        <div className="pt-2 pb-4 text-center text-neutral-500 text-[11px]">
          <p className="font-semibold text-neutral-400">AetherVPN v{updateInfo?.currentVersion || '0.1.5'}</p>
          <p className="text-[10px] mt-0.5 text-neutral-500">Secure &bull; Encrypted &bull; Private</p>
        </div>
      </div>
    </div>
  );
};
