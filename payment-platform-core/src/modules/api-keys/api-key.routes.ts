import { Router, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@core/infrastructure/database/prisma';
import { redisService } from '@core/infrastructure/redis/redis.service';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';
import { jwtMiddleware, JwtAuthenticatedRequest } from '@core/modules/auth/jwt.middleware';
import { validateBody } from '@core/middleware/validation.middleware';
import { RotateApiKeySchema, RevokeApiKeySchema } from './api-key.schemas';

const router = Router();
const APIKEY_CACHE_PREFIX = 'apikey:';

// ─── List API Keys ────────────────────────────────────────────────────────
router.get('/', jwtMiddleware, async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { merchantId: req.merchantId, deletedAt: null },
      select: {
        id: true,
        prefix: true,
        name: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
        // We do NOT select hashedKey
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(keys);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// ─── Rotate (Create New, Revoke Old) ──────────────────────────────────────
router.post(
  '/rotate',
  jwtMiddleware,
  validateBody(RotateApiKeySchema),
  async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const merchantId = req.merchantId!;
      const apiKeyPlain = `sk_live_${randomBytes(24).toString('hex')}`;
      const hashedApiKey = createHash('sha256').update(apiKeyPlain).digest('hex');

      // 1. Find the currently active key to revoke
      const activeKeys = await prisma.apiKey.findMany({
        where: { merchantId, isActive: true, deletedAt: null }
      });

      await prisma.$transaction(async (tx) => {
        // Revoke active keys
        for (const key of activeKeys) {
          await tx.apiKey.update({
            where: { id: key.id },
            data: { isActive: false, deletedAt: new Date() }
          });
        }

        // Create new key
        await tx.apiKey.create({
          data: {
            id: generateUuidV7(),
            merchantId,
            hashedKey: hashedApiKey,
            prefix: 'sk_live',
            name: req.body.name || 'API Key',
            isActive: true
          }
        });
      });

      // 2. Invalidate all revoked keys from Redis cache immediately
      for (const key of activeKeys) {
        await redisService.del(`${APIKEY_CACHE_PREFIX}${key.hashedKey}`);
      }

      logger.info({ merchantId }, 'API key rotated');

      // Only time we return the plain key
      res.status(201).json({ apiKeyPlain, message: 'Store this key securely. It will not be shown again.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to rotate API key' });
    }
  }
);

// ─── Revoke API Key ────────────────────────────────────────────────────────
router.post(
  '/revoke',
  jwtMiddleware,
  validateBody(RevokeApiKeySchema),
  async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const merchantId = req.merchantId!;
      const { id } = req.body;

      const key = await prisma.apiKey.findFirst({
        where: { id, merchantId, deletedAt: null }
      });

      if (!key) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      await prisma.apiKey.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() }
      });

      // Invalidate from Redis
      await redisService.del(`${APIKEY_CACHE_PREFIX}${key.hashedKey}`);

      logger.info({ merchantId, keyId: id }, 'API key revoked');
      res.json({ message: 'API key revoked successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  }
);

export default router;
