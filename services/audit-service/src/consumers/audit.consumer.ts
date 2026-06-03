import { Kafka } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';
import { writeAuditLog } from '../services/audit.service';

const prisma = new PrismaClient();

const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';

export async function startAuditConsumer() {
  if (kafkaEnabled) {
    try {
      const kafka = new Kafka({
        clientId: 'audit-service',
        brokers: brokers.split(',')
      });

      const consumer = kafka.consumer({ groupId: 'audit-group' });
      await consumer.connect();

      // Subscribe to all platform events
      const topics = [
        'payment.created',
        'payment.authorized',
        'payment.captured',
        'payment.failed',
        'refund.created',
        'refund.completed',
        'invoice.created',
        'notification.sent'
      ];

      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }

      logger.info('Audit Compliance Service connected to Kafka and collecting logs...');

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          if (!message.value) return;
          const payload = JSON.parse(message.value.toString());
          await writeAuditLog({
            topic,
            key: message.key ? message.key.toString() : generateUuidV7(),
            payload
          });
        }
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Kafka offline. Starting audit database polling fallback...');
      startFallbackPolling();
    }
  } else {
    logger.info('Kafka disabled. Running Audit Service in database polling mode...');
    startFallbackPolling();
  }
}

function startFallbackPolling() {
  // Read all outbox events written to database and write them to audit logs
  setInterval(async () => {
    try {
      const pendingAuditLogs = await prisma.outboxEvent.findMany({
        where: {
          attempts: 1,
          status: 'PUBLISHED'
        },
        take: 10
      });

      for (const event of pendingAuditLogs) {
        const payload = JSON.parse(event.payload);
        
        const exists = await prisma.auditLog.findFirst({
          where: { action: event.topic.toUpperCase(), entityId: event.key }
        });

        if (!exists) {
          await writeAuditLog({
            topic: event.topic,
            key: event.key || event.id,
            payload
          });
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in audit fallback polling loop');
    }
  }, 10000);
}
