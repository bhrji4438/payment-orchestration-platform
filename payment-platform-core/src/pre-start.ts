import dotenv from 'dotenv';
import { validateEnv } from '@shared/validators/env.validator';

dotenv.config();

validateEnv([
  { name: 'PORT', required: false, type: 'number', default: 3000 },
  { name: 'DATABASE_URL', required: true, type: 'url' },
  { name: 'KAFKA_BROKERS', required: true },
  { name: 'KAFKA_ENABLED', required: false, type: 'boolean', default: true },
  { name: 'ENCRYPTION_MASTER_KEY', required: true }
], 'payment-platform-core');
