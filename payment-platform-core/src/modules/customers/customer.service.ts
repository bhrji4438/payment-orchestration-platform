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

  public async listCustomers(merchantId: string, params: { search?: string, limit?: number, cursor?: string }) {
    const { search, limit = 50, cursor } = params;
    
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

    const take = Number(limit);

    const customers = await prisma.customer.findMany({
      where,
      take: take + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor }
      }),
      orderBy: { createdAt: 'desc' }
    });

    let nextCursor: string | null = null;
    if (customers.length > take) {
      const nextItem = customers.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: customers,
      nextCursor
    };
  }
}

export const customerService = new CustomerService();
