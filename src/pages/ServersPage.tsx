import React, { useState } from 'react';
import {
  Server,
  Plus,
  Search,
  Star,
  Activity,
  Trash2,
  Check,
  Globe,
  X,
  AlertCircle,
  Zap,
  Pencil,
  ChevronDown,
  ChevronRight,
  Shield,
  Network,
  Cloud,
  Share2,
  Copy,
} from 'lucide-react';
import { Profile, VpnProtocol } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { getProtocolBadgeColor, isCloudProfile } from '../utils/formatters';

interface ServersPageProps {
  store: VpnStoreType;
}

export const ServersPage: React.FC<ServersPageProps> = ({ store }) => {
  const {
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    toggleFavorite,
    deleteProfile,
    saveProfile,
    importProfileLink,
    exportProfileLink,
    syncCloudServers,
    testProfileLatency,
    setActiveTab,
    connectionInfo,
    connect,
  } = store;

  const isVpnConnected = connectionInfo.status === 'Connected' || connectionInfo.status === 'Connecting';

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [exportedModalData, setExportedModalData] = useState<{ name: string; link: string; copied: boolean } | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const handleExportProfile = async (profile: Profile) => {
    if (isCloudProfile(profile)) {
      return;
    }
    try {
      const link = await exportProfileLink(profile.id);
      try {
        await navigator.clipboard.writeText(link);
      } catch (_) {}
      setExportedModalData({ name: profile.name, link, copied: true });
      setExportSuccessMessage(`Copied link for "${profile.name}" to clipboard`);
      setTimeout(() => setExportSuccessMessage(null), 3500);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to export configuration');
    }
  };

  const handleSyncFreeServers = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const count = await syncCloudServers();
      setSyncStatus(count > 0 ? `Synced ${count}` : 'Synced');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch {
      setSyncStatus('Failed');
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const [addMode, setAddMode] = useState<'link' | 'manual'>('link');

  const [manualProtocol, setManualProtocol] = useState<VpnProtocol>('vless');
  const [manualName, setManualName] = useState('');
  const [manualServer, setManualServer] = useState('');
  const [manualPort, setManualPort] = useState(443);
  const [manualCountryCode, setManualCountryCode] = useState('');

  const [manualUuid, setManualUuid] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualCipher, setManualCipher] = useState('');
  const [manualAlterId, setManualAlterId] = useState(0);
  const [manualFlow, setManualFlow] = useState('');
  const [manualPacketEncoding, setManualPacketEncoding] = useState('xudp');

  const [manualTlsEnabled, setManualTlsEnabled] = useState(true);
  const [manualSni, setManualSni] = useState('');
  const [manualInsecure, setManualInsecure] = useState(false);
  const [manualFingerprint, setManualFingerprint] = useState('chrome');
  const [manualAlpn, setManualAlpn] = useState('');
  const [manualRealityPubKey, setManualRealityPubKey] = useState('');
  const [manualRealityShortId, setManualRealityShortId] = useState('');

  const [manualTransport, setManualTransport] = useState<'tcp' | 'ws' | 'grpc' | 'http' | 'httpupgrade'>('tcp');
  const [manualTransportPath, setManualTransportPath] = useState('');
  const [manualTransportHost, setManualTransportHost] = useState('');

  const [manualWgPrivateKey, setManualWgPrivateKey] = useState('');
  const [manualWgPublicKey, setManualWgPublicKey] = useState('');
  const [manualWgAddress, setManualWgAddress] = useState('10.14.0.2/32');
  const [manualWgDns, setManualWgDns] = useState('');
  const [manualWgMtu, setManualWgMtu] = useState(1420);

  const [showTlsSection, setShowTlsSection] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);

  const filteredProfiles = profiles
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.server.toLowerCase().includes(q) ||
        p.protocol.toLowerCase().includes(q) ||
        (p.countryCode && p.countryCode.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (a.latencyMs || 999) - (b.latencyMs || 999);
    });

  const handleSelectServer = (profile: Profile) => {
    setSelectedProfileId(profile.id);
    setActiveTab('dashboard');
    if (connectionInfo.status === 'Connected') {
      connect();
    }
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    for (const p of profiles) {
      await testProfileLatency(p.id);
    }
    setIsTestingAll(false);
  };

  const handleOpenAdd = () => {
    setEditingProfile(null);
    setAddMode('link');
    setImportText('');
    setImportError(null);

    setManualProtocol('vless');
    setManualName('');
    setManualServer('');
    setManualPort(443);
    setManualCountryCode('');

    setManualUuid('');
    setManualPassword('');
    setManualUsername('');
    setManualCipher('');
    setManualAlterId(0);
    setManualFlow('');
    setManualPacketEncoding('xudp');

    setManualTlsEnabled(true);
    setManualSni('');
    setManualInsecure(false);
    setManualFingerprint('chrome');
    setManualAlpn('');
    setManualRealityPubKey('');
    setManualRealityShortId('');

    setManualTransport('tcp');
    setManualTransportPath('');
    setManualTransportHost('');

    setManualWgPrivateKey('');
    setManualWgPublicKey('');
    setManualWgAddress('10.14.0.2/32');
    setManualWgDns('');
    setManualWgMtu(1420);

    setShowTlsSection(false);
    setShowTransportSection(false);

    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (profile: Profile) => {
    if (isVpnConnected && profile.id === connectionInfo.activeProfileId) {
      return;
    }
    setEditingProfile(profile);
    setAddMode('manual');
    setImportText('');
    setImportError(null);

    setManualProtocol(profile.protocol);
    setManualName(profile.name || '');
    setManualServer(profile.server || '');
    setManualPort(profile.port || 443);
    setManualCountryCode(profile.countryCode || '');

    setManualUuid(profile.uuid || '');
    setManualPassword(profile.password || '');
    setManualUsername(profile.username || '');
    setManualCipher(profile.cipher || '');
    setManualAlterId(profile.alterId || 0);
    setManualFlow(profile.flow || '');
    setManualPacketEncoding(profile.packetEncoding || 'xudp');

    const defaultTls = profile.protocol === 'vless' || profile.protocol === 'trojan' || profile.protocol === 'hysteria2';
    setManualTlsEnabled(profile.tlsEnabled ?? defaultTls);
    setManualSni(profile.serverName || '');
    setManualInsecure(profile.allowInsecure || false);
    setManualFingerprint(profile.fingerprint || 'chrome');
    setManualAlpn(profile.alpn ? profile.alpn.join(',') : '');
    setManualRealityPubKey(profile.realityPublicKey || '');
    setManualRealityShortId(profile.realityShortId || '');

    setManualTransport(profile.transportType || 'tcp');
    setManualTransportPath(profile.transportPath || '');
    setManualTransportHost(profile.transportHost || '');

    setManualWgPrivateKey(profile.wgPrivateKey || '');
    setManualWgPublicKey(profile.wgPublicKey || '');
    setManualWgAddress(profile.wgAddress || '10.14.0.2/32');
    setManualWgDns(profile.wgDns || '');
    setManualWgMtu(profile.wgMtu || 1420);

    setShowTlsSection(Boolean(profile.tlsEnabled || profile.serverName || profile.realityPublicKey || profile.fingerprint));
    setShowTransportSection(Boolean(profile.transportType && profile.transportType !== 'tcp'));

    setIsAddModalOpen(true);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const lines = importText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      for (const line of lines) {
        await importProfileLink(line);
      }
      setImportText('');
      setIsAddModalOpen(false);
      setEditingProfile(null);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse link. Check URL format.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualName.trim() || !manualServer.trim()) {
      setImportError('Please enter a server name and address');
      return;
    }

    const alpnArray = manualAlpn.trim() ? manualAlpn.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

    const baseData: Partial<Profile> = {
      name: manualName.trim(),
      protocol: manualProtocol,
      server: manualServer.trim(),
      port: Number(manualPort) || 443,
      countryCode: manualCountryCode.trim().toUpperCase() || undefined,

      uuid: manualUuid.trim() || undefined,
      password: manualPassword.trim() || undefined,
      username: manualUsername.trim() || undefined,
      cipher: manualCipher.trim() || undefined,
      alterId: manualAlterId ? Number(manualAlterId) : undefined,
      flow: manualFlow.trim() || undefined,
      packetEncoding: manualPacketEncoding.trim() || undefined,

      tlsEnabled: manualTlsEnabled,
      serverName: manualSni.trim() || undefined,
      allowInsecure: manualInsecure,
      fingerprint: manualFingerprint.trim() || undefined,
      alpn: alpnArray,
      realityPublicKey: manualRealityPubKey.trim() || undefined,
      realityShortId: manualRealityShortId.trim() || undefined,

      transportType: manualTransport !== 'tcp' ? manualTransport : undefined,
      transportPath: manualTransportPath.trim() || undefined,
      transportHost: manualTransportHost.trim() || undefined,

      wgPrivateKey: manualWgPrivateKey.trim() || undefined,
      wgPublicKey: manualWgPublicKey.trim() || undefined,
      wgAddress: manualWgAddress.trim() || undefined,
      wgDns: manualWgDns.trim() || undefined,
      wgMtu: manualWgMtu ? Number(manualWgMtu) : undefined,

      updatedAt: new Date().toISOString(),
    };

    if (editingProfile) {
      if (isCloudProfile(editingProfile)) {
        if (isVpnConnected && editingProfile.id === connectionInfo.activeProfileId) {
          setImportError('Cannot edit active server configuration while VPN is connected. Please disconnect first.');
          return;
        }
        const updatedProfile: Profile = {
          ...editingProfile,
          serverName: manualSni.trim() || undefined,
          transportHost: manualTransportHost.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };
        await saveProfile(updatedProfile);
        setIsAddModalOpen(false);
        setEditingProfile(null);
        return;
      }
      if (isVpnConnected) {
        setImportError('Cannot edit server configuration while VPN is connected. Please disconnect first.');
        return;
      }
      const updatedProfile: Profile = {
        ...editingProfile,
        ...baseData,
      };
      await saveProfile(updatedProfile);
    } else {
      const newProfile: Profile = {
        id: `profile-${Date.now()}`,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        ...baseData,
      } as Profile;
      await saveProfile(newProfile);
    }

    setIsAddModalOpen(false);
    setEditingProfile(null);
  };

  const supportsTls =
    manualProtocol === 'vless' ||
    manualProtocol === 'vmess' ||
    manualProtocol === 'trojan' ||
    manualProtocol === 'hysteria2';

  const supportsTransport =
    manualProtocol === 'vless' ||
    manualProtocol === 'vmess' ||
    manualProtocol === 'trojan';

  return (
    <div className="flex flex-col h-full p-4 sm:p-5 max-w-md mx-auto w-full select-none">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-white" />
          <h2 className="text-base font-bold text-white">Servers</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/20 font-mono">
            {profiles.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSyncFreeServers}
            disabled={isSyncing}
            title="Sync Free Servers from Cloud"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-neutral-300 text-xs font-medium border border-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <Cloud className={`w-3.5 h-3.5 text-neutral-300 ${isSyncing ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : syncStatus || 'Sync'}</span>
          </button>

          <button
            onClick={handleTestAll}
            disabled={isTestingAll || profiles.length === 0}
            title="Test Latency to All Servers"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-neutral-300 text-xs font-medium border border-white/10 transition-all cursor-pointer disabled:opacity-40"
          >
            <Activity className={`w-3.5 h-3.5 text-neutral-300 ${isTestingAll ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ping</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold shadow-md shadow-black transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="relative my-3 shrink-0">
        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, location, protocol..."
          className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {exportSuccessMessage && (
        <div className="flex items-center gap-2 p-2.5 mb-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
            <Globe className="w-10 h-10 text-neutral-600 mb-2" />
            <p className="text-sm font-semibold text-neutral-300">No Servers Found</p>
            <p className="text-xs text-neutral-500 mt-1">
              Click &quot;+ Add&quot; to import a VLESS, WireGuard, or Shadowsocks link
            </p>
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const isSelected = selectedProfileId === profile.id;
            return (
              <div
                key={profile.id}
                onClick={() => handleSelectServer(profile)}
                className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 border-white shadow-md shadow-black'
                    : 'bg-[#0d0d0d] hover:bg-[#141414] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#050505] border border-white/10 flex items-center justify-center text-base shrink-0">
                    {profile.countryCode === 'SG'
                      ? '🇸🇬'
                      : profile.countryCode === 'US'
                      ? '🇺🇸'
                      : profile.countryCode === 'DE'
                      ? '🇩🇪'
                      : profile.countryCode === 'JP'
                      ? '🇯🇵'
                      : profile.countryCode === 'GB'
                      ? '🇬🇧'
                      : '🌐'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-white' : 'text-neutral-200'
                        }`}
                      >
                        {profile.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${getProtocolBadgeColor(
                          profile.protocol
                        )}`}
                      >
                        {profile.protocol}
                      </span>
                      {isCloudProfile(profile) && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 flex items-center gap-0.5">
                          <Cloud className="w-2.5 h-2.5" />
                          Cloud
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
                      {isCloudProfile(profile) ? 'Cloud Node • Protected' : `${profile.server}:${profile.port}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {profile.latencyMs ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border text-neutral-200 bg-white/10 border-white/15">
                      {profile.latencyMs}ms
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testProfileLatency(profile.id);
                      }}
                      title="Test Latency"
                      className="text-neutral-500 hover:text-white p-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(profile.id);
                    }}
                    className={`p-1 transition-colors ${
                      profile.isFavorite
                        ? 'text-white fill-current'
                        : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isVpnConnected && profile.id === connectionInfo.activeProfileId) return;
                      handleOpenEdit(profile);
                    }}
                    disabled={isVpnConnected && profile.id === connectionInfo.activeProfileId}
                    title={
                      isVpnConnected && profile.id === connectionInfo.activeProfileId
                        ? 'Cannot edit server while VPN is connected'
                        : isCloudProfile(profile)
                        ? 'Customize SNI & Host Header'
                        : 'Edit Server'
                    }
                    className={`p-1 transition-colors ${
                      isVpnConnected && profile.id === connectionInfo.activeProfileId
                        ? 'text-neutral-700 cursor-not-allowed opacity-40'
                        : 'text-neutral-600 hover:text-white cursor-pointer'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {!isCloudProfile(profile) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportProfile(profile);
                      }}
                      title="Export Configuration / Copy Share Link"
                      className="p-1 text-neutral-600 hover:text-white cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isVpnConnected && (profile.id === connectionInfo.activeProfileId || profile.id === selectedProfileId)) {
                        return;
                      }
                      deleteProfile(profile.id);
                    }}
                    disabled={isVpnConnected && (profile.id === connectionInfo.activeProfileId || profile.id === selectedProfileId)}
                    title={
                      isVpnConnected && (profile.id === connectionInfo.activeProfileId || profile.id === selectedProfileId)
                        ? 'Cannot delete active server while VPN is connected'
                        : 'Delete Server'
                    }
                    className={`p-1 transition-colors ${
                      isVpnConnected && (profile.id === connectionInfo.activeProfileId || profile.id === selectedProfileId)
                        ? 'text-neutral-700 cursor-not-allowed opacity-40'
                        : 'text-neutral-600 hover:text-red-400 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-white border-white text-black'
                        : 'border-neutral-700 bg-neutral-900/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-3xl p-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-bold text-white">
                {editingProfile
                  ? isCloudProfile(editingProfile)
                    ? 'Edit Cloud Server (Host & SNI)'
                    : 'Edit Server'
                  : 'Add Server'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProfile(null);
                }}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isVpnConnected && editingProfile && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 my-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Disconnect VPN before modifying server configurations.</span>
              </div>
            )}

            {!editingProfile && (
              <div className="flex bg-black p-1 rounded-xl border border-white/10 my-3 text-xs shrink-0">
                <button
                  onClick={() => setAddMode('link')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    addMode === 'link' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Import Link / URL
                </button>
                <button
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    addMode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Manual Config
                </button>
              </div>
            )}

            {!editingProfile && addMode === 'link' ? (
              <div className="space-y-3 pt-2">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste link here (vless://, vmess://, ss://, trojan://, or Subscription URL)"
                  rows={5}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-white/40 resize-none"
                />

                {importError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/40">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={isImporting || !importText.trim()}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : 'Save & Add'}
                </button>
              </div>
            ) : editingProfile && isCloudProfile(editingProfile) ? (
              <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
                <div className="flex items-start gap-2.5 p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-xs text-cyan-200">
                  <Cloud className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-cyan-300">Cloud Node Configuration</div>
                    <div className="text-[11px] text-cyan-200/80 leading-relaxed">
                      Core node infrastructure is managed by cloud. You can customize the <strong>SNI</strong> and <strong>Host Header</strong> below for your ISP or bypass requirements.
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px]">Server:</span>
                    <span className="font-semibold text-white">{editingProfile.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px]">Protocol:</span>
                    <span className="font-mono uppercase font-bold text-neutral-200">{editingProfile.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px]">Server Address:</span>
                    <span className="font-mono text-neutral-500">Cloud Node • Protected</span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      SNI (Server Name)
                    </label>
                    <input
                      type="text"
                      value={manualSni}
                      onChange={(e) => setManualSni(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      TLS Server Name Indication (used for handshake validation)
                    </span>
                  </div>

                  <div>
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Host (Host Header)
                    </label>
                    <input
                      type="text"
                      value={manualTransportHost}
                      onChange={(e) => setManualTransportHost(e.target.value)}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      HTTP/WebSocket/gRPC Host header sent through the transport
                    </span>
                  </div>
                </div>

                {importError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/40">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                    Protocol
                  </label>
                  <select
                    value={manualProtocol}
                    onChange={(e) => setManualProtocol(e.target.value as VpnProtocol)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                  >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="shadowsocks">Shadowsocks</option>
                    <option value="trojan">Trojan</option>
                    <option value="wireguard">WireGuard</option>
                    <option value="socks5">SOCKS5</option>
                    <option value="hysteria2">Hysteria2</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Server Name
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={manualCountryCode}
                      onChange={(e) => setManualCountryCode(e.target.value)}
                      maxLength={4}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 uppercase font-mono text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Server Address / Host
                    </label>
                    <input
                      type="text"
                      value={manualServer}
                      onChange={(e) => setManualServer(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={manualPort}
                      onChange={(e) => setManualPort(Number(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono"
                    />
                  </div>
                </div>

                {manualProtocol === 'vless' && (
                  <div className="space-y-2.5 pt-1 border-t border-white/10">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        UUID (User ID)
                      </label>
                      <input
                        type="text"
                        value={manualUuid}
                        onChange={(e) => setManualUuid(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                          Flow
                        </label>
                        <select
                          value={manualFlow}
                          onChange={(e) => setManualFlow(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                        >
                          <option value="">None</option>
                          <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                          Packet Encoding
                        </label>
                        <select
                          value={manualPacketEncoding}
                          onChange={(e) => setManualPacketEncoding(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                        >
                          <option value="xudp">xudp</option>
                          <option value="packetaddr">packetaddr</option>
                          <option value="">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {manualProtocol === 'vmess' && (
                  <div className="space-y-2.5 pt-1 border-t border-white/10">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        UUID (User ID)
                      </label>
                      <input
                        type="text"
                        value={manualUuid}
                        onChange={(e) => setManualUuid(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                          Security / Cipher
                        </label>
                        <select
                          value={manualCipher || 'auto'}
                          onChange={(e) => setManualCipher(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                        >
                          <option value="auto">auto</option>
                          <option value="aes-128-gcm">aes-128-gcm</option>
                          <option value="chacha20-poly1305">chacha20-poly1305</option>
                          <option value="none">none</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                          Alter ID
                        </label>
                        <input
                          type="number"
                          value={manualAlterId}
                          onChange={(e) => setManualAlterId(Number(e.target.value))}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {manualProtocol === 'shadowsocks' && (
                  <div className="space-y-2.5 pt-1 border-t border-white/10">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        Password
                      </label>
                      <input
                        type="text"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        Cipher Method
                      </label>
                      <select
                        value={manualCipher || '2022-blake3-aes-128-gcm'}
                        onChange={(e) => setManualCipher(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                      >
                        <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                        <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                        <option value="2022-blake3-chacha20-poly1305">2022-blake3-chacha20-poly1305</option>
                        <option value="aes-128-gcm">aes-128-gcm</option>
                        <option value="aes-256-gcm">aes-256-gcm</option>
                        <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                        <option value="none">none</option>
                      </select>
                    </div>
                  </div>
                )}

                {(manualProtocol === 'trojan' || manualProtocol === 'hysteria2') && (
                  <div className="pt-1 border-t border-white/10">
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Password
                    </label>
                    <input
                      type="text"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                    />
                  </div>
                )}

                {manualProtocol === 'socks5' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualUsername}
                        onChange={(e) => setManualUsername(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        Password (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                      />
                    </div>
                  </div>
                )}

                {manualProtocol === 'wireguard' && (
                  <div className="space-y-2.5 pt-1 border-t border-white/10">
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        Interface Private Key
                      </label>
                      <input
                        type="text"
                        value={manualWgPrivateKey}
                        onChange={(e) => setManualWgPrivateKey(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        Peer Public Key
                      </label>
                      <input
                        type="text"
                        value={manualWgPublicKey}
                        onChange={(e) => setManualWgPublicKey(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                          Local Address
                        </label>
                        <input
                          type="text"
                          value={manualWgAddress}
                          onChange={(e) => setManualWgAddress(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                          MTU
                        </label>
                        <input
                          type="number"
                          value={manualWgMtu}
                          onChange={(e) => setManualWgMtu(Number(e.target.value))}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                        DNS Server (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualWgDns}
                        onChange={(e) => setManualWgDns(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {supportsTls && (
                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowTlsSection(!showTlsSection)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/10 text-xs font-semibold text-neutral-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-neutral-400" />
                        <span>TLS & Security Settings</span>
                      </div>
                      {showTlsSection ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>

                    {showTlsSection && (
                      <div className="p-3 mt-2 rounded-xl bg-black/60 border border-white/10 space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={manualTlsEnabled}
                            onChange={(e) => setManualTlsEnabled(e.target.checked)}
                            className="rounded border-white/20 bg-neutral-900 text-white focus:ring-0 cursor-pointer"
                          />
                          <span className="text-neutral-300 font-medium">Enable TLS</span>
                        </label>

                        {manualTlsEnabled && (
                          <>
                            <div>
                              <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                SNI / Server Name
                              </label>
                              <input
                                type="text"
                                value={manualSni}
                                onChange={(e) => setManualSni(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                  Fingerprint (uTLS)
                                </label>
                                <select
                                  value={manualFingerprint}
                                  onChange={(e) => setManualFingerprint(e.target.value)}
                                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                                >
                                  <option value="chrome">chrome</option>
                                  <option value="firefox">firefox</option>
                                  <option value="safari">safari</option>
                                  <option value="ios">ios</option>
                                  <option value="android">android</option>
                                  <option value="edge">edge</option>
                                  <option value="randomized">randomized</option>
                                  <option value="">None</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                  ALPN
                                </label>
                                <input
                                  type="text"
                                  value={manualAlpn}
                                  onChange={(e) => setManualAlpn(e.target.value)}
                                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                                />
                              </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={manualInsecure}
                                onChange={(e) => setManualInsecure(e.target.checked)}
                                className="rounded border-white/20 bg-neutral-900 text-white focus:ring-0 cursor-pointer"
                              />
                              <span className="text-neutral-300 font-medium">
                                Allow Insecure (Skip Cert Verification)
                              </span>
                            </label>

                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <div className="text-[10px] uppercase font-bold text-neutral-400">
                                VLESS Reality Settings
                              </div>
                              <div>
                                <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                  Reality Public Key
                                </label>
                                <input
                                  type="text"
                                  value={manualRealityPubKey}
                                  onChange={(e) => setManualRealityPubKey(e.target.value)}
                                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                  Reality Short ID
                                </label>
                                <input
                                  type="text"
                                  value={manualRealityShortId}
                                  onChange={(e) => setManualRealityShortId(e.target.value)}
                                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {supportsTransport && (
                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowTransportSection(!showTransportSection)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/10 text-xs font-semibold text-neutral-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Network className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Transport & Stream Settings</span>
                      </div>
                      {showTransportSection ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>

                    {showTransportSection && (
                      <div className="p-3 mt-2 rounded-xl bg-black/60 border border-white/10 space-y-2.5">
                        <div>
                          <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                            Transport Type
                          </label>
                          <select
                            value={manualTransport}
                            onChange={(e) =>
                              setManualTransport(e.target.value as 'tcp' | 'ws' | 'grpc' | 'http' | 'httpupgrade')
                            }
                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                          >
                            <option value="tcp">TCP (Default)</option>
                            <option value="ws">WebSocket (WS)</option>
                            <option value="grpc">gRPC</option>
                            <option value="http">HTTP</option>
                            <option value="httpupgrade">HTTPUpgrade</option>
                          </select>
                        </div>

                        {manualTransport !== 'tcp' && (
                          <>
                            <div>
                              <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                {manualTransport === 'grpc' ? 'gRPC Service Name' : 'Path'}
                              </label>
                              <input
                                type="text"
                                value={manualTransportPath}
                                onChange={(e) => setManualTransportPath(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                              />
                            </div>

                            {manualTransport !== 'grpc' && (
                              <div>
                                <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                                  Host Header
                                </label>
                                <input
                                  type="text"
                                  value={manualTransportHost}
                                  onChange={(e) => setManualTransportHost(e.target.value)}
                                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {importError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/40">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            )}

            {(editingProfile || addMode === 'manual') && (
              <div className="pt-3 border-t border-white/10 shrink-0">
                <button
                  onClick={handleManualSave}
                  disabled={isVpnConnected && !!editingProfile}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                    isVpnConnected && editingProfile
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                      : 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
                  }`}
                >
                  {isVpnConnected && editingProfile
                    ? 'Cannot Save While Connected'
                    : editingProfile
                    ? 'Save Changes'
                    : 'Save Profile'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {exportedModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-3xl p-5 shadow-2xl relative flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">Export Configuration</h3>
              </div>
              <button
                onClick={() => setExportedModalData(null)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold text-neutral-300 mb-1">{exportedModalData.name}</div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Share link generated. You can copy this link and import it into any VPN client:
              </p>
              <textarea
                readOnly
                value={exportedModalData.link}
                rows={4}
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-neutral-200 font-mono focus:outline-none focus:border-white/30 resize-none select-all break-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setExportedModalData(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#161616] hover:bg-[#222] border border-white/10 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportedModalData.link);
                    setExportedModalData({ ...exportedModalData, copied: true });
                  } catch (_) {}
                }}
                className="px-4 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {exportedModalData.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-black" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-black" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
