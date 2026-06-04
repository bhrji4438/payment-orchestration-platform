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

  private parseXmlTag(xml: string, tag: string): string | null {
    const match = new RegExp(`<${tag}>(.*?)</${tag}>`, 's').exec(xml);
    return match ? match[1].trim() : null;
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

    const nameParts = (request.card.holderName || '').trim().split(/\s+/);
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';
    if (firstname) params.append('firstname', firstname);
    if (lastname) params.append('lastname', lastname);

    if (request.card.billingAddress) {
      const { addressLine1, city, state, postalCode, country } = request.card.billingAddress;
      if (addressLine1) params.append('address1', addressLine1);
      if (city) params.append('city', city);
      if (state) params.append('state', state);
      if (postalCode) params.append('zip', postalCode);
      if (country) params.append('country', country);
    }

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
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

    const nameParts = (request.card.holderName || '').trim().split(/\s+/);
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';
    if (firstname) params.append('firstname', firstname);
    if (lastname) params.append('lastname', lastname);

    if (request.card.billingAddress) {
      const { addressLine1, city, state, postalCode, country } = request.card.billingAddress;
      if (addressLine1) params.append('address1', addressLine1);
      if (city) params.append('city', city);
      if (state) params.append('state', state);
      if (postalCode) params.append('zip', postalCode);
      if (country) params.append('country', country);
    }

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
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
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
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
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
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
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
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

    if (this.isMockMode()) {
      const mockRefId = 'nmi_ach_' + Math.floor(Math.random() * 1000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '100',
        responseMessage: 'Approved (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS&transactionid=' + mockRefId
      };
      this.auditGatewayResponse('echeckSale', response);
      return response;
    }

    const params = new URLSearchParams();
    this.buildAuthParams(params);
    params.append('type', 'sale');
    params.append('payment', 'check');
    params.append('amount', request.amount.toFixed(2));
    params.append('currency', request.currency);
    params.append('checkname', request.echeck.accountName);
    params.append('checkaccount', request.echeck.accountNumber);
    params.append('checkaba', request.echeck.routingNumber);
    params.append('account_type', request.echeck.accountType);
    params.append('account_holder_type', 'personal');
    params.append('sec_code', 'WEB');

    const nameParts = (request.echeck.accountName || '').trim().split(/\s+/);
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';
    if (firstname) params.append('firstname', firstname);
    if (lastname) params.append('lastname', lastname);

    if (request.echeck.billingAddress) {
      const { addressLine1, city, state, postalCode, country } = request.echeck.billingAddress;
      if (addressLine1) params.append('address1', addressLine1);
      if (city) params.append('city', city);
      if (state) params.append('state', state);
      if (postalCode) params.append('zip', postalCode);
      if (country) params.append('country', country);
    }

    try {
      const res = await axios.post(this.getEndpoint(), params.toString(), {
        headers: this.buildHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      });
      const data = new URLSearchParams(res.data);
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Processed',
        rawResponse: res.data
      };
      this.auditGatewayResponse('echeckSale', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('echeckSale', error);
    }
  }

  public async echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckRefund', request);

    if (this.isMockMode()) {
      const mockRefId = 'nmi_ach_ref_' + Math.floor(Math.random() * 1000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '100',
        responseMessage: 'Refunded (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS'
      };
      this.auditGatewayResponse('echeckRefund', response);
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
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Refunded',
        rawResponse: res.data
      };
      this.auditGatewayResponse('echeckRefund', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('echeckRefund', error);
    }
  }

  public async echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckVoid', request);

    if (this.isMockMode()) {
      const response = {
        success: true,
        transactionReference: request.transactionReference,
        responseCode: '100',
        responseMessage: 'Voided (Mock)',
        rawResponse: 'response=1&responsetext=SUCCESS'
      };
      this.auditGatewayResponse('echeckVoid', response);
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
      const success = data.get('response') === '1' || data.get('response_code') === '100';

      const response = {
        success,
        transactionReference: data.get('transactionid') || undefined,
        responseCode: data.get('response_code') || data.get('response') || undefined,
        responseMessage: data.get('responsetext') || 'Voided',
        rawResponse: res.data
      };
      this.auditGatewayResponse('echeckVoid', response);
      return response;
    } catch (error: any) {
      throw this.mapGatewayError('echeckVoid', error);
    }
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
      const xml = res.data;
      const responseCode = this.parseXmlTag(xml, 'response_code') || undefined;
      const success = responseCode === '100' || this.parseXmlTag(xml, 'result') === 'update_success';
      const transactionId = this.parseXmlTag(xml, 'transaction_id') || transactionReference;
      const responseText = this.parseXmlTag(xml, 'responsetext') || 'Query Complete';

      return {
        success,
        transactionReference: transactionId,
        responseCode,
        responseMessage: responseText,
        rawResponse: xml
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
