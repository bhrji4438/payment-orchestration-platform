import { kafkaService } from '@core/infrastructure/kafka/kafka.service';
import { logger } from '@shared/logger/logger';
import { prisma } from '@core/infrastructure/database/prisma';

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

  private isProcessing = false;

  /**
   * Fetches and processes PENDING outbox events in a batch
   */
  public async processPendingEvents(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

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
        try {
          let parsedPayload: any;
          try {
            parsedPayload = JSON.parse(event.payload);
          } catch (parseErr: any) {
            logger.error(
              { eventId: event.id, error: parseErr.message },
              'Failed to parse outbox event payload. Moving to FAILED state.'
            );
            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                status: 'FAILED',
                attempts: event.attempts + 1
              }
            });
            continue;
          }

          // Attempt publishing to Kafka
          const success = await kafkaService.publish(
            event.topic,
            event.key || event.id,
            parsedPayload
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
        } catch (eventError: any) {
          logger.error({ eventId: event.id, error: eventError.message }, 'Unexpected error processing individual outbox event');
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error during outbox processing cycle');
    } finally {
      this.isProcessing = false;
    }
  }
}

export const outboxPublisher = new OutboxPublisher();
