import {
  canCaptureTransaction,
  canRefundTransaction,
  canVoidTransaction,
  getTransactionActions,
  TRANSACTION_ACTION
} from '@shared/transactions/transaction-lifecycle';

describe('transaction lifecycle rules', () => {
  it('allows capture and void for authorized transactions but hides refund', () => {
    const transaction = { status: 'AUTHORIZED', type: 'AUTH', refundableAmount: 0 };

    expect(getTransactionActions(transaction)).toEqual([
      TRANSACTION_ACTION.VIEW_RECEIPT,
      TRANSACTION_ACTION.CAPTURE,
      TRANSACTION_ACTION.VOID,
      TRANSACTION_ACTION.PRINT_RECEIPT
    ]);
    expect(canCaptureTransaction(transaction)).toBe(true);
    expect(canVoidTransaction(transaction)).toBe(true);
    expect(canRefundTransaction(transaction)).toBe(false);
  });

  it('allows refunds only while a captured transaction has refundable balance', () => {
    expect(canRefundTransaction({ status: 'CAPTURED', type: 'SALE', refundableAmount: 25 })).toBe(true);
    expect(canRefundTransaction({ status: 'CAPTURED', type: 'SALE', refundableAmount: 0 })).toBe(false);
    expect(canRefundTransaction({ status: 'REFUNDED', type: 'REFUND', refundableAmount: 0 })).toBe(false);
  });

  it('limits failed and pending transactions to details only', () => {
    expect(getTransactionActions({ status: 'FAILED' })).toEqual([TRANSACTION_ACTION.VIEW_DETAILS]);
    expect(getTransactionActions({ status: 'PENDING' })).toEqual([TRANSACTION_ACTION.VIEW_DETAILS]);
  });
});
