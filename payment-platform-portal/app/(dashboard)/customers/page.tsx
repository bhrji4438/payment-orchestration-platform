'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Users,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { customersApi } from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const fetchCustomers = async (currentCursor: string | null = null, currentSearch: string = '') => {
    setLoading(true);
    try {
      const res = await customersApi.getCustomers({
        limit: 15,
        cursor: currentCursor || undefined,
        search: currentSearch || undefined
      });
      setCustomers(res.data.data);
      setCursor(res.data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      setHistory([]);
      fetchCustomers(null, search);
    }, 500);
    return () => clearTimeout(delay);
  }, [search]);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await customersApi.updateStatus(id, !currentStatus);
      setCustomers(customers.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Customers</h2>
          <p className="text-zinc-400 mt-1">Manage your customer profiles and billing addresses.</p>
        </div>
        <Link 
          href="/customers/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
        >
          <Plus className="h-4 w-4" />
          Create Customer
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex gap-4 bg-zinc-900/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-950/30">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Added</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-800/50">
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-indigo-400">
                          {(customer.firstName?.[0] || customer.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-200">
                            {customer.firstName || customer.lastName ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unnamed'}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate w-32">{customer.id.split('-')[0]}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-zinc-300">{customer.email}</div>
                      <div className="text-xs text-zinc-500">{customer.mobilePhone || customer.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                      {customer.companyName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        customer.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-400 text-xs">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                      <Link
                        href={`/customers/${customer.id}/edit`}
                        className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => toggleStatus(customer.id, customer.isActive)}
                        className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                      >
                        {customer.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <span className="text-xs text-zinc-500 font-medium">
            {loading ? 'Loading...' : `Showing ${customers.length} customers`}
          </span>
          <div className="flex gap-2">
            <button 
              disabled={history.length === 0 || loading}
              onClick={() => {
                const newHistory = [...history];
                const prevCursor = newHistory.pop();
                setHistory(newHistory);
                fetchCustomers(prevCursor || null, search);
              }}
              className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              disabled={!cursor || loading}
              onClick={() => {
                if (customers.length > 0) {
                  setHistory([...history, customers[0].id]);
                  fetchCustomers(cursor, search);
                }
              }}
              className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
