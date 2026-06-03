import { Router, Request, Response } from 'express';
import { gatewayFactory } from '@core/modules/gateways/factory/gateway.factory';
import { kafkaService } from '@core/infrastructure/kafka/kafka.service';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';
import { prisma } from '@core/infrastructure/database/prisma';
const router = Router();

async function handleWebhook(
  gatewayCode: string,
  req: Request,
  res: Response
): Promise<void> {
  const startTime = Date.now();
  const headers = req.headers as Record<string, string>;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  logger.info({ gateway: gatewayCode }, 'Received webhook from gateway');

  try {
    const adapter = gatewayFactory.getAdapter(gatewayCode);
    const secret = process.env[`WEBHOOK_SECRET_${gatewayCode}`] || 'mock_secret';
    const isValid = await adapter.verifyWebhook({
      headers,
      rawBody,
      webhookSecret: secret
    });

    if (!isValid) {
      logger.warn({ gateway: gatewayCode }, 'Webhook signature verification failed');
      res.status(401).json({ error: 'Signature verification failed' });
      return;
    }

    const duration = Date.now() - startTime;
    const deliveryId = generateUuidV7();

    await prisma.webhookDelivery.create({
      data: {
        id: deliveryId,
        endpoint: req.originalUrl,
        payload: rawBody,
        headers: JSON.stringify(headers),
        responseCode: 200,
        responseBody: 'SUCCESS',
        status: 'SUCCESS',
        durationMs: duration
      }
    });

    await kafkaService.publish('webhook.received', deliveryId, {
      deliveryId,
      gateway: gatewayCode,
      payload: req.body,
      receivedAt: new Date()
    });

    await kafkaService.publish('webhook.processed', deliveryId, {
      deliveryId,
      gateway: gatewayCode,
      status: 'PROCESSED'
    });

    res.status(200).send('Event processed successfully');
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error({ gateway: gatewayCode, error: error.message }, 'Error processing webhook');

    try {
      await prisma.webhookDelivery.create({
        data: {
          id: generateUuidV7(),
          endpoint: req.originalUrl,
          payload: rawBody,
          headers: JSON.stringify(headers),
          responseCode: 500,
          responseBody: error.message,
          status: 'FAILED',
          durationMs: duration
        }
      });
    } catch (dbErr) {
      console.error('Failed to log failed webhook delivery:', dbErr);
    }

    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

router.post('/stripe', (req, res) => handleWebhook('STRIPE', req, res));
router.post('/authorize-net', (req, res) => handleWebhook('AUTHORIZE_NET', req, res));
router.post('/nmi', (req, res) => handleWebhook('NMI', req, res));
router.post('/custom', (req, res) => handleWebhook('CARDPOINTE', req, res));

export default router;
