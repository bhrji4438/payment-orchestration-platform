import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../shared/logger/create-logger';

const prisma = new PrismaClient();
const logger = createLogger('reporting-service');

export async function getAnalyticsReport(merchantId: string) {
  // Check merchant exists
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId }
  });

  if (!merchant) {
    return null;
  }

  // Fetch payments summary
  const payments = await prisma.payment.findMany({
    where: { merchantId, deletedAt: null }
  });

  const totalCount = payments.length;
  const capturedPayments = payments.filter(p => p.status === 'CAPTURED');
  const authorizedPayments = payments.filter(p => p.status === 'AUTHORIZED');
  const failedPayments = payments.filter(p => p.status === 'FAILED');
  const refundedPayments = payments.filter(p => p.status === 'REFUNDED');

  const totalVolume = capturedPayments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalRefunded = refundedPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  const successRate = totalCount > 0 
    ? ((capturedPayments.length + authorizedPayments.length) / totalCount) * 100 
    : 100;
  const failureRate = totalCount > 0 
    ? (failedPayments.length / totalCount) * 100 
    : 0;

  // Fetch gateway health analytics (attempts count per config)
  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      payment: { merchantId }
    },
    include: {
      gatewayConfig: {
        include: { gatewayProvider: true }
      }
    }
  });

  const gatewayStats: Record<string, { total: number; success: number; failure: number }> = {};
  for (const att of attempts) {
    const provider = att.gatewayConfig.gatewayProvider.name;
    if (!gatewayStats[provider]) {
      gatewayStats[provider] = { total: 0, success: 0, failure: 0 };
    }
    gatewayStats[provider].total++;
    if (att.status === 'SUCCESS') {
      gatewayStats[provider].success++;
    } else {
      gatewayStats[provider].failure++;
    }
  }

  // Fetch recent payments
  const recentPayments = await prisma.payment.findMany({
    where: { merchantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      gatewayConfig: {
        select: { displayName: true, gatewayProvider: { select: { name: true } } }
      }
    }
  });

  return {
    summary: {
      totalVolume,
      totalRefunded,
      successRate,
      failureRate,
      totalPayments: totalCount,
      capturedCount: capturedPayments.length,
      authorizedCount: authorizedPayments.length,
      failedCount: failedPayments.length,
      refundedCount: refundedPayments.length
    },
    gateways: Object.keys(gatewayStats).map(key => ({
      gateway: key,
      ...gatewayStats[key],
      successRate: gatewayStats[key].total > 0 ? (gatewayStats[key].success / gatewayStats[key].total) * 100 : 100
    })),
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      cardBrand: p.cardBrand,
      cardLastFour: p.cardLastFour,
      gateway: p.gatewayConfig?.gatewayProvider.name || 'Direct Routing',
      createdAt: p.createdAt
    }))
  };
}
