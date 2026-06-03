import { Request, Response, NextFunction } from 'express';
import { idempotencyService } from '@core/services/idempotency.service';

export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.header('Idempotency-Key');
    // Extract merchantId (which is set on req by the authentication middleware)
    const merchantId = (req as any).merchantId;

    if (!idempotencyKey) {
      return next();
    }

    if (!merchantId) {
      res.status(400).json({ error: 'Merchant validation required for idempotent requests.' });
      return;
    }

    const requestHash = idempotencyService.generateHash(req.body);

    try {
      const lockResult = await idempotencyService.getOrReserveKey(
        merchantId,
        idempotencyKey,
        requestHash
      );

      if (lockResult.isReplay) {
        if (lockResult.status === 'PROCESSING') {
          res.status(409).json({
            error: 'Conflict: A request with this Idempotency-Key is already in progress.'
          });
          return;
        }

        // Return the cached response
        res.status(200).json(lockResult.responsePayload);
        return;
      }

      // Intercept res.json to capture response when request finishes
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        // Complete the key with success or failure depending on status code
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        idempotencyService.completeKey(
          merchantId,
          idempotencyKey,
          body,
          isSuccess ? 'COMPLETED' : 'FAILED'
        ).catch((err) => {
          console.error('Failed to complete idempotency key:', err);
        });

        return originalJson(body);
      };

      next();
    } catch (error: any) {
      if (error.message.includes('Idempotency Key collision')) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal idempotency subsystem failure' });
    }
  };
}
