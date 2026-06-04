import { Kafka } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@shared/logger/create-logger';
import { processNotification } from '../services/notification.service';

const prisma = new PrismaClient();
const logger = createLogger('notification-consumer');

const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';

export async function startNotificationConsumer() {
  if (kafkaEnabled) {
    try {
      const kafka = new Kafka({
        clientId: 'notification-service',
        brokers: brokers.split(',')
      });

      const consumer = kafka.consumer({ groupId: 'notification-group' });
      await consumer.connect();
      
      // Subscribe to topics that prompt customer notification
      await consumer.subscribe({ topic: 'payment.captured', fromBeginning: false });
      await consumer.subscribe({ topic: 'payment.failed', fromBeginning: false });
      await consumer.subscribe({ topic: 'invoice.created', fromBeginning: false });

      logger.info('Notification Service Kafka Consumer listening...');

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          if (!message.value) return;
          const payload = JSON.parse(message.value.toString());

          let recipient = 'customer@demo-domain.com';
          if (payload.customerId) {
            const customer = await prisma.customer.findUnique({
              where: { id: payload.customerId }
            });
            if (customer && customer.email) {
              recipient = customer.email;
            }
          }

          // Trigger email or SMS depending on payload type (simulate customer contact settings)
          await processNotification({
            merchantId: payload.merchantId,
            type: 'EMAIL',
            recipient,
            payload: { topic, payload }
          });
        }
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Kafka offline. Starting notification polling fallback...');
      startFallbackPolling();
    }
  } else {
    logger.info('Kafka disabled. Running Notification Service in database polling mode...');
    startFallbackPolling();
  }
}

function startFallbackPolling() {
  // Poll outbox table directly for events that need notifications sent out
  setInterval(async () => {
    try {
      const pendingNotificationEvents = await prisma.outboxEvent.findMany({
        where: {
          topic: { in: ['payment.captured', 'payment.failed', 'invoice.created'] },
          attempts: 1, // Only check initially written events
          status: 'PUBLISHED'
        },
        take: 5
      });

      for (const event of pendingNotificationEvents) {
        const payload = JSON.parse(event.payload);
        const merchantId = payload.merchantId || 'a0000000-0000-0000-0000-00000000000a';

        let recipient = 'customer@demo-domain.com';
        if (payload.customerId) {
          const customer = await prisma.customer.findUnique({
            where: { id: payload.customerId }
          });
          if (customer && customer.email) {
            recipient = customer.email;
          }
        }

        // Check if we already created a notification for this event key
        const exists = await prisma.notification.findFirst({
          where: { recipient, payload: { contains: event.key || '' } }
        });

        if (!exists) {
          await processNotification({
            merchantId,
            type: 'EMAIL',
            recipient,
            payload: { topic: event.topic, payload }
          });
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in notification fallback polling');
    }
  }, 10000);
}
