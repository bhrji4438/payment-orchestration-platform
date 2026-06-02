export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  VOIDED: 'VOIDED'
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

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
