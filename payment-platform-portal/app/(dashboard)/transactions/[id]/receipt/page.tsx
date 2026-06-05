'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, Printer, Users, XCircle } from 'lucide-react';
import { transactionsApi } from '@/lib/api';
import { Messages } from '@/lib/messages';
import { PaymentMethodCell } from '@/(dashboard)/payments/components/PaymentMethodCell';
import { TransactionStatusCell } from '@/(dashboard)/payments/components/TransactionStatusCell';

interface ReceiptData {
  transactionId: string;
  receiptNumber?: string | null;
  type: string;
  status: string;
  gateway: string;
  gatewayTransactionId?: string | null;
  customerSnapshot: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  paymentSnapshot: any;
  refunds: Array<{
    id: string;
    amount: number;
    reason?: string | null;
    status: string;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    amount?: number | null;
    reason?: string | null;
    createdAt: string;
  }>;
  receiptData: {
    amount: number;
    currency: string;
    createdAt: string;
    paymentMethodType: string;
    gatewayToken?: string;
    cardBrand?: string;
    cardLastFour?: string;
    refundableAmount?: number;
    refundedAmount?: number;
    errorMsg?: string;
  };
}

export default function TransactionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    transactionsApi.getTransaction(id)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.error || Messages.TRANSACTION.RECEIPT_LOAD_FAILED))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && data && searchParams.get('print') === '1') {
      window.print();
    }
  }, [data, loading, searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="mt-4 text-sm text-zinc-500">Loading receipt details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-bold text-zinc-50">Unable to load receipt</h3>
        <p className="mt-2 text-sm text-zinc-400">{error || Messages.GENERIC.NOT_FOUND('Transaction')}</p>
        <Link href="/payments" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Transactions
        </Link>
      </div>
    );
  }

  const receipt = data.receiptData;
  const customerName = data.customerSnapshot
    ? `${data.customerSnapshot.firstName || ''} ${data.customerSnapshot.lastName || ''}`.trim() || 'Guest Customer'
    : 'Guest Customer';
  const isFailed = data.status === 'FAILED' || data.status === 'PENDING';

  return (
    <div className="print-container mx-auto max-w-7xl pb-16 animate-in fade-in duration-300">
      <style>{`
        @media print {
          body, main { background: white !important; color: black !important; }
          aside, .no-print { display: none !important; }
          .print-container { max-width: 100% !important; padding: 0 !important; }
          .print-card { background: white !important; border: 1px solid #e4e4e7 !important; color: black !important; box-shadow: none !important; }
          .print-card * { color: black !important; }
        }
      `}</style>

      <div className="no-print mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link href="/payments" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Transactions
          </Link>
          <h2 className="text-2xl font-bold text-zinc-50">Transaction Receipt</h2>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700">
          <Printer className="h-4 w-4" /> Print Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="print-card flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            {isFailed ? <XCircle className="h-10 w-10 shrink-0 text-red-500" /> : <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-500" />}
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-zinc-50">{isFailed ? 'Transaction Needs Attention' : 'Transaction Processed'}</h3>
              <p className="mt-0.5 text-xs text-zinc-400">Processed via {data.gateway} on {new Date(receipt.createdAt).toLocaleString()}</p>
            </div>
            <div className="ml-auto">
              <TransactionStatusCell type={data.type} status={data.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <section className="print-card rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <h4 className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Users className="h-3.5 w-3.5 text-indigo-400" /> Customer
              </h4>
              <div className="space-y-3 text-sm">
                <div><span className="block text-xs text-zinc-500">Name</span><span className="font-semibold text-zinc-200">{customerName}</span></div>
                <div><span className="block text-xs text-zinc-500">Email</span><span className="block truncate font-medium text-zinc-200">{data.customerSnapshot?.email || 'N/A'}</span></div>
                <div><span className="block text-xs text-zinc-500">Phone</span><span className="font-medium text-zinc-200">{data.customerSnapshot?.phone || 'N/A'}</span></div>
              </div>
            </section>

            <section className="print-card rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <h4 className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Transaction
              </h4>
              <div className="space-y-3 text-sm">
                <div><span className="block text-xs text-zinc-500">Transaction ID</span><span className="block truncate font-mono text-xs text-zinc-200">{data.transactionId}</span></div>
                <div><span className="block text-xs text-zinc-500">Receipt Number</span><span className="font-mono text-xs text-zinc-200">{data.receiptNumber || 'N/A'}</span></div>
                <div><span className="block text-xs text-zinc-500">Amount</span><span className="text-base font-bold text-zinc-50">${Number(receipt.amount).toFixed(2)} <span className="text-xs font-normal text-zinc-400">{receipt.currency}</span></span></div>
                {receipt.refundedAmount ? <div><span className="block text-xs text-zinc-500">Refunded</span><span className="font-semibold text-orange-300">${Number(receipt.refundedAmount).toFixed(2)}</span></div> : null}
              </div>
            </section>

            <section className="print-card rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <h4 className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Payment Method
              </h4>
              <div className="space-y-4 text-sm">
                <PaymentMethodCell brand={receipt.cardBrand} type={receipt.paymentMethodType} last4={receipt.cardLastFour || data.paymentSnapshot?.cardLastFour || data.paymentSnapshot?.accountLastFour} />
                <div><span className="block text-xs text-zinc-500">Gateway Transaction ID</span><span className="break-all font-mono text-xs text-zinc-200">{data.gatewayTransactionId || receipt.gatewayToken || 'N/A'}</span></div>
                {receipt.errorMsg && <div><span className="block text-xs text-zinc-500">Details</span><span className="text-xs font-medium text-red-400">{receipt.errorMsg}</span></div>}
              </div>
            </section>
          </div>

          <section className="print-card rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h4 className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Transaction Timeline
            </h4>
            <div className="space-y-4">
              {data.timeline.length === 0 ? (
                <p className="text-sm text-zinc-500">No lifecycle events recorded.</p>
              ) : data.timeline.map(event => (
                <div key={event.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">{event.eventType}</div>
                    <div className="text-xs text-zinc-500">{new Date(event.createdAt).toLocaleString()}{event.amount ? ` · $${Number(event.amount).toFixed(2)}` : ''}</div>
                    {event.reason && <div className="mt-1 text-xs text-zinc-400">{event.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="no-print space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-6 xl:sticky xl:top-24 xl:h-fit">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Receipt Actions</h4>
          <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700">
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
          <Link href="/virtual-terminal" className="block w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-500">
            Process Another Payment
          </Link>
        </aside>
      </div>
    </div>
  );
}
