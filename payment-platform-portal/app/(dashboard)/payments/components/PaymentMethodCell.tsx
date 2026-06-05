'use client';

import React from 'react';
import { PaymentMethodIcon } from './PaymentMethodIcon';

interface PaymentMethodCellProps {
  brand?: string | null;
  type?: string | null;
  last4?: string | null;
}

function formatBrand(brand?: string | null, type?: string | null): string {
  const normalizedBrand = (brand || '').toUpperCase();
  if ((type || '').toLowerCase() === 'echeck' || normalizedBrand === 'ECHECK') return 'eCheck';
  if (normalizedBrand === 'MASTERCARD') return 'Mastercard';
  if (normalizedBrand === 'AMEX') return 'Amex';
  if (normalizedBrand === 'APPLE_PAY') return 'Apple Pay';
  if (normalizedBrand === 'GOOGLE_PAY') return 'Google Pay';
  if (!normalizedBrand) return 'Card';
  return normalizedBrand.charAt(0) + normalizedBrand.slice(1).toLowerCase();
}

export function PaymentMethodCell({ brand, type, last4 }: PaymentMethodCellProps) {
  const isBank = (type || '').toLowerCase() === 'echeck' || (brand || '').toUpperCase() === 'ECHECK';

  return (
    <div className="flex items-center gap-3">
      <PaymentMethodIcon brand={brand} type={type} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">{formatBrand(brand, type)}</div>
        <div className="font-mono text-xs text-zinc-500">
          {isBank ? 'Acct ' : ''}•••• {last4 || '0000'}
        </div>
      </div>
    </div>
  );
}
