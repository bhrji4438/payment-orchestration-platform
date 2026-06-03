'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, TableSchema } from '@components/datatable';
import { customersApi } from '@/lib/api';

const customerTableSchema: TableSchema<any> = {
  columns: [
    {
      key: 'customer',
      label: 'Customer',
      type: 'custom',
      sortable: true,
      format: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-indigo-400">
            {(row.firstName?.[0] || row.email[0]).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-zinc-200">
              {row.firstName || row.lastName ? `${row.firstName || ''} ${row.lastName || ''}`.trim() : 'Unnamed'}
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate w-32">{row.id.split('-')[0]}...</div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      type: 'custom',
      format: (_, row) => (
        <div>
          <div className="text-zinc-300 text-sm">{row.email}</div>
          <div className="text-xs text-zinc-500">{row.mobilePhone || row.phone || 'No phone'}</div>
        </div>
      )
    },
    {
      key: 'companyName',
      label: 'Company',
      type: 'text',
      sortable: true,
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'custom',
      sortable: true,
      format: (value) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
          value ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Added',
      type: 'date',
    }
  ],
  rowActions: (row) => ['edit', row.isActive ? 'deactivate' : 'activate'],
  bulkActions: ['delete']
};

export function CustomerTable() {
  const router = useRouter();

  return (
    <div className="w-full">
      <DataTable
        title="Customers"
        description="Manage your customer profiles and billing addresses."
        schema={customerTableSchema}
        endpoint="/v1/customers"
        idField="id"
        onRowAction={async (action, row) => {
          if (action === 'edit') {
            router.push(`/customers/${row.id}/edit`);
          } else if (action === 'activate') {
            await customersApi.updateStatus(row.id, true);
            window.location.reload(); // Simple refresh for now
          } else if (action === 'deactivate') {
            await customersApi.updateStatus(row.id, false);
            window.location.reload();
          }
        }}
        onBulkAction={(action, ids) => {
          console.log(`Bulk Action ${action} on ids ${ids.join(', ')}`);
        }}
      />
    </div>
  );
}
