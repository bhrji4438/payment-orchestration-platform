import { prisma } from '@core/infrastructure/database/prisma';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { logger } from '@shared/logger/logger';

export class CustomerService {
  public async createCustomer(merchantId: string, data: any) {
    // Check if customer with email already exists for this merchant
    const existing = await prisma.customer.findUnique({
      where: {
        merchantId_email: {
          merchantId,
          email: data.email
        }
      }
    });

    if (existing) {
      throw new Error('A customer with this email already exists.');
    }

    const customer = await prisma.customer.create({
      data: {
        id: generateUuidV7(),
        merchantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        phone: data.phone,
        mobilePhone: data.mobilePhone,
        billingAddress: data.billingAddress || null,
        shippingAddress: data.shippingAddress || null,
        isActive: true
      }
    });

    logger.info({ merchantId, customerId: customer.id }, 'Customer created');
    return customer;
  }

  public async getCustomer(merchantId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, merchantId, deletedAt: null }
    });
    if (!customer) throw new Error('Customer not found');
    return customer;
  }

  public async updateCustomer(merchantId: string, id: string, data: any) {
    const customer = await this.getCustomer(merchantId, id);

    if (data.email && data.email !== customer.email) {
      const existing = await prisma.customer.findUnique({
        where: {
          merchantId_email: {
            merchantId,
            email: data.email
          }
        }
      });
      if (existing) throw new Error('A customer with this email already exists.');
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        billingAddress: data.billingAddress !== undefined ? data.billingAddress : customer.billingAddress,
        shippingAddress: data.shippingAddress !== undefined ? data.shippingAddress : customer.shippingAddress
      }
    });

    logger.info({ merchantId, customerId: updated.id }, 'Customer updated');
    return updated;
  }

  public async setCustomerStatus(merchantId: string, id: string, isActive: boolean) {
    await this.getCustomer(merchantId, id);
    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive }
    });
    logger.info({ merchantId, customerId: updated.id, isActive }, 'Customer status changed');
    return updated;
  }

  public async listCustomers(merchantId: string, params: { search?: string, pageSize?: number, page?: number, sort?: string, order?: 'asc' | 'desc' }) {
    const { search, pageSize = 10, page = 1, sort, order } = params;
    
    const where: any = {
      merchantId,
      deletedAt: null
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const take = Number(pageSize);
    const skip = (Number(page) - 1) * take;
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    
    let orderBy: any = { createdAt: sortOrder };
    if (sort === 'customer') {
      orderBy = { firstName: sortOrder };
    } else if (sort === 'companyName') {
      orderBy = { companyName: sortOrder };
    } else if (sort === 'isActive') {
      orderBy = { isActive: sortOrder };
    } else if (sort === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    }

    const [total, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        take,
        skip,
        orderBy
      })
    ]);

    return {
      data: customers,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }
}

export const customerService = new CustomerService();
