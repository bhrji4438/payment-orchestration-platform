export interface MerchantDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CustomerDto {
  id: string;
  merchantId: string;
  email: string;
  name: string;
  phone?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NotificationDto {
  id: string;
  merchantId: string;
  type: 'EMAIL' | 'SMS';
  recipient: string;
  payload: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InvoiceDto {
  id: string;
  merchantId: string;
  paymentId: string;
  number: string;
  pdfUrl: string;
  status: 'UNPAID' | 'PAID' | 'VOIDED';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RefundDto {
  id: string;
  paymentId: string;
  amount: number;
  reason?: string | null;
  status: 'SUCCESS' | 'FAILED';
  gatewayTxnId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
