import { PrismaClient } from '@prisma/client';
import { generateUuidV7 } from '../../../../shared/ids/generate-uuid-v7.ts';
import { logger } from '../../../../shared/logger/logger.ts';

const prisma = new PrismaClient();

export async function createInvoice(paymentData: { paymentId: string; merchantId: string; amount: number; currency: string }) {
  try {
    const { paymentId, merchantId, amount, currency } = paymentData;

    // Check if invoice already exists
    const existing = await prisma.invoice.findFirst({
      where: { paymentId }
    });
    if (existing) return;

    logger.info({ paymentId }, 'Generating invoice for captured payment');

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pdfUrl = `https://paymentplatform-invoices.s3.amazonaws.com/${invoiceNumber}.pdf`;

    const invoice = await prisma.invoice.create({
      data: {
        id: generateUuidV7(),
        merchantId,
        paymentId,
        number: invoiceNumber,
        pdfUrl,
        status: 'PAID'
      }
    });

    logger.info({ invoiceNumber, invoiceId: invoice.id }, 'Successfully created invoice record');

    // Publish event outbox entry
    await prisma.outboxEvent.create({
      data: {
        id: generateUuidV7(),
        topic: 'invoice.created',
        key: invoice.id,
        payload: JSON.stringify({
          invoiceId: invoice.id,
          paymentId,
          merchantId,
          amount,
          invoiceNumber,
          pdfUrl
        }),
        status: 'PENDING'
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create invoice');
  }
}
