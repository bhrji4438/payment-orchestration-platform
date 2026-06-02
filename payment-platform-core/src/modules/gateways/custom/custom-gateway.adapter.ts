import { AbstractPaymentGateway } from '../../../../../shared/contracts/abstract-payment-gateway.ts';
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
} from '../../../../../shared/dto/gateway.dto.ts';
import axios from 'axios';

export class CustomGatewayAdapter extends AbstractPaymentGateway {
  private getBaseUrl(): string {
    const siteName = this.credentials.siteName || 'fts';
    const postFixUrl = this.environment.toUpperCase() === 'PRODUCTION'
      ? '.cardconnect.com/cardconnect/rest'
      : '-uat.cardconnect.com/cardconnect/rest';
    return `https://${siteName}${postFixUrl}`;
  }

  private getAuthHeader(): string {
    const user = this.credentials.cardpointeuser || '';
    const pass = this.credentials.cardpointepass || '';
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardSale', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/auth`;

    const card = request.card;
    const expiry = `${card.expiryYear.slice(-2)}${card.expiryMonth.padStart(2, '0')}`;

    const payload = {
      merchid: this.credentials.merchantid,
      account: card.pan,
      expiry: expiry,
      amount: this.formatAmount(request.amount),
      currency: request.currency || 'USD',
      capture: 'Y',
      receipt: 'Y',
      cvv2: card.cvv,
      name: card.holderName,
      address: card.billingAddress?.addressLine1 || '',
      city: card.billingAddress?.city || '',
      region: card.billingAddress?.state || '',
      postal: card.billingAddress?.postalCode || '55555',
      cof: 'M',
      cofscheduled: 'N',
      ecomind: 'E'
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        cardBrand: data.binType || 'VISA',
        cardLastFour: card.pan.slice(-4),
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('creditCardSale', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardSale', error);
    }
  }

  public async creditCardAuthorize(request: CreditCardAuthorizeRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardAuthorize', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/auth`;

    const card = request.card;
    const expiry = `${card.expiryYear.slice(-2)}${card.expiryMonth.padStart(2, '0')}`;

    const payload = {
      merchid: this.credentials.merchantid,
      account: card.pan,
      expiry: expiry,
      amount: this.formatAmount(request.amount),
      currency: request.currency || 'USD',
      capture: 'N',
      receipt: 'Y',
      cvv2: card.cvv,
      name: card.holderName,
      address: card.billingAddress?.addressLine1 || '',
      city: card.billingAddress?.city || '',
      region: card.billingAddress?.state || '',
      postal: card.billingAddress?.postalCode || '55555',
      cof: 'M',
      cofscheduled: 'N',
      ecomind: 'E'
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        cardBrand: data.binType || 'VISA',
        cardLastFour: card.pan.slice(-4),
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('creditCardAuthorize', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardAuthorize', error);
    }
  }

  public async creditCardCapture(request: CreditCardCaptureRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardCapture', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/capture`;

    const payload = {
      retref: request.transactionReference,
      merchid: this.credentials.merchantid,
      amount: this.formatAmount(request.amount)
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('creditCardCapture', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardCapture', error);
    }
  }

  public async creditCardRefund(request: CreditCardRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardRefund', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/refund`;

    const payload = {
      retref: request.transactionReference,
      merchid: this.credentials.merchantid,
      amount: this.formatAmount(request.amount)
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('creditCardRefund', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardRefund', error);
    }
  }

  public async creditCardVoid(request: CreditCardVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardVoid', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/void`;

    const payload = {
      retref: request.transactionReference,
      merchid: this.credentials.merchantid
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('creditCardVoid', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('creditCardVoid', error);
    }
  }

  public async echeckSale(request: EcheckSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckSale', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/auth`;

    const echeck = request.echeck;

    const payload = {
      accttype: 'ECHK',
      merchid: this.credentials.merchantid,
      account: echeck.accountNumber,
      bankaba: echeck.routingNumber,
      amount: this.formatAmount(request.amount),
      currency: request.currency || 'USD',
      capture: 'Y',
      name: echeck.accountName,
      address: echeck.billingAddress?.addressLine1 || '',
      city: echeck.billingAddress?.city || '',
      region: echeck.billingAddress?.state || '',
      postal: echeck.billingAddress?.postalCode || '55555',
      cof: 'M',
      cofscheduled: 'N',
      ecomind: 'E'
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('echeckSale', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('echeckSale', error);
    }
  }

  public async echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckRefund', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/refund`;

    const payload = {
      retref: request.transactionReference,
      merchid: this.credentials.merchantid,
      amount: this.formatAmount(request.amount)
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('echeckRefund', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('echeckRefund', error);
    }
  }

  public async echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckVoid', request);

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/void`;

    const payload = {
      retref: request.transactionReference,
      merchid: this.credentials.merchantid
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders({
          'Authorization': this.getAuthHeader()
        }),
        timeout: 10000
      });

      const data = response.data;
      const success = data.respstat === 'A';

      const responseDto = {
        success,
        transactionReference: data.retref,
        responseCode: data.respcode,
        responseMessage: data.resptext,
        rawResponse: JSON.stringify(data)
      };

      this.auditGatewayResponse('echeckVoid', responseDto);
      return responseDto;
    } catch (error: any) {
      throw this.mapGatewayError('echeckVoid', error);
    }
  }
}
export const CardpointeGatewayAdapter = CustomGatewayAdapter;
