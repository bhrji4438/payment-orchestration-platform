import { uow } from '@core/infrastructure/database/uow';
import { prisma } from '@core/infrastructure/database/prisma';
import { gatewayFactory } from '@core/modules/gateways/factory/gateway.factory';
import { CircuitBreaker } from '@core/modules/gateways/circuit-breaker';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';
import { credentialEncryptionService } from '@shared/crypto/credential-encryption';

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
    currency?: string;
    gatewayConfigurationId?: string;
    gatewayId?: string;
    customerId?: string;
    card?: any;
    token?: string;
    capture?: boolean;
    paymentMethodType?: 'credit_card' | 'echeck';
    billingAddress?: any;
    shippingAddress?: any;
    customerSnapshot?: any;
    paymentDetails?: any;
  }) {
    const gatewayConfigId = params.gatewayId || params.gatewayConfigurationId;

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
    if (gatewayConfigId) {
      const selected = activeConfigs.find(c => c.id === gatewayConfigId);
      if (!selected) {
        throw new Error('Requested gateway configuration is inactive or not found.');
      }
      routeList = [selected, ...activeConfigs.filter(c => c.id !== gatewayConfigId)];
    }

    // Resolve currency
    const resolvedCurrency = await this.determineCurrency(params.merchantId, gatewayConfigId, params.currency);

    // Resolve customer snapshot
    let snapshot = params.customerSnapshot || null;
    if (!snapshot && params.customerId) {
      snapshot = await this.buildCustomerSnapshot(params.merchantId, params.customerId);
    }

    // Redact payment details
    const savedPaymentDetails = this.redactSensitivePaymentDetails(params.paymentMethodType, params.paymentDetails);

    const paymentId = generateUuidV7();

    let cardBrand = 'UNKNOWN';
    let cardLastFour = 'MOCK';
    let cardExpiry = 'MOCK';

    if (params.paymentMethodType === 'credit_card' && params.paymentDetails) {
      cardBrand = params.paymentDetails.cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD';
      cardLastFour = params.paymentDetails.cardNumber.slice(-4);
      cardExpiry = `${params.paymentDetails.expMonth}/${params.paymentDetails.expYear}`;
    } else if (params.card) {
      cardBrand = params.card.pan.startsWith('4') ? 'VISA' : 'MASTERCARD';
      cardLastFour = params.card.pan.slice(-4);
      cardExpiry = `${params.card.expiryMonth}/${params.card.expiryYear}`;
    } else if (params.paymentMethodType === 'echeck' && params.paymentDetails) {
      cardBrand = 'ECHECK';
      cardLastFour = params.paymentDetails.accountNumber.slice(-4);
      cardExpiry = 'ACH';
    }

    await prisma.payment.create({
      data: {
        id: paymentId,
        merchantId: params.merchantId,
        customerId: params.customerId,
        amount: params.amount,
        currency: resolvedCurrency,
        status: 'PENDING',
        cardBrand,
        cardLastFour,
        cardExpiry,
        paymentMethodType: params.paymentMethodType || 'credit_card',
        customerSnapshot: snapshot ?? undefined,
        paymentDetails: savedPaymentDetails ?? undefined,
        billingAddress: params.billingAddress || params.card?.billingAddress || undefined,
        shippingAddress: params.shippingAddress || undefined,
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

          let gatewayResult;

          if (params.paymentMethodType === 'echeck') {
            const echeckDetails = {
              accountNumber: params.paymentDetails.accountNumber,
              routingNumber: params.paymentDetails.routingNumber,
              accountType: params.paymentDetails.accountType,
              accountName: params.paymentDetails.accountHolderName,
              billingAddress: params.billingAddress || snapshot?.billingAddress || undefined
            };

            gatewayResult = await gateway.echeckSale({
              amount: params.amount,
              currency: resolvedCurrency,
              echeck: echeckDetails
            });
          } else {
            const cardDetails = params.paymentMethodType === 'credit_card' ? {
              pan: params.paymentDetails.cardNumber,
              expiryMonth: params.paymentDetails.expMonth,
              expiryYear: params.paymentDetails.expYear.length === 2 ? `20${params.paymentDetails.expYear}` : params.paymentDetails.expYear,
              cvv: params.paymentDetails.cvv,
              holderName: params.paymentDetails.cardholderName,
              billingAddress: params.billingAddress || snapshot?.billingAddress || undefined
            } : params.card ? {
              pan: params.card.pan,
              expiryMonth: params.card.expiryMonth,
              expiryYear: params.card.expiryYear,
              cvv: params.card.cvv,
              holderName: params.card.holderName,
              billingAddress: params.card.billingAddress
            } : undefined;

            if (!cardDetails) {
              throw new Error('No card details provided.');
            }

            const captureMode = params.capture !== false;
            if (captureMode) {
              gatewayResult = await gateway.creditCardSale({
                amount: params.amount,
                currency: resolvedCurrency,
                card: cardDetails
              });
            } else {
              gatewayResult = await gateway.creditCardAuthorize({
                amount: params.amount,
                currency: resolvedCurrency,
                card: cardDetails
              });
            }
          }

          await prisma.paymentAttempt.create({
            data: {
              id: generateUuidV7(),
              paymentId,
              gatewayConfigId: config.id,
              action: params.paymentMethodType === 'echeck' ? 'SALE' : (params.capture !== false ? 'SALE' : 'AUTHORIZE'),
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
        const finalStatus = (params.paymentMethodType === 'echeck' || params.capture !== false) ? 'CAPTURED' : 'AUTHORIZED';
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
          status: (params.paymentMethodType === 'echeck' || params.capture !== false) ? 'SETTLED' : 'PENDING'
        });

        const topic = (params.paymentMethodType === 'echeck' || params.capture !== false) ? 'payment.captured' : 'payment.authorized';
        await repos.outbox.create(topic, paymentId, {
          paymentId,
          merchantId: params.merchantId,
          amount: params.amount,
          currency: resolvedCurrency,
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

        return updatedPayment;
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

  private async determineCurrency(merchantId: string, gatewayConfigId?: string, clientCurrency?: string): Promise<string> {
    if (gatewayConfigId) {
      const config = await prisma.merchantGatewayConfiguration.findUnique({
        where: { id: gatewayConfigId }
      });
      if (config) {
        try {
          const decrypted = JSON.parse(credentialEncryptionService.decrypt(config.encryptedCredentials));
          if (decrypted && typeof decrypted.currency === 'string' && decrypted.currency.length === 3) {
            return decrypted.currency.toUpperCase();
          }
        } catch (err) {
          // ignore
        }
      }
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });
    if (merchant && (merchant as any).currency) {
      return (merchant as any).currency;
    }

    if (clientCurrency) {
      return clientCurrency;
    }

    return 'USD';
  }

  private async buildCustomerSnapshot(merchantId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, merchantId, deletedAt: null }
    });
    if (!customer) return null;
    return {
      email: customer.email,
      phone: customer.phone,
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress
    };
  }

  private redactSensitivePaymentDetails(paymentMethodType?: string, paymentDetails?: any) {
    if (!paymentMethodType || !paymentDetails) return null;
    if (paymentMethodType === 'credit_card') {
      return {
        cardholderName: paymentDetails.cardholderName,
        cardLastFour: paymentDetails.cardNumber.slice(-4),
        cardBrand: paymentDetails.cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD',
        expMonth: paymentDetails.expMonth,
        expYear: paymentDetails.expYear
      };
    }
    if (paymentMethodType === 'echeck') {
      return {
        accountHolderName: paymentDetails.accountHolderName,
        holderType: paymentDetails.holderType,
        accountType: paymentDetails.accountType,
        accountLastFour: paymentDetails.accountNumber.slice(-4),
        routingNumber: paymentDetails.routingNumber.slice(0, 3) + '******'
      };
    }
    return null;
  }
}
export const paymentService = new PaymentService();
export default paymentService;
