import {
  MERCHANT_TRANSACTION_TYPE,
  MerchantTransactionType,
  TRANSACTION_STATUS,
  TransactionStatus
} from '@shared/constants/payment.constants';

export const TRANSACTION_ACTION = {
  VIEW_RECEIPT: 'viewReceipt',
  VIEW_DETAILS: 'viewDetails',
  PRINT_RECEIPT: 'printReceipt',
  CAPTURE: 'capture',
  VOID: 'void',
  REFUND: 'refund'
} as const;

export type TransactionAction = typeof TRANSACTION_ACTION[keyof typeof TRANSACTION_ACTION];

export interface TransactionLifecycleState {
  status: TransactionStatus | string;
  type?: MerchantTransactionType | string | null;
  refundableAmount?: number | string | null;
}

export function getMerchantTransactionType(input: {
  capture?: boolean;
  paymentMethodType?: string | null;
  status?: string | null;
}): MerchantTransactionType {
  if (input.status === TRANSACTION_STATUS.VOIDED) return MERCHANT_TRANSACTION_TYPE.VOID;
  if (input.status === TRANSACTION_STATUS.REFUNDED) return MERCHANT_TRANSACTION_TYPE.REFUND;
  return input.capture === false ? MERCHANT_TRANSACTION_TYPE.AUTH : MERCHANT_TRANSACTION_TYPE.SALE;
}

export function getTransactionActions(transaction: TransactionLifecycleState): TransactionAction[] {
  switch (transaction.status) {
    case TRANSACTION_STATUS.AUTHORIZED:
      return [
        TRANSACTION_ACTION.VIEW_RECEIPT,
        TRANSACTION_ACTION.CAPTURE,
        TRANSACTION_ACTION.VOID,
        TRANSACTION_ACTION.PRINT_RECEIPT
      ];
    case TRANSACTION_STATUS.CAPTURED:
      return [
        TRANSACTION_ACTION.VIEW_RECEIPT,
        TRANSACTION_ACTION.REFUND,
        TRANSACTION_ACTION.PRINT_RECEIPT
      ];
    case TRANSACTION_STATUS.REFUNDED:
    case TRANSACTION_STATUS.VOIDED:
      return [TRANSACTION_ACTION.VIEW_RECEIPT, TRANSACTION_ACTION.PRINT_RECEIPT];
    case TRANSACTION_STATUS.FAILED:
    case TRANSACTION_STATUS.PENDING:
    default:
      return [TRANSACTION_ACTION.VIEW_DETAILS];
  }
}

export function canCaptureTransaction(transaction: TransactionLifecycleState): boolean {
  return transaction.status === TRANSACTION_STATUS.AUTHORIZED;
}

export function canVoidTransaction(transaction: TransactionLifecycleState): boolean {
  return transaction.status === TRANSACTION_STATUS.AUTHORIZED;
}

export function canRefundTransaction(transaction: TransactionLifecycleState): boolean {
  const refundableAmount = Number(transaction.refundableAmount ?? 0);
  return transaction.status === TRANSACTION_STATUS.CAPTURED && refundableAmount > 0;
}

export function getStatusTone(status: string): 'blue' | 'green' | 'orange' | 'gray' | 'red' | 'yellow' {
  switch (status) {
    case TRANSACTION_STATUS.AUTHORIZED:
      return 'blue';
    case TRANSACTION_STATUS.CAPTURED:
      return 'green';
    case TRANSACTION_STATUS.REFUNDED:
      return 'orange';
    case TRANSACTION_STATUS.VOIDED:
      return 'gray';
    case TRANSACTION_STATUS.FAILED:
      return 'red';
    case TRANSACTION_STATUS.PENDING:
    default:
      return 'yellow';
  }
}
