import { Prisma } from '@prisma/client';
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';
import { prisma } from './prisma';

export class PaymentRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  public async create(data: Prisma.PaymentUncheckedCreateInput) {
    return this.tx.payment.create({ data });
  }

  public async update(id: string, data: Prisma.PaymentUncheckedUpdateInput, expectedVersion?: number) {
    if (expectedVersion !== undefined) {
      // Optimistic locking: update if version matches expected
      const updated = await this.tx.payment.updateMany({
        where: { id, version: expectedVersion, deletedAt: null },
        data: {
          ...data,
          version: { increment: 1 }
        }
      });

      if (updated.count === 0) {
        throw new Error('OptimisticLockError: The payment record was modified by another request.');
      }

      return this.tx.payment.findUnique({
        where: { id }
      });
    }

    return this.tx.payment.update({
      where: { id },
      data
    });
  }

  public async findById(id: string) {
    return this.tx.payment.findFirst({
      where: { id, deletedAt: null },
      include: { attempts: true, gatewayConfig: true }
    });
  }

  public async softDelete(id: string, userId?: string): Promise<void> {
    await this.tx.payment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId
      }
    });
  }
}

export class TransactionRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  public async create(data: Prisma.TransactionUncheckedCreateInput) {
    return this.tx.transaction.create({ data });
  }

  public async findById(id: string) {
    return this.tx.transaction.findFirst({
      where: { id, deletedAt: null }
    });
  }
}

export class TransactionEventRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  public async create(data: Prisma.TransactionEventUncheckedCreateInput) {
    return this.tx.transactionEvent.create({ data });
  }
}

export class OutboxEventRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  public async create(topic: string, key: string | null, payload: any) {
    return this.tx.outboxEvent.create({
      data: {
        id: generateUuidV7(),
        topic,
        key,
        payload: JSON.stringify(payload),
        status: 'PENDING'
      }
    });
  }
}

export class UnitOfWork {
  public async run<T>(
    callback: (
      repos: {
        payments: PaymentRepository;
        transactions: TransactionRepository;
        transactionEvents: TransactionEventRepository;
        outbox: OutboxEventRepository;
      },
      tx: Prisma.TransactionClient
    ) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const payments = new PaymentRepository(tx);
      const transactions = new TransactionRepository(tx);
      const transactionEvents = new TransactionEventRepository(tx);
      const outbox = new OutboxEventRepository(tx);
      return callback({ payments, transactions, transactionEvents, outbox }, tx);
    });
  }
}

export const uow = new UnitOfWork();
