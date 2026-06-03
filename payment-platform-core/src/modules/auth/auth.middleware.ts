import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { prisma } from '@core/infrastructure/database/prisma';
import { redisService } from '@core/infrastructure/redis/redis.service';
import { logger } from '@shared/logger/logger';
import { jwtMiddleware } from './jwt.middleware';

// ─── Key Patterns ──────────────────────────────────────────────────────────────
const APIKEY_CACHE_PREFIX = 'apikey:';
const RATE_LIMIT_PREFIX = 'ratelimit:';
const APIKEY_CACHE_TTL = 300;    // 5 minutes
const RATE_LIMIT_WINDOW = 60;    // 1 minute
const RATE_LIMIT_MAX = 100;      // 100 requests per minute per key

// ─── Buffered Usage Logger (prevents DB saturation) ───────────────────────────
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
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.start();
  }

  public log(entry: Omit<ApiKeyUsageEntry, 'createdAt'>) {
    this.buffer.push({ ...entry, createdAt: new Date() });
    if (this.buffer.length >= 100) this.flush();
  }

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), 5000);
  }

  public stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.flush();
  }

  private async flush() {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];
    await prisma.apiKeyUsage.createMany({ data: batch }).catch((err) => {
      logger.error({ err: err.message }, 'Failed to flush API key usage batch');
    });
  }
}

export const apiKeyUsageLogger = new ApiKeyUsageLogger();

// ─── Authenticated Request ─────────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  merchantId?: string;
  apiKeyId?: string;
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required. Provide an API key in Authorization header.' });
    return;
  }

  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  // If it does NOT start with sk_, assume it's a JWT from the portal
  if (!apiKey.startsWith('sk_')) {
    return jwtMiddleware(req as any, res, next);
  }

  const hashedKey = createHash('sha256').update(apiKey).digest('hex');
  const cacheKey = `${APIKEY_CACHE_PREFIX}${hashedKey}`;

  try {
    // ── 1. Redis cache fast-path ──────────────────────────────────────────────
    let merchantId: string | undefined;
    let apiKeyId: string | undefined;

    const cached = await redisService.get<{ merchantId: string; apiKeyId: string }>(cacheKey);

    if (cached) {
      merchantId = cached.merchantId;
      apiKeyId = cached.apiKeyId;
    } else {
      // ── 2. DB lookup (cache miss) ─────────────────────────────────────────
      const record = await prisma.apiKey.findFirst({
        where: { hashedKey, isActive: true, deletedAt: null },
        include: { merchant: { select: { id: true, status: true } } }
      });

      if (!record || !record.merchant || record.merchant.status !== 'ACTIVE') {
        res.status(401).json({ error: 'Invalid or revoked API key.' });
        return;
      }

      if (record.expiresAt && new Date() > record.expiresAt) {
        res.status(401).json({ error: 'API key has expired.' });
        return;
      }

      merchantId = record.merchantId;
      apiKeyId = record.id;

      // Write to Redis cache (TTL 5 min)
      await redisService.setex(cacheKey, APIKEY_CACHE_TTL, { merchantId, apiKeyId });
    }

    // ── 3. Sliding-window rate limiting via Redis ─────────────────────────────
    const now = new Date();
    const windowKey = `${RATE_LIMIT_PREFIX}${apiKeyId}:${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;

    const requestCount = await redisService.incrWithExpire(windowKey, RATE_LIMIT_WINDOW);
    if (requestCount > RATE_LIMIT_MAX) {
      res.status(429).json({
        error: 'Rate limit exceeded. Maximum 100 requests per minute per API key.',
        retryAfter: RATE_LIMIT_WINDOW
      });
      return;
    }

    // ── 4. Attach context ─────────────────────────────────────────────────────
    req.merchantId = merchantId;
    req.apiKeyId = apiKeyId;

    // Async buffered usage log
    apiKeyUsageLogger.log({
      id: generateUuidV7(),
      apiKeyId: apiKeyId!,
      endpoint: req.originalUrl,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      status: 200
    });

    next();
  } catch (error: any) {
    logger.error({ err: error.message }, 'Auth middleware internal error');
    res.status(500).json({ error: 'Authentication internal error' });
  }
}

export default authMiddleware;
