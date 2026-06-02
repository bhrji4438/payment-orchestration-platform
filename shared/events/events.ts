import { KAFKA_TOPICS, KafkaTopic } from '../constants/kafka.constants.ts';

export { KAFKA_TOPICS, KafkaTopic };

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
