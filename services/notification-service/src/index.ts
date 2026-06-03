import http from 'http';
import dotenv from 'dotenv';
import { validateEnv } from '@shared/validators/env.validator';

dotenv.config();

validateEnv([
  { name: 'PORT', required: false, type: 'number', default: 3002 },
  { name: 'DATABASE_URL', required: true, type: 'url' },
  { name: 'KAFKA_BROKERS', required: true },
  { name: 'KAFKA_ENABLED', required: false, type: 'boolean', default: true },
  { name: 'SMTP_HOST', required: false, type: 'string', default: 'localhost' },
  { name: 'SMTP_PORT', required: false, type: 'number', default: 1025 }
], 'notification-service');

import { startNotificationConsumer } from './consumers/notification.consumer';
import pino from 'pino';

const logger = pino({
  transport: { target: 'pino-pretty' }
});

const port = process.env.PORT || 3002;

// Boot the notification consumer
startNotificationConsumer().catch((error) => {
  logger.error(error, 'Notification consumer failed to start');
  process.exit(1);
});

// A simple HTTP health check server using built-in http module
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'notification-service', timestamp: new Date() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  logger.info(`Notification Service healthcheck server listening on port ${port}`);
});
