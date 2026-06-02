import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { generateUuidV7 } from '../../../../shared/ids/generate-uuid-v7.ts';

const prisma = new PrismaClient();
const apiKeyCache = new Map<string, { merchantId: string; apiKeyId: string }>();

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

    prisma.apiKeyUsage.create({
      data: {
        id: generateUuidV7(),
        apiKeyId: apiKeyId,
        endpoint: req.originalUrl,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        status: 200
      }
    }).catch(err => console.error('Failed to log API key usage:', err));

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Authentication internal subsystem error' });
  }
}
export default authMiddleware;
