import React, { useState } from 'react';
import {
  Plus,
  Server,
  Search,
  Filter,
  Star,
  Activity,
  Trash2,
  Copy,
  Edit2,
  Download,
  Upload,
  CheckCircle,
  Wifi,
  Shield,
  Layers,
  ArrowUpDown,
  X,
  Globe,
  Lock,
} from 'lucide-react';
import { Profile, VpnProtocol } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { getProtocolBadgeColor } from '../utils/formatters';
import { vpnApi } from '../services/tauriApi';

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
    testProfileLatency,
    connectionInfo,
  } = store;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'latency' | 'name' | 'favorite'>('favorite');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<Profile> | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Extract unique groups
  const groups = ['All', ...Array.from(new Set(profiles.map((p) => p.groupName || 'Default')))];

  // Filter & Sort
  const filteredProfiles = profiles
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.server.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.protocol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = selectedGroup === 'All' || (p.groupName || 'Default') === selectedGroup;
      const matchesProtocol = selectedProtocol === 'All' || p.protocol === selectedProtocol;
      return matchesSearch && matchesGroup && matchesProtocol;
    })
    .sort((a, b) => {
      if (sortBy === 'favorite') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return (a.latencyMs || 999) - (b.latencyMs || 999);
      }
      if (sortBy === 'latency') {
        return (a.latencyMs || 999) - (b.latencyMs || 999);
      }
      return a.name.localeCompare(b.name);
    });

  const handleOpenAdd = () => {
    setEditingProfile({
      id: `prof-${Date.now()}`,
      name: '',
      protocol: 'vless',
      server: '',
      port: 443,
      uuid: '',
      tlsEnabled: true,
      serverName: '',
      countryCode: 'US',
      groupName: 'Default',
      isFavorite: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProfile({ ...p });
    setIsModalOpen(true);
  };

  const handleDuplicate = (p: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated: Profile = {
      ...p,
      id: `prof-${Date.now()}`,
      name: `${p.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProfile(duplicated);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this profile?')) {
      deleteProfile(id);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name || !editingProfile.server) return;

    const fullProfile: Profile = {
      id: editingProfile.id || `prof-${Date.now()}`,
      name: editingProfile.name,
      protocol: (editingProfile.protocol as VpnProtocol) || 'vless',
      server: editingProfile.server,
      port: Number(editingProfile.port) || 443,
      uuid: editingProfile.uuid,
      password: editingProfile.password,
      cipher: editingProfile.cipher,
      tlsEnabled: editingProfile.tlsEnabled ?? true,
      serverName: editingProfile.serverName,
      allowInsecure: editingProfile.allowInsecure ?? false,
      alpn: editingProfile.alpn,
      realityPublicKey: editingProfile.realityPublicKey,
      realityShortId: editingProfile.realityShortId,
      transportType: editingProfile.transportType,
      transportPath: editingProfile.transportPath,
      transportHost: editingProfile.transportHost,
      flow: editingProfile.flow,
      fingerprint: editingProfile.fingerprint,
      packetEncoding: editingProfile.packetEncoding,
      alterId: editingProfile.alterId,
      countryCode: editingProfile.countryCode || 'US',
      groupName: editingProfile.groupName || 'Default',
      isFavorite: editingProfile.isFavorite || false,
      latencyMs: editingProfile.latencyMs || null,
      createdAt: editingProfile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProfile(fullProfile);
    setIsModalOpen(false);
    setEditingProfile(null);
  };

  const handleImportLinks = async () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      try {
        const imported = await vpnApi.importProfileLink(line);
        if (imported && imported.id) {
          saveProfile(imported);
        }
      } catch (err) {
        console.error('Failed to parse share link via backend:', line, err);
      }
    }

    setIsImportModalOpen(false);
    setImportText('');
  };

  const handlePingAll = () => {
    profiles.forEach((p) => {
      testProfileLatency(p.id);
    });
  };

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4 select-none">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-xs hover:brightness-110 shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Server</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-800 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handlePingAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 font-medium text-xs hover:bg-slate-800 transition-all"
          >
            <Wifi className="w-4 h-4" />
            <span>Test All Pings</span>
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search servers, IPs, protocols..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() =>
              setSortBy((prev) =>
                prev === 'favorite' ? 'latency' : prev === 'latency' ? 'name' : 'favorite'
              )
            }
            title={`Sort by: ${sortBy}`}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 font-medium"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortBy}</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-xs">
        {/* Groups */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Group:
          </span>
          {groups.map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedGroup === grp
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Protocols */}
        <div className="flex items-center gap-1.5">
          {['All', 'vless', 'shadowsocks', 'wireguard', 'trojan', 'hysteria2'].map((proto) => (
            <button
              key={proto}
              onClick={() => setSelectedProtocol(proto)}
              className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] uppercase transition-all ${
                selectedProtocol === proto
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>
      </div>

      {/* Server List Cards */}
      {filteredProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
          <Server className="w-12 h-12 text-slate-600" />
          <div>
            <div className="text-base font-semibold text-slate-200">No Servers Found</div>
            <div className="text-xs text-slate-400 mt-1 max-w-sm">
              {profiles.length === 0
                ? 'No VPN servers configured yet. Add a server manually or import from a share link or subscription.'
                : 'No servers match the selected filters or search query.'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-xs hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Server</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Import Links</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProfiles.map((p) => {
            const isSelected = selectedProfileId === p.id;
            const isConnected = isSelected && connectionInfo.status === 'Connected';

          return (
            <div
              key={p.id}
              onClick={() => setSelectedProfileId(p.id)}
              className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-200 relative group border ${
                isSelected
                  ? 'border-cyan-500/60 bg-slate-900/90 shadow-lg shadow-cyan-950/40'
                  : 'hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {p.countryCode === 'DE' ? '🇩🇪' : p.countryCode === 'JP' ? '🇯🇵' : p.countryCode === 'GB' ? '🇬🇧' : p.countryCode === 'SG' ? '🇸🇬' : '🇺🇸'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      {isConnected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {p.server}:{p.port}
                    </div>
                  </div>
                </div>

                {/* Favorite Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                >
                  <Star
                    className={`w-4 h-4 ${
                      p.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Sub-Details */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-mono uppercase text-[10px] font-semibold border ${getProtocolBadgeColor(
                      p.protocol
                    )}`}
                  >
                    {p.protocol}
                  </span>
                  <span className="text-slate-400 text-[11px]">{p.groupName || 'Default'}</span>
                </div>

                {/* Ping & Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      testProfileLatency(p.id);
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                  >
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>{p.latencyMs ? `${p.latencyMs} ms` : 'Ping'}</span>
                  </button>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={(e) => handleOpenEdit(p, e)}
                      title="Edit server"
                      className="p-1 hover:text-cyan-400 text-slate-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(p, e)}
                      title="Duplicate server"
                      className="p-1 hover:text-cyan-400 text-slate-400"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      title="Delete server"
                      className="p-1 hover:text-rose-400 text-slate-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {isModalOpen && editingProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h2 className="font-bold text-base text-white">
                {editingProfile.id ? 'Edit Server Profile' : 'Add New Server Profile'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs mt-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProfile.name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  placeholder="e.g. Frankfurt Dedicated 01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Protocol
                  </label>
                  <select
                    value={editingProfile.protocol || 'vless'}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        protocol: e.target.value as VpnProtocol,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase font-mono"
                  >
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                    <option value="shadowsocks">Shadowsocks</option>
                    <option value="wireguard">WireGuard</option>
                    <option value="hysteria2">Hysteria 2</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Group / Category
                  </label>
                  <input
                    type="text"
                    value={editingProfile.groupName || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, groupName: e.target.value })
                    }
                    placeholder="e.g. Europe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Server Address / Hostname
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProfile.server || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, server: e.target.value })
                    }
                    placeholder="de.example.com or 1.2.3.4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Port
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProfile.port || 443}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, port: parseInt(e.target.value) || 443 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Protocol Credentials */}
              {(editingProfile.protocol === 'vless' || editingProfile.protocol === 'vmess') && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    UUID User ID
                  </label>
                  <input
                    type="text"
                    value={editingProfile.uuid || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, uuid: e.target.value })
                    }
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {editingProfile.protocol === 'vmess' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                      Cipher / Security
                    </label>
                    <select
                      value={editingProfile.cipher || 'auto'}
                      onChange={(e) => setEditingProfile({ ...editingProfile, cipher: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value="auto">auto</option>
                      <option value="aes-128-gcm">aes-128-gcm</option>
                      <option value="chacha20-poly1305">chacha20-poly1305</option>
                      <option value="none">none</option>
                      <option value="zero">zero</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                      Alter ID
                    </label>
                    <input
                      type="number"
                      value={editingProfile.alterId ?? 0}
                      onChange={(e) => setEditingProfile({ ...editingProfile, alterId: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {(editingProfile.protocol === 'trojan' || editingProfile.protocol === 'shadowsocks') && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Password / Secret Key
                  </label>
                  <input
                    type="password"
                    value={editingProfile.password || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, password: e.target.value })
                    }
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {editingProfile.protocol === 'shadowsocks' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Shadowsocks Cipher
                  </label>
                  <select
                    value={editingProfile.cipher || '2022-blake3-aes-128-gcm'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, cipher: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm (Fastest)</option>
                    <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                    <option value="aes-256-gcm">aes-256-gcm</option>
                    <option value="aes-128-gcm">aes-128-gcm</option>
                    <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                  </select>
                </div>
              )}

              {/* V2Ray Transport Network */}
              {(editingProfile.protocol === 'vless' || editingProfile.protocol === 'vmess' || editingProfile.protocol === 'trojan') && (
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-[11px] uppercase tracking-wide">
                    <Globe className="w-3.5 h-3.5" />
                    <span>V2Ray Transport Network</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">
                        Transport Type
                      </label>
                      <select
                        value={editingProfile.transportType || 'tcp'}
                        onChange={(e) => setEditingProfile({ ...editingProfile, transportType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 uppercase"
                      >
                        <option value="tcp">TCP (Standard)</option>
                        <option value="ws">WebSocket (WS)</option>
                        <option value="grpc">gRPC</option>
                        <option value="http">HTTP/2</option>
                      </select>
                    </div>

                    {(editingProfile.transportType === 'ws' || editingProfile.transportType === 'http') && (
                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">
                          Path
                        </label>
                        <input
                          type="text"
                          value={editingProfile.transportPath || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, transportPath: e.target.value })}
                          placeholder="/ or /ws-path"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}

                    {editingProfile.transportType === 'grpc' && (
                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">
                          Service Name
                        </label>
                        <input
                          type="text"
                          value={editingProfile.transportPath || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, transportPath: e.target.value })}
                          placeholder="grpc-service"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>

                  {(editingProfile.transportType === 'ws' || editingProfile.transportType === 'http') && (
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">
                        Header Host (CDN / WebSocket Host)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.transportHost || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, transportHost: e.target.value })}
                        placeholder="e.g. v2ray.xoxod33p.tech (Leave empty to use server)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TLS & Security */}
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px] uppercase tracking-wide">
                    <Lock className="w-3.5 h-3.5" />
                    <span>TLS & Security Settings</span>
                  </div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={editingProfile.tlsEnabled ?? true}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, tlsEnabled: e.target.checked })
                      }
                      className="rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-0"
                    />
                    <span>Enable TLS</span>
                  </label>
                </div>

                {editingProfile.tlsEnabled && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">
                          Server Name (SNI)
                        </label>
                        <input
                          type="text"
                          value={editingProfile.serverName || ''}
                          onChange={(e) => setEditingProfile({ ...editingProfile, serverName: e.target.value })}
                          placeholder="e.g. v2ray.xoxod33p.tech"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">
                          uTLS Client Fingerprint
                        </label>
                        <select
                          value={editingProfile.fingerprint || 'chrome'}
                          onChange={(e) => setEditingProfile({ ...editingProfile, fingerprint: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                        >
                          <option value="chrome">chrome (Default)</option>
                          <option value="firefox">firefox</option>
                          <option value="safari">safari</option>
                          <option value="ios">ios</option>
                          <option value="edge">edge</option>
                          <option value="randomized">randomized</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-slate-400 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={editingProfile.allowInsecure ?? false}
                          onChange={(e) => setEditingProfile({ ...editingProfile, allowInsecure: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-800 text-rose-500 focus:ring-0"
                        />
                        <span>Allow Insecure (Skip Certificate Verification)</span>
                      </label>
                    </div>

                    {/* VLESS Reality & Vision */}
                    {editingProfile.protocol === 'vless' && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 mb-1 text-[11px]">
                              Flow (XTLS)
                            </label>
                            <select
                              value={editingProfile.flow || ''}
                              onChange={(e) => setEditingProfile({ ...editingProfile, flow: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                            >
                              <option value="">None (Standard)</option>
                              <option value="xtls-rprx-vision">xtls-rprx-vision (Vision)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 text-[11px]">
                              Reality Short ID (sid)
                            </label>
                            <input
                              type="text"
                              value={editingProfile.realityShortId || ''}
                              onChange={(e) => setEditingProfile({ ...editingProfile, realityShortId: e.target.value })}
                              placeholder="e.g. 12345678"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1 text-[11px]">
                            Reality Public Key (pbk)
                          </label>
                          <input
                            type="text"
                            value={editingProfile.realityPublicKey || ''}
                            onChange={(e) => setEditingProfile({ ...editingProfile, realityPublicKey: e.target.value })}
                            placeholder="Reality public key base64"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 shrink-0 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-bold text-base text-white">Import Share Links</h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste VLESS, Trojan, Shadowsocks, or VMess share URLs (one per line):
            </p>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="vless://uuid@host:443?security=tls#Frankfurt&#10;trojan://password@host:443#Tokyo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImportLinks}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
              >
                Import Profiles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
