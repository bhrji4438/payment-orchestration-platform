import { PrismaClient } from '@prisma/client';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';

const prisma = new PrismaClient();

class ThirdPartyNotificationProvider {
  // Store notification IDs that have failed once.
  private static failedOnceSet = new Set<string>();

  public async sendEmail(recipient: string, subject: string, body: string, id: string): Promise<void> {
    logger.info({ recipient, id }, '[EmailProvider] Triggering SMTP transaction...');
    
    if (!ThirdPartyNotificationProvider.failedOnceSet.has(id)) {
      ThirdPartyNotificationProvider.failedOnceSet.add(id);
      logger.warn({ id }, '[EmailProvider] Simulated transient SMTP server timeout (will succeed on retry)');
      throw new Error('SMTP connection timed out. Gateway host unreachable.');
    }

    logger.info({ recipient, id }, '[EmailProvider] SMTP Dispatch Success');
  }

  public async sendSms(recipient: string, body: string, id: string): Promise<void> {
    logger.info({ recipient, id }, '[SmsProvider] Dispatching SMS payload to carrier...');

    if (!ThirdPartyNotificationProvider.failedOnceSet.has(id)) {
      ThirdPartyNotificationProvider.failedOnceSet.add(id);
      logger.warn({ id }, '[SmsProvider] Simulated carrier rate limit reached (will succeed on retry)');
      throw new Error('Carrier endpoint responded with 429 Rate Limit Exceeded.');
    }

    logger.info({ recipient, id }, '[SmsProvider] SMS Dispatch Success');
  }
}

const provider = new ThirdPartyNotificationProvider();

export async function processNotification(params: {
  merchantId: string;
  type: 'EMAIL' | 'SMS';
  recipient: string;
  payload: any;
}) {
  const notificationId = generateUuidV7();
  logger.info({ notificationId, type: params.type }, 'Recording outbound notification record');

  await prisma.notification.create({
    data: {
      id: notificationId,
      merchantId: params.merchantId,
      type: params.type,
      recipient: params.recipient,
      payload: JSON.stringify(params.payload),
      status: 'PENDING',
      attempts: 1
    }
  });

  try {
    if (params.type === 'EMAIL') {
      await provider.sendEmail(
        params.recipient,
        'Notification: Transaction Alert',
        JSON.stringify(params.payload),
        notificationId
      );
    } else {
      await provider.sendSms(params.recipient, `Transaction Alert: ${JSON.stringify(params.payload)}`, notificationId);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT' }
    });
    
    // Publish audit log
    await prisma.outboxEvent.create({
      data: {
        id: generateUuidV7(),
        topic: 'notification.sent',
        key: notificationId,
        payload: JSON.stringify({ notificationId, status: 'SENT', recipient: params.recipient }),
        status: 'PENDING'
      }
    });

  } catch (error: any) {
    logger.error({ notificationId, error: error.message }, 'Notification dispatch failed on first attempt. Enqueuing retry...');

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED' }
    });

    // Immediate retry simulation (normally queue-driven, e.g., BullMQ)
    setTimeout(async () => {
      logger.info({ notificationId }, 'Retrying notification dispatch (Attempt 2)...');
      try {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { attempts: 2 }
        });

        if (params.type === 'EMAIL') {
          await provider.sendEmail(
            params.recipient,
            'Notification: Transaction Alert',
            JSON.stringify(params.payload),
            notificationId
          );
        } else {
          await provider.sendSms(params.recipient, `Transaction Alert: ${JSON.stringify(params.payload)}`, notificationId);
        }

        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'SENT' }
        });
        logger.info({ notificationId }, 'Notification successfully dispatched on retry attempt.');
      } catch (retryError: any) {
        logger.error({ notificationId, error: retryError.message }, 'Notification retry failed permanently.');
      }
    }, 2000); // Retry after 2 seconds
  }
}
