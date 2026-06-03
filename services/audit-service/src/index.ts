import http from 'http';
import { startAuditConsumer } from './consumers/audit.consumer';
import { logger } from '@shared/logger/logger';

const port = process.env.PORT || 3003;

// Boot the audit consumer
startAuditConsumer().catch((error) => {
  logger.error(error, 'Audit consumer failed to start');
  process.exit(1);
});

// A simple HTTP health check server using built-in http module
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'audit-service', timestamp: new Date() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  logger.info(`Audit Service healthcheck server listening on port ${port}`);
});
