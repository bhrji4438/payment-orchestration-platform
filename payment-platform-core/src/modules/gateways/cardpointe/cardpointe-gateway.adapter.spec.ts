import { CardpointeGatewayAdapter } from './cardpointe-gateway.adapter';
import {
  CreditCardSaleRequestDto,
  CreditCardAuthorizeRequestDto,
  CreditCardCaptureRequestDto,
  CreditCardRefundRequestDto,
  CreditCardVoidRequestDto,
  EcheckSaleRequestDto,
  EcheckRefundRequestDto,
  EcheckVoidRequestDto
} from '@shared/dto/gateway.dto';
import axios from 'axios';
import { createHmac } from 'crypto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CardpointeGatewayAdapter', () => {
  let adapter: CardpointeGatewayAdapter;
  let mockAdapter: CardpointeGatewayAdapter;

  const credentials = {
    merchantid: '1234567890',
    cardpointeuser: 'test_user',
    cardpointepass: 'test_password',
    siteName: 'fts'
  };

  const echeckRequest: EcheckSaleRequestDto = {
    amount: 100.00,
    currency: 'USD',
    echeck: {
      accountName: 'John Smith',
      accountNumber: '111122223333',
      routingNumber: '123456789',
      accountType: 'checking',
      billingAddress: {
        addressLine1: '789 Pine Ave',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94101',
        country: 'USA'
      }
    }
  };

  const saleRequest: CreditCardSaleRequestDto = {
    amount: 15.75,
    currency: 'USD',
    card: {
      pan: '4111111111111111',
      expiryMonth: '11',
      expiryYear: '29',
      cvv: '123',
      holderName: 'Alice Johnson',
      billingAddress: {
        addressLine1: '456 Oak Rd',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'USA'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new CardpointeGatewayAdapter(credentials, 'sandbox', 'test-merchant');
    mockAdapter = new CardpointeGatewayAdapter({}, 'sandbox', 'test-merchant');
  });

  describe('Mock Mode Detection & Handling', () => {
    it('should run in mock mode when credentials are missing', async () => {
      const result = await mockAdapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should run in mock mode when merchantid is mock_merchant_id', async () => {
      const specificMockAdapter = new CardpointeGatewayAdapter(
        { merchantid: 'mock_merchant_id', cardpointeuser: 'user', cardpointepass: 'pass' },
        'sandbox',
        'test-merchant'
      );
      const result = await specificMockAdapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run in mock mode when password is missing', async () => {
      const partialMockAdapter = new CardpointeGatewayAdapter(
        { merchantid: '1234567890', cardpointeuser: 'test_user' },
        'sandbox',
        'test-merchant'
      );
      const result = await partialMockAdapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
    });

    it('should run in mock mode when merchantid is missing', async () => {
      const partialMockAdapter = new CardpointeGatewayAdapter(
        { cardpointeuser: 'test_user', cardpointepass: 'test_password' },
        'sandbox',
        'test-merchant'
      );
      const result = await partialMockAdapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
    });

    it('should mock creditCardAuthorize', async () => {
      const result = await mockAdapter.creditCardAuthorize(saleRequest);
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock creditCardCapture', async () => {
      const result = await mockAdapter.creditCardCapture({
        amount: 25.50,
        transactionReference: 'txn123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock creditCardRefund', async () => {
      const result = await mockAdapter.creditCardRefund({
        amount: 25.50,
        transactionReference: 'txn123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock creditCardVoid', async () => {
      const result = await mockAdapter.creditCardVoid({
        transactionReference: 'txn123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock echeckSale', async () => {
      const result = await mockAdapter.echeckSale(echeckRequest);
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock echeckRefund', async () => {
      const result = await mockAdapter.echeckRefund({
        amount: 50.00,
        transactionReference: 'ach123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock echeckVoid', async () => {
      const result = await mockAdapter.echeckVoid({
        transactionReference: 'ach123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should mock getTransaction', async () => {
      const result = await mockAdapter.getTransaction('txn123');
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });
  });

  describe('Credit Card transactions (API)', () => {
    it('should execute creditCardSale successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Approved',
          retref: 'cp_ref_12345',
          binType: 'VISA'
        }
      });

      const result = await adapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_12345');
      expect(result.responseCode).toBe('00');
      expect(result.responseMessage).toBe('Approved');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0] as any[];
      expect(url).toBe('https://fts-uat.cardconnect.com/cardconnect/rest/auth');
      expect(payload.merchid).toBe('1234567890');
      expect(payload.account).toBe('4111111111111111');
      expect(payload.expiry).toBe('2911');
      expect(payload.amount).toBe('15.75');
      expect(payload.capture).toBe('Y');
      expect(payload.cvv2).toBe('123');
      expect(payload.name).toBe('Alice Johnson');
      expect(payload.address).toBe('456 Oak Rd');
      expect(payload.city).toBe('Los Angeles');
      expect(payload.region).toBe('CA');
      expect(payload.postal).toBe('90001');
      expect(config?.headers?.Authorization).toContain('Basic');
    });

    it('should fallback to default siteName fts when siteName is not configured', async () => {
      const noSiteAdapter = new CardpointeGatewayAdapter(
        { merchantid: '1234567890', cardpointeuser: 'test_user', cardpointepass: 'test_password' },
        'sandbox',
        'test-merchant'
      );
      mockedAxios.post.mockResolvedValueOnce({ data: { respstat: 'A' } });
      await noSiteAdapter.creditCardSale(saleRequest);
      expect(mockedAxios.post.mock.calls[0][0]).toContain('https://fts-uat.cardconnect.com');
    });

    it('should use production URL in production environment', async () => {
      const prodAdapter = new CardpointeGatewayAdapter(
        credentials,
        'production',
        'test-merchant'
      );
      mockedAxios.post.mockResolvedValueOnce({ data: { respstat: 'A' } });
      await prodAdapter.creditCardSale(saleRequest);
      expect(mockedAxios.post.mock.calls[0][0]).toContain('https://fts.cardconnect.com');
    });

    it('should fallback to default values in payload when request fields are missing', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { respstat: 'A', respcode: '00', retref: 'cp_ref_123' }
      });

      const minimalRequest: CreditCardSaleRequestDto = {
        amount: 10.00,
        currency: '',
        card: {
          pan: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2028',
          cvv: '',
          holderName: 'John Minimal'
        }
      };

      await adapter.creditCardSale(minimalRequest);
      const payload = mockedAxios.post.mock.calls[0][1] as any;
      expect(payload.currency).toBe('USD');
      expect(payload.cvv2).toBe('');
      expect(payload.address).toBe('');
      expect(payload.city).toBe('');
      expect(payload.region).toBe('');
      expect(payload.postal).toBe('55555');
    });

    it('should support capture override in creditCardSale request', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { respstat: 'A', respcode: '00', retref: 'cp_ref_123' }
      });

      const reqWithCapture = { ...saleRequest, capture: 'N' };
      await adapter.creditCardSale(reqWithCapture as any);

      const payload = mockedAxios.post.mock.calls[0][1] as any;
      expect(payload.capture).toBe('N');
    });

    it('should execute creditCardAuthorize successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Authorized',
          retref: 'cp_ref_54321',
          binType: 'VISA'
        }
      });

      const result = await adapter.creditCardAuthorize(saleRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_54321');
      const payload = mockedAxios.post.mock.calls[0][1] as any;
      expect(payload.capture).toBe('N');
    });

    it('should support fallbacks to alternative approval codes', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'C',
          respcode: '000',
          resptext: 'Approved (Alternate)',
          retref: 'cp_ref_999'
        }
      });

      const result = await adapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
      expect(result.responseCode).toBe('000');
    });

    it('should fail if transaction declined', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'B',
          respcode: '12',
          resptext: 'Declined',
          retref: 'cp_ref_declined'
        }
      });

      const result = await adapter.creditCardSale(saleRequest);
      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('12');
    });

    it('should handle creditCardCapture successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Captured',
          retref: 'cp_ref_12345'
        }
      });

      const captureRequest: CreditCardCaptureRequestDto = {
        amount: 15.75,
        transactionReference: 'cp_ref_12345'
      };

      const result = await adapter.creditCardCapture(captureRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_12345');

      const [url, payload] = mockedAxios.post.mock.calls[0] as any[];
      expect(url).toBe('https://fts-uat.cardconnect.com/cardconnect/rest/capture');
      expect(payload.retref).toBe('cp_ref_12345');
      expect(payload.amount).toBe('15.75');
    });

    it('should handle creditCardRefund successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Refunded',
          retref: 'cp_ref_refund'
        }
      });

      const refundRequest: CreditCardRefundRequestDto = {
        amount: 10.00,
        transactionReference: 'cp_ref_12345'
      };

      const result = await adapter.creditCardRefund(refundRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_refund');

      const [url, payload] = mockedAxios.post.mock.calls[0] as any[];
      expect(url).toBe('https://fts-uat.cardconnect.com/cardconnect/rest/refund');
      expect(payload.retref).toBe('cp_ref_12345');
      expect(payload.amount).toBe('10.00');
    });

    it('should handle creditCardVoid successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Voided',
          retref: 'cp_ref_void'
        }
      });

      const voidRequest: CreditCardVoidRequestDto = {
        transactionReference: 'cp_ref_12345'
      };

      const result = await adapter.creditCardVoid(voidRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_void');

      const [url, payload] = mockedAxios.post.mock.calls[0] as any[];
      expect(url).toBe('https://fts-uat.cardconnect.com/cardconnect/rest/void');
      expect(payload.retref).toBe('cp_ref_12345');
    });
  });

  describe('Echeck/ACH Transactions (API)', () => {
    it('should execute echeckSale successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Approved',
          retref: 'cp_ref_ach_123'
        }
      });

      const result = await adapter.echeckSale(echeckRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_ach_123');

      const [url, payload] = mockedAxios.post.mock.calls[0] as any[];
      expect(url).toBe('https://fts-uat.cardconnect.com/cardconnect/rest/auth');
      expect(payload.accttype).toBe('ECHK');
      expect(payload.account).toBe('111122223333');
      expect(payload.bankaba).toBe('123456789');
      expect(payload.achEntryCode).toBe('WEB');
    });

    it('should fallback to default values in echeckSale payload when request fields are missing', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { respstat: 'A', respcode: '00', retref: 'cp_ref_ach_123' }
      });

      const minimalEcheck: EcheckSaleRequestDto = {
        amount: 100.00,
        currency: '',
        echeck: {
          accountName: 'Jane Smith',
          accountNumber: '111122223333',
          routingNumber: '123456789',
          accountType: 'checking'
        }
      };

      await adapter.echeckSale(minimalEcheck);
      const payload = mockedAxios.post.mock.calls[0][1] as any;
      expect(payload.currency).toBe('USD');
      expect(payload.address).toBe('');
      expect(payload.city).toBe('');
      expect(payload.region).toBe('');
      expect(payload.postal).toBe('55555');
    });

    it('should execute echeckSale with custom achEntryCode', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { respstat: 'A', respcode: '00', retref: 'cp_ref_ach_456' }
      });

      const customReq = {
        ...echeckRequest,
        echeck: {
          ...echeckRequest.echeck,
          achEntryCode: 'CCD'
        }
      };

      await adapter.echeckSale(customReq as any);
      const payload = mockedAxios.post.mock.calls[0][1] as any;
      expect(payload.achEntryCode).toBe('CCD');
    });

    it('should handle echeckRefund successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { respstat: 'A', respcode: '00', retref: 'cp_ref_ach_ref' }
      });

      const refundRequest: EcheckRefundRequestDto = {
        amount: 50.00,
        transactionReference: 'cp_ref_ach_123'
      };

      const result = await adapter.echeckRefund(refundRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_ach_ref');
    });

    it('should handle echeckVoid successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { respstat: 'A', respcode: '00', retref: 'cp_ref_ach_void' }
      });

      const voidRequest: EcheckVoidRequestDto = {
        transactionReference: 'cp_ref_ach_123'
      };

      const result = await adapter.echeckVoid(voidRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_ach_void');
    });
  });

  describe('getTransaction Query API', () => {
    it('should query transaction status successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          respstat: 'A',
          respcode: '00',
          resptext: 'Settled',
          retref: 'cp_ref_12345'
        }
      });

      const result = await adapter.getTransaction('cp_ref_12345');
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('cp_ref_12345');
      expect(result.responseCode).toBe('00');
      expect(result.responseMessage).toBe('Settled');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      const calledUrl = mockedAxios.get.mock.calls[0][0];
      expect(calledUrl).toBe('https://fts-uat.cardconnect.com/cardconnect/rest/status/1234567890/cp_ref_12345');
    });
  });

  describe('verifyWebhook signature verification', () => {
    const webhookSecret = 'test_webhook_secret';
    const rawBody = JSON.stringify({ event: 'payment.success', id: '123' });

    it('should return true for valid x-cardconnect-signature', async () => {
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const result = await adapter.verifyWebhook({
        headers: { 'x-cardconnect-signature': signature },
        rawBody,
        webhookSecret
      });
      expect(result).toBe(true);
    });

    it('should return false for invalid x-cardconnect-signature', async () => {
      const result = await adapter.verifyWebhook({
        headers: { 'x-cardconnect-signature': 'invalid_sig' },
        rawBody,
        webhookSecret
      });
      expect(result).toBe(false);
    });
  });

  describe('Error Mapping / Exceptions', () => {
    it('should map errors correctly on creditCardSale failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Timeout'));
      await expect(adapter.creditCardSale(saleRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on creditCardAuthorize failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Down'));
      await expect(adapter.creditCardAuthorize(saleRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on creditCardCapture failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Connection Failed'));
      await expect(adapter.creditCardCapture({ amount: 10, transactionReference: '123' })).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on creditCardRefund failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Timeout'));
      await expect(adapter.creditCardRefund({ amount: 10, transactionReference: '123' })).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on creditCardVoid failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Internal Server Error'));
      await expect(adapter.creditCardVoid({ transactionReference: '123' })).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on echeckSale failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid Account'));
      await expect(adapter.echeckSale(echeckRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on echeckRefund failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Refund Error'));
      await expect(adapter.echeckRefund({ amount: 10, transactionReference: '123' })).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on echeckVoid failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Void Error'));
      await expect(adapter.echeckVoid({ transactionReference: '123' })).rejects.toThrow('GatewayExecutionError');
    });

    it('should map errors correctly on getTransaction failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(adapter.getTransaction('123')).rejects.toThrow('GatewayExecutionError');
    });

    it('should extract structured error message from axios response if present', async () => {
      const axiosError = {
        response: {
          data: {
            error: {
              message: 'Card Expired'
            }
          }
        }
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);
      await expect(adapter.creditCardSale(saleRequest)).rejects.toThrow('Card Expired');
    });

    it('should return false if signature header is missing', async () => {
      const result = await adapter.verifyWebhook({
        headers: {},
        rawBody: 'body',
        webhookSecret: 'secret'
      });
      expect(result).toBe(false);
    });

    it('should return false if verifyWebhook throws/errors internally', async () => {
      const result = await adapter.verifyWebhook({
        headers: { 'x-cardconnect-signature': 'sig' },
        rawBody: null as any,
        webhookSecret: null as any
      });
      expect(result).toBe(false);
    });
  });
});
