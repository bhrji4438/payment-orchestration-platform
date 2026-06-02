import { z } from 'zod';

const BillingAddressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(3).max(10),
  country: z.string().length(2, 'Country code must be ISO 2-letter')
});

const CardDetailsSchema = z.object({
  pan: z.string().regex(/^\d{13,19}$/, 'PAN must be between 13 and 19 digits'),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Expiry month must be MM (01-12)'),
  expiryYear: z.string().regex(/^(20)\d{2}$/, 'Expiry year must be YYYY'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  holderName: z.string().min(2, 'Cardholder name is required'),
  billingAddress: BillingAddressSchema.optional()
});

export const CreatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code').default('USD'),
  gatewayConfigurationId: z.string().uuid('Gateway configuration ID must be a valid UUID').optional(),
  customerId: z.string().uuid('Customer ID must be a valid UUID').optional(),
  card: CardDetailsSchema.optional(),
  token: z.string().optional(),
  capture: z.boolean().default(true)
}).refine(data => data.card || data.token, {
  message: "Either card details or a payment token must be provided",
  path: ["card"]
});

export const CapturePaymentSchema = z.object({
  amount: z.number().positive('Amount must be a positive number')
});

export const RefundPaymentSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  reason: z.string().optional()
});

export const VoidPaymentSchema = z.object({
  reason: z.string().optional()
});
