import { Router, Response } from 'express';
import { prisma } from '@core/infrastructure/database/prisma';
import { authMiddleware, AuthenticatedRequest } from '@core/modules/auth/auth.middleware';
import { idempotencyMiddleware } from '@core/middleware/idempotency.middleware';
import { validateBody } from '@core/middleware/validation.middleware';
import {
  CreatePaymentSchema,
  CapturePaymentSchema,
  RefundPaymentSchema,
  VoidPaymentSchema
} from '@shared/validators/payment.schemas';
import { paymentService } from './payment.service';
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
  validateBody(CapturePaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId, amount } = req.body;

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
  validateBody(RefundPaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId, amount, reason } = req.body;

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
  validateBody(VoidPaymentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { paymentId, reason } = req.body;

    try {
      const payment = await paymentService.voidPayment(paymentId, reason);
      res.status(200).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/payments/:id/sync',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payment = await paymentService.syncPaymentStatus(req.params.id);
      res.status(200).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/payments', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, search, limit = 50, cursor } = req.query;

    const where: any = {
      merchantId: req.merchantId!,
      deletedAt: null
    };

    if (status) {
      where.status = status as string;
    }

    if (search) {
      const searchStr = search as string;
      where.OR = [
        { id: { contains: searchStr, mode: 'insensitive' } },
        { cardLastFour: { contains: searchStr } }
      ];
    }

    const take = Number(limit);
    
    const payments = await prisma.payment.findMany({
      where,
      take: take + 1, // Fetch 1 extra to check if there is a next page
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor as string }
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        gatewayConfig: {
          include: { gatewayProvider: true }
        }
      }
    });

    let nextCursor: string | null = null;
    if (payments.length > take) {
      const nextItem = payments.pop();
      nextCursor = nextItem!.id;
    }

    const formatted = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      cardBrand: p.cardBrand,
      cardLastFour: p.cardLastFour,
      gateway: p.gatewayConfig?.gatewayProvider.name || 'Direct',
      createdAt: p.createdAt
    }));

    res.json({
      data: formatted,
      nextCursor
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
