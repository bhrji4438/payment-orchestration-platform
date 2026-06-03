import './pre-start';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import paymentRoutes from './modules/payments/payment.routes';
import webhookRoutes from './modules/webhooks/webhook.routes';
import authRoutes from './modules/auth/auth.routes';
import apiKeyRoutes from './modules/api-keys/api-key.routes';
import gatewayRoutes from './modules/gateways/gateway.routes';
import customerRoutes from './modules/customers/customer.routes';
import { outboxPublisher } from './infrastructure/outbox/outbox-publisher';
import { kafkaService } from './infrastructure/kafka/kafka.service';
import { redisService } from './infrastructure/redis/redis.service';

const logger = pino({
  transport: { target: 'pino-pretty' }
});

const app = express();
const port = process.env.PORT || 3000;

// Capture raw body for signature verification (e.g. Stripe webhooks)
app.use(
  express.json({
    verify: (req: any, res: Response, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Register routers
app.use('/v1/auth', authRoutes);
app.use('/v1/api-keys', apiKeyRoutes);
app.use('/v1/gateways', gatewayRoutes);
app.use('/v1', paymentRoutes);
app.use('/v1', customerRoutes);
app.use('/webhooks', webhookRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err, 'Global unhandled exception caught');
  
  if (err.message && err.message.includes('OptimisticLockError')) {
    res.status(409).json({ error: 'Conflict: The record has been modified by another request. Please retry.' });
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// Startup sequence
async function startServer() {
  logger.info('Initializing Payment Orchestrator Platform...');

  // 1. Connect to Redis (cache, rate limiting, circuit breaker state)
  await redisService.connect();

  // 2. Connect to Kafka
  await kafkaService.connect();

  // 3. Start Transactional Outbox Publisher worker
  outboxPublisher.start(5000);

  // 4. Listen
  app.listen(port, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
  });
}

startServer().catch((error) => {
  logger.error(error, 'Startup sequence aborted due to error');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  outboxPublisher.stop();
  await kafkaService.disconnect();
  await redisService.disconnect();
  process.exit(0);
});
