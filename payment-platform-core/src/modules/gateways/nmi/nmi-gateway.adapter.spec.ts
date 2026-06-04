import { NmiGatewayAdapter } from './nmi-gateway.adapter';
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

describe('NmiGatewayAdapter', () => {
  let adapter: NmiGatewayAdapter;
  let mockAdapter: NmiGatewayAdapter;
  let apiKeyAdapter: NmiGatewayAdapter;

  const credentials = {
    username: 'demo_user',
    password: 'demo_password'
  };

  const keyCredentials = {
    securityKey: 'demo_security_key'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new NmiGatewayAdapter(credentials, 'sandbox', 'test-merchant');
    mockAdapter = new NmiGatewayAdapter({}, 'sandbox', 'test-merchant');
    apiKeyAdapter = new NmiGatewayAdapter(keyCredentials, 'sandbox', 'test-merchant');
  });

  describe('Mock Mode Detection & Auth Parameter Mapping', () => {
    const saleRequest: CreditCardSaleRequestDto = {
      amount: 10.00,
      currency: 'USD',
      card: {
        pan: '5454545454545454',
        expiryMonth: '12',
        expiryYear: '2028',
        cvv: '123',
        holderName: 'John Doe'
      }
    };

    it('should run creditCardSale in mock mode when credentials are not configured', async () => {
      const result = await mockAdapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should run creditCardAuthorize in mock mode', async () => {
      const result = await mockAdapter.creditCardAuthorize(saleRequest);
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run creditCardCapture in mock mode', async () => {
      const result = await mockAdapter.creditCardCapture({
        amount: 10.00,
        transactionReference: 'txn123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run creditCardRefund in mock mode', async () => {
      const result = await mockAdapter.creditCardRefund({
        amount: 5.00,
        transactionReference: 'txn123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run creditCardVoid in mock mode', async () => {
      const result = await mockAdapter.creditCardVoid({
        transactionReference: 'txn123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run echeckRefund in mock mode', async () => {
      const result = await mockAdapter.echeckRefund({
        amount: 50.00,
        transactionReference: 'ach123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run echeckVoid in mock mode', async () => {
      const result = await mockAdapter.echeckVoid({
        transactionReference: 'ach123'
      });
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should run getTransaction in mock mode', async () => {
      const result = await mockAdapter.getTransaction('txn123');
      expect(result.success).toBe(true);
      expect(result.responseMessage).toContain('Mock');
    });

    it('should use security key in buildAuthParams if only securityKey is configured', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=SUCCESS&transactionid=12345&response_code=100'
      });

      await apiKeyAdapter.creditCardSale(saleRequest);
      const calledBody = mockedAxios.post.mock.calls[0][1] as string;
      expect(calledBody).toContain('security_key=demo_security_key');
      expect(calledBody).not.toContain('username=');
    });
  });

  describe('Credit Card transactions', () => {
    const saleRequest: CreditCardSaleRequestDto = {
      amount: 10.00,
      currency: 'USD',
      card: {
        pan: '5454545454545454',
        expiryMonth: '12',
        expiryYear: '28',
        cvv: '123',
        holderName: 'John Doe',
        billingAddress: {
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA'
        }
      }
    };

    it('should successfully execute creditCardSale', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=SUCCESS&transactionid=12345&response_code=100'
      });

      const result = await adapter.creditCardSale(saleRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('12345');
      expect(result.responseCode).toBe('100');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Verify params passed
      const calledUrl = mockedAxios.post.mock.calls[0][0];
      const calledBody = mockedAxios.post.mock.calls[0][1] as string;
      expect(calledUrl).toBe('https://secure.networkmerchants.com/api/transact.php');
      expect(calledBody).toContain('username=demo_user');
      expect(calledBody).toContain('password=demo_password');
      expect(calledBody).toContain('type=sale');
      expect(calledBody).toContain('firstname=John');
      expect(calledBody).toContain('lastname=Doe');
      expect(calledBody).toContain('address1=123+Main+St');
      expect(calledBody).toContain('zip=10001');
    });

    it('should handle declined creditCardSale', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=2&responsetext=DECLINED&transactionid=12345&response_code=200'
      });

      const result = await adapter.creditCardSale(saleRequest);
      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('200');
      expect(result.responseMessage).toBe('DECLINED');
    });

    it('should map errors correctly on creditCardSale failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Timeout'));
      await expect(adapter.creditCardSale(saleRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should successfully execute creditCardAuthorize', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=SUCCESS&transactionid=12346&response_code=100'
      });

      const authRequest: CreditCardAuthorizeRequestDto = saleRequest;
      const result = await adapter.creditCardAuthorize(authRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('12346');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('type=auth');
    });

    it('should map errors correctly on creditCardAuthorize failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Down'));
      await expect(adapter.creditCardAuthorize(saleRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should successfully execute creditCardCapture', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=SUCCESS&transactionid=12347&response_code=100'
      });

      const captureRequest: CreditCardCaptureRequestDto = {
        amount: 10.00,
        transactionReference: '12346'
      };
      const result = await adapter.creditCardCapture(captureRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('12347');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('type=capture');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('transactionid=12346');
    });

    it('should map errors correctly on creditCardCapture failure', async () => {
      const captureRequest: CreditCardCaptureRequestDto = {
        amount: 10.00,
        transactionReference: '12346'
      };
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.creditCardCapture(captureRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should successfully execute creditCardRefund', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=SUCCESS&transactionid=12348&response_code=100'
      });

      const refundRequest: CreditCardRefundRequestDto = {
        amount: 5.00,
        transactionReference: '12347'
      };
      const result = await adapter.creditCardRefund(refundRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('12348');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('type=refund');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('amount=5.00');
    });

    it('should map errors correctly on creditCardRefund failure', async () => {
      const refundRequest: CreditCardRefundRequestDto = {
        amount: 5.00,
        transactionReference: '12347'
      };
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.creditCardRefund(refundRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should successfully execute creditCardVoid', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=SUCCESS&transactionid=12349&response_code=100'
      });

      const voidRequest: CreditCardVoidRequestDto = {
        transactionReference: '12347'
      };
      const result = await adapter.creditCardVoid(voidRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('12349');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('type=void');
    });

    it('should map errors correctly on creditCardVoid failure', async () => {
      const voidRequest: CreditCardVoidRequestDto = {
        transactionReference: '12347'
      };
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.creditCardVoid(voidRequest)).rejects.toThrow('GatewayExecutionError');
    });
  });

  describe('Echeck/ACH Transactions', () => {
    const echeckRequest: EcheckSaleRequestDto = {
      amount: 150.00,
      currency: 'USD',
      echeck: {
        accountName: 'Jane Smith',
        accountNumber: '123456789',
        routingNumber: '987654321',
        accountType: 'checking',
        billingAddress: {
          addressLine1: '456 Elm St',
          city: 'Boston',
          state: 'MA',
          postalCode: '02108',
          country: 'USA'
        }
      }
    };

    it('should successfully execute echeckSale', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=Approved&transactionid=ach12345&response_code=100'
      });

      const result = await adapter.echeckSale(echeckRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('ach12345');
      expect(result.responseCode).toBe('100');

      const calledBody = mockedAxios.post.mock.calls[0][1] as string;
      expect(calledBody).toContain('payment=check');
      expect(calledBody).toContain('checkname=Jane+Smith');
      expect(calledBody).toContain('checkaccount=123456789');
      expect(calledBody).toContain('checkaba=987654321');
      expect(calledBody).toContain('account_type=checking');
      expect(calledBody).toContain('sec_code=WEB');
      expect(calledBody).toContain('firstname=Jane');
      expect(calledBody).toContain('lastname=Smith');
      expect(calledBody).toContain('address1=456+Elm+St');
      expect(calledBody).toContain('zip=02108');
    });

    it('should map errors correctly on echeckSale failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.echeckSale(echeckRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should successfully execute echeckRefund', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=Approved&transactionid=ach12346&response_code=100'
      });

      const refundRequest: EcheckRefundRequestDto = {
        amount: 150.00,
        transactionReference: 'ach12345'
      };

      const result = await adapter.echeckRefund(refundRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('ach12346');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('type=refund');
    });

    it('should map errors correctly on echeckRefund failure', async () => {
      const refundRequest: EcheckRefundRequestDto = {
        amount: 150.00,
        transactionReference: 'ach12345'
      };
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.echeckRefund(refundRequest)).rejects.toThrow('GatewayExecutionError');
    });

    it('should successfully execute echeckVoid', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: 'response=1&responsetext=Approved&transactionid=ach12347&response_code=100'
      });

      const voidRequest: EcheckVoidRequestDto = {
        transactionReference: 'ach12345'
      };

      const result = await adapter.echeckVoid(voidRequest);
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('ach12347');
      expect(mockedAxios.post.mock.calls[0][1]).toContain('type=void');
    });

    it('should map errors correctly on echeckVoid failure', async () => {
      const voidRequest: EcheckVoidRequestDto = {
        transactionReference: 'ach12345'
      };
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.echeckVoid(voidRequest)).rejects.toThrow('GatewayExecutionError');
    });
  });

  describe('getTransaction Query API', () => {
    it('should query and parse XML response successfully', async () => {
      const xmlResponse = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nmipxml>
          <transaction>
            <transaction_id>400123456</transaction_id>
            <response_code>100</response_code>
            <responsetext>SUCCESSFUL TRANSACTION</responsetext>
          </transaction>
        </nmipxml>
      `;
      mockedAxios.post.mockResolvedValueOnce({ data: xmlResponse });

      const result = await adapter.getTransaction('400123456');
      expect(result.success).toBe(true);
      expect(result.transactionReference).toBe('400123456');
      expect(result.responseCode).toBe('100');
      expect(result.responseMessage).toBe('SUCCESSFUL TRANSACTION');
    });

    it('should report failure if response_code is not 100 in XML', async () => {
      const xmlResponse = `
        <?xml version="1.0" encoding="UTF-8"?>
        <nmipxml>
          <transaction>
            <transaction_id>400123456</transaction_id>
            <response_code>200</response_code>
            <responsetext>DECLINED TRANSACTION</responsetext>
          </transaction>
        </nmipxml>
      `;
      mockedAxios.post.mockResolvedValueOnce({ data: xmlResponse });

      const result = await adapter.getTransaction('400123456');
      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('200');
    });

    it('should map errors correctly on getTransaction failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      await expect(adapter.getTransaction('400123456')).rejects.toThrow('GatewayExecutionError');
    });
  });

  describe('verifyWebhook signature verification', () => {
    const webhookSecret = 'nmi_webhook_secret_key';
    const rawBody = JSON.stringify({ event: 'transaction.success', id: '123' });

    it('should return true for a valid signature header', async () => {
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const result = await adapter.verifyWebhook({
        headers: { 'x-nmi-signature': signature },
        rawBody,
        webhookSecret
      });
      expect(result).toBe(true);
    });

    it('should return false for an invalid signature header', async () => {
      const result = await adapter.verifyWebhook({
        headers: { 'x-nmi-signature': 'invalid_signature' },
        rawBody,
        webhookSecret
      });
      expect(result).toBe(false);
    });

    it('should return false if signature header is missing', async () => {
      const result = await adapter.verifyWebhook({
        headers: {},
        rawBody,
        webhookSecret
      });
      expect(result).toBe(false);
    });

    it('should return false if verifyWebhook throws/errors internally', async () => {
      // Pass null/undefined inputs to trigger exceptions in crypto import or update
      const result = await adapter.verifyWebhook({
        headers: { 'x-nmi-signature': 'sig' },
        rawBody: null as any,
        webhookSecret: null as any
      });
      expect(result).toBe(false);
    });
  });
});
