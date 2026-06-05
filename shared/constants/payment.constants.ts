export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  VOIDED: 'VOIDED'
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export const MERCHANT_TRANSACTION_TYPE = {
  SALE: 'SALE',
  AUTH: 'AUTH',
  REFUND: 'REFUND',
  VOID: 'VOID'
} as const;

export type MerchantTransactionType = typeof MERCHANT_TRANSACTION_TYPE[keyof typeof MERCHANT_TRANSACTION_TYPE];

export const TRANSACTION_EVENT_TYPE = {
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  VOIDED: 'VOIDED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
  PENDING: 'PENDING'
} as const;

export type TransactionEventType = typeof TRANSACTION_EVENT_TYPE[keyof typeof TRANSACTION_EVENT_TYPE];

export const PAYMENT_METHOD_BRAND = {
  VISA: 'VISA',
  MASTERCARD: 'MASTERCARD',
  AMEX: 'AMEX',
  DISCOVER: 'DISCOVER',
  ECHECK: 'ECHECK',
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  ACH: 'ACH',
  UNKNOWN: 'UNKNOWN'
} as const;

export const GATEWAY_PROVIDERS = {
  STRIPE: 'STRIPE',
  AUTHORIZE_NET: 'AUTHORIZE_NET',
  NMI: 'NMI',
  CARDPOINTE: 'CARDPOINTE',
  CUSTOM: 'CUSTOM'
} as const;

export type GatewayProvider = typeof GATEWAY_PROVIDERS[keyof typeof GATEWAY_PROVIDERS];

export const ENVIRONMENTS = {
  SANDBOX: 'SANDBOX',
  PRODUCTION: 'PRODUCTION'
} as const;

export type Environment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS];
