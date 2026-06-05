'use client';

import React from 'react';
import { getStatusTone } from '@shared/transactions/transaction-lifecycle';

interface TransactionStatusCellProps {
  type?: string | null;
  status: string;
}

const toneClasses = {
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  orange: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  gray: 'bg-zinc-700/40 text-zinc-300 border-zinc-600',
  red: 'bg-red-500/10 text-red-300 border-red-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
} as const;

export function TransactionStatusCell({ type, status }: TransactionStatusCellProps) {
  const tone = getStatusTone(status);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex w-fit items-center rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
        {type || 'SALE'}
      </span>
      <span className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${toneClasses[tone]}`}>
        {status}
      </span>
    </div>
  );
}
