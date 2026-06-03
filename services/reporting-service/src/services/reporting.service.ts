import { PrismaClient } from '@prisma/client';
import { createLogger } from '@shared/logger/create-logger';
import { redisService } from '../infrastructure/redis/redis.service';

const prisma = new PrismaClient();
const logger = createLogger('reporting-service');

export async function getAnalyticsReport(merchantId: string) {
  // Check cache first
  const cacheKey = `analytics:${merchantId}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    logger.info({ merchantId }, 'Analytics cache hit');
    return cached;
  }

  // Check merchant exists
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId }
  });

  if (!merchant) {
    return null;
  }

  // 1. Fetch aggregated payment metrics (avoid loading millions of records in memory)
  const statusGroups = await prisma.payment.groupBy({
    by: ['status'],
    where: { merchantId, deletedAt: null },
    _count: {
      _all: true
    },
    _sum: {
      amount: true
    }
  });

  let totalCount = 0;
  let capturedCount = 0;
  let authorizedCount = 0;
  let failedCount = 0;
  let refundedCount = 0;
  let totalVolume = 0;
  let totalRefunded = 0;

  for (const group of statusGroups) {
    const count = group._count._all || 0;
    const sum = Number(group._sum.amount || 0);
    totalCount += count;

    if (group.status === 'CAPTURED') {
      capturedCount = count;
      totalVolume = sum;
    } else if (group.status === 'AUTHORIZED') {
      authorizedCount = count;
    } else if (group.status === 'FAILED') {
      failedCount = count;
    } else if (group.status === 'REFUNDED') {
      refundedCount = count;
      totalRefunded = sum;
    }
  }

  const successRate = totalCount > 0 
    ? ((capturedCount + authorizedCount) / totalCount) * 100 
    : 100;
  const failureRate = totalCount > 0 
    ? (failedCount / totalCount) * 100 
    : 0;

  // 2. Fetch configurations for provider mapping
  const configs = await prisma.merchantGatewayConfiguration.findMany({
    where: { merchantId },
    include: { gatewayProvider: true }
  });
  const configMap = new Map(configs.map(c => [c.id, c.gatewayProvider.name]));

  // 3. Fetch aggregated gateway health attempts count using groupBy
  const attemptGroups = await prisma.paymentAttempt.groupBy({
    by: ['gatewayConfigId', 'status'],
    where: {
      payment: { merchantId, deletedAt: null }
    },
    _count: {
      _all: true
    }
  });

  const gatewayStats: Record<string, { total: number; success: number; failure: number }> = {};
  for (const group of attemptGroups) {
    const provider = configMap.get(group.gatewayConfigId) || 'Unknown';
    if (!gatewayStats[provider]) {
      gatewayStats[provider] = { total: 0, success: 0, failure: 0 };
    }
    const count = group._count._all || 0;
    gatewayStats[provider].total += count;
    if (group.status === 'SUCCESS') {
      gatewayStats[provider].success += count;
    } else {
      gatewayStats[provider].failure += count;
    }
  }

  // 4. Fetch recent payments (paged limit)
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

  const report = {
    summary: {
      totalVolume,
      totalRefunded,
      successRate,
      failureRate,
      totalPayments: totalCount,
      capturedCount,
      authorizedCount,
      failedCount,
      refundedCount
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

  // Cache report for 30 seconds
  await redisService.setex(cacheKey, 30, report);

  return report;
}
