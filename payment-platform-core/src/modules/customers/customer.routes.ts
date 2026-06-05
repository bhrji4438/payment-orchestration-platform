import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '@core/modules/auth/auth.middleware';
import { validateBody } from '@core/middleware/validation.middleware';
import { CreateCustomerSchema, UpdateCustomerSchema, UpdateCustomerStatusSchema } from './customer.schemas';
import { customerService } from './customer.service';

const router = Router();
router.use(authMiddleware);

router.post(
  '/customers',
  validateBody(CreateCustomerSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await customerService.createCustomer(req.merchantId!, req.body);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/customers', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, limit, pageSize, page, sort, order, activeOnly, isActive } = req.query;
    const activeOnlyParam = activeOnly ?? isActive;
    const result = await customerService.listCustomers(req.merchantId!, {
      search: search as string,
      pageSize: pageSize ? Number(pageSize) : limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      sort: sort as string,
      order: order as 'asc' | 'desc',
      activeOnly: activeOnlyParam === 'true'
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/customers/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customer = await customerService.getCustomer(req.merchantId!, req.params.id);
    res.json(customer);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.put(
  '/customers/:id',
  validateBody(UpdateCustomerSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await customerService.updateCustomer(req.merchantId!, req.params.id, req.body);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.put(
  '/customers/:id/status',
  validateBody(UpdateCustomerStatusSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await customerService.setCustomerStatus(req.merchantId!, req.params.id, req.body.isActive);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
