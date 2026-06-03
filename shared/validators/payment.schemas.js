"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoidPaymentSchema = exports.RefundPaymentSchema = exports.CapturePaymentSchema = exports.CreatePaymentSchema = void 0;
const zod_1 = require("zod");
const BillingAddressSchema = zod_1.z.object({
    addressLine1: zod_1.z.string().min(1, 'Address line 1 is required'),
    city: zod_1.z.string().min(1, 'City is required'),
    state: zod_1.z.string().min(2).max(50),
    postalCode: zod_1.z.string().min(3).max(10),
    country: zod_1.z.string().length(2, 'Country code must be ISO 2-letter')
});
const CardDetailsSchema = zod_1.z.object({
    pan: zod_1.z.string().regex(/^\d{13,19}$/, 'PAN must be between 13 and 19 digits'),
    expiryMonth: zod_1.z.string().regex(/^(0[1-9]|1[0-2])$/, 'Expiry month must be MM (01-12)'),
    expiryYear: zod_1.z.string().regex(/^(20)\d{2}$/, 'Expiry year must be YYYY'),
    cvv: zod_1.z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
    holderName: zod_1.z.string().min(2, 'Cardholder name is required'),
    billingAddress: BillingAddressSchema.optional()
});
exports.CreatePaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be a positive number'),
    currency: zod_1.z.string().length(3, 'Currency must be a 3-character ISO code').default('USD'),
    gatewayConfigurationId: zod_1.z.string().uuid('Gateway configuration ID must be a valid UUID').optional(),
    customerId: zod_1.z.string().uuid('Customer ID must be a valid UUID').optional(),
    card: CardDetailsSchema.optional(),
    token: zod_1.z.string().optional(),
    capture: zod_1.z.boolean().default(true)
}).refine(data => data.card || data.token, {
    message: "Either card details or a payment token must be provided",
    path: ["card"]
});
exports.CapturePaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be a positive number')
});
exports.RefundPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be a positive number'),
    reason: zod_1.z.string().optional()
});
exports.VoidPaymentSchema = zod_1.z.object({
    reason: zod_1.z.string().optional()
});
