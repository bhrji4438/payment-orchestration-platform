import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../auth/auth.middleware.ts';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware.ts';
import { validateBody } from '../../middleware/validation.middleware.ts';
import {
  CreatePaymentSchema
} from '../../../../shared/validators/payment.schemas.ts';
import { paymentService } from './payment.service.ts';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware);

router.post(
  '/payments',
  idempotencyMiddleware(),
  validateBody(CreatePaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payment = await paymentService.createPayment({
        merchantId: req.merchantId!,
        amount: req.body.amount,
        currency: req.body.currency,
        gatewayConfigurationId: req.body.gatewayConfigurationId,
        customerId: req.body.customerId,
        card: req.body.card,
        token: req.body.token,
        capture: req.body.capture
      });

      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/captures',
  idempotencyMiddleware(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId, amount } = req.body;
    if (!paymentId || !amount) {
      res.status(400).json({ error: 'paymentId and amount are required.' });
      return;
    }

    try {
      const payment = await paymentService.capturePayment(paymentId, amount);
      res.status(200).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/refunds',
  idempotencyMiddleware(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId, amount, reason } = req.body;
    if (!paymentId || !amount) {
      res.status(400).json({ error: 'paymentId and amount are required.' });
      return;
    }

    try {
      const payment = await paymentService.refundPayment(paymentId, amount, reason);
      res.status(200).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/voids',
  idempotencyMiddleware(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId, reason } = req.body;
    if (!paymentId) {
      res.status(400).json({ error: 'paymentId is required.' });
      return;
    }

    try {
      const payment = await paymentService.voidPayment(paymentId, reason);
      res.status(200).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/payments/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: req.params.id,
        merchantId: req.merchantId!,
        deletedAt: null
      },
      include: {
        attempts: { orderBy: { createdAt: 'desc' } },
        refunds: true,
        voids: true,
        invoices: true
      }
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        payment: { merchantId: req.merchantId! },
        deletedAt: null
      }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/refunds/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const refund = await prisma.refund.findFirst({
      where: {
        id: req.params.id,
        payment: { merchantId: req.merchantId! },
        deletedAt: null
      }
    });

    if (!refund) {
      res.status(404).json({ error: 'Refund not found' });
      return;
    }

    res.json(refund);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
