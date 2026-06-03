'use client';

import React from 'react';
import { PaymentTable } from './components/PaymentTable';

export default function TransactionsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PaymentTable />
    </div>
  );
}
