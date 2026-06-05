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
        gatewayId: req.body.gatewayId,
        customerId: req.body.customerId,
        card: req.body.card,
        token: req.body.token,
        capture: req.body.capture,
        paymentMethodType: req.body.paymentMethodType,
        billingAddress: req.body.billingAddress,
        shippingAddress: req.body.shippingAddress,
        customerSnapshot: req.body.customerSnapshot,
        paymentDetails: req.body.paymentDetails
      });

      if (!payment) {
        res.status(500).json({ error: 'Failed to create payment record.' });
        return;
      }

      if (payment.status === 'FAILED') {
        const lastAttempt = await prisma.paymentAttempt.findFirst({
          where: { paymentId: payment.id },
          orderBy: { createdAt: 'desc' }
        });
        res.status(400).json({
          error: lastAttempt?.responseMessage || 'Transaction failed across all gateway channels.',
          paymentId: payment.id
        });
        return;
      }

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
    const { status, search, pageSize = 10, page = 1, sort, order } = req.query;

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

    const take = Number(pageSize);
    const skip = (Number(page) - 1) * take;
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    
    let orderBy: any = { createdAt: sortOrder };
    if (sort === 'amount') {
      orderBy = { amount: sortOrder };
    } else if (sort === 'customer') {
      orderBy = { customer: { firstName: sortOrder } };
    } else if (sort === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    }
    
    const [total, payments] = await prisma.$transaction([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          gatewayConfig: {
            include: { gatewayProvider: true }
          },
          customer: true
        }
      })
    ]);

    const formatted = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      cardBrand: p.cardBrand,
      cardLastFour: p.cardLastFour,
      gateway: p.gatewayConfig?.gatewayProvider.name || 'Direct',
      createdAt: p.createdAt,
      customer: p.customer ? {
        id: p.customer.id,
        firstName: p.customer.firstName,
        lastName: p.customer.lastName,
        email: p.customer.email
      } : null
    }));

    res.json({
      data: formatted,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take)
      }
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
    // 1. Try to find a payment record first (since virtual terminal uses paymentId)
    let payment = await prisma.payment.findFirst({
      where: {
        id: req.params.id,
        merchantId: req.merchantId!,
        deletedAt: null
      },
      include: {
        gatewayConfig: true,
        attempts: { orderBy: { createdAt: 'desc' } }
      }
    });

    // 2. If not found, try to find a transaction record and get its associated payment
    if (!payment) {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: req.params.id,
          payment: { merchantId: req.merchantId! },
          deletedAt: null
        },
        include: {
          payment: {
            include: {
              gatewayConfig: true,
              attempts: { orderBy: { createdAt: 'desc' } }
            }
          }
        }
      });

      if (transaction) {
        payment = transaction.payment;
      }
    }

    if (!payment) {
      res.status(404).json({ error: 'Transaction or Payment not found' });
      return;
    }

    const lastAttempt = payment.attempts[0];
    const errorMsg = payment.status === 'FAILED' ? (lastAttempt?.responseMessage || 'Transaction failed') : undefined;

    res.json({
      transactionId: payment.id,
      status: payment.status,
      gateway: payment.gatewayConfig?.displayName || 'Direct',
      customerSnapshot: payment.customerSnapshot,
      paymentSnapshot: payment.paymentDetails,
      receiptData: {
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        paymentMethodType: payment.paymentMethodType,
        billingAddress: payment.billingAddress,
        shippingAddress: payment.shippingAddress,
        cardBrand: payment.cardBrand,
        cardLastFour: payment.cardLastFour,
        gatewayToken: payment.gatewayToken,
        errorMsg: errorMsg
      }
    });
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
