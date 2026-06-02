import { PrismaClient } from '@prisma/client';
import { kafkaService } from '../kafka/kafka.service.ts';
import { logger } from '../../../../shared/logger/logger.ts';

const prisma = new PrismaClient();

export class OutboxPublisher {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Starts the polling worker to read from the outbox table
   */
  public start(intervalMs = 5000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Transactional Outbox Publisher worker started');

    this.intervalId = setInterval(async () => {
      await this.processPendingEvents();
    }, intervalMs);
  }

  /**
   * Stops the polling worker
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Transactional Outbox Publisher worker stopped');
  }

  /**
   * Fetches and processes PENDING outbox events in a batch
   */
  public async processPendingEvents(): Promise<void> {
    try {
      // Fetch oldest pending events
      const events = await prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50
      });

      if (events.length === 0) return;

      logger.debug({ count: events.length }, 'Processing pending outbox events');

      for (const event of events) {
        // Attempt publishing to Kafka
        const success = await kafkaService.publish(
          event.topic,
          event.key || event.id,
          JSON.parse(event.payload)
        );

        if (success) {
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PUBLISHED',
              attempts: event.attempts + 1
            }
          });
        } else {
          // If fail, increment attempts. If too many failures, mark as FAILED (DLQ)
          const nextAttempts = event.attempts + 1;
          const status = nextAttempts >= 5 ? 'FAILED' : 'PENDING';
          
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status,
              attempts: nextAttempts
            }
          });

          if (status === 'FAILED') {
            logger.error({ eventId: event.id, topic: event.topic }, 'Outbox event reached maximum retries. Moved to DLQ/Failed state.');
          }
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error during outbox processing cycle');
    }
  }
}

export const outboxPublisher = new OutboxPublisher();
