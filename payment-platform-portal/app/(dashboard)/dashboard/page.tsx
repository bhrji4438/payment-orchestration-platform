'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Network,
  Zap,
  ChevronRight,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { reportingApi } from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await reportingApi.getAnalytics(user.merchant.id);
      setAnalytics(res.data);
    } catch (err: any) {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <XCircle className="h-10 w-10 text-red-500 mb-4" />
        <p>{error}</p>
        <button onClick={fetchAnalytics} className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white">
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Platform Overview</h2>
          <p className="text-zinc-400 mt-1">Real-time orchestration metrics and health.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-16 w-16 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Volume</p>
          <h3 className="text-3xl font-bold text-zinc-50">${(analytics.summary.totalVolume || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck className="h-16 w-16 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Success Rate</p>
          <h3 className="text-3xl font-bold text-zinc-50">{(analytics.summary.successRate || 0).toFixed(1)}%</h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Network className="h-16 w-16 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Total Payments</p>
          <h3 className="text-3xl font-bold text-zinc-50">{analytics.summary.totalPayments}</h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="h-16 w-16 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Failed / Refunded</p>
          <h3 className="text-3xl font-bold text-zinc-50">{analytics.summary.failedCount} / {analytics.summary.refundedCount}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-zinc-50 mb-6">Recent Transactions</h3>
          {analytics.recentPayments.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase">ID</th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase">Status</th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase">Gateway</th>
                    <th className="pb-3 text-xs font-semibold text-zinc-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {analytics.recentPayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-4 font-mono text-[10px] text-zinc-400">{p.id}</td>
                      <td className="py-4 text-zinc-200 font-medium">${p.amount.toFixed(2)} {p.currency}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400' :
                          p.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                          'bg-zinc-500/10 text-zinc-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-xs">
                        <span className="text-zinc-300">{p.gateway}</span>
                      </td>
                      <td className="py-4 text-xs text-zinc-500">{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-zinc-50 mb-6">Gateway Distribution</h3>
          {analytics.gateways.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">No routing data yet.</div>
          ) : (
            <div className="space-y-4">
              {analytics.gateways.map((g: any) => (
                <div key={g.gateway} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-zinc-200">{g.gateway}</span>
                    <span className="text-xs text-zinc-500">{g.total} txns</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.max(5, (g.total / analytics.summary.totalPayments) * 100)}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    <span className="text-emerald-400">{g.success} Success</span>
                    <span className={g.failure > 0 ? 'text-red-400' : ''}>{g.failure} Failed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
