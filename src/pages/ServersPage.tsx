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
  Link as LinkIcon,
  X,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Profile, VpnProtocol } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { getProtocolBadgeColor } from '../utils/formatters';

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
    testProfileLatency,
    setActiveTab,
    connectionInfo,
    connect,
  } = store;

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Manual Add Form State
  const [addMode, setAddMode] = useState<'link' | 'manual'>('link');
  const [manualProtocol, setManualProtocol] = useState<VpnProtocol>('vless');
  const [manualName, setManualName] = useState('');
  const [manualServer, setManualServer] = useState('');
  const [manualPort, setManualPort] = useState(443);
  const [manualUuid, setManualUuid] = useState('');

  // Filtered & sorted profiles
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
      // Reconnect to newly selected server
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
    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      name: manualName.trim(),
      protocol: manualProtocol,
      server: manualServer.trim(),
      port: Number(manualPort),
      uuid: manualUuid.trim() || undefined,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(newProfile);
    setIsAddModalOpen(false);
    setManualName('');
    setManualServer('');
    setManualUuid('');
  };

  return (
    <div className="flex flex-col h-full p-4 sm:p-5 max-w-md mx-auto w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-white" />
          <h2 className="text-base font-bold text-white">Servers</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/20 font-mono">
            {profiles.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Ping All Button */}
          <button
            onClick={handleTestAll}
            disabled={isTestingAll || profiles.length === 0}
            title="Test Latency to All Servers"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0d0d0d] hover:bg-[#161616] text-neutral-300 text-xs font-medium border border-white/10 transition-all cursor-pointer disabled:opacity-40"
          >
            <Activity className={`w-3.5 h-3.5 text-neutral-300 ${isTestingAll ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ping</span>
          </button>

          {/* Add Server Button */}
          <button
            onClick={() => {
              setImportError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold shadow-md shadow-black transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
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

      {/* Server List */}
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
                {/* Left info */}
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
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
                      {profile.server}:{profile.port}
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Ping Badge */}
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

                  {/* Favorite toggle */}
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

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(profile.id);
                    }}
                    className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Active Radio / Check */}
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

      {/* Add / Import Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/15 rounded-3xl p-5 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <h3 className="text-sm font-bold text-white mb-3">Add Server</h3>

            {/* Tabs: Link / Manual */}
            <div className="flex bg-black p-1 rounded-xl border border-white/10 mb-3 text-xs">
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

            {/* Link Mode */}
            {addMode === 'link' ? (
              <div className="space-y-3">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste link here (vless://, vmess://, ss://, trojan://, or Subscription URL)"
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-white/40 resize-none"
                />

                {importError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/40">
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
            ) : (
              /* Manual Mode */
              <div className="space-y-2.5 text-xs">
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
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. My Fast Server"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                      Server Host
                    </label>
                    <input
                      type="text"
                      value={manualServer}
                      onChange={(e) => setManualServer(e.target.value)}
                      placeholder="1.2.3.4 or example.com"
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

                <div>
                  <label className="text-neutral-400 text-[10px] uppercase font-bold block mb-1">
                    UUID / Password
                  </label>
                  <input
                    type="text"
                    value={manualUuid}
                    onChange={(e) => setManualUuid(e.target.value)}
                    placeholder="User ID or Password"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/40 font-mono text-[11px]"
                  />
                </div>

                <button
                  onClick={handleManualSave}
                  className="w-full mt-2 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold transition-all cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
