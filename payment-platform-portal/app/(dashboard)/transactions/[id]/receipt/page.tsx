'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Printer,
  ArrowLeft,
  RefreshCw,
  CreditCard,
  Building2,
  Users,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { transactionsApi } from '@/lib/api';

interface ReceiptData {
  transactionId: string;
  status: string;
  gateway: string;
  customerSnapshot: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  paymentSnapshot: any;
  receiptData: {
    amount: number;
    currency: string;
    createdAt: string;
    paymentMethodType: string;
    billingAddress?: any;
    shippingAddress?: any;
    gatewayToken?: string;
    cardBrand?: string;
    cardLastFour?: string;
    errorMsg?: string;
  };
}

export default function TransactionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    transactionsApi.getTransaction(unwrappedParams.id)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load transaction receipt details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [unwrappedParams.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="text-sm text-zinc-500 mt-4">Loading receipt details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-zinc-50">Unable to load receipt</h3>
        <p className="text-sm text-zinc-400 mt-2">{error || 'The requested transaction could not be found.'}</p>
        <Link
          href="/virtual-terminal"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-200 hover:text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Virtual Terminal
        </Link>
      </div>
    );
  }

  const isApproved = data.status === 'CAPTURED' || data.status === 'AUTHORIZED';
  const r = data.receiptData;
  const cust = data.customerSnapshot;
  const pay = data.paymentSnapshot;

  return (
    <div className="print-container max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside,
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            background: transparent !important;
          }
          main > div {
            padding: 0 !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            border: none !important;
          }
          .print-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
          }
          .print-card {
            background: white !important;
            border: 1px solid #e4e4e7 !important;
            box-shadow: none !important;
            color: black !important;
            border-radius: 12px !important;
            padding: 16px !important;
          }
          .print-card * {
            color: black !important;
          }
          .print-card h4 {
            border-bottom: 1px solid #e4e4e7 !important;
            padding-bottom: 8px !important;
          }
          .print-badge {
            background: #f4f4f5 !important;
            border: 1px solid #e4e4e7 !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <Link
            href="/virtual-terminal"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Virtual Terminal
          </Link>
          <h2 className="text-2xl font-bold text-zinc-50">Transaction Receipt</h2>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left column containing status and details grid */}
        <div className="flex-1 w-full space-y-6">
          {/* Header Status Section */}
          <div className="print-card bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            {isApproved ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-10 w-10 text-red-500 shrink-0" />
            )}
            <div>
              <h3 className="text-lg font-bold text-zinc-50">
                {isApproved ? 'Transaction Approved' : 'Transaction Failed'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Processed via {data.gateway} on {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`print-badge ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                isApproved
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {data.status}
            </span>
          </div>

          {/* Three-Card Details Grid */}
          <div className="print-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Customer Info */}
            <div className="print-card bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-850 pb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-indigo-400" /> Customer Information
              </h4>
              <div className="space-y-3 flex-1 text-sm">
                <div>
                  <span className="block text-xs text-zinc-500">Customer</span>
                  <span className="font-semibold text-zinc-200">
                    {cust ? `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Guest Customer' : 'Guest Customer'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Receipt Email</span>
                  <span className="font-medium text-zinc-200 truncate block">
                    {cust?.email || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Phone</span>
                  <span className="font-medium text-zinc-200">
                    {cust?.phone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Transaction Info */}
            <div className="print-card bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-850 pb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Transaction Information
              </h4>
              <div className="space-y-3 flex-1 text-sm">
                <div>
                  <span className="block text-xs text-zinc-500">Transaction ID</span>
                  <span className="font-mono text-xs text-zinc-200 block truncate" title={data.transactionId}>
                    {data.transactionId}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Gateway</span>
                  <span className="font-medium text-zinc-200">{data.gateway}</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Amount</span>
                  <span className="font-bold text-zinc-50 text-base">
                    ${Number(r.amount).toFixed(2)} <span className="text-xs font-normal text-zinc-400">{r.currency}</span>
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500">Status</span>
                  <span className={`font-semibold ${isApproved ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.status}
                  </span>
                </div>
                {isApproved && r.gatewayToken && (
                  <div>
                    <span className="block text-xs text-zinc-500">Authorization Code</span>
                    <span className="font-mono text-xs text-zinc-200">{r.gatewayToken}</span>
                  </div>
                )}
                {!isApproved && r.errorMsg && (
                  <div>
                    <span className="block text-xs text-zinc-500">Decline Details</span>
                    <span className="text-xs text-red-400 font-medium block leading-tight mt-0.5">
                      {r.errorMsg}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Payment Info */}
            <div className="print-card bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-850 pb-2 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-indigo-400" /> Payment Information
              </h4>
              <div className="space-y-3 flex-1 text-sm">
                <div>
                  <span className="block text-xs text-zinc-500">Payment Type</span>
                  <span className="font-semibold text-zinc-200">
                    {r.paymentMethodType === 'credit_card' ? 'Credit Card' : 'E-Check'}
                  </span>
                </div>

                {r.paymentMethodType === 'credit_card' ? (
                  <>
                    <div>
                      <span className="block text-xs text-zinc-500">Card Brand</span>
                      <span className="font-medium text-zinc-200">{r.cardBrand || 'Visa'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-zinc-500">Card Details</span>
                      <span className="font-mono text-zinc-200">
                        •••• {r.cardLastFour || (pay && pay.cardNumber ? pay.cardNumber.slice(-4) : '••••')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="block text-xs text-zinc-500">Account Details</span>
                      <span className="font-mono text-zinc-200">
                        Account •••• {r.cardLastFour || (pay && pay.accountNumber ? pay.accountNumber.slice(-4) : '••••')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-zinc-500">Routing Number</span>
                      <span className="font-mono text-zinc-200">
                        {pay && pay.routingNumber
                          ? `${pay.routingNumber.slice(0, 3)}******`
                          : 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column containing sticky actions */}
        <div className="w-full lg:w-80 lg:sticky lg:top-24 no-print space-y-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm shrink-0">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Receipt Actions</h4>
          
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-755 text-zinc-200 rounded-lg flex items-center justify-center gap-2 transition-colors border border-zinc-700 font-semibold text-sm"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
          
          <Link
            href="/virtual-terminal"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-semibold text-sm shadow-md shadow-indigo-500/10 text-center block"
          >
            Process Another Payment
          </Link>

          {!isApproved && (
            <Link
              href="/virtual-terminal"
              className="w-full py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-indigo-400 rounded-lg flex items-center justify-center gap-2 transition-colors font-semibold text-sm text-center block"
            >
              <RefreshCw className="h-4 w-4" /> Retry Payment
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
