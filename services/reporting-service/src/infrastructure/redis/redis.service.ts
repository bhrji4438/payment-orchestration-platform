import Redis from 'ioredis';
import { createLogger } from '@shared/logger/create-logger';

const logger = createLogger('reporting-redis');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  private client: Redis;
  private isReady = false;

  constructor() {
    this.client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: true
    });

    this.client.on('connect', () => {
      this.isReady = true;
      logger.info('Redis connected in reporting service');
    });

    this.client.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis error — falling back to DB queries');
      this.isReady = false;
    });

    this.client.on('close', () => {
      this.isReady = false;
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Redis unavailable — continuing without cache');
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /** Get and parse a JSON value. Returns null if missing or Redis is down. */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.isReady) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Store a JSON value with TTL (seconds) */
  public async setex<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
    if (!this.isReady) return;
    await this.client.setex(key, ttlSeconds, JSON.stringify(value)).catch(() => {});
  }
}

export const redisService = new RedisService();
