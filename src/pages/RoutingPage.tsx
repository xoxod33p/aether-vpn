import React, { useState } from 'react';
import {
  Split,
  Plus,
  Trash2,
  Edit2,
  Check,
  Shield,
  ArrowRight,
  Filter,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { RoutingRule, RoutingAction, RoutingRuleType } from '../types';
import { VpnStoreType } from '../stores/useVpnStore';
import { vpnApi } from '../services/tauriApi';

interface RoutingPageProps {
  store: VpnStoreType;
}

export const RoutingPage: React.FC<RoutingPageProps> = ({ store }) => {
  const { routingRules, setRoutingRules, addLog } = store;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<{
    name: string;
    ruleType: RoutingRuleType;
    ruleValue: string;
    action: RoutingAction;
  }>({
    name: '',
    ruleType: 'domain_suffix',
    ruleValue: '',
    action: 'proxy',
  });

  const handleToggleRule = async (id: string) => {
    const rule = routingRules.find((r) => r.id === id);
    if (!rule) return;
    const updated = { ...rule, isEnabled: !rule.isEnabled };
    try {
      await vpnApi.saveRoutingRule(updated);
      setRoutingRules((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    } catch (err: any) {
      addLog('error', `Failed to toggle rule: ${err.message}`);
    }
  };

  const handleDeleteRule = async (id: string, name: string) => {
    try {
      await vpnApi.deleteRoutingRule(id);
      setRoutingRules((prev) => prev.filter((r) => r.id !== id));
      addLog('info', `Removed routing rule "${name}"`);
    } catch (err: any) {
      addLog('error', `Failed to delete rule: ${err.message}`);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name || !newRule.ruleValue) return;

    const created: RoutingRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      ruleType: newRule.ruleType,
      ruleValue: newRule.ruleValue,
      action: newRule.action,
      priority: routingRules.length + 1,
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await vpnApi.saveRoutingRule(created);
      setRoutingRules((prev) => [...prev, created]);
      addLog('info', `Added routing rule "${created.name}" [Action: ${created.action.toUpperCase()}]`);
      setIsModalOpen(false);
      setNewRule({
        name: '',
        ruleType: 'domain_suffix',
        ruleValue: '',
        action: 'proxy',
      });
    } catch (err: any) {
      addLog('error', `Failed to add rule: ${err.message}`);
    }
  };

  const getActionBadge = (action: RoutingAction) => {
    switch (action) {
      case 'direct':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'proxy':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'block':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4 select-none">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Visual Routing Rules</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define traffic dispatch policies: Direct bypass, Encrypted Proxy, or Outright Ad/Malware Blocking.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-xs hover:brightness-110 shadow-lg shadow-cyan-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">State</th>
                <th className="py-3.5 px-5">Rule Name</th>
                <th className="py-3.5 px-5">Match Type</th>
                <th className="py-3.5 px-5">Target Pattern</th>
                <th className="py-3.5 px-5">Route Action</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {routingRules.map((rule) => (
                <tr
                  key={rule.id}
                  className={`hover:bg-slate-900/40 transition-colors ${
                    !rule.isEnabled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Enabled Toggle */}
                  <td className="py-3 px-5">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                        rule.isEnabled ? 'bg-cyan-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform duration-150 absolute top-0.5 ${
                          rule.isEnabled ? 'left-4.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-5 text-white font-semibold">{rule.name}</td>

                  {/* Type */}
                  <td className="py-3 px-5">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                      {rule.ruleType.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Value */}
                  <td className="py-3 px-5 font-mono text-slate-300 max-w-xs truncate">
                    {rule.ruleValue}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-5">
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono uppercase text-[10px] font-bold border ${getActionBadge(
                        rule.action
                      )}`}
                    >
                      {rule.action}
                    </span>
                  </td>

                  {/* Delete */}
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-bold text-base text-white">Create Visual Routing Rule</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Matcher Type
                  </label>
                  <select
                    value={newRule.ruleType}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        ruleType: e.target.value as RoutingRuleType,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  >
                    <option value="domain_suffix">Domain Suffix</option>
                    <option value="domain">Exact Domain</option>
                    <option value="ip_cidr">IP / CIDR</option>
                    <option value="country">GeoIP Country</option>
                    <option value="protocol">Protocol (TCP/UDP)</option>
                    <option value="port">Port</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                    Action
                  </label>
                  <select
                    value={newRule.action}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        action: e.target.value as RoutingAction,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono uppercase text-xs"
                  >
                    <option value="proxy">Proxy (Encrypted)</option>
                    <option value="direct">Direct (Bypass)</option>
                    <option value="block">Block (Drop)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase text-[11px]">
                  Pattern Value
                </label>
                <input
                  type="text"
                  required
                  value={newRule.ruleValue}
                  onChange={(e) => setNewRule({ ...newRule, ruleValue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
