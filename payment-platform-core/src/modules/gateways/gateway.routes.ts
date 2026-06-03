import { Router, Response } from 'express';
import { prisma } from '@core/infrastructure/database/prisma';
import { redisService } from '@core/infrastructure/redis/redis.service';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';
import { jwtMiddleware, JwtAuthenticatedRequest } from '@core/modules/auth/jwt.middleware';
import { validateBody } from '@core/middleware/validation.middleware';
import { CreateGatewayConfigSchema, UpdateGatewayConfigSchema, SetPrioritySchema } from './gateway.schemas';
import { credentialEncryptionService } from '@shared/crypto/credential-encryption';
import { CircuitBreaker } from './circuit-breaker';

const router = Router();
const GW_PROVIDERS_CACHE_KEY = 'gw:providers';

// ─── Get Gateway Providers ───────────────────────────────────────────────
router.get('/providers', jwtMiddleware, async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cached = await redisService.get(GW_PROVIDERS_CACHE_KEY);
    if (cached) {
      res.json(cached);
      return;
    }

    const providers = await prisma.gatewayProvider.findMany({
      where: { isActive: true }
    });

    await redisService.setex(GW_PROVIDERS_CACHE_KEY, 300, providers);
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch gateway providers' });
  }
});

// ─── Get Configurations ───────────────────────────────────────────────────
router.get('/configurations', jwtMiddleware, async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const configs = await prisma.merchantGatewayConfiguration.findMany({
      where: { merchantId: req.merchantId, deletedAt: null },
      include: { gatewayProvider: true },
      orderBy: { priority: 'asc' }
    });

    const response = await Promise.all(configs.map(async (c) => {
      // Get real-time circuit breaker status from Redis
      const breaker = CircuitBreaker.getBreaker(c.id);
      const state = await breaker.getState();
      
      return {
        id: c.id,
        gatewayProviderId: c.gatewayProviderId,
        displayName: c.displayName,
        priority: c.priority,
        isActive: c.isActive,
        createdAt: c.createdAt,
        provider: c.gatewayProvider,
        circuitState: state
      };
    }));

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch gateway configurations' });
  }
});

// ─── Create Configuration ─────────────────────────────────────────────────
router.post(
  '/configurations',
  jwtMiddleware,
  validateBody(CreateGatewayConfigSchema),
  async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { gatewayProviderId, displayName, credentials, priority } = req.body;
      const encryptedCredentials = credentialEncryptionService.encrypt(JSON.stringify(credentials));

      const config = await prisma.merchantGatewayConfiguration.create({
        data: {
          id: generateUuidV7(),
          merchantId: req.merchantId!,
          gatewayProviderId,
          displayName,
          encryptedCredentials,
          priority
        }
      });

      logger.info({ merchantId: req.merchantId, configId: config.id }, 'Gateway configuration created');
      res.status(201).json({ id: config.id, message: 'Configuration created' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create configuration' });
    }
  }
);

// ─── Update Configuration ─────────────────────────────────────────────────
router.put(
  '/configurations/:id',
  jwtMiddleware,
  validateBody(UpdateGatewayConfigSchema),
  async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { displayName, credentials, priority, isActive } = req.body;

      const existing = await prisma.merchantGatewayConfiguration.findFirst({
        where: { id, merchantId: req.merchantId, deletedAt: null }
      });

      if (!existing) {
        res.status(404).json({ error: 'Configuration not found' });
        return;
      }

      const updateData: any = { displayName, priority, isActive };
      if (credentials) {
        updateData.encryptedCredentials = credentialEncryptionService.encrypt(JSON.stringify(credentials));
      }

      await prisma.merchantGatewayConfiguration.update({
        where: { id },
        data: updateData
      });

      res.json({ message: 'Configuration updated' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }
);

// ─── Delete Configuration ─────────────────────────────────────────────────
router.delete('/configurations/:id', jwtMiddleware, async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.merchantGatewayConfiguration.updateMany({
      where: { id, merchantId: req.merchantId! },
      data: { deletedAt: new Date(), isActive: false }
    });
    res.json({ message: 'Configuration deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// ─── Reset Circuit Breaker ─────────────────────────────────────────────────
router.post('/configurations/:id/circuit-reset', jwtMiddleware, async (req: JwtAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const config = await prisma.merchantGatewayConfiguration.findFirst({
      where: { id, merchantId: req.merchantId, deletedAt: null }
    });

    if (!config) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    const breaker = CircuitBreaker.getBreaker(id);
    await breaker.reset();
    res.json({ message: 'Circuit breaker reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

export default router;
