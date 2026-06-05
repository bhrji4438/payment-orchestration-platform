import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@core/infrastructure/database/prisma';
import { authMiddleware, AuthenticatedRequest } from '@core/modules/auth/auth.middleware';
import { idempotencyMiddleware } from '@core/middleware/idempotency.middleware';
import { validateBody } from '@core/middleware/validation.middleware';
import {
  CreatePaymentSchema,
  CapturePaymentSchema,
  ListTransactionsQuerySchema,
  RefundPaymentSchema,
  TransactionPathParamsSchema,
  VoidPaymentSchema
} from '@shared/validators/payment.schemas';
import { getTransactionActions } from '@shared/transactions/transaction-lifecycle';
import { paymentService } from './payment.service';
const router = Router();

router.use(authMiddleware);

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(',').map(item => item.trim()).filter(Boolean);
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function buildTransactionResource(payment: any) {
  const customerName = payment.customer
    ? `${payment.customer.firstName || ''} ${payment.customer.lastName || ''}`.trim()
    : '';
  const refundTotal = (payment.refunds || [])
    .filter((refund: any) => refund.status === 'SUCCESS')
    .reduce((total: number, refund: any) => total + Number(refund.amount), 0);

  return {
    id: payment.id,
    transactionId: payment.id,
    type: payment.transactionType,
    amount: toNumber(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paymentMethodType: payment.paymentMethodType,
    paymentMethodBrand: payment.cardBrand,
    cardBrand: payment.cardBrand,
    last4: payment.cardLastFour,
    cardLastFour: payment.cardLastFour,
    gateway: payment.gatewayConfig?.displayName || payment.gatewayConfig?.gatewayProvider?.name || 'Direct',
    gatewayProviderCode: payment.gatewayConfig?.gatewayProvider?.code || null,
    gatewayTransactionId: payment.gatewayTransactionId || payment.gatewayToken,
    receiptNumber: payment.receiptNumber,
    refundableAmount: toNumber(payment.refundableAmount),
    refundedAmount: refundTotal,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    availableActions: getTransactionActions({
      status: payment.status,
      type: payment.transactionType,
      refundableAmount: payment.refundableAmount
    }),
    customer: payment.customer ? {
      id: payment.customer.id,
      firstName: payment.customer.firstName,
      lastName: payment.customer.lastName,
      name: customerName,
      email: payment.customer.email
    } : null
  };
}

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
  '/transactions/:id/capture',
  idempotencyMiddleware(),
  validateBody(CapturePaymentSchema.omit({ paymentId: true })),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const params = TransactionPathParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: 'Validation failed', details: params.error.errors });
      return;
    }

    try {
      const payment = await paymentService.capturePayment(params.data.id, req.body.amount);
      res.status(200).json(buildTransactionResource({ ...payment, refunds: [], customer: null }));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/transactions/:id/void',
  idempotencyMiddleware(),
  validateBody(VoidPaymentSchema.omit({ paymentId: true })),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const params = TransactionPathParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: 'Validation failed', details: params.error.errors });
      return;
    }

    try {
      const payment = await paymentService.voidPayment(params.data.id, req.body.reason);
      res.status(200).json(buildTransactionResource({ ...payment, refunds: [], customer: null }));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/transactions/:id/refund',
  idempotencyMiddleware(),
  validateBody(RefundPaymentSchema.omit({ paymentId: true })),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const params = TransactionPathParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: 'Validation failed', details: params.error.errors });
      return;
    }

    try {
      const payment = await paymentService.refundPayment(params.data.id, req.body.amount, req.body.reason);
      res.status(200).json(buildTransactionResource({ ...payment, refunds: [], customer: null }));
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

async function listTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parsed = ListTransactionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }

    const query = parsed.data;
    const page = query.page;
    const take = query.pageSize ?? query.limit;
    const sortBy = query.sort ?? query.sortBy;
    const sortOrder = query.order ?? query.sortOrder;
    const statusFilters = toArray(query.status);
    const typeFilters = toArray(query.type);
    const methodFilters = toArray(query.paymentMethod).map(method => method.toUpperCase().replace(/\s+/g, '_'));
    const gatewayFilters = toArray(query.gateway);

    const where: Prisma.PaymentWhereInput = {
      merchantId: req.merchantId!,
      deletedAt: null
    };

    if (statusFilters.length > 0) {
      where.status = { in: statusFilters.map(status => status.toUpperCase()) };
    }

    if (typeFilters.length > 0) {
      where.transactionType = { in: typeFilters.map(type => type.toUpperCase()) };
    }

    if (methodFilters.length > 0) {
      where.cardBrand = { in: methodFilters };
    }

    if (gatewayFilters.length > 0) {
      where.gatewayConfig = {
        OR: [
          { id: { in: gatewayFilters } },
          { displayName: { in: gatewayFilters, mode: 'insensitive' } },
          { gatewayProvider: { code: { in: gatewayFilters.map(gateway => gateway.toUpperCase()) } } },
          { gatewayProvider: { name: { in: gatewayFilters, mode: 'insensitive' } } }
        ]
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) })
      };
    }

    if (query.amountMin !== undefined || query.amountMax !== undefined) {
      where.amount = {
        ...(query.amountMin !== undefined && { gte: query.amountMin }),
        ...(query.amountMax !== undefined && { lte: query.amountMax })
      };
    }

    if (query.search) {
      const searchStr = query.search;
      const isUuidSearch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchStr);
      where.OR = [
        ...(isUuidSearch ? [{ id: searchStr }] : []),
        { cardLastFour: { contains: searchStr } },
        { gatewayTransactionId: { contains: searchStr, mode: 'insensitive' } },
        { gatewayToken: { contains: searchStr, mode: 'insensitive' } },
        { receiptNumber: { contains: searchStr, mode: 'insensitive' } },
        { customer: { firstName: { contains: searchStr, mode: 'insensitive' } } },
        { customer: { lastName: { contains: searchStr, mode: 'insensitive' } } },
        { customer: { email: { contains: searchStr, mode: 'insensitive' } } }
      ];
    }

    const skip = (page - 1) * take;
    let orderBy: Prisma.PaymentOrderByWithRelationInput = { createdAt: sortOrder };
    if (sortBy === 'amount') {
      orderBy = { amount: sortOrder };
    } else if (sortBy === 'customer') {
      orderBy = { customer: { firstName: sortOrder } };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (sortBy === 'createdAt') {
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
          customer: true,
          refunds: true
        }
      })
    ]);

    const [availableGateways, availableMethods] = await Promise.all([
      prisma.merchantGatewayConfiguration.findMany({
        where: { merchantId: req.merchantId!, isActive: true, deletedAt: null },
        include: { gatewayProvider: true },
        orderBy: { displayName: 'asc' }
      }),
      prisma.payment.findMany({
        where: { merchantId: req.merchantId!, deletedAt: null, cardBrand: { not: null } },
        distinct: ['cardBrand'],
        select: { cardBrand: true },
        orderBy: { cardBrand: 'asc' }
      })
    ]);

    res.json({
      data: payments.map(buildTransactionResource),
      pagination: {
        page,
        pageSize: take,
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      },
      filters: {
        availableGateways: availableGateways.map(gateway => ({
          id: gateway.id,
          name: gateway.displayName,
          provider: gateway.gatewayProvider.name,
          code: gateway.gatewayProvider.code
        })),
        availableMethods: availableMethods.map(method => method.cardBrand).filter(Boolean)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

router.get('/payments', listTransactions);
router.get('/transactions', listTransactions);

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
        gatewayConfig: { include: { gatewayProvider: true } },
        customer: true,
        attempts: { orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
        voids: { orderBy: { createdAt: 'desc' } },
        invoices: true,
        events: { orderBy: { createdAt: 'asc' } }
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
              gatewayConfig: { include: { gatewayProvider: true } },
              customer: true,
              attempts: { orderBy: { createdAt: 'desc' } },
              refunds: { orderBy: { createdAt: 'desc' } },
              voids: { orderBy: { createdAt: 'desc' } },
              invoices: true,
              events: { orderBy: { createdAt: 'asc' } }
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
    const refundTotal = payment.refunds
      .filter(refund => refund.status === 'SUCCESS')
      .reduce((total, refund) => total + Number(refund.amount), 0);

    res.json({
      transactionId: payment.id,
      receiptNumber: payment.receiptNumber,
      type: payment.transactionType,
      status: payment.status,
      gateway: payment.gatewayConfig?.displayName || payment.gatewayConfig?.gatewayProvider.name || 'Direct',
      gatewayProvider: payment.gatewayConfig?.gatewayProvider?.name || null,
      gatewayTransactionId: payment.gatewayTransactionId || payment.gatewayToken,
      customerSnapshot: payment.customerSnapshot || (payment.customer ? {
        firstName: payment.customer.firstName,
        lastName: payment.customer.lastName,
        email: payment.customer.email,
        phone: payment.customer.phone
      } : null),
      paymentSnapshot: payment.paymentDetails,
      refunds: payment.refunds.map(refund => ({
        id: refund.id,
        amount: Number(refund.amount),
        reason: refund.reason,
        status: refund.status,
        gatewayTxnId: refund.gatewayTxnId,
        createdAt: refund.createdAt
      })),
      timeline: payment.events.map(event => ({
        id: event.id,
        eventType: event.eventType,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        amount: event.amount ? Number(event.amount) : null,
        gatewayTxnId: event.gatewayTxnId,
        reason: event.reason,
        createdAt: event.createdAt
      })),
      receiptData: {
        amount: Number(payment.amount),
        currency: payment.currency,
        createdAt: payment.createdAt,
        paymentMethodType: payment.paymentMethodType,
        billingAddress: payment.billingAddress,
        shippingAddress: payment.shippingAddress,
        cardBrand: payment.cardBrand,
        cardLastFour: payment.cardLastFour,
        gatewayToken: payment.gatewayToken,
        refundableAmount: Number(payment.refundableAmount),
        refundedAmount: refundTotal,
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
