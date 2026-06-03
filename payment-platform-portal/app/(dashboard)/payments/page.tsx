'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { paymentsApi } from '@/lib/api';

export default function TransactionsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]); // For 'Previous' button

  const fetchPayments = async (currentCursor?: string) => {
    setLoading(true);
    try {
      const res = await paymentsApi.getPayments({
        search: search || undefined,
        status: statusFilter || undefined,
        cursor: currentCursor,
        limit: 15
      });
      setPayments(res.data.data);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(cursor);
  }, [cursor, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCursor(undefined);
    setHistory([]);
    fetchPayments();
  };

  const handleNext = () => {
    if (nextCursor) {
      setHistory((prev) => [...prev, cursor || '']);
      setCursor(nextCursor);
    }
  };

  const handlePrev = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const prevCursor = newHistory.pop();
      setHistory(newHistory);
      setCursor(prevCursor === '' ? undefined : prevCursor);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Transactions</h2>
          <p className="text-zinc-400 mt-1">View and manage all payment operations.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCursor(undefined);
              setHistory([]);
            }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="CAPTURED">Captured</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="VOIDED">Voided</option>
          </select>

          <div className="relative">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or Card..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors w-64"
            />
            <Globe2 className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          </div>
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-zinc-500">
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                  <th className="py-4 px-6 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Method</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Gateway</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-6 font-mono text-[10px] text-zinc-400">{p.id}</td>
                    <td className="py-4 px-6 text-zinc-200 font-medium">${p.amount.toFixed(2)} {p.currency}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                        p.status === 'CAPTURED' ? 'bg-emerald-500/10 text-emerald-400' :
                        p.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-8 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-zinc-300">{p.cardBrand || 'CARD'}</span>
                        </div>
                        <span className="text-zinc-400 text-xs">•••• {p.cardLastFour || '****'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">{p.gateway}</td>
                    <td className="py-4 px-6 text-xs text-zinc-500">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <span className="text-xs text-zinc-500">
            {payments.length} transactions on this page
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={history.length === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <button
              onClick={handleNext}
              disabled={!nextCursor || loading}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-1"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
