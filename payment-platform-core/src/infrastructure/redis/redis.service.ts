import Redis from 'ioredis';
import { logger } from '@shared/logger/logger';

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
      logger.info('Redis connected');
    });

    this.client.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis error — falling back to no-cache mode');
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

  /** Store a JSON value with TTL (seconds) */
  public async setex<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
    if (!this.isReady) return;
    await this.client.setex(key, ttlSeconds, JSON.stringify(value)).catch(() => {});
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

  /** Set a raw string value with optional TTL */
  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isReady) return;
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value).catch(() => {});
    } else {
      await this.client.set(key, value).catch(() => {});
    }
  }

  /** Delete one or more keys */
  public async del(...keys: string[]): Promise<void> {
    if (!this.isReady) return;
    await this.client.del(...keys).catch(() => {});
  }

  /** Check key existence */
  public async exists(key: string): Promise<boolean> {
    if (!this.isReady) return false;
    return (await this.client.exists(key).catch(() => 0)) === 1;
  }

  /** Increment counter and set TTL only on first create */
  public async incrWithExpire(key: string, ttlSeconds: number): Promise<number> {
    if (!this.isReady) return 0;
    const pipe = this.client.pipeline();
    pipe.incr(key);
    pipe.expire(key, ttlSeconds, 'NX'); // only set TTL if not already set
    const results = await pipe.exec().catch(() => null);
    return results ? (results[0][1] as number) : 0;
  }

  /** Set a hash field map */
  public async hset(key: string, data: Record<string, string | number>): Promise<void> {
    if (!this.isReady) return;
    await this.client.hset(key, data).catch(() => {});
  }

  /** Get all hash fields */
  public async hgetall(key: string): Promise<Record<string, string> | null> {
    if (!this.isReady) return null;
    const result = await this.client.hgetall(key).catch(() => null);
    return result && Object.keys(result).length > 0 ? result : null;
  }

  /** Get TTL of a key in seconds (-1 = no TTL, -2 = does not exist) */
  public async ttl(key: string): Promise<number> {
    if (!this.isReady) return -2;
    return this.client.ttl(key).catch(() => -2);
  }

  public get ready(): boolean {
    return this.isReady;
  }
}

export const redisService = new RedisService();
