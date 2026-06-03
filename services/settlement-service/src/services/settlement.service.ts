import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '@shared/logger/create-logger';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';

const prisma = new PrismaClient();
const logger = createLogger('settlement-service');

let isReconciling = false;

export async function runReconciliation() {
  if (isReconciling) {
    logger.info('Settlement reconciliation already in progress. Skipping cycle.');
    return;
  }

  isReconciling = true;
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
      const itemsData: Prisma.SettlementItemCreateManyInput[] = [];

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

      // Execute database operations atomically in a transaction
      await prisma.$transaction(async (tx) => {
        // Create settlement header
        await tx.settlement.create({
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

        // Bulk create items
        await tx.settlementItem.createMany({
          data: itemsData
        });

        // Update header
        const hasVariance = itemsData.some(i => i.status === 'VARIANCE');
        const finalStatus = hasVariance ? 'DISCREPANCY' : 'MATCHED';
        await tx.settlement.update({
          where: { id: settlementId },
          data: {
            totalAmount: totalReconciledAmount,
            status: finalStatus
          }
        });

        // Write transactional outbox event
        await tx.outboxEvent.create({
          data: {
            id: generateUuidV7(),
            topic: hasVariance ? 'settlement.discrepancy' : 'settlement.completed',
            key: settlementId,
            payload: JSON.stringify({
              settlementId,
              configId: config.id,
              merchantId: config.merchantId,
              totalAmount: totalReconciledAmount,
              status: finalStatus
            }),
            status: 'PENDING'
          }
        });

        logger.info({ settlementId, status: finalStatus }, 'Settlement transaction committed successfully');
      });
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed during settlement reconciliation cycle');
  } finally {
    isReconciling = false;
  }
}
