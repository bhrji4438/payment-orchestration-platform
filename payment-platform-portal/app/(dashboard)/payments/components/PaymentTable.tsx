'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Copy } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, TableSchema } from '@components/datatable';
import { useNotification } from '@components/notification';
import { handleApiError, gatewaysApi, transactionsApi } from '@/lib/api';
import { Messages } from '@/lib/messages';
import { TRANSACTION_ACTION, TransactionAction } from '@shared/transactions/transaction-lifecycle';
import { PaymentMethodCell } from './PaymentMethodCell';
import { TransactionActionsDropdown } from './TransactionActionsDropdown';
import { getStatusTone } from '@shared/transactions/transaction-lifecycle';

type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethodType?: string | null;
  paymentMethodBrand?: string | null;
  last4?: string | null;
  gateway: string;
  refundableAmount: number;
  receiptNumber?: string | null;
  createdAt: string;
  availableActions: TransactionAction[];
  customer: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

type ModalState =
  | { action: 'capture' | 'void'; transaction: TransactionRow }
  | { action: 'refund'; transaction: TransactionRow; amount: string; reason: string }
  | null;

const statusOptions = ['AUTHORIZED', 'CAPTURED', 'REFUNDED', 'VOIDED', 'FAILED', 'PENDING'];
const typeOptions = ['SALE', 'AUTH', 'REFUND', 'VOID'];
const methodOptions = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'ECHECK', 'APPLE_PAY', 'GOOGLE_PAY'];

function isoDateRange(range: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const start = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
  }

  if (range === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }

  if (range === '7d' || range === '30d') {
    start.setDate(start.getDate() - (range === '7d' ? 7 : 30));
    return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
  }

  return {};
}

export function PaymentTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notification = useNotification();
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    paymentMethod: '',
    gateway: '',
    dateRange: '',
    amountMin: '',
    amountMax: ''
  });
  const [gatewayOptions, setGatewayOptions] = useState<Array<{ id: string; displayName: string }>>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    gatewaysApi.getConfigurations()
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : res.data.data || [];
        setGatewayOptions(items.map((gateway: any) => ({ id: gateway.id, displayName: gateway.displayName })));
      })
      .catch(err => handleApiError(err, undefined, Messages.GATEWAY.UNAVAILABLE));
  }, []);

  const additionalParams = useMemo(() => {
    const dateRange = isoDateRange(filters.dateRange);
    return {
      ...(filters.status && { status: filters.status }),
      ...(filters.type && { type: filters.type }),
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters.gateway && { gateway: filters.gateway }),
      ...dateRange,
      ...(filters.amountMin && { amountMin: filters.amountMin }),
      ...(filters.amountMax && { amountMax: filters.amountMax })
    };
  }, [filters]);

  const activeFilters = Object.entries(filters).filter(([, value]) => value);

  const resetFilter = (key: string) => {
    setFilters(current => ({ ...current, [key]: '' }));
  };

  const refetchTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['/v1/transactions'] });
  };

  const runAction = async () => {
    if (!modal) return;
    setIsSubmitting(true);

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      const config = { headers: { 'Idempotency-Key': idempotencyKey } };

      if (modal.action === 'capture') {
        await transactionsApi.capture(modal.transaction.id, modal.transaction.amount, config);
        notification.success(Messages.TRANSACTION.CAPTURE_SUCCESS);
      }

      if (modal.action === 'void') {
        await transactionsApi.void(modal.transaction.id, undefined, config);
        notification.success(Messages.TRANSACTION.VOID_SUCCESS);
      }

      if (modal.action === 'refund') {
        const amount = Number(modal.amount);
        if (!amount || amount <= 0) {
          notification.error(Messages.TRANSACTION.REFUND_AMOUNT_REQUIRED);
          setIsSubmitting(false);
          return;
        }
        if (amount > modal.transaction.refundableAmount) {
          notification.error(Messages.TRANSACTION.REFUND_AMOUNT_EXCEEDS_BALANCE);
          setIsSubmitting(false);
          return;
        }
        await transactionsApi.refund(modal.transaction.id, amount, modal.reason || undefined, config);
        notification.success(Messages.TRANSACTION.REFUND_SUCCESS);
      }

      setModal(null);
      refetchTransactions();
    } catch (err) {
      const fallback = modal.action === 'capture'
        ? Messages.TRANSACTION.CAPTURE_FAILED
        : modal.action === 'void'
          ? Messages.TRANSACTION.VOID_FAILED
          : Messages.TRANSACTION.REFUND_FAILED;
      handleApiError(err, undefined, fallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionAction = (action: TransactionAction, transaction: TransactionRow) => {
    if (action === TRANSACTION_ACTION.VIEW_RECEIPT || action === TRANSACTION_ACTION.VIEW_DETAILS) {
      router.push(`/transactions/${transaction.id}/receipt`);
      return;
    }
    if (action === TRANSACTION_ACTION.PRINT_RECEIPT) {
      window.open(`/transactions/${transaction.id}/receipt?print=1`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === TRANSACTION_ACTION.CAPTURE) {
      setModal({ action: 'capture', transaction });
      return;
    }
    if (action === TRANSACTION_ACTION.VOID) {
      setModal({ action: 'void', transaction });
      return;
    }
    if (action === TRANSACTION_ACTION.REFUND) {
      setModal({ action: 'refund', transaction, amount: String(transaction.refundableAmount || transaction.amount), reason: '' });
    }
  };

  const statusToneClasses = {
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    gray: 'bg-zinc-700/40 text-zinc-300 border-zinc-600',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
  } as const;

  function AmountWithStatus({ amount, status, type }: { amount: number; status: string; type?: string | null }) {
    const tone = getStatusTone(status);

    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">${amount.toFixed(2)}</span>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusToneClasses[tone]}`}>
            {status}
          </span>
        </div>
        <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
          {type ? type.toUpperCase() : 'SALE'}
        </span>
      </div>
    );
  }

  const paymentTableSchema: TableSchema<TransactionRow> = {
    columns: [
      {
        key: 'id',
        label: 'Transaction ID',
        width: '12rem',
        type: 'text',
        format: (value) => {
          const id = String(value);
          const visibleId = id.length > 12 ? `...${id.slice(-12)}` : id;

          return (
            <div className="flex items-center gap-2">
              <span title={id} className="font-mono text-xs text-zinc-400">
                {visibleId}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      await navigator.clipboard.writeText(id);
                    } else {
                      const el = document.createElement('textarea');
                      el.value = id;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                    }
                    notification.success('Transaction ID copied to clipboard');
                  } catch (err) {
                    notification.error('Failed to copy transaction ID');
                  }
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                aria-label="Copy transaction ID"
                title="Copy full transaction ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          );
        }
      },
      {
        key: 'customer',
        label: 'Customer',
        type: 'custom',
        sortable: true,
        format: (_, row) => {
          if (!row.customer) return <span className="text-zinc-500">--</span>;
          const displayName = row.customer.name || `${row.customer.firstName || ''} ${row.customer.lastName || ''}`.trim() || row.customer.email || 'Unknown';
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
        type: 'custom',
        sortable: true,
        format: (value, row) => (
          <AmountWithStatus amount={Number(value)} status={row.status} type={row.type} />
        )
      },
      {
        key: 'paymentMethodBrand',
        label: 'Payment Method',
        type: 'custom',
        format: (_, row) => <PaymentMethodCell brand={row.paymentMethodBrand} type={row.paymentMethodType} last4={row.last4} />
      },
      {
        key: 'gateway',
        label: 'Gateway',
        type: 'text'
      },
      {
        key: 'createdAt',
        label: 'Date',
        type: 'datetime',
        sortable: true
      },
      {
        key: 'actions',
        label: 'Actions',
        type: 'custom',
        align: 'right',
        format: (_, row) => (
          <TransactionActionsDropdown
            transaction={row}
            onAction={(action) => handleTransactionAction(action, row)}
          />
        )
      }
    ],
    bulkActions: ['export']
  };

  return (
    <div className="w-full space-y-4">
      <DataTable
        title="Transactions"
        description="View and manage all payment operations."
        schema={paymentTableSchema}
        endpoint="/v1/transactions"
        idField="id"
        additionalParams={additionalParams}
        filters={
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-400">Filter transaction status, type, payment method, gateway, date range, and amount.</p>
              {activeFilters.length > 0 && (
                <button type="button" onClick={() => setFilters({ status: '', type: '', paymentMethod: '', gateway: '', dateRange: '', amountMin: '', amountMax: '' })} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <div className="min-w-0">
                <select className="w-full min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All statuses</option>
                  {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <select className="w-full min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All types</option>
                  {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <select className="w-full min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" value={filters.paymentMethod} onChange={e => setFilters({ ...filters, paymentMethod: e.target.value })}>
                  <option value="">All methods</option>
                  {methodOptions.map(method => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <select className="w-full min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" value={filters.gateway} onChange={e => setFilters({ ...filters, gateway: e.target.value })}>
                  <option value="">All gateways</option>
                  {gatewayOptions.map(gateway => <option key={gateway.id} value={gateway.id}>{gateway.displayName}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <select className="w-full min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })}>
                  <option value="">Any date</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" placeholder="Min" value={filters.amountMin} onChange={e => setFilters({ ...filters, amountMin: e.target.value })} />
                <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" placeholder="Max" value={filters.amountMax} onChange={e => setFilters({ ...filters, amountMax: e.target.value })} />
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map(([key, value]) => (
                  <button key={key} type="button" onClick={() => resetFilter(key)} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                    {value}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-50">
              {modal.action === 'capture' ? 'Capture Transaction' : modal.action === 'void' ? 'Void Transaction' : 'Refund Transaction'}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {modal.action === 'capture' && Messages.TRANSACTION.CONFIRM_CAPTURE}
              {modal.action === 'void' && Messages.TRANSACTION.CONFIRM_VOID}
              {modal.action === 'refund' && `Refundable balance: $${modal.transaction.refundableAmount.toFixed(2)}`}
            </p>

            {modal.action === 'refund' && (
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  value={modal.amount}
                  onChange={e => setModal({ ...modal, amount: e.target.value })}
                  inputMode="decimal"
                />
                <textarea
                  className="min-h-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  value={modal.reason}
                  onChange={e => setModal({ ...modal, reason: e.target.value })}
                  placeholder="Reason"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                Cancel
              </button>
              <button type="button" disabled={isSubmitting} onClick={runAction} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
