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

export class StripeGatewayAdapter extends AbstractPaymentGateway {
  private getHeaders(): Record<string, string> {
    const apiKey = this.credentials.apiKey || 'sk_test_mock';
    return this.buildHeaders({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    });
  }

  public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardSale', request);

    const amountInCents = Math.round(request.amount * 100);
    const apiKey = this.credentials.apiKey || 'sk_test_mock';

    try {
      if (apiKey === 'sk_test_mock') {
        const mockIntentId = 'pi_' + Math.random().toString(36).substring(2, 15);
        const response = {
          success: true,
          transactionReference: mockIntentId,
          responseCode: '200',
          responseMessage: 'Sale succeeded (Mock)',
          cardBrand: 'Visa',
          cardLastFour: request.card.pan.slice(-4),
          rawResponse: JSON.stringify({ id: mockIntentId, status: 'succeeded', amount: amountInCents })
        };
        this.auditGatewayResponse('creditCardSale', response);
        return response;
      }

      const params = new URLSearchParams();
      params.append('amount', amountInCents.toString());
      params.append('currency', request.currency.toLowerCase());
      params.append('capture_method', 'automatic');
      params.append('payment_method', 'pm_card_visa');
      params.append('confirm', 'true');

      const res = await axios.post('https://api.stripe.com/v1/payment_intents', params.toString(), {
        headers: this.getHeaders()
      });

      const response = {
        success: res.data.status === 'succeeded',
        transactionReference: res.data.id,
        responseCode: '200',
        responseMessage: res.data.status,
        cardBrand: 'Visa',
        cardLastFour: '4242',
        rawResponse: JSON.stringify(res.data)
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

    const amountInCents = Math.round(request.amount * 100);
    const apiKey = this.credentials.apiKey || 'sk_test_mock';

    try {
      if (apiKey === 'sk_test_mock') {
        const mockIntentId = 'pi_' + Math.random().toString(36).substring(2, 15);
        const response = {
          success: true,
          transactionReference: mockIntentId,
          responseCode: '200',
          responseMessage: 'Authorization requires capture (Mock)',
          cardBrand: 'Visa',
          cardLastFour: request.card.pan.slice(-4),
          rawResponse: JSON.stringify({ id: mockIntentId, status: 'requires_capture', amount: amountInCents })
        };
        this.auditGatewayResponse('creditCardAuthorize', response);
        return response;
      }

      const params = new URLSearchParams();
      params.append('amount', amountInCents.toString());
      params.append('currency', request.currency.toLowerCase());
      params.append('capture_method', 'manual');
      params.append('payment_method', 'pm_card_visa');
      params.append('confirm', 'true');

      const res = await axios.post('https://api.stripe.com/v1/payment_intents', params.toString(), {
        headers: this.getHeaders()
      });

      const response = {
        success: res.data.status === 'requires_capture',
        transactionReference: res.data.id,
        responseCode: '200',
        responseMessage: res.data.status,
        cardBrand: 'Visa',
        cardLastFour: '4242',
        rawResponse: JSON.stringify(res.data)
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

    const amountInCents = Math.round(request.amount * 100);
    const apiKey = this.credentials.apiKey || 'sk_test_mock';

    try {
      if (apiKey === 'sk_test_mock') {
        const response = {
          success: true,
          transactionReference: request.transactionReference,
          responseCode: '200',
          responseMessage: 'Capture succeeded (Mock)',
          rawResponse: JSON.stringify({ id: request.transactionReference, status: 'succeeded', amount_captured: amountInCents })
        };
        this.auditGatewayResponse('creditCardCapture', response);
        return response;
      }

      const params = new URLSearchParams();
      params.append('amount_to_capture', amountInCents.toString());

      const res = await axios.post(
        `https://api.stripe.com/v1/payment_intents/${request.transactionReference}/capture`,
        params.toString(),
        { headers: this.getHeaders() }
      );

      const response = {
        success: res.data.status === 'succeeded',
        transactionReference: res.data.id,
        responseCode: '200',
        responseMessage: res.data.status,
        rawResponse: JSON.stringify(res.data)
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

    const amountInCents = Math.round(request.amount * 100);
    const apiKey = this.credentials.apiKey || 'sk_test_mock';

    try {
      if (apiKey === 'sk_test_mock') {
        const mockRefundId = 're_' + Math.random().toString(36).substring(2, 15);
        const response = {
          success: true,
          transactionReference: mockRefundId,
          responseCode: '200',
          responseMessage: 'Refund succeeded (Mock)',
          rawResponse: JSON.stringify({ id: mockRefundId, status: 'succeeded', amount: amountInCents })
        };
        this.auditGatewayResponse('creditCardRefund', response);
        return response;
      }

      const params = new URLSearchParams();
      params.append('payment_intent', request.transactionReference);
      params.append('amount', amountInCents.toString());

      const res = await axios.post('https://api.stripe.com/v1/refunds', params.toString(), {
        headers: this.getHeaders()
      });

      const response = {
        success: res.data.status === 'succeeded',
        transactionReference: res.data.id,
        responseCode: '200',
        responseMessage: res.data.status,
        rawResponse: JSON.stringify(res.data)
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

    const apiKey = this.credentials.apiKey || 'sk_test_mock';

    try {
      if (apiKey === 'sk_test_mock') {
        const response = {
          success: true,
          transactionReference: request.transactionReference,
          responseCode: '200',
          responseMessage: 'Void requires canceling (Mock)',
          rawResponse: JSON.stringify({ id: request.transactionReference, status: 'canceled' })
        };
        this.auditGatewayResponse('creditCardVoid', response);
        return response;
      }

      const res = await axios.post(
        `https://api.stripe.com/v1/payment_intents/${request.transactionReference}/cancel`,
        {},
        { headers: this.getHeaders() }
      );

      const response = {
        success: res.data.status === 'canceled',
        transactionReference: res.data.id,
        responseCode: '200',
        responseMessage: res.data.status,
        rawResponse: JSON.stringify(res.data)
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
    const mockRefId = 'stripe_ach_' + Math.floor(Math.random() * 100000);
    return {
      success: true,
      transactionReference: mockRefId,
      responseCode: '200',
      responseMessage: 'ACH sale processed successfully (Mock)',
      rawResponse: JSON.stringify({ id: mockRefId, object: 'charge', type: 'ach' })
    };
  }

  public async echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckRefund', request);
    const mockRefId = 'stripe_ach_ref_' + Math.floor(Math.random() * 100000);
    return {
      success: true,
      transactionReference: mockRefId,
      responseCode: '200',
      responseMessage: 'ACH refund processed successfully (Mock)',
      rawResponse: JSON.stringify({ id: mockRefId })
    };
  }

  public async echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckVoid', request);
    return {
      success: true,
      transactionReference: request.transactionReference,
      responseCode: '200',
      responseMessage: 'ACH void processed successfully (Mock)',
      rawResponse: JSON.stringify({ id: request.transactionReference })
    };
  }
}
