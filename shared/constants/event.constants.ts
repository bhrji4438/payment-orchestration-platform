export const PLATFORM_EVENTS = {
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_CREATED: 'refund.created',
  REFUND_COMPLETED: 'refund.completed',
  INVOICE_CREATED: 'invoice.created',
  NOTIFICATION_SENT: 'notification.sent',
  AUDIT_LOGGED: 'audit.logged',
  SETTLEMENT_STARTED: 'settlement.started',
  SETTLEMENT_COMPLETED: 'settlement.completed',
  WEBHOOK_RECEIVED: 'webhook.received',
  WEBHOOK_PROCESSED: 'webhook.processed'
} as const;

export type PlatformEvent = typeof PLATFORM_EVENTS[keyof typeof PLATFORM_EVENTS];
