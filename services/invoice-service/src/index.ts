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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

// Boot the invoice consumer
startInvoiceConsumer().catch((error) => {
  logger.error(error, 'Invoice consumer failed to start');
  process.exit(1);
});

// A simple HTTP health check server using built-in http module
const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'invoice-service', timestamp: new Date() }));
    return;
  } 
  
  if (req.url?.match(/^\/v1\/invoices\/([a-zA-Z0-9-]+)\/print$/) && req.method === 'GET') {
    const id = req.url.split('/')[3];
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { payment: { include: { merchant: true } } }
      });

      if (!invoice) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Invoice Not Found</h1>');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.number}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .details { margin-top: 40px; }
            .total { font-size: 24px; font-weight: bold; margin-top: 40px; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <h2>${invoice.payment.merchant.name}</h2>
              <p>Invoice #${invoice.number}</p>
              <p>Date: ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
            <div style="text-align: right">
              <h2>STATUS: <span style="color: ${invoice.status === 'PAID' ? 'green' : 'red'}">${invoice.status}</span></h2>
            </div>
          </div>
          <div class="details">
            <p><strong>Billed To:</strong> Customer ID: ${invoice.payment.customerId || 'N/A'}</p>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td>Payment for transaction ${invoice.payment.id}</td><td>$${Number(invoice.payment.amount).toFixed(2)} ${invoice.payment.currency}</td></tr>
            </tbody>
          </table>
          <div class="total">
            Total: $${Number(invoice.payment.amount).toFixed(2)} ${invoice.payment.currency}
          </div>
        </body>
        </html>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Internal Server Error</h1>');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(port, () => {
  logger.info(`Invoice Service healthcheck server listening on port ${port}`);
});
