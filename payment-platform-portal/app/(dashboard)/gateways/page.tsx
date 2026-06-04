'use client';

import React, { useEffect, useState } from 'react';
import {
  Network,
  Plus,
  Loader2,
  Settings,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { gatewaysApi } from '@/lib/api';

const renderCredentialFields = (
  providerCode: string,
  values: Record<string, string>,
  onChange: (key: string, value: string) => void,
  isEdit: boolean = false
) => {
  const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors";
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

  switch (providerCode) {
    case 'STRIPE':
      return (
        <div>
          <label className={labelClass}>API Key {!isEdit && <span className="text-red-500">*</span>}</label>
          <input
            required={!isEdit}
            type="password"
            placeholder={isEdit ? "Enter new API key to update..." : "sk_test_..."}
            value={values.apiKey || ''}
            onChange={e => onChange('apiKey', e.target.value)}
            className={inputClass}
          />
        </div>
      );
    case 'NMI':
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Username {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="text"
              placeholder={isEdit ? "Enter new username to update..." : "Username.."}
              value={values.username || ''}
              onChange={e => onChange('username', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="password"
              placeholder={isEdit ? "Enter new password to update..." : "password.."}
              value={values.password || ''}
              onChange={e => onChange('password', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      );
    case 'AUTHORIZE_NET':
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Login ID {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="text"
              placeholder={isEdit ? "Enter new Login ID to update..." : "Login ID"}
              value={values.loginId || ''}
              onChange={e => onChange('loginId', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Transaction Key {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="password"
              placeholder={isEdit ? "Enter new Transaction Key to update..." : "Transaction Key"}
              value={values.transactionKey || ''}
              onChange={e => onChange('transactionKey', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      );
    case 'CARDPOINTE':
    case 'CUSTOM':
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Merchant ID {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="text"
              placeholder={isEdit ? "Enter new Merchant ID to update..." : "Merchant ID"}
              value={values.merchantid || ''}
              onChange={e => onChange('merchantid', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Username {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="text"
              placeholder={isEdit ? "Enter new username to update..." : "Username"}
              value={values.cardpointeuser || ''}
              onChange={e => onChange('cardpointeuser', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password {!isEdit && <span className="text-red-500">*</span>}</label>
            <input
              required={!isEdit}
              type="password"
              placeholder={isEdit ? "Enter new password to update..." : "Password"}
              value={values.cardpointepass || ''}
              onChange={e => onChange('cardpointepass', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Site Name (Optional)</label>
            <input
              type="text"
              placeholder="fts"
              value={values.siteName || ''}
              onChange={e => onChange('siteName', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      );
    default:
      return (
        <div>
          <label className={labelClass}>API Secret Key {!isEdit && <span className="text-red-500">*</span>}</label>
          <input
            required={!isEdit}
            type="password"
            placeholder={isEdit ? "Enter new key to update..." : "sk_test_..."}
            value={values.secretKey || ''}
            onChange={e => onChange('secretKey', e.target.value)}
            className={inputClass}
          />
        </div>
      );
  }
};

export default function GatewaysPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [newConfig, setNewConfig] = useState({ providerId: '', displayName: '', priority: 1, secretKey: '' });
  const [credentialsInput, setCredentialsInput] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [confRes, provRes] = await Promise.all([
        gatewaysApi.getConfigurations(),
        gatewaysApi.getProviders()
      ]);
      setConfigs(confRes.data);
      setProviders(provRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const credentials: Record<string, string> = {};
      Object.entries(credentialsInput).forEach(([k, v]) => {
        if (v.trim() !== '') {
          credentials[k] = v.trim();
        }
      });

      await gatewaysApi.createConfiguration({
        gatewayProviderId: newConfig.providerId,
        displayName: newConfig.displayName,
        priority: newConfig.priority,
        credentials
      });
      setShowAddModal(false);
      setNewConfig({ providerId: '', displayName: '', priority: 1, secretKey: '' });
      setCredentialsInput({});
      fetchData();
    } catch (err) {
      alert('Failed to add gateway');
    }
  };

  const resetCircuit = async (id: string) => {
    try {
      await gatewaysApi.resetCircuit(id);
      fetchData();
    } catch (err) {
      alert('Failed to reset circuit breaker');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        displayName: editingConfig.displayName,
        priority: editingConfig.priority,
        isActive: editingConfig.isActive
      };
      const credentials: Record<string, string> = {};
      Object.entries(credentialsInput).forEach(([k, v]) => {
        if (v.trim() !== '') {
          credentials[k] = v.trim();
        }
      });
      if (Object.keys(credentials).length > 0) {
        payload.credentials = credentials;
      }
      await gatewaysApi.updateConfiguration(editingConfig.id, payload);
      setShowEditModal(false);
      setEditingConfig(null);
      setCredentialsInput({});
      fetchData();
    } catch (err) {
      alert('Failed to update gateway');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate/delete this gateway?')) {
      try {
        await gatewaysApi.deleteConfiguration(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete gateway');
      }
    }
  };

  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Gateway Routing</h2>
          <p className="text-zinc-400 mt-1">Configure your payment waterfall and circuit breakers.</p>
        </div>
        <button 
          onClick={() => {
            setNewConfig({ providerId: '', displayName: '', priority: 1, secretKey: '' });
            setCredentialsInput({});
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
        >
          <Plus className="h-4 w-4" />
          Add Gateway
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Waterfall Logic Visualizer */}
        <div className="md:col-span-1 border-r border-zinc-800 pr-6 relative">
          <div className="absolute top-8 bottom-8 left-6 w-px bg-zinc-800" />
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6">Routing Waterfall</h3>
          
          <div className="space-y-6 relative">
            {configs.length === 0 && (
              <p className="text-sm text-zinc-500 italic pl-12">No gateways configured.</p>
            )}
            {configs.map((g, i) => (
              <div key={g.id} className="flex items-start gap-4 relative">
                <div className={`h-12 w-12 rounded-full border-[4px] border-zinc-950 flex items-center justify-center shrink-0 z-10 ${
                  i === 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  <span className="font-bold text-sm">{g.priority}</span>
                </div>
                <div className="pt-2 flex-1">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-200">{g.displayName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                        g.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {g.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase">{g.provider.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gateway Configurations */}
        <div className="md:col-span-2 space-y-4 pl-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Configurations</h3>
            <button onClick={fetchData} className="text-zinc-400 hover:text-white" title="Refresh state">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          
          {configs.map(g => (
            <div key={g.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <Network className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-zinc-200 font-semibold">{g.displayName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500 font-mono">ID: {g.id.slice(0,8)}...</span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className={`text-xs flex items-center gap-1 font-semibold uppercase ${
                      g.circuitState === 'CLOSED' ? 'text-emerald-400' :
                      g.circuitState === 'HALF_OPEN' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {g.circuitState === 'CLOSED' && <CheckCircle2 className="h-3 w-3" />}
                      {g.circuitState !== 'CLOSED' && <AlertCircle className="h-3 w-3" />}
                      Circuit: {g.circuitState}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {g.circuitState !== 'CLOSED' && (
                  <button 
                    onClick={() => resetCircuit(g.id)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-md transition-colors border border-amber-500/20"
                  >
                    Reset Circuit
                  </button>
                )}
                <button 
                  onClick={() => {
                    setEditingConfig({ ...g });
                    setCredentialsInput({});
                    setShowEditModal(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(g.id)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-zinc-50 mb-4">Add Gateway</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Provider</label>
                <select
                  required
                  value={newConfig.providerId}
                  onChange={e => {
                    setNewConfig({...newConfig, providerId: e.target.value});
                    setCredentialsInput({});
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300"
                >
                  <option value="">Select a provider...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Display Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Primary Stripe US"
                  value={newConfig.displayName}
                  onChange={e => setNewConfig({...newConfig, displayName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority (1 = Highest)</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={newConfig.priority}
                  onChange={e => setNewConfig({...newConfig, priority: parseInt(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300"
                />
              </div>
              {(() => {
                const selectedProvider = providers.find(p => p.id === newConfig.providerId);
                const providerCode = selectedProvider?.code?.toUpperCase() || '';
                return renderCredentialFields(
                  providerCode,
                  credentialsInput,
                  (key, val) => setCredentialsInput(prev => ({ ...prev, [key]: val })),
                  false
                );
              })()}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-medium text-zinc-300">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white">
                  Save Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-zinc-50 mb-4">Edit Gateway</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Provider</label>
                <input
                  disabled
                  value={editingConfig.provider.name}
                  className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-2.5 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Display Name</label>
                <input
                  required
                  type="text"
                  value={editingConfig.displayName}
                  onChange={e => setEditingConfig({...editingConfig, displayName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={editingConfig.priority}
                    onChange={e => setEditingConfig({...editingConfig, priority: parseInt(e.target.value)})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                  <select
                    value={editingConfig.isActive ? 'true' : 'false'}
                    onChange={e => setEditingConfig({...editingConfig, isActive: e.target.value === 'true'})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-300"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              {renderCredentialFields(
                editingConfig.provider.code.toUpperCase(),
                credentialsInput,
                (key, val) => setCredentialsInput(prev => ({ ...prev, [key]: val })),
                true
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-medium text-zinc-300">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
