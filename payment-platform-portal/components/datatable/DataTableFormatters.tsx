import React from 'react';
import { ColumnType } from './DataTableSchema';

export function formatCell(value: any, type: ColumnType, row: any): React.ReactNode {
  if (value === null || value === undefined) return '-';

  switch (type) {
    case 'text':
      return <span className="text-sm text-zinc-50">{String(value)}</span>;
      
    case 'badge':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800/50 text-zinc-400 uppercase tracking-wider">
          {String(value)}
        </span>
      );

    case 'status':
      const statusStr = String(value).toLowerCase();
      let statusColor = 'bg-zinc-800/50 text-zinc-400';
      if (['active', 'success', 'completed', 'paid'].includes(statusStr)) {
        statusColor = 'bg-emerald-500/10 text-emerald-400';
      } else if (['inactive', 'failed', 'error', 'cancelled'].includes(statusStr)) {
        statusColor = 'bg-red-500/10 text-red-400';
      } else if (['pending', 'processing'].includes(statusStr)) {
        statusColor = 'bg-amber-500/10 text-amber-400';
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
          {String(value)}
        </span>
      );

    case 'currency':
      return <span className="text-zinc-300 font-medium tracking-tight">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: row.currency || 'USD',
        }).format(Number(value))}
      </span>;

    case 'amount':
      return <span className="text-zinc-300 font-medium">
        {new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(value))}
      </span>;

    case 'percentage':
      return <span className="text-zinc-300 font-medium">
        {`${Number(value).toFixed(2)}%`}
      </span>;

    case 'date':
      return <span className="text-zinc-400 font-medium text-xs">
        {new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
        }).format(new Date(value))}
      </span>;

    case 'datetime':
      return <span className="text-zinc-400 font-medium text-xs">
        {new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))}
      </span>;

    case 'boolean':
      return <span className="text-zinc-400">{value ? 'Yes' : 'No'}</span>;

    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
          {value}
        </a>
      );

    case 'link':
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
          {value}
        </a>
      );

    case 'custom':
      // Handled by custom format prop if present, else fallback
      return <span className="text-sm">{String(value)}</span>;

    default:
      return <span className="text-sm text-zinc-50">{String(value)}</span>;
  }
}
