import http from 'http';
import { runReconciliation } from './services/settlement.service';
import { createLogger } from '@shared/logger/create-logger';

const logger = createLogger('settlement-service');

const port = process.env.PORT || 3004;

async function start() {
  logger.info('Settlement Reconciliation engine initializing...');
  
  // Run reconciliation every 30 seconds for simulation purposes
  setInterval(async () => {
    await runReconciliation();
  }, 30000);

  // Run once on startup
  await runReconciliation();
}

// Boot settlement loop
start().catch((error) => {
  logger.error(error, 'Settlement engine failed to start');
  process.exit(1);
});

// A simple HTTP health check server using built-in http module
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'settlement-service', timestamp: new Date() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, () => {
  logger.info(`Settlement Service healthcheck server listening on port ${port}`);
});
