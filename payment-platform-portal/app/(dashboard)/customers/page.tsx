'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { CustomerTable } from './components/CustomerTable';

export default function CustomersPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-end mb-8">
        <Link 
          href="/customers/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
        >
          <Plus className="h-4 w-4" />
          Create Customer
        </Link>
      </div>

      <CustomerTable />
    </div>
  );
}
