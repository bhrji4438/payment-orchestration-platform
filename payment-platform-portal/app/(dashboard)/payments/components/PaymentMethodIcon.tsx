'use client';

import React from 'react';
import { Building2, CreditCard, Smartphone, WalletCards } from 'lucide-react';

interface PaymentMethodIconProps {
  brand?: string | null;
  type?: string | null;
}

export function PaymentMethodIcon({ brand, type }: PaymentMethodIconProps) {
  const normalizedBrand = (brand || '').toUpperCase();
  const normalizedType = (type || '').toLowerCase();

  if (normalizedType === 'echeck' || normalizedBrand === 'ECHECK' || normalizedBrand === 'ACH') {
    return (
      <div className="flex h-7 w-9 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
        <Building2 className="h-4 w-4" />
      </div>
    );
  }

  if (normalizedBrand === 'APPLE_PAY' || normalizedBrand === 'GOOGLE_PAY') {
    return (
      <div className="flex h-7 w-9 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
        <Smartphone className="h-4 w-4" />
      </div>
    );
  }

  if (normalizedBrand === 'VISA' || normalizedBrand === 'MASTERCARD' || normalizedBrand === 'AMEX' || normalizedBrand === 'DISCOVER') {
    return (
      <div className="flex h-7 w-10 items-center justify-center rounded border border-zinc-700 bg-zinc-50">
        <span className="text-[9px] font-black text-zinc-900">{normalizedBrand === 'MASTERCARD' ? 'MC' : normalizedBrand}</span>
      </div>
    );
  }

  return (
    <div className="flex h-7 w-9 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
      {normalizedType === 'wallet' ? <WalletCards className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
    </div>
  );
}
