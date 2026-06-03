import http from 'http';
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
