import { AbstractPaymentGateway } from '@shared/contracts/abstract-payment-gateway';
import {
  CreditCardSaleRequestDto,
  CreditCardAuthorizeRequestDto,
  CreditCardCaptureRequestDto,
  CreditCardRefundRequestDto,
  CreditCardVoidRequestDto,
  EcheckSaleRequestDto,
  EcheckRefundRequestDto,
  EcheckVoidRequestDto,
  PaymentResponseDto
} from '@shared/dto/gateway.dto';
import axios from 'axios';

export class NmiGatewayAdapter extends AbstractPaymentGateway {
  private getEndpoint(): string {
    return 'https://secure.networkmerchants.com/api/transact.php';
  }

  /**
   * NMI supports two authentication methods:
   *   1. security_key  – single API key (production / key-based sandbox)
   *   2. username + password – direct-post credentials (public demo sandbox)
   * This helper appends whichever set of credentials is present.
   */
  private buildAuthParams(params: URLSearchParams): void {
    const { securityKey, username, password } = this.credentials;
    if (username && password) {
      params.append('username', username);
      params.append('password', password);
    } else {
      params.append('security_key', securityKey || '');
    }
  }

  /** Returns true when no real credentials are configured (mock mode). */
  private isMockMode(): boolean {
    const { securityKey, username } = this.credentials;
    return !securityKey && !username;
  }

  public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardSale', request);

    if (this.isMockMode()) {
      const mockRefId = 'nmi_' + Math.floor(Math.random() * 10000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '100',
        responseMessage: 'Approved (Mock)',
        cardBrand: 'Visa',
        cardLastFour: request.card.pan.slice(-4),
        rawResponse: 'response=1&responsetext=SUCCESS&transactionid=' + mockRefId
      };
      this.auditGatewayResponse('creditCardSale', response);
      return response;
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('type', 'sale');
    params.append('amount', request.amount.toFixed(2));
    params.append('currency', request.currency);
    params.append('ccnumber', request.card.pan);
    params.append('ccexp', `${request.card.expiryMonth}${request.card.expiryYear.slice(-2)}`);
    params.append('cvv', request.card.cvv);

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const success = data.get('response') === '1';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Processed',
        cardBrand: 'Visa',
        cardLastFour: request.card.pan.slice(-4),
        rawResponse: res.data
      };
      this.auditGatewayResponse('creditCardSale', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardSale', error);
    }
  }

  public async creditCardAuthorize(request: CreditCardAuthorizeRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardAuthorize', request);

    if (this.isMockMode()) {
      const mockRefId = 'nmi_' + Math.floor(Math.random() * 10000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '100',
        responseMessage: 'Auth Approved (Mock)',
        cardBrand: 'Visa',
        cardLastFour: request.card.pan.slice(-4),
        rawResponse: 'response=1&responsetext=SUCCESS&transactionid=' + mockRefId
      };
      this.auditGatewayResponse('creditCardAuthorize', response);
      return response;
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('type', 'auth');
    params.append('amount', request.amount.toFixed(2));
    params.append('currency', request.currency);
    params.append('ccnumber', request.card.pan);
    params.append('ccexp', `${request.card.expiryMonth}${request.card.expiryYear.slice(-2)}`);
    params.append('cvv', request.card.cvv);

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const success = data.get('response') === '1';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Processed',
        cardBrand: 'Visa',
        cardLastFour: request.card.pan.slice(-4),
        rawResponse: res.data
      };
      this.auditGatewayResponse('creditCardAuthorize', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardAuthorize', error);
    }
  }

  public async creditCardCapture(request: CreditCardCaptureRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardCapture', request);

    if (this.isMockMode()) {
      const response = {
        success: true,
        transactionReference: request.transactionReference,
        responseCode: '100',
        responseMessage: 'Captured (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS&transactionid=' + request.transactionReference
      };
      this.auditGatewayResponse('creditCardCapture', response);
      return response;
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('type', 'capture');
    params.append('transactionid', request.transactionReference);
    params.append('amount', request.amount.toFixed(2));

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const response = {
        success: data.get('response') === '1',
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Captured',
        rawResponse: res.data
      };
      this.auditGatewayResponse('creditCardCapture', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardCapture', error);
    }
  }

  public async creditCardRefund(request: CreditCardRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardRefund', request);

    if (this.isMockMode()) {
      const mockRefId = 'refund_nmi_' + Math.floor(Math.random() * 10000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '100',
        responseMessage: 'Refund Approved (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS'
      };
      this.auditGatewayResponse('creditCardRefund', response);
      return response;
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('type', 'refund');
    params.append('transactionid', request.transactionReference);
    params.append('amount', request.amount.toFixed(2));

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const response = {
        success: data.get('response') === '1',
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Refunded',
        rawResponse: res.data
      };
      this.auditGatewayResponse('creditCardRefund', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardRefund', error);
    }
  }

  public async creditCardVoid(request: CreditCardVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardVoid', request);

    if (this.isMockMode()) {
      const response = {
        success: true,
        transactionReference: request.transactionReference,
        responseCode: '100',
        responseMessage: 'Void Approved (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS'
      };
      this.auditGatewayResponse('creditCardVoid', response);
      return response;
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('type', 'void');
    params.append('transactionid', request.transactionReference);

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const response = {
        success: data.get('response') === '1',
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Voided',
        rawResponse: res.data
      };
      this.auditGatewayResponse('creditCardVoid', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardVoid', error);
    }
  }

  public async echeckSale(request: EcheckSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckSale', request);
    const mockRefId = 'nmi_ach_' + Math.floor(Math.random() * 1000000);
    return {
      success: true,
      transactionReference: mockRefId,
      responseCode: '100',
      responseMessage: 'Approved (Mock)',
      rawResponse: 'response=1&responsetext=SUCCESS&transactionid=' + mockRefId
    };
  }

  public async echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckRefund', request);
    const mockRefId = 'nmi_ach_ref_' + Math.floor(Math.random() * 1000000);
    return {
      success: true,
      transactionReference: mockRefId,
      responseCode: '100',
      responseMessage: 'Refunded (Mock)',
      rawResponse: 'response=1&responsetext=SUCCESS'
    };
  }

  public async echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckVoid', request);
    return {
      success: true,
      transactionReference: request.transactionReference,
      responseCode: '100',
      responseMessage: 'Voided (Mock)',
      rawResponse: 'response=1&responsetext=SUCCESS'
    };
  }

  public async getTransaction(transactionReference: string): Promise<PaymentResponseDto> {
    if (this.isMockMode()) {
      return {
        success: true,
        transactionReference,
        responseCode: '100',
        responseMessage: 'Approved (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS&transactionid=' + transactionReference
      };
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('report_type', 'transaction_detail');
    params.append('transaction_id', transactionReference);

    try {
      const res = await axios.post('https://secure.networkmerchants.com/api/query.php', params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const success = data.get('response') === '1' || data.get('status') === 'success';

      return {
        success,
        transactionReference: data.get('transactionid') || transactionReference,
        responseCode: data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Query Complete',
        rawResponse: res.data
      };
    } catch (error: any) {
      throw this.mapGatewayError('getTransaction', error);
    }
  }

  public override async verifyWebhook(params: {
    headers: Record<string, string>;
    rawBody: string;
    webhookSecret: string;
  }): Promise<boolean> {
    try {
      const signatureHeader = params.headers['x-nmi-signature'] || params.headers['X-Nmi-Signature'];
      if (!signatureHeader) return false;

      const { createHmac } = await import('crypto');
      const expectedSignature = createHmac('sha256', params.webhookSecret)
        .update(params.rawBody)
        .digest('hex');

      return signatureHeader === expectedSignature;
    } catch {
      return false;
    }
  }
}
