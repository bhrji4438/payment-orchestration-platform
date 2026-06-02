export const KAFKA_TOPICS = {
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

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];

export interface PaymentCapturedEvent {
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  gatewayTxnId: string;
  customerId?: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  merchantId: string;
  amount: number;
  error: string;
}

export interface InvoiceCreatedEvent {
  invoiceId: string;
  paymentId: string;
  merchantId: string;
  amount: number;
  invoiceNumber: string;
  pdfUrl: string;
}
