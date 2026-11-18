import React, { useState } from 'react';
import { Download, X, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { UpdateInfo } from '../../types';
import { vpnApi } from '../../services/tauriApi';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, isOpen, onClose }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstall = async () => {
    if (!updateInfo.downloadUrl) return;
    setIsInstalling(true);
    setInstallStatus('Downloading and preparing installer...');
    try {
      const res = await vpnApi.downloadAndInstallUpdate(updateInfo.downloadUrl);
      setInstallStatus(res || 'Installer launched. Restarting application...');
    } catch (err: any) {
      setInstallStatus(err?.message || 'Failed to install update. Please download manually.');
      setIsInstalling(false);
    }
  };

  const assetSizeMb = updateInfo.assetSize
    ? (updateInfo.assetSize / (1024 * 1024)).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/15 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        <div className="p-5 pb-4 flex items-start justify-between border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(255,255,255,0.15)] shrink-0">
              <img src="/icon.png" alt="Aether" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">New Update Available</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-extrabold">
                  v{updateInfo.latestVersion}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                Current version: v{updateInfo.currentVersion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 max-h-[55vh] overflow-y-auto">
          <div className="bg-[#111111] border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200 mb-1">
              <span>{updateInfo.releaseName || `AetherVPN v${updateInfo.latestVersion}`}</span>
              {assetSizeMb && (
                <span className="text-[10px] font-mono text-neutral-400">{assetSizeMb} MB</span>
              )}
            </div>
            {updateInfo.releaseNotes && (
              <p className="text-[11px] text-neutral-400 whitespace-pre-wrap leading-relaxed">
                {updateInfo.releaseNotes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0" />
            <span>Persistence guaranteed. Your saved servers and settings will remain intact.</span>
          </div>

          {installStatus && (
            <div className="bg-[#141414] border border-white/10 rounded-lg p-2.5 flex items-center gap-2 text-[11px] font-mono text-neutral-200">
              {isInstalling ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
              )}
              <span className="truncate">{installStatus}</span>
            </div>
          )}
        </div>

        <div className="p-4 pt-3 border-t border-white/10 bg-[#070707] flex flex-col gap-2">
          {updateInfo.downloadUrl ? (
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs tracking-wide hover:bg-neutral-200 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-60"
            >
              {isInstalling ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Installing Update...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Update Now {assetSizeMb ? `(${assetSizeMb} MB)` : ''}</span>
                </>
              )}
            </button>
          ) : (
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs tracking-wide hover:bg-neutral-200 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span>Download on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-neutral-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View Release Notes</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
