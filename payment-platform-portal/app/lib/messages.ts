/**
 * @file messages.ts
 * @description Centralized message registry — single source of truth for all
 * user-facing strings in the portal.
 *
 * Architecture decisions:
 * - Tag-based generic factories (GENERIC) for parameterized messages to avoid
 *   dozens of near-duplicate strings.
 * - Domain namespacing (AUTH, CUSTOMER, GATEWAY, PAYMENT, DEVELOPER, SYSTEM)
 *   for direct-reference constants — no magic strings scattered across pages.
 * - i18n-ready: replace the factory functions and constants with a
 *   translation loader (e.g. react-intl, next-intl) without changing any
 *   call-site code.
 *
 * Usage:
 *   import { Messages } from '@/lib/messages';
 *   Messages.CUSTOMER.CREATE_SUCCESS
 *   Messages.GENERIC.REQUIRED('Email address')
 *   Messages.SYSTEM.NETWORK_ERROR
 */

// ─── Generic Tag-Based Factories ──────────────────────────────────────────────
// Use these for messages that follow a common template pattern.
// Prefer these over hardcoding entity-specific strings wherever the pattern fits.

export const GENERIC = {
  /** "{Entity} is required" */
  REQUIRED: (entity: string) => `${entity} is required`,

  /** "{Entity} must be at least {n} characters" */
  MIN_LENGTH: (entity: string, min: number) =>
    `${entity} must be at least ${min} characters`,

  /** "{Entity} must be no more than {n} characters" */
  MAX_LENGTH: (entity: string, max: number) =>
    `${entity} must be no more than ${max} characters`,

  /** "{Entity} is invalid" */
  INVALID: (entity: string) => `${entity} is invalid`,

  /** "{Entity} already exists" */
  ALREADY_EXISTS: (entity: string) => `${entity} already exists`,

  /** "{Entity} not found" */
  NOT_FOUND: (entity: string) => `${entity} not found`,

  /** "Failed to {action}" */
  FAILED: (action: string) => `Failed to ${action}`,

  /** "{Entity} {actioned} successfully" */
  SUCCESS: (entity: string, action: string) => `${entity} ${action} successfully`,

  /** "Please select {entity}" */
  SELECT_REQUIRED: (entity: string) => `Please select ${entity}`,
} as const;

// ─── Validation Field Labels ───────────────────────────────────────────────────
// Canonical field names used in GENERIC factories to ensure consistency.

export const FIELD = {
  EMAIL: 'Email address',
  PASSWORD: 'Password',
  FIRST_NAME: 'First name',
  LAST_NAME: 'Last name',
  COMPANY_NAME: 'Company name',
  PHONE: 'Phone number',
  AMOUNT: 'Amount',
  CARD_NUMBER: 'Card number',
  CARDHOLDER_NAME: 'Cardholder name',
  EXPIRY: 'Expiry date',
  CVV: 'CVV',
  ACCOUNT_NUMBER: 'Account number',
  ROUTING_NUMBER: 'Routing number',
  ADDRESS_LINE_1: 'Address line 1',
  CITY: 'City',
  STATE: 'State',
  POSTAL_CODE: 'Postal code',
  COUNTRY: 'Country',
  BUSINESS_NAME: 'Business name',
  FULL_NAME: 'Full name',
  DISPLAY_NAME: 'Display name',
  PRIORITY: 'Priority',
  PROVIDER: 'Provider',
  API_KEY: 'API key',
  USERNAME: 'Username',
  GATEWAY: 'Gateway configuration',
  CUSTOMER: 'Customer profile',
} as const;

// ─── Validation Messages ───────────────────────────────────────────────────────
// Field-level inline validation strings. Consumed by Zod schemas and custom
// validate() functions in useFormValidation.

export const VALIDATION = {
  EMAIL_INVALID: 'Invalid email address',
  EMAIL_REQUIRED: GENERIC.REQUIRED(FIELD.EMAIL),

  PASSWORD_REQUIRED: GENERIC.REQUIRED(FIELD.PASSWORD),
  PASSWORD_MIN_LENGTH: GENERIC.MIN_LENGTH(FIELD.PASSWORD, 8),

  AMOUNT_REQUIRED: GENERIC.REQUIRED(FIELD.AMOUNT),
  AMOUNT_INVALID: 'Please enter a valid amount',
  AMOUNT_MIN: 'Amount must be greater than 0',

  CARD_NUMBER_REQUIRED: GENERIC.REQUIRED(FIELD.CARD_NUMBER),
  CARD_NUMBER_INVALID: GENERIC.INVALID(FIELD.CARD_NUMBER),

  CARDHOLDER_NAME_REQUIRED: GENERIC.REQUIRED(FIELD.CARDHOLDER_NAME),

  EXPIRY_REQUIRED: GENERIC.REQUIRED(FIELD.EXPIRY),
  EXPIRY_INVALID: GENERIC.INVALID(FIELD.EXPIRY),

  CVV_REQUIRED: GENERIC.REQUIRED(FIELD.CVV),
  CVV_INVALID: GENERIC.INVALID(FIELD.CVV),

  ACCOUNT_NUMBER_REQUIRED: GENERIC.REQUIRED(FIELD.ACCOUNT_NUMBER),
  ROUTING_NUMBER_REQUIRED: GENERIC.REQUIRED(FIELD.ROUTING_NUMBER),
  ROUTING_NUMBER_LENGTH: 'Routing number must be exactly 9 digits',

  ADDRESS_LINE_1_REQUIRED: GENERIC.REQUIRED(FIELD.ADDRESS_LINE_1),
  CITY_REQUIRED: GENERIC.REQUIRED(FIELD.CITY),
  STATE_REQUIRED: GENERIC.REQUIRED(FIELD.STATE),
  POSTAL_CODE_REQUIRED: GENERIC.REQUIRED(FIELD.POSTAL_CODE),
  COUNTRY_REQUIRED: GENERIC.REQUIRED(FIELD.COUNTRY),

  DISPLAY_NAME_REQUIRED: GENERIC.REQUIRED(FIELD.DISPLAY_NAME),
  PRIORITY_REQUIRED: 'Priority must be at least 1',

  PROVIDER_REQUIRED: GENERIC.SELECT_REQUIRED('a provider'),
  GATEWAY_REQUIRED: GENERIC.SELECT_REQUIRED('a gateway'),
  CUSTOMER_REQUIRED: GENERIC.SELECT_REQUIRED('or create a customer profile'),

  BUSINESS_NAME_REQUIRED: GENERIC.REQUIRED(FIELD.BUSINESS_NAME),
  FULL_NAME_REQUIRED: GENERIC.REQUIRED(FIELD.FULL_NAME),

  API_KEY_REQUIRED: GENERIC.REQUIRED(FIELD.API_KEY),
  USERNAME_REQUIRED: GENERIC.REQUIRED(FIELD.USERNAME),
} as const;

// ─── Domain: Authentication ────────────────────────────────────────────────────

export const AUTH = {
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  SIGNUP_FAILED: 'Sign up failed. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
} as const;

// ─── Domain: Customer Management ───────────────────────────────────────────────

export const CUSTOMER = {
  CREATE_SUCCESS: GENERIC.SUCCESS('Customer', 'created'),
  UPDATE_SUCCESS: GENERIC.SUCCESS('Customer', 'updated'),
  DELETE_SUCCESS: GENERIC.SUCCESS('Customer', 'deactivated'),
  CREATE_FAILED: GENERIC.FAILED('create customer'),
  UPDATE_FAILED: GENERIC.FAILED('update customer'),
  LOAD_FAILED: GENERIC.FAILED('load customer profile'),
  EMAIL_EXISTS: GENERIC.ALREADY_EXISTS(FIELD.EMAIL),
} as const;

// ─── Domain: Gateway Management ────────────────────────────────────────────────

export const GATEWAY = {
  CREATE_SUCCESS: GENERIC.SUCCESS('Gateway configuration', 'saved'),
  UPDATE_SUCCESS: GENERIC.SUCCESS('Gateway configuration', 'updated'),
  DELETE_SUCCESS: GENERIC.SUCCESS('Gateway', 'deactivated'),
  CIRCUIT_RESET_SUCCESS: GENERIC.SUCCESS('Circuit breaker', 'reset'),
  CREATE_FAILED: GENERIC.FAILED('add gateway'),
  UPDATE_FAILED: GENERIC.FAILED('update gateway'),
  DELETE_FAILED: GENERIC.FAILED('delete gateway'),
  CIRCUIT_RESET_FAILED: GENERIC.FAILED('reset circuit breaker'),
  UNAVAILABLE: 'Gateway service is currently unavailable',
} as const;

// ─── Domain: Payment / Virtual Terminal ───────────────────────────────────────

export const PAYMENT = {
  PROCESSING_FAILED: 'Transaction declined by gateway. Please try again.',
  GATEWAY_TIMEOUT: 'Gateway request timed out. Please try again.',
  DUPLICATE_DETECTED: 'Duplicate transaction detected. Please check your records.',
} as const;

export const TRANSACTION = {
  LOAD_FAILED: GENERIC.FAILED('load transactions'),
  RECEIPT_LOAD_FAILED: GENERIC.FAILED('load transaction receipt details'),
  CAPTURE_SUCCESS: GENERIC.SUCCESS('Transaction', 'captured'),
  CAPTURE_FAILED: GENERIC.FAILED('capture transaction'),
  VOID_SUCCESS: GENERIC.SUCCESS('Transaction', 'voided'),
  VOID_FAILED: GENERIC.FAILED('void transaction'),
  REFUND_SUCCESS: GENERIC.SUCCESS('Refund', 'processed'),
  REFUND_FAILED: GENERIC.FAILED('process refund'),
  REFUND_AMOUNT_REQUIRED: GENERIC.REQUIRED('Refund amount'),
  REFUND_AMOUNT_EXCEEDS_BALANCE: 'Refund amount cannot exceed the refundable balance',
  CONFIRM_CAPTURE: 'Capture this authorized transaction?',
  CONFIRM_VOID: 'Void this authorized transaction?',
} as const;

// ─── Domain: Developer / API Keys ─────────────────────────────────────────────

export const DEVELOPER = {
  KEY_ROTATED_SUCCESS: GENERIC.SUCCESS('API key', 'rotated'),
  KEY_ROTATE_FAILED: GENERIC.FAILED('rotate API key'),
  KEY_COPIED_SUCCESS: 'API key copied to clipboard',
  FEATURE_COMING_SOON: 'This feature is coming in Phase 4',
} as const;

// ─── System / Network ─────────────────────────────────────────────────────────

export const SYSTEM = {
  NETWORK_ERROR: 'A network error occurred. Please check your connection.',
  SERVER_ERROR: 'An unexpected server error occurred. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
  TIMEOUT: 'The request timed out. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please refresh the page.',
} as const;

// ─── Composite export for convenience ─────────────────────────────────────────

export const Messages = {
  GENERIC,
  FIELD,
  VALIDATION,
  AUTH,
  CUSTOMER,
  GATEWAY,
  PAYMENT,
  TRANSACTION,
  DEVELOPER,
  SYSTEM,
} as const;
