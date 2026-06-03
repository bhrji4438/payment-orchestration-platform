import { PrismaClient } from '@prisma/client';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';

const prisma = new PrismaClient();

export async function writeAuditLog(event: { topic: string; key: string; payload: any }) {
  try {
    const payload = event.payload;
    const merchantId = payload.merchantId || null;

    logger.info({ topic: event.topic, key: event.key }, 'Recording immutable audit log entry');

    await prisma.auditLog.create({
      data: {
        id: generateUuidV7(),
        merchantId,
        userId: payload.userId || null,
        action: event.topic.toUpperCase(),
        entityName: event.topic.split('.')[0].toUpperCase(),
        entityId: event.key,
        payload: JSON.stringify(payload),
        ipAddress: payload.ipAddress || 'SYSTEM',
        userAgent: 'Event-Driven Audit Service'
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to write audit log entry');
  }
}
