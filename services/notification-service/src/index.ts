import http from 'http';
import { startNotificationConsumer } from './consumers/notification.consumer.ts';
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
