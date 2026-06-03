import { uow } from '@core/infrastructure/database/uow';
import { prisma } from '@core/infrastructure/database/prisma';
import { gatewayFactory } from '@core/modules/gateways/factory/gateway.factory';
import { CircuitBreaker } from '@core/modules/gateways/circuit-breaker';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';

function redactCardData(rawResponse: string | undefined): string | undefined {
  if (!rawResponse) return rawResponse;
  let redacted = rawResponse;
  // Redact PANs (13-19 digits)
  redacted = redacted.replace(/(?:"number"\s*:\s*"?|\b)(\d{13,19})(?:"?|\b)/g, (match, p1) => {
    return match.replace(p1, `${p1.substring(0, 6)}******${p1.substring(p1.length - 4)}`);
  });
  // Redact CVCs (3-4 digits) near cvc/cvv keys
  redacted = redacted.replace(/("(?:cvc|cvv|security_code)"\s*:\s*")(\d{3,4})(")/gi, '$1***$3');
  return redacted;
}

export class PaymentService {
  public async createPayment(params: {
    merchantId: string;
    amount: number;
    currency: string;
    gatewayConfigurationId?: string;
    customerId?: string;
    card?: any;
    token?: string;
    capture: boolean;
  }) {
    const activeConfigs = await prisma.merchantGatewayConfiguration.findMany({
      where: {
        merchantId: params.merchantId,
        isActive: true,
        deletedAt: null
      },
      include: { gatewayProvider: true },
      orderBy: { priority: 'asc' }
    });

    if (activeConfigs.length === 0) {
      throw new Error('Merchant has no active gateway configurations.');
    }

    let routeList = [...activeConfigs];
    if (params.gatewayConfigurationId) {
      const selected = activeConfigs.find(c => c.id === params.gatewayConfigurationId);
      if (!selected) {
        throw new Error('Requested gateway configuration is inactive or not found.');
      }
      routeList = [selected, ...activeConfigs.filter(c => c.id !== params.gatewayConfigurationId)];
    }

    const paymentId = generateUuidV7();
    await prisma.payment.create({
      data: {
        id: paymentId,
        merchantId: params.merchantId,
        customerId: params.customerId,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        cardBrand: params.card ? (params.card.pan.startsWith('4') ? 'VISA' : 'MASTERCARD') : 'UNKNOWN',
        cardLastFour: params.card ? params.card.pan.slice(-4) : 'MOCK',
        cardExpiry: params.card ? `${params.card.expiryMonth}/${params.card.expiryYear}` : 'MOCK',
        version: 1
      }
    });

    let successResponse: any = null;
    let finalGatewayConfigId: string | null = null;
    let lastError: any = null;

    for (const config of routeList) {
      const breaker = CircuitBreaker.getBreaker(config.id);

      try {
        let isBusinessDecline = false;

        await breaker.execute(async () => {
          logger.info({ paymentId, configId: config.id, provider: config.gatewayProvider.code }, 'Routing payment execution via Abstract Gateway');

          const gateway = await gatewayFactory.create(params.merchantId, config.id);

          const cardDetails = params.card ? {
            pan: params.card.pan,
            expiryMonth: params.card.expiryMonth,
            expiryYear: params.card.expiryYear,
            cvv: params.card.cvv,
            holderName: params.card.holderName,
            billingAddress: params.card.billingAddress
          } : undefined;

          let gatewayResult;

          if (params.capture) {
            gatewayResult = await gateway.creditCardSale({
              amount: params.amount,
              currency: params.currency,
              card: cardDetails!
            });
          } else {
            gatewayResult = await gateway.creditCardAuthorize({
              amount: params.amount,
              currency: params.currency,
              card: cardDetails!
            });
          }

          await prisma.paymentAttempt.create({
            data: {
              id: generateUuidV7(),
              paymentId,
              gatewayConfigId: config.id,
              action: params.capture ? 'SALE' : 'AUTHORIZE',
              amount: params.amount,
              status: gatewayResult.success ? 'SUCCESS' : 'FAILED',
              gatewayTxnId: gatewayResult.transactionReference || null,
              responseCode: gatewayResult.responseCode || null,
              responseMessage: gatewayResult.responseMessage || null,
              rawResponse: redactCardData(gatewayResult.rawResponse)
            }
          });

          if (!gatewayResult.success) {
            isBusinessDecline = true;
            const declineMessage = gatewayResult.responseMessage || 'Transaction declined';
            lastError = new Error(declineMessage);
            (lastError as any).isBusiness = true;
            return;
          }

          successResponse = gatewayResult;
          finalGatewayConfigId = config.id;
        });

        if (isBusinessDecline) {
          break;
        }

        if (successResponse) {
          break;
        }
      } catch (err: any) {
        logger.warn({ configId: config.id, error: err.message }, 'Abstract gateway route execution failed, retrying failover...');
        lastError = err;
      }
    }

    return await uow.run(async (repos, tx) => {
      const payment = await repos.payments.findById(paymentId);
      if (!payment) throw new Error('Payment record not found.');

      if (successResponse && finalGatewayConfigId) {
        const finalStatus = params.capture ? 'CAPTURED' : 'AUTHORIZED';
        const updatedPayment = await repos.payments.update(
          paymentId,
          {
            status: finalStatus,
            gatewayConfigId: finalGatewayConfigId,
            gatewayToken: successResponse.transactionReference
          },
          payment.version
        );

        await repos.transactions.create({
          id: generateUuidV7(),
          paymentId,
          amount: params.amount,
          type: 'CREDIT',
          status: params.capture ? 'SETTLED' : 'PENDING'
        });

        const topic = params.capture ? 'payment.captured' : 'payment.authorized';
        await repos.outbox.create(topic, paymentId, {
          paymentId,
          merchantId: params.merchantId,
          amount: params.amount,
          currency: params.currency,
          gatewayTxnId: successResponse.transactionReference,
          customerId: params.customerId
        });

        return updatedPayment;
      } else {
        const updatedPayment = await repos.payments.update(
          paymentId,
          { status: 'FAILED' },
          payment.version
        );

        await repos.outbox.create('payment.failed', paymentId, {
          paymentId,
          merchantId: params.merchantId,
          amount: params.amount,
          error: lastError?.message || 'Gateway routing exhausted.'
        });

        throw new Error(lastError?.message || 'Transaction failed across all gateway channels.');
      }
    });
  }

  public async capturePayment(paymentId: string, amount: number) {
    return await uow.run(async (repos, tx) => {
      const payment = await repos.payments.findById(paymentId);
      if (!payment || payment.status !== 'AUTHORIZED') {
        throw new Error('Payment is not in AUTHORIZED state.');
      }
      if (!payment.gatewayConfigId || !payment.gatewayToken) {
        throw new Error('Missing gateway reference details for capture.');
      }

      const config = await tx.merchantGatewayConfiguration.findUnique({
        where: { id: payment.gatewayConfigId }
      });
      if (!config) throw new Error('Gateway configuration was deleted or disabled.');

      const gateway = await gatewayFactory.create(payment.merchantId, config.id);
      const breaker = CircuitBreaker.getBreaker(config.id);

      let gatewayResult;
      try {
        gatewayResult = await breaker.execute(async () => {
          return await gateway.creditCardCapture({
            amount,
            transactionReference: payment.gatewayToken!
          });
        });
      } catch (err: any) {
        gatewayResult = { success: false, responseMessage: err.message, rawResponse: JSON.stringify({ error: err.message }) };
      }

      await tx.paymentAttempt.create({
        data: {
          id: generateUuidV7(),
          paymentId,
          gatewayConfigId: config.id,
          action: 'CAPTURE',
          amount,
          status: gatewayResult.success ? 'SUCCESS' : 'FAILED',
          gatewayTxnId: gatewayResult.transactionReference || null,
          responseCode: gatewayResult.responseCode || null,
          responseMessage: gatewayResult.responseMessage || null,
          rawResponse: redactCardData(gatewayResult.rawResponse)
        }
      });

      if (!gatewayResult.success) {
        throw new Error(`Capture failed: ${gatewayResult.responseMessage}`);
      }

      const updatedPayment = await repos.payments.update(
        paymentId,
        { status: 'CAPTURED' },
        payment.version
      );

      await repos.transactions.create({
        id: generateUuidV7(),
        paymentId,
        amount,
        type: 'CREDIT',
        status: 'SETTLED'
      });

      await repos.outbox.create('payment.captured', paymentId, {
        paymentId,
        merchantId: payment.merchantId,
        amount,
        currency: payment.currency,
        gatewayTxnId: gatewayResult.transactionReference
      });

      return updatedPayment;
    });
  }

  public async refundPayment(paymentId: string, amount: number, reason?: string) {
    return await uow.run(async (repos, tx) => {
      const payment = await repos.payments.findById(paymentId);
      if (!payment || payment.status !== 'CAPTURED') {
        throw new Error('Payment is not in CAPTURED state.');
      }
      if (!payment.gatewayConfigId || !payment.gatewayToken) {
        throw new Error('Missing gateway reference details for refund.');
      }

      const config = await tx.merchantGatewayConfiguration.findUnique({
        where: { id: payment.gatewayConfigId }
      });
      if (!config) throw new Error('Gateway configuration was deleted or disabled.');

      const gateway = await gatewayFactory.create(payment.merchantId, config.id);
      const breaker = CircuitBreaker.getBreaker(config.id);

      let gatewayResult;
      try {
        gatewayResult = await breaker.execute(async () => {
          return await gateway.creditCardRefund({
            amount,
            transactionReference: payment.gatewayToken!
          });
        });
      } catch (err: any) {
        gatewayResult = { success: false, responseMessage: err.message, rawResponse: JSON.stringify({ error: err.message }) };
      }

      const refundId = generateUuidV7();
      await tx.refund.create({
        data: {
          id: refundId,
          paymentId,
          amount,
          reason,
          status: gatewayResult.success ? 'SUCCESS' : 'FAILED',
          gatewayTxnId: gatewayResult.transactionReference
        }
      });

      if (!gatewayResult.success) {
        throw new Error(`Refund failed: ${gatewayResult.responseMessage}`);
      }

      const updatedPayment = await repos.payments.update(
        paymentId,
        { status: 'REFUNDED' },
        payment.version
      );

      await repos.transactions.create({
        id: generateUuidV7(),
        paymentId,
        amount,
        type: 'DEBIT',
        status: 'SETTLED'
      });

      await repos.outbox.create('refund.completed', refundId, {
        refundId,
        paymentId,
        merchantId: payment.merchantId,
        amount,
        gatewayTxnId: gatewayResult.transactionReference
      });

      return updatedPayment;
    });
  }

  public async voidPayment(paymentId: string, reason?: string) {
    return await uow.run(async (repos, tx) => {
      const payment = await repos.payments.findById(paymentId);
      if (!payment || payment.status !== 'AUTHORIZED') {
        throw new Error('Payment is not in AUTHORIZED state.');
      }
      if (!payment.gatewayConfigId || !payment.gatewayToken) {
        throw new Error('Missing gateway reference details for void.');
      }

      const config = await tx.merchantGatewayConfiguration.findUnique({
        where: { id: payment.gatewayConfigId }
      });
      if (!config) throw new Error('Gateway configuration was deleted or disabled.');

      const gateway = await gatewayFactory.create(payment.merchantId, config.id);
      const breaker = CircuitBreaker.getBreaker(config.id);

      let gatewayResult;
      try {
        gatewayResult = await breaker.execute(async () => {
          return await gateway.creditCardVoid({
            transactionReference: payment.gatewayToken!
          });
        });
      } catch (err: any) {
        gatewayResult = { success: false, responseMessage: err.message, rawResponse: JSON.stringify({ error: err.message }) };
      }

      const voidId = generateUuidV7();
      await tx.void.create({
        data: {
          id: voidId,
          paymentId,
          reason,
          status: gatewayResult.success ? 'SUCCESS' : 'FAILED',
          gatewayTxnId: gatewayResult.transactionReference
        }
      });

      if (!gatewayResult.success) {
        throw new Error(`Void failed: ${gatewayResult.responseMessage}`);
      }

      const updatedPayment = await repos.payments.update(
        paymentId,
        { status: 'VOIDED' },
        payment.version
      );

      await repos.outbox.create('payment.failed', paymentId, {
        paymentId,
        merchantId: payment.merchantId,
        status: 'VOIDED',
        reason
      });

      return updatedPayment;
    });
  }

  public async syncPaymentStatus(paymentId: string) {
    return await uow.run(async (repos, tx) => {
      const payment = await repos.payments.findById(paymentId);
      if (!payment) throw new Error('Payment record not found.');
      if (!payment.gatewayConfigId || !payment.gatewayToken) {
        throw new Error('Missing gateway reference details for status synchronization.');
      }

      const config = await tx.merchantGatewayConfiguration.findUnique({
        where: { id: payment.gatewayConfigId }
      });
      if (!config) throw new Error('Gateway configuration was deleted or disabled.');

      const gateway = await gatewayFactory.create(payment.merchantId, config.id);
      const gatewayResult = await gateway.getTransaction(payment.gatewayToken);

      if (gatewayResult.success) {
        const isCurrentlyPending = payment.status === 'PENDING' || payment.status === 'AUTHORIZED';
        if (isCurrentlyPending) {
          const finalStatus = 'CAPTURED';
          
          const updatedPayment = await repos.payments.update(
            paymentId,
            { status: finalStatus },
            payment.version
          );

          const existingLedger = await tx.transaction.findFirst({
            where: { paymentId, type: 'CREDIT', deletedAt: null }
          });
          if (!existingLedger) {
            await repos.transactions.create({
              id: generateUuidV7(),
              paymentId,
              amount: payment.amount,
              type: 'CREDIT',
              status: 'SETTLED'
            });
          }

          await repos.outbox.create('payment.captured', paymentId, {
            paymentId,
            merchantId: payment.merchantId,
            amount: Number(payment.amount),
            currency: payment.currency,
            gatewayTxnId: payment.gatewayToken
          });

          return updatedPayment;
        }
      } else {
        const isNotFailed = payment.status !== 'FAILED' && payment.status !== 'VOIDED';
        if (isNotFailed) {
          const updatedPayment = await repos.payments.update(
            paymentId,
            { status: 'FAILED' },
            payment.version
          );

          await repos.outbox.create('payment.failed', paymentId, {
            paymentId,
            merchantId: payment.merchantId,
            amount: Number(payment.amount),
            error: gatewayResult.responseMessage || 'Gateway transaction status reported failure.'
          });

          return updatedPayment;
        }
      }

      return payment;
    });
  }
}
export const paymentService = new PaymentService();
export default paymentService;
