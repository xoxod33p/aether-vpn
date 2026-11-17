import React, { useState } from 'react';
import {
  Rss,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { Subscription } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';

interface SubscriptionsPageProps {
  store: VpnStoreType;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({ store }) => {
  const { subscriptions, setSubscriptions, addLog } = store;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newSub, setNewSub] = useState({
    name: '',
    url: '',
    format: 'singbox' as Subscription['format'],
    autoUpdate: true,
    updateIntervalHours: 24,
  });

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name || !newSub.url) return;

    const created: Subscription = {
      id: `sub-${Date.now()}`,
      name: newSub.name,
      url: newSub.url,
      format: newSub.format,
      autoUpdate: newSub.autoUpdate,
      updateIntervalHours: newSub.updateIntervalHours,
      lastUpdatedAt: new Date().toISOString(),
      lastStatus: 'pending',
      profileCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await vpnApi.saveSubscription(created);
      setSubscriptions((prev) => [created, ...prev]);
      addLog('info', `Added subscription "${created.name}" (${created.format.toUpperCase()})`);
      setIsModalOpen(false);
      setNewSub({
        name: '',
        url: '',
        format: 'singbox',
        autoUpdate: true,
        updateIntervalHours: 24,
      });

      // Automatically trigger update
      handleUpdate(created.id, created.name);
    } catch (err: any) {
      addLog('error', `Failed to add subscription: ${err.message}`);
    }
  };

  const handleUpdate = async (id: string, name: string) => {
    setUpdatingId(id);
    addLog('info', `Updating subscription "${name}" from remote endpoint...`);

    try {
      const importedProfiles = await vpnApi.updateSubscription(id);
      const updatedSubs = await vpnApi.getSubscriptions();
      setSubscriptions(updatedSubs);
      addLog('info', `Subscription "${name}" synchronized: ${importedProfiles.length} nodes loaded.`);
    } catch (err: any) {
      addLog('error', `Subscription update failed: ${err.message || err}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete subscription "${name}" and its associated nodes?`)) {
      try {
        await vpnApi.deleteSubscription(id);
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        addLog('info', `Deleted subscription "${name}"`);
      } catch (err: any) {
        addLog('error', `Failed to delete subscription: ${err.message}`);
      }
    }
  };

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4 select-none">
      {/* Top Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Subscription Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-fetch and sync remote node lists from sing-box, Clash, or V2Ray endpoints.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-xs hover:brightness-110 shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Subscriptions Grid */}
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
          <Rss className="w-12 h-12 text-slate-600" />
          <div>
            <div className="text-base font-semibold text-slate-200">No Subscriptions Added</div>
            <div className="text-xs text-slate-400 mt-1 max-w-sm">
              Add a subscription URL to automatically synchronize and manage remote VPN server endpoints.
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-xs hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.map((sub) => {
            const isUpdating = updatingId === sub.id;

            return (
              <div
                key={sub.id}
                className="glass-panel rounded-2xl p-6 relative border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                      <Rss className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{sub.name}</h3>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-xs mt-0.5">
                        {sub.url}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
                    {sub.format}
                  </span>
                </div>

                {/* Status and count */}
                <div className="grid grid-cols-3 gap-2 my-4 pt-4 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Profiles</span>
                    <span className="font-mono font-bold text-white text-sm">{sub.profileCount}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Auto-Sync</span>
                    <span className="text-slate-300 font-medium">{sub.autoUpdate ? `Every ${sub.updateIntervalHours}h` : 'Manual'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Status</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Synced
                    </span>
                  </div>
                </div>

                {/* Footer action bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>
                      {sub.lastUpdatedAt
                        ? new Date(sub.lastUpdatedAt).toLocaleTimeString()
                        : 'Never'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdate(sub.id, sub.name)}
                      disabled={isUpdating}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-all ${
                        isUpdating ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(sub.id, sub.name)}
                      className="p-1.5 rounded-xl hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-bold text-base text-white">Add Subscription Provider</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Subscription Name
                </label>
                <input
                  type="text"
                  required
                  value={newSub.name}
                  onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                  placeholder="e.g. Aether Primary Feed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Subscription URL
                </label>
                <input
                  type="url"
                  required
                  value={newSub.url}
                  onChange={(e) => setNewSub({ ...newSub, url: e.target.value })}
                  placeholder="https://example.com/api/v1/client/subscribe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Format
                  </label>
                  <select
                    value={newSub.format}
                    onChange={(e) =>
                      setNewSub({
                        ...newSub,
                        format: e.target.value as Subscription['format'],
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono uppercase"
                  >
                    <option value="singbox">sing-box JSON</option>
                    <option value="v2ray">V2Ray / Base64</option>
                    <option value="clash">Clash YAML</option>
                    <option value="shadowsocks">SIP002 (Shadowsocks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Sync Interval
                  </label>
                  <select
                    value={newSub.updateIntervalHours}
                    onChange={(e) =>
                      setNewSub({
                        ...newSub,
                        updateIntervalHours: parseInt(e.target.value) || 24,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={6}>Every 6 Hours</option>
                    <option value={12}>Every 12 Hours</option>
                    <option value={24}>Every 24 Hours</option>
                    <option value={48}>Every 48 Hours</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSub.autoUpdate}
                    onChange={(e) => setNewSub({ ...newSub, autoUpdate: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Auto-update in background</span>
                </label>

                <div className="flex items-center gap-2">
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
                    Save Feed
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
