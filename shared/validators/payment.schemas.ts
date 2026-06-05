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

const CreatePaymentBaseSchema = z.object({
  amount: z.number().positive('Amount must be a positive number'),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code').default('USD'),
  gatewayConfigurationId: z.string().uuid('Gateway configuration ID must be a valid UUID').optional(),
  customerId: z.string().uuid('Customer ID must be a valid UUID').optional(),
  card: CardDetailsSchema.optional(),
  token: z.string().optional(),
  capture: z.boolean().default(true)
});

const LegacyPaymentSchema = CreatePaymentBaseSchema.refine(
  (data) => !!(data.card || data.token),
  {
    message: "Either card details or a payment token must be provided",
    path: ["card"]
  }
);

const UnifiedBillingAddressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(50),
  postalCode: z.string().min(3, 'Postal code is required').max(10),
  country: z.string().length(2, 'Country code must be ISO 2-letter')
});

const UnifiedCardDetailsSchema = z.object({
  cardholderName: z.string().min(2, 'Cardholder name is required'),
  cardNumber: z.string().regex(/^\d{13,19}$/, 'Card number must be between 13 and 19 digits'),
  expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Expiry month must be MM (01-12)'),
  expYear: z.string().regex(/^(20)?\d{2}$/, 'Expiry year must be YY or YYYY'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits')
});

const UnifiedEcheckDetailsSchema = z.object({
  accountHolderName: z.string().min(2, 'Account holder name is required'),
  holderType: z.enum(['personal', 'business']),
  accountType: z.enum(['checking', 'savings']),
  accountNumber: z.string().min(4, 'Account number is too short').max(20, 'Account number is too long'),
  routingNumber: z.string().regex(/^\d{9}$/, 'Routing number must be exactly 9 digits')
});

const UnifiedPaymentRequestBaseSchema = z.object({
  customerId: z.string().min(1, 'Please select or create a customer profile').uuid('Customer ID must be a valid UUID'),
  gatewayId: z.string().min(1, 'Gateway Configuration is required. Please select a gateway').uuid('Gateway ID must be a valid UUID'),
  amount: z.number().positive('Amount must be a positive number'),
  billingAddress: UnifiedBillingAddressSchema,
  shippingAddress: UnifiedBillingAddressSchema.optional().nullable(),
  customerSnapshot: z.object({
    email: z.string().email('Invalid customer email').optional().nullable(),
    phone: z.string().optional().nullable(),
    billingAddress: UnifiedBillingAddressSchema,
    shippingAddress: UnifiedBillingAddressSchema.optional().nullable()
  }).optional().nullable(),
  capture: z.boolean().default(true).optional()
});

const UnifiedCreditCardSchema = UnifiedPaymentRequestBaseSchema.extend({
  paymentMethodType: z.literal('credit_card'),
  paymentDetails: UnifiedCardDetailsSchema
});

const UnifiedEcheckSchema = UnifiedPaymentRequestBaseSchema.extend({
  paymentMethodType: z.literal('echeck'),
  paymentDetails: UnifiedEcheckDetailsSchema
});

export const UnifiedPaymentRequestSchema = z.discriminatedUnion('paymentMethodType', [
  UnifiedCreditCardSchema,
  UnifiedEcheckSchema
]);

export const CreatePaymentSchema = z.union([
  LegacyPaymentSchema,
  UnifiedPaymentRequestSchema
]);

export const CapturePaymentSchema = z.object({
  paymentId: z.string().uuid('Payment ID must be a valid UUID'),
  amount: z.number().positive('Amount must be a positive number')
});

export const TransactionPathParamsSchema = z.object({
  id: z.string().uuid('Transaction ID must be a valid UUID')
});

export const RefundPaymentSchema = z.object({
  paymentId: z.string().uuid('Payment ID must be a valid UUID'),
  amount: z.number().positive('Amount must be a positive number'),
  reason: z.string().optional()
});

export const VoidPaymentSchema = z.object({
  paymentId: z.string().uuid('Payment ID must be a valid UUID'),
  reason: z.string().optional()
});

const QueryArraySchema = z.union([z.string(), z.array(z.string())]).optional();

export const ListTransactionsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: QueryArraySchema,
  type: QueryArraySchema,
  paymentMethod: QueryArraySchema,
  gateway: QueryArraySchema,
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  amountMin: z.coerce.number().nonnegative().optional(),
  amountMax: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(['createdAt', 'amount', 'customer', 'status']).default('createdAt'),
  sort: z.enum(['createdAt', 'amount', 'customer', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  order: z.enum(['asc', 'desc']).optional()
}).refine(
  (query) => query.amountMin === undefined || query.amountMax === undefined || query.amountMin <= query.amountMax,
  {
    message: 'Minimum amount must be less than or equal to maximum amount',
    path: ['amountMin']
  }
);
