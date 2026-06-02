import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../shared/logger/create-logger';
import { generateUuidV7 } from '../../../../shared/ids/generate-uuid-v7';

const prisma = new PrismaClient();
const logger = createLogger('settlement-service');

export async function runReconciliation() {
  logger.info('Starting gateway payout reconciliation run...');

  try {
    // 1. Fetch active configurations to reconcile
    const gatewayConfigs = await prisma.merchantGatewayConfiguration.findMany({
      where: { isActive: true, deletedAt: null }
    });

    for (const config of gatewayConfigs) {
      // 2. Fetch payments processed by this config that haven't been reconciled
      const unreconciledPayments = await prisma.payment.findMany({
        where: {
          gatewayConfigId: config.id,
          status: 'CAPTURED',
          settlementItems: { none: {} },
          deletedAt: null
        }
      });

      if (unreconciledPayments.length === 0) {
        logger.info({ configId: config.id }, 'No unreconciled payments found for configuration');
        continue;
      }

      logger.info({ configId: config.id, count: unreconciledPayments.length }, 'Processing reconciliation for configuration');

      const settlementId = generateUuidV7();
      let totalReconciledAmount = 0;

      // Create settlement header
      await prisma.settlement.create({
        data: {
          id: settlementId,
          merchantId: config.merchantId,
          gatewayConfigId: config.id,
          settlementDate: new Date(),
          totalAmount: 0, // Will update below
          currency: 'USD',
          status: 'PENDING'
        }
      });

      const itemsData = [];

      for (const payment of unreconciledPayments) {
        const paymentAmount = Number(payment.amount);
        totalReconciledAmount += paymentAmount;

        // Introduce a simulated 5% variance chance to demonstrate variance detection logic
        const simulateVariance = Math.random() < 0.05;
        const gatewayTxnId = payment.gatewayToken || 'TXN_' + Date.now();
        const gatewayAmount = simulateVariance 
          ? paymentAmount - 2.50 // Simulate gateway took fee directly (variance)
          : paymentAmount;

        const status = simulateVariance ? 'VARIANCE' : 'MATCHED';

        if (simulateVariance) {
          logger.warn({ paymentId: payment.id, gatewayAmount, paymentAmount }, 'Variance detected during settlement check');
        }

        itemsData.push({
          id: generateUuidV7(),
          settlementId,
          paymentId: payment.id,
          gatewayTxnId,
          amount: gatewayAmount,
          status
        });
      }

      // Bulk create items
      await prisma.settlementItem.createMany({
        data: itemsData
      });

      // Update header
      const hasVariance = itemsData.some(i => i.status === 'VARIANCE');
      await prisma.settlement.update({
        where: { id: settlementId },
        data: {
          totalAmount: totalReconciledAmount,
          status: hasVariance ? 'DISCREPANCY' : 'MATCHED'
        }
      });

      // Write transactional outbox event
      await prisma.outboxEvent.create({
        data: {
          id: generateUuidV7(),
          topic: hasVariance ? 'settlement.discrepancy' : 'settlement.completed',
          key: settlementId,
          payload: JSON.stringify({
            settlementId,
            configId: config.id,
            merchantId: config.merchantId,
            totalAmount: totalReconciledAmount,
            status: hasVariance ? 'DISCREPANCY' : 'MATCHED'
          }),
          status: 'PENDING'
        }
      });

      logger.info({ settlementId, status: hasVariance ? 'DISCREPANCY' : 'MATCHED' }, 'Settlement reconciliation complete');
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed during settlement reconciliation cycle');
  }
}
