import { Kafka } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import { logger } from '@shared/logger/logger';
import { createInvoice } from '../services/invoice.service';

const prisma = new PrismaClient();

const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';

export async function startInvoiceConsumer() {
  if (kafkaEnabled) {
    try {
      const kafka = new Kafka({
        clientId: 'invoice-service',
        brokers: brokers.split(',')
      });

      const consumer = kafka.consumer({ groupId: 'invoice-group' });
      await consumer.connect();
      await consumer.subscribe({ topic: 'payment.captured', fromBeginning: false });

      logger.info('Invoice Service Kafka Consumer connected and listening on payment.captured...');

      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          const payload = JSON.parse(message.value.toString());
          await createInvoice(payload);
        }
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Kafka connection failed in Invoice Service. Starting database polling fallback...');
      startFallbackPolling();
    }
  } else {
    logger.info('Kafka is disabled. Running Invoice Service in database polling mode...');
    startFallbackPolling();
  }
}

function startFallbackPolling() {
  setInterval(async () => {
    try {
      // Find payments that are captured but have no invoice
      const paymentsWithoutInvoice = await prisma.payment.findMany({
        where: {
          status: 'CAPTURED',
          invoices: { none: {} },
          deletedAt: null
        },
        take: 10
      });

      for (const p of paymentsWithoutInvoice) {
        await createInvoice({
          paymentId: p.id,
          merchantId: p.merchantId,
          amount: Number(p.amount),
          currency: p.currency
        });
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error in invoice polling cycle');
    }
  }, 10000);
}
