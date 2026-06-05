'use client';

import React, { useEffect, useState } from 'react';
import {
  Lock,
  Copy,
  RefreshCcw,
  Globe2,
  Plus,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { apiKeysApi } from '@/lib/api';
import { Messages } from '@/lib/messages';
import { useNotification } from '@components/notification';

export default function DeveloperPage() {
  const notification = useNotification();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await apiKeysApi.getKeys();
      setKeys(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRotate = async () => {
    const confirm = window.confirm('Are you sure you want to rotate your active API key? The old key will immediately stop working and any active integrations will fail until you update them.');
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await apiKeysApi.rotate({ name: 'Default API Key' });
      setNewPlainKey(res.data.apiKeyPlain);
      fetchKeys();
      notification.success(Messages.DEVELOPER.KEY_ROTATED_SUCCESS);
    } catch (err) {
      notification.error(Messages.DEVELOPER.KEY_ROTATE_FAILED);
      setLoading(false);
    }
  };

  const copyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    notification.success(Messages.DEVELOPER.KEY_COPIED_SUCCESS);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Developer Center</h2>
          <p className="text-zinc-400 mt-1">Manage API keys and webhook integrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="h-6 w-6 text-indigo-400" />
            <h3 className="text-lg font-semibold text-zinc-50">API Keys</h3>
          </div>

          {loading && keys.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {newPlainKey && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">New API Key Generated</span>
                  </div>
                  <p className="text-xs text-zinc-300 mb-3">Copy this key now. It will never be shown again.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black border border-emerald-500/30 rounded px-3 py-2 text-xs font-mono text-emerald-400 break-all">
                      {newPlainKey}
                    </code>
                    <button 
                      onClick={() => copyKey(newPlainKey)}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded transition-colors text-xs shrink-0"
                    >
                      Copy Key
                    </button>
                  </div>
                </div>
              )}

              {keys.map((k) => (
                <div key={k.id} className={`bg-zinc-950 border rounded-xl p-4 ${k.isActive ? 'border-zinc-800' : 'border-red-500/20 opacity-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-300">{k.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${k.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-500">
                      {k.prefix}_••••••••••••••••••••••••
                    </code>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2">Created: {new Date(k.createdAt).toLocaleDateString()}</p>
                </div>
              ))}

              <button 
                onClick={handleRotate}
                disabled={loading}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4 border border-zinc-700"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Rotate Secret Key
              </button>
            </div>
          )}
        </div>

        {/* Webhooks (Mock UI for now, no API built yet) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe2 className="h-6 w-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-zinc-50">Webhook Endpoints</h3>
          </div>

          <p className="text-sm text-zinc-400 mb-4">
            Listen to asynchronous events (e.g., successful captures, refunds, or circuit breaker trips).
          </p>

          <div className="space-y-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between opacity-50 pointer-events-none">
              <div>
                <p className="text-sm font-medium text-zinc-200">https://api.merchant.com/webhooks</p>
                <p className="text-xs text-emerald-400 mt-1">Status: Listening • 12 events today</p>
              </div>
              <button className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-zinc-300">
                Edit
              </button>
            </div>
            
            <button className="w-full py-2.5 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add Endpoint
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Webhook Simulator</h4>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => notification.info(Messages.DEVELOPER.FEATURE_COMING_SOON)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 font-mono transition-colors">
                payment.captured
              </button>
              <button onClick={() => notification.info(Messages.DEVELOPER.FEATURE_COMING_SOON)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 font-mono transition-colors">
                payment.failed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
