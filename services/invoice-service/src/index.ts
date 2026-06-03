import http from 'http';
import dotenv from 'dotenv';
import { validateEnv } from '@shared/validators/env.validator';

dotenv.config();

validateEnv([
  { name: 'PORT', required: false, type: 'number', default: 3001 },
  { name: 'DATABASE_URL', required: true, type: 'url' },
  { name: 'KAFKA_BROKERS', required: true },
  { name: 'KAFKA_ENABLED', required: false, type: 'boolean', default: true },
  { name: 'MINIO_ENDPOINT', required: false, type: 'string', default: 'localhost:9000' },
  { name: 'MINIO_ROOT_USER', required: false, type: 'string', default: 'minioadmin' },
  { name: 'MINIO_ROOT_PASSWORD', required: false, type: 'string', default: 'minioadmin' },
  { name: 'MINIO_USE_SSL', required: false, type: 'boolean', default: false }
], 'invoice-service');

import { startInvoiceConsumer } from './consumers/invoice.consumer';
import { logger } from '@shared/logger/logger';

const port = process.env.PORT || 3001;

// Boot the invoice consumer
startInvoiceConsumer().catch((error) => {
  logger.error(error, 'Invoice consumer failed to start');
  process.exit(1);
});

// A simple HTTP health check server using built-in http module
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'invoice-service', timestamp: new Date() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  logger.info(`Invoice Service healthcheck server listening on port ${port}`);
});
