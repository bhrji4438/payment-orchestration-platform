import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { generateUuidV7 } from '../../../shared/ids/generate-uuid-v7.ts';

const prisma = new PrismaClient();

export interface IdempotencyResult {
  isReplay: boolean;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  responsePayload?: any;
}

export class IdempotencyService {
  /**
   * Generates a SHA-256 hash of the request body to verify payload integrity
   */
  public generateHash(body: any): string {
    const payloadString = JSON.stringify(body || {});
    return createHash('sha256').update(payloadString).digest('hex');
  }

  /**
   * Checks or reserves the idempotency key in a transaction
   */
  public async getOrReserveKey(
    merchantId: string,
    idempotencyKey: string,
    requestHash: string,
    ttlSeconds = 86400 // 24 Hours default
  ): Promise<IdempotencyResult> {
    // Run inside an isolated transaction to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.idempotencyKey.findUnique({
        where: {
          merchantId_idempotencyKey: {
            merchantId,
            idempotencyKey
          }
        }
      });

      if (existing) {
        // Validate request hash matches
        if (existing.requestHash !== requestHash) {
          throw new Error('Idempotency Key collision: The payload for this key does not match the original request.');
        }

        // Check if key is expired
        if (new Date() > existing.expiresAt) {
          // Key expired, delete and let it re-process
          await tx.idempotencyKey.delete({
            where: { id: existing.id }
          });
        } else {
          return {
            isReplay: true,
            status: existing.status as any,
            responsePayload: JSON.parse(existing.responsePayload)
          };
        }
      }

      // Key does not exist or expired; reserve it now
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      await tx.idempotencyKey.create({
        data: {
          id: generateUuidV7(),
          merchantId,
          idempotencyKey,
          requestHash,
          responsePayload: JSON.stringify({}),
          status: 'PROCESSING',
          expiresAt
        }
      });

      return {
        isReplay: false,
        status: 'PROCESSING'
      };
    });
  }

  /**
   * Saves the final response to the reserved idempotency key
   */
  public async completeKey(
    merchantId: string,
    idempotencyKey: string,
    responsePayload: any,
    status: 'COMPLETED' | 'FAILED'
  ): Promise<void> {
    await prisma.idempotencyKey.update({
      where: {
        merchantId_idempotencyKey: {
          merchantId,
          idempotencyKey
        }
      },
      data: {
        status,
        responsePayload: JSON.stringify(responsePayload)
      }
    });
  }
}

export const idempotencyService = new IdempotencyService();
