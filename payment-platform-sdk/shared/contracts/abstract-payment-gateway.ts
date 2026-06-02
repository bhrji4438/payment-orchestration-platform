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
} from '../dto/gateway.dto.ts';
import pino from 'pino';

const logger = pino({
  transport: { target: 'pino-pretty' }
});

export abstract class AbstractPaymentGateway {
  protected readonly correlationId: string;

  constructor(
    protected readonly credentials: Record<string, string>,
    protected readonly environment: string,
    protected readonly merchantId: string
  ) {
    this.correlationId = 'corr_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  }

  // --- Abstract Gateway Contract Methods ---
  public abstract creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto>;
  public abstract creditCardAuthorize(request: CreditCardAuthorizeRequestDto): Promise<PaymentResponseDto>;
  public abstract creditCardCapture(request: CreditCardCaptureRequestDto): Promise<PaymentResponseDto>;
  public abstract creditCardRefund(request: CreditCardRefundRequestDto): Promise<PaymentResponseDto>;
  public abstract creditCardVoid(request: CreditCardVoidRequestDto): Promise<PaymentResponseDto>;
  
  public abstract echeckSale(request: EcheckSaleRequestDto): Promise<PaymentResponseDto>;
  public abstract echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto>;
  public abstract echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto>;

  // --- Base Gateway Responsibilities (Shared Functionality) ---
  
  protected validateRequest(request: any): void {
    if (!request) {
      throw new Error(`[Correlation ID: ${this.correlationId}] Request payload cannot be empty.`);
    }
  }

  protected buildHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Correlation-ID': this.correlationId,
      ...customHeaders
    };
  }

  protected auditGatewayRequest(action: string, payload: any): void {
    const sanitized = { ...payload };
    if (sanitized.card) {
      sanitized.card = {
        ...sanitized.card,
        pan: 'XXXX-XXXX-XXXX-' + sanitized.card.pan.slice(-4),
        cvv: 'XXX'
      };
    }
    if (sanitized.echeck) {
      sanitized.echeck = {
        ...sanitized.echeck,
        accountNumber: 'XXXX-XXXX-' + sanitized.echeck.accountNumber.slice(-4)
      };
    }
    
    logger.info({
      correlationId: this.correlationId,
      action,
      merchantId: this.merchantId,
      environment: this.environment,
      payload: sanitized
    }, `[Gateway Audit Request] ${action}`);
  }

  protected auditGatewayResponse(action: string, response: any): void {
    logger.info({
      correlationId: this.correlationId,
      action,
      merchantId: this.merchantId,
      environment: this.environment,
      response
    }, `[Gateway Audit Response] ${action}`);
  }

  protected mapGatewayError(action: string, error: any): Error {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown network error';
    logger.error({
      correlationId: this.correlationId,
      action,
      error: errorMsg
    }, `[Gateway Execution Failure] ${action}`);
    return new Error(`GatewayExecutionError [Correlation: ${this.correlationId}]: ${errorMsg}`);
  }
}
