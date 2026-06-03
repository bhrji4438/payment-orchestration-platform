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

export class AuthorizeNetGatewayAdapter extends AbstractPaymentGateway {
  private getEndpoint(): string {
    return this.environment.toUpperCase() === 'PRODUCTION'
      ? 'https://api.authorize.net/xml/v1/request.api'
      : 'https://apitest.authorize.net/xml/v1/request.api';
  }

  public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardSale', request);

    const loginId = this.credentials.loginId || 'mock_login_id';
    const transKey = this.credentials.transactionKey || 'mock_trans_key';

    if (loginId === 'mock_login_id') {
      const mockRefId = 'auth_net_' + Math.floor(Math.random() * 10000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '1',
        responseMessage: 'Approved (Mock)',
        cardBrand: 'Visa',
        cardLastFour: request.card.pan.slice(-4),
        rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: mockRefId } })
      };
      this.auditGatewayResponse('creditCardSale', response);
      return response;
    }

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: loginId,
          transactionKey: transKey
        },
        transactionRequest: {
          transactionType: 'authCaptureTransaction',
          amount: request.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: request.card.pan,
              expirationDate: `${request.card.expiryYear}-${request.card.expiryMonth}`,
              cardCode: request.card.cvv
            }
          }
        }
      }
    };

    try {
      const res = await axios.post(this.getEndpoint(), payload, {
        headers: this.buildHeaders()
      });
      const tx = res.data?.transactionResponse || {};
      const success = tx.responseCode === '1';

      const response = {
        success,
        transactionReference: tx.transId,
        responseCode: tx.responseCode,
        responseMessage: tx.errors?.[0]?.errorText || 'Processed',
        cardBrand: tx.accountType || 'Visa',
        cardLastFour: tx.accountNumber?.slice(-4) || '1111',
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

    const loginId = this.credentials.loginId || 'mock_login_id';
    const transKey = this.credentials.transactionKey || 'mock_trans_key';

    if (loginId === 'mock_login_id') {
      const mockRefId = 'auth_net_' + Math.floor(Math.random() * 10000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '1',
        responseMessage: 'AuthOnly Approved (Mock)',
        cardBrand: 'Visa',
        cardLastFour: request.card.pan.slice(-4),
        rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: mockRefId } })
      };
      this.auditGatewayResponse('creditCardAuthorize', response);
      return response;
    }

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: loginId,
          transactionKey: transKey
        },
        transactionRequest: {
          transactionType: 'authOnlyTransaction',
          amount: request.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: request.card.pan,
              expirationDate: `${request.card.expiryYear}-${request.card.expiryMonth}`,
              cardCode: request.card.cvv
            }
          }
        }
      }
    };

    try {
      const res = await axios.post(this.getEndpoint(), payload, {
        headers: this.buildHeaders()
      });
      const tx = res.data?.transactionResponse || {};
      const success = tx.responseCode === '1';

      const response = {
        success,
        transactionReference: tx.transId,
        responseCode: tx.responseCode,
        responseMessage: tx.errors?.[0]?.errorText || 'Processed',
        cardBrand: tx.accountType || 'Visa',
        cardLastFour: tx.accountNumber?.slice(-4) || '1111',
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

    const loginId = this.credentials.loginId || 'mock_login_id';
    const transKey = this.credentials.transactionKey || 'mock_trans_key';

    if (loginId === 'mock_login_id') {
      const response = {
        success: true,
        transactionReference: request.transactionReference,
        responseCode: '1',
        responseMessage: 'Captured (Mock)',
        rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: request.transactionReference } })
      };
      this.auditGatewayResponse('creditCardCapture', response);
      return response;
    }

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: loginId,
          transactionKey: transKey
        },
        transactionRequest: {
          transactionType: 'priorAuthCaptureTransaction',
          amount: request.amount.toFixed(2),
          refTransId: request.transactionReference
        }
      }
    };

    try {
      const res = await axios.post(this.getEndpoint(), payload, {
        headers: this.buildHeaders()
      });
      const tx = res.data?.transactionResponse || {};
      const response = {
        success: tx.responseCode === '1',
        transactionReference: tx.transId,
        responseCode: tx.responseCode,
        responseMessage: tx.errors?.[0]?.errorText || 'Captured',
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

    const loginId = this.credentials.loginId || 'mock_login_id';
    const transKey = this.credentials.transactionKey || 'mock_trans_key';

    if (loginId === 'mock_login_id') {
      const mockRefId = 'refund_net_' + Math.floor(Math.random() * 10000000);
      const response = {
        success: true,
        transactionReference: mockRefId,
        responseCode: '1',
        responseMessage: 'Refund Approved (Mock)',
        rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: mockRefId } })
      };
      this.auditGatewayResponse('creditCardRefund', response);
      return response;
    }

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: loginId,
          transactionKey: transKey
        },
        transactionRequest: {
          transactionType: 'refundTransaction',
          amount: request.amount.toFixed(2),
          refTransId: request.transactionReference
        }
      }
    };

    try {
      const res = await axios.post(this.getEndpoint(), payload, {
        headers: this.buildHeaders()
      });
      const tx = res.data?.transactionResponse || {};
      const response = {
        success: tx.responseCode === '1',
        transactionReference: tx.transId,
        responseCode: tx.responseCode,
        responseMessage: tx.errors?.[0]?.errorText || 'Refunded',
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

    const loginId = this.credentials.loginId || 'mock_login_id';
    const transKey = this.credentials.transactionKey || 'mock_trans_key';

    if (loginId === 'mock_login_id') {
      const response = {
        success: true,
        transactionReference: request.transactionReference,
        responseCode: '1',
        responseMessage: 'Void Approved (Mock)',
        rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: request.transactionReference } })
      };
      this.auditGatewayResponse('creditCardVoid', response);
      return response;
    }

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: loginId,
          transactionKey: transKey
        },
        transactionRequest: {
          transactionType: 'voidTransaction',
          refTransId: request.transactionReference
        }
      }
    };

    try {
      const res = await axios.post(this.getEndpoint(), payload, {
        headers: this.buildHeaders()
      });
      const tx = res.data?.transactionResponse || {};
      const response = {
        success: tx.responseCode === '1',
        transactionReference: tx.transId,
        responseCode: tx.responseCode,
        responseMessage: tx.errors?.[0]?.errorText || 'Voided',
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
    const mockRefId = 'auth_net_ach_' + Math.floor(Math.random() * 1000000);
    return {
      success: true,
      transactionReference: mockRefId,
      responseCode: '1',
      responseMessage: 'ACH sale approved (Mock)',
      rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: mockRefId } })
    };
  }

  public async echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckRefund', request);
    const mockRefId = 'auth_net_ach_ref_' + Math.floor(Math.random() * 1000000);
    return {
      success: true,
      transactionReference: mockRefId,
      responseCode: '1',
      responseMessage: 'ACH refund approved (Mock)',
      rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: mockRefId } })
    };
  }

  public async echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('echeckVoid', request);
    return {
      success: true,
      transactionReference: request.transactionReference,
      responseCode: '1',
      responseMessage: 'ACH void approved (Mock)',
      rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: request.transactionReference } })
    };
  }

  public async getTransaction(transactionReference: string): Promise<PaymentResponseDto> {
    const loginId = this.credentials.loginId || 'mock_login_id';
    const transKey = this.credentials.transactionKey || 'mock_trans_key';

    if (loginId === 'mock_login_id') {
      return {
        success: true,
        transactionReference,
        responseCode: '1',
        responseMessage: 'Settled (Mock)',
        rawResponse: JSON.stringify({ transactionResponse: { responseCode: '1', transId: transactionReference } })
      };
    }

    const payload = {
      getTransactionDetailsRequest: {
        merchantAuthentication: {
          name: loginId,
          transactionKey: transKey
        },
        transId: transactionReference
      }
    };

    try {
      const res = await axios.post(this.getEndpoint(), payload, {
        headers: this.buildHeaders()
      });
      const tx = res.data?.transaction || {};
      const success = tx.transactionStatus === 'settledSuccessfully' || tx.transactionStatus === 'capturedPendingSettlement';

      return {
        success,
        transactionReference: tx.transId,
        responseCode: tx.responseCode,
        responseMessage: tx.transactionStatus,
        rawResponse: JSON.stringify(res.data)
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
      const signatureHeader = params.headers['x-anet-signature'] || params.headers['X-Anet-Signature'];
      if (!signatureHeader) return false;

      const signature = signatureHeader.toLowerCase().replace('sha512=', '').trim();
      const { createHmac } = await import('crypto');
      const expectedSignature = createHmac('sha512', params.webhookSecret)
        .update(params.rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch {
      return false;
    }
  }
}
