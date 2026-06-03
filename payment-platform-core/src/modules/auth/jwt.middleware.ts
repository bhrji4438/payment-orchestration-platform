import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redisService } from '@core/infrastructure/redis/redis.service';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'changeme_access_secret';
const SESSION_REVOKED_PREFIX = 'session:revoked:';

export interface JwtPayload {
  userId: string;
  merchantId: string;
  role: string;
  jti: string; // JWT ID for blacklisting
  iat: number;
  exp: number;
}

export interface JwtAuthenticatedRequest extends Request {
  userId?: string;
  merchantId?: string;
  role?: string;
}

export async function jwtMiddleware(
  req: JwtAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header is required.' });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;

    // Check JWT blacklist in Redis (for logout / password reset revocation)
    if (payload.jti) {
      const isRevoked = await redisService.exists(`${SESSION_REVOKED_PREFIX}${payload.jti}`);
      if (isRevoked) {
        res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
        return;
      }
    }

    req.userId = payload.userId;
    req.merchantId = payload.merchantId;
    req.role = payload.role;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Access token has expired.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid access token.' });
  }
}
