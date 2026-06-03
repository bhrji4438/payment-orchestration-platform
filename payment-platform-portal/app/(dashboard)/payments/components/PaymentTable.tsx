'use client';

import React from 'react';
import { DataTable, TableSchema } from '@components/datatable';

import Link from 'next/link';

const paymentTableSchema: TableSchema<any> = {
  columns: [
    {
      key: 'id',
      label: 'Transaction ID',
      type: 'text',
      format: (value) => <span className="font-mono text-xs text-zinc-400">{String(value)}</span>
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'custom',
      sortable: true,
      format: (_, row) => {
        if (!row.customer) return <span className="text-zinc-500">--</span>;
        const name = `${row.customer.firstName || ''} ${row.customer.lastName || ''}`.trim();
        const displayName = name || row.customer.email || 'Unknown';
        return (
          <Link href={`/customers/${row.customer.id}/edit`} className="text-indigo-400 hover:text-indigo-300 transition-colors hover:underline">
            {displayName}
          </Link>
        );
      }
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'currency',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
    },
    {
      key: 'method',
      label: 'Method',
      type: 'custom',
      format: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-8 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
            <span className="text-[10px] font-bold text-zinc-400">{row.cardBrand || 'CARD'}</span>
          </div>
          <span className="text-zinc-500 text-xs">•••• {row.cardLastFour || '****'}</span>
        </div>
      )
    },
    {
      key: 'gateway',
      label: 'Gateway',
      type: 'text',
    },
    {
      key: 'createdAt',
      label: 'Date',
      type: 'datetime',
      sortable: true,
    }
  ],
  rowActions: ['view', 'refund', 'capture', 'void'],
  bulkActions: ['export']
};

export function PaymentTable() {
  return (
    <div className="w-full">
      <DataTable
        title="Transactions"
        description="View and manage all payment operations."
        schema={paymentTableSchema}
        endpoint="/v1/payments"
        idField="id"
        onRowAction={(action, row) => {
          console.log(`Action ${action} on row ${row.id}`);
        }}
        onBulkAction={(action, ids) => {
          console.log(`Bulk Action ${action} on ids ${ids.join(', ')}`);
        }}
      />
    </div>
  );
}
