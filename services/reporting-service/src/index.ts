import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger } from '../../../shared/logger/create-logger';
import { getAnalyticsReport } from './services/reporting.service.ts';

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;
const logger = createLogger('reporting-service');

app.use(cors());
app.use(express.json());

app.get('/analytics/:merchantId', async (req, res) => {
  const { merchantId } = req.params;

  logger.info({ merchantId }, 'Compiling analytics report');

  try {
    const report = await getAnalyticsReport(merchantId);
    if (!report) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }
    res.json(report);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch analytics data');
    res.status(500).json({ error: 'Internal analytics generation failure' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'reporting-service', timestamp: new Date() });
});

app.listen(port, () => {
  logger.info(`Reporting analytics service running on port ${port}`);
});
