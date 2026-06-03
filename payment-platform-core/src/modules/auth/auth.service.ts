import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { prisma } from '@core/infrastructure/database/prisma';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';
import { redisService } from '@core/infrastructure/redis/redis.service';
import type {
  SignupInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput
} from './auth.schemas';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'changeme_access_secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'changeme_refresh_secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const SESSION_REVOKED_PREFIX = 'session:revoked:';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  jti: string;
}

function generateAccessToken(payload: { userId: string; merchantId: string; role: string }): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ ...payload, jti }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  return { token, jti };
}

function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

export class AuthService {
  // ─── Sign Up ──────────────────────────────────────────────────────────────
  public async signup(input: SignupInput, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    // Get or create the MERCHANT role
    let merchantRole = await prisma.role.findUnique({ where: { name: 'MERCHANT' } });
    if (!merchantRole) {
      merchantRole = await prisma.role.create({
        data: {
          id: generateUuidV7(),
          name: 'MERCHANT',
          description: 'Merchant User'
        }
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const merchantId = generateUuidV7();
    const userId = generateUuidV7();
    const apiKeyPlain = `sk_live_${randomBytes(24).toString('hex')}`;
    const hashedApiKey = createHash('sha256').update(apiKeyPlain).digest('hex');

    // Atomic creation: merchant + user + merchant-user link + API key
    await prisma.$transaction(async (tx) => {
      await tx.merchant.create({
        data: {
          id: merchantId,
          name: input.merchantName,
          status: 'ACTIVE'
        }
      });

      await tx.user.create({
        data: {
          id: userId,
          email: input.email,
          password: passwordHash,
          name: input.name,
          roleId: merchantRole!.id,
          isActive: true
        }
      });

      await tx.merchantUser.create({
        data: {
          id: generateUuidV7(),
          merchantId,
          userId
        }
      });

      await tx.apiKey.create({
        data: {
          id: generateUuidV7(),
          merchantId,
          hashedKey: hashedApiKey,
          prefix: 'sk_live',
          name: 'Default API Key',
          isActive: true
        }
      });
    });

    logger.info({ userId, merchantId }, 'New merchant signed up');

    // Issue tokens immediately after signup
    const tokens = await this._issueTokenPair(userId, merchantId, merchantRole.name, ipAddress, userAgent);

    return {
      user: { id: userId, email: input.email, name: input.name },
      merchant: { id: merchantId, name: input.merchantName },
      apiKeyPlain, // returned ONCE at signup only
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  public async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        role: true,
        merchantUsers: { include: { merchant: true }, take: 1 }
      }
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new Error('Invalid credentials.');
    }

    const passwordMatch = await bcrypt.compare(input.password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid credentials.');
    }

    const merchantUser = user.merchantUsers[0];
    if (!merchantUser || merchantUser.merchant.status !== 'ACTIVE') {
      throw new Error('Your merchant account is not active. Please contact support.');
    }

    const tokens = await this._issueTokenPair(
      user.id,
      merchantUser.merchantId,
      user.role.name,
      ipAddress,
      userAgent
    );

    logger.info({ userId: user.id, merchantId: merchantUser.merchantId }, 'User logged in');

    return {
      user: { id: user.id, email: user.email, name: user.name },
      merchant: { id: merchantUser.merchantId, name: merchantUser.merchant.name },
      ...tokens
    };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  public async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { include: { role: true, merchantUsers: { include: { merchant: true }, take: 1 } } } }
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new Error('Refresh token is invalid or expired. Please log in again.');
    }

    // Rotate: revoke old session, issue new pair
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    const merchantUser = session.user.merchantUsers[0];
    if (!merchantUser) throw new Error('Merchant association not found.');

    const tokens = await this._issueTokenPair(
      session.userId,
      merchantUser.merchantId,
      session.user.role.name,
      ipAddress,
      userAgent
    );

    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  public async logout(refreshToken: string, jti?: string) {
    await prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    // Blacklist the access token in Redis so it is instantly rejected
    if (jti) {
      await redisService.set(`${SESSION_REVOKED_PREFIX}${jti}`, '1', ACCESS_TOKEN_EXPIRY_SECONDS);
    }

    logger.info('Session revoked via logout');
  }

  // ─── Me ───────────────────────────────────────────────────────────────────
  public async getMe(userId: string, merchantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });

    if (!user || !user.isActive) throw new Error('User not found.');

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) throw new Error('Merchant not found.');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.name),
      merchant: {
        id: merchant.id,
        name: merchant.name,
        status: merchant.status
      }
    };
  }

  // ─── Password Reset Request ───────────────────────────────────────────────
  public async requestPasswordReset(input: PasswordResetRequestInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Always respond generically to prevent email enumeration
    if (!user || !user.isActive) {
      logger.info({ email: input.email }, 'Password reset requested for unknown/inactive email (silently ignored)');
      return;
    }

    // Invalidate existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        id: generateUuidV7(),
        userId: user.id,
        token,
        expiresAt
      }
    });

    // TODO: send email via notification service
    logger.info({ userId: user.id, token }, 'Password reset token generated (email delivery pending notification service)');
  }

  // ─── Password Reset Confirm ───────────────────────────────────────────────
  public async confirmPasswordReset(input: PasswordResetConfirmInput) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token: input.token }
    });

    if (!record || record.usedAt || new Date() > record.expiresAt) {
      throw new Error('Password reset token is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    // All active access tokens for this user are now stale — blacklist via Redis
    // We don't have each jti here, so the DB session revocation is sufficient;
    // existing access tokens will fail on next refresh (session marked revoked in DB).
    logger.info({ userId: record.userId }, 'Password reset completed; all sessions revoked');
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────
  private async _issueTokenPair(
    userId: string,
    merchantId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const { token: accessToken, jti } = generateAccessToken({ userId, merchantId, role });

    const rawRefreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.session.create({
      data: {
        id: generateUuidV7(),
        userId,
        refreshToken: rawRefreshToken,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      jti
    };
  }
}

export const authService = new AuthService();
