import axios, { AxiosInstance } from 'axios';
import { createHmac } from 'crypto';

export interface CardDetails {
  pan: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  billingAddress?: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  gatewayConfigurationId?: string;
  customerId?: string;
  card?: CardDetails;
  token?: string;
  capture?: boolean;
}

export interface PaymentResponse {
  id: string;
  merchantId: string;
  customerId: string | null;
  gatewayConfigId: string | null;
  amount: string;
  currency: string;
  status: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  cardExpiry: string | null;
  gatewayToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PaymentPlatformClient {
  private client: AxiosInstance;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    if (!options.apiKey) {
      throw new Error('API key is required to initialize the Payment Platform Client.');
    }
    
    this.client = axios.create({
      baseURL: options.baseUrl || process.env.PAYMENT_PLATFORM_CORE_URL || 'http://localhost:3000',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Payments service endpoints
   */
  public readonly payments = {
    /**
     * Processes a new charge (sale) or authorization.
     */
    create: async (params: CreatePaymentParams, idempotencyKey?: string): Promise<PaymentResponse> => {
      const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
      const response = await this.client.post<PaymentResponse>('/v1/payments', params, { headers });
      return response.data;
    },

    /**
     * Captures a pre-authorized payment.
     */
    capture: async (paymentId: string, amount: number, idempotencyKey?: string): Promise<PaymentResponse> => {
      const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
      const response = await this.client.post<PaymentResponse>('/v1/captures', { paymentId, amount }, { headers });
      return response.data;
    },

    /**
     * Refunds a captured payment.
     */
    refund: async (paymentId: string, amount: number, reason?: string, idempotencyKey?: string): Promise<PaymentResponse> => {
      const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
      const response = await this.client.post<PaymentResponse>('/v1/refunds', { paymentId, amount, reason }, { headers });
      return response.data;
    },

    /**
     * Voids an authorized payment.
     */
    void: async (paymentId: string, reason?: string, idempotencyKey?: string): Promise<PaymentResponse> => {
      const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
      const response = await this.client.post<PaymentResponse>('/v1/voids', { paymentId, reason }, { headers });
      return response.data;
    },

    /**
     * Retrieves details of a payment by ID.
     */
    retrieve: async (paymentId: string): Promise<PaymentResponse> => {
      const response = await this.client.get<PaymentResponse>(`/v1/payments/${paymentId}`);
      return response.data;
    }
  };

  /**
   * Webhook payload verification helpers
   */
  public readonly webhooks = {
    /**
     * Verifies if a gateway webhook callback matches the calculated HMAC signature
     */
    verifySignature: (rawBody: string, signature: string, secret: string): boolean => {
      if (!rawBody || !signature || !secret) return false;
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      return expected === signature;
    }
  };
}
export default PaymentPlatformClient;
