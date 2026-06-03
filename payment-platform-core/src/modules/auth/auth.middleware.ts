import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { prisma } from '../../infrastructure/database/prisma';

// --- Step 5: Size-Bounded LRU Cache to Prevent Memory Leaks ---
class SizeBoundedCache<K, V> {
  private cache = new Map<K, V>();

  constructor(private readonly maxSize: number) {}

  public get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Refresh key by deleting and re-inserting (moves to end of insertion order)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest element (first key in map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }
}

const apiKeyCache = new SizeBoundedCache<string, { merchantId: string; apiKeyId: string }>(10000);

// --- Step 6: Buffered Usage Logger to Prevent Database Saturation ---
interface ApiKeyUsageEntry {
  id: string;
  apiKeyId: string;
  endpoint: string;
  ipAddress: string;
  status: number;
  createdAt: Date;
}

class ApiKeyUsageLogger {
  private buffer: ApiKeyUsageEntry[] = [];
  private flushInterval = 5000; // 5 seconds
  private batchSize = 100;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.start();
  }

  public log(entry: Omit<ApiKeyUsageEntry, 'createdAt'>) {
    this.buffer.push({ ...entry, createdAt: new Date() });
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }

  private async flush() {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await prisma.apiKeyUsage.createMany({
        data: batch
      });
    } catch (err) {
      console.error('Failed to flush API key usage batch:', err);
    }
  }
}

export const apiKeyUsageLogger = new ApiKeyUsageLogger();

export interface AuthenticatedRequest extends Request {
  merchantId?: string;
  apiKeyId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required. Provide an API key in Authorization header.' });
    return;
  }

  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey.startsWith('sk_')) {
    res.status(401).json({ error: 'Invalid API key format. API key must start with "sk_".' });
    return;
  }

  try {
    const cached = apiKeyCache.get(apiKey);
    let merchantId = cached?.merchantId;
    let apiKeyId = cached?.apiKeyId;

    if (!merchantId || !apiKeyId) {
      const hashedKey = createHash('sha256').update(apiKey).digest('hex');

      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { hashedKey, deletedAt: null, isActive: true },
        include: { merchant: true }
      });

      if (!apiKeyRecord || apiKeyRecord.merchant.status !== 'ACTIVE') {
        res.status(401).json({ error: 'Invalid or revoked API key.' });
        return;
      }

      if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
        res.status(401).json({ error: 'API key has expired.' });
        return;
      }

      merchantId = apiKeyRecord.merchantId;
      apiKeyId = apiKeyRecord.id;
      apiKeyCache.set(apiKey, { merchantId, apiKeyId });
    }

    req.merchantId = merchantId;
    req.apiKeyId = apiKeyId;

    // Buffer usage log writing instead of fire-and-forget immediate database insert
    apiKeyUsageLogger.log({
      id: generateUuidV7(),
      apiKeyId: apiKeyId,
      endpoint: req.originalUrl,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      status: 200
    });

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Authentication internal subsystem error' });
  }
}
export default authMiddleware;
