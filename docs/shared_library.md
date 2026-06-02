# Shared Library Reference (`shared/`)

The `shared/` directory at the repository root is the **single source of truth** for all cross-cutting concerns in the monorepo. It is consumed by `payment-platform-core` and all five microservices via relative TypeScript imports.

> **Rule**: Every reusable utility, helper, constant, DTO, validator, event contract, logger, and UUID generator must exist in exactly one location — `shared/`. No service may define its own duplicate.

---

## Directory Structure

```
shared/
├── constants/
│   ├── payment.constants.ts       ← PaymentStatus, RefundStatus, CaptureStatus enums
│   ├── kafka.constants.ts         ← Kafka topic name constants
│   ├── notification.constants.ts  ← NotificationType enums
│   └── event.constants.ts         ← EventType enum
│
├── contracts/
│   └── abstract-payment-gateway.ts  ← AbstractPaymentGateway base class
│
├── crypto/
│   └── credential-encryption.ts    ← AES-256-GCM encrypt/decrypt for gateway creds
│
├── dates/
│   └── date-utils.ts               ← toISOString(), formatDate(), toUTC() helpers
│
├── dto/
│   ├── gateway.dto.ts              ← CreditCardSaleRequestDto, PaymentResponseDto, etc.
│   └── common.dto.ts               ← PaginationDto, ApiResponseDto, etc.
│
├── errors/
│   └── errors.ts                   ← AppError, ValidationError, NotFoundError,
│                                     ConflictError, UnauthorizedError
│
├── events/
│   └── events.ts                   ← Typed Kafka event payload definitions
│
├── ids/
│   └── generate-uuid-v7.ts         ← generateUuidV7(): string
│
├── logger/
│   ├── logger.ts                   ← Default logger instance
│   └── create-logger.ts            ← createLogger(name: string): Logger factory
│
└── validators/
    └── payment.schemas.ts          ← Zod schemas: createPaymentSchema, refundSchema, etc.
```

---

## Module Reference

### `shared/ids/generate-uuid-v7.ts`

Generates time-sortable UUIDv7 identifiers used for all entity IDs across the platform.

```typescript
import { generateUuidV7 } from '../../../../shared/ids/generate-uuid-v7';

const paymentId = generateUuidV7();
// e.g., "01917c4a-3b2f-7000-8000-a1b2c3d4e5f6"
```

---

### `shared/logger/create-logger.ts`

Creates a named [Pino](https://github.com/pinojs/pino) logger instance with `pino-pretty` transport for development.

```typescript
import { createLogger } from '../../../../shared/logger/create-logger';

const logger = createLogger('settlement-service');

logger.info({ settlementId }, 'Settlement reconciliation complete');
logger.error({ error: err.message }, 'Reconciliation failed');
logger.warn({ paymentId, variance }, 'Variance detected');
```

Always pass the **service name** as the argument so log entries are identifiable in aggregated log streams (Grafana Loki, CloudWatch).

---

### `shared/errors/errors.ts`

A typed error hierarchy for consistent HTTP error responses and logging.

```typescript
import { AppError, ValidationError, NotFoundError, ConflictError, UnauthorizedError } from '../../../../shared/errors/errors';

// Throw typed errors in service layer:
throw new NotFoundError('Payment not found');
throw new ConflictError('Idempotency key already used');
throw new ValidationError('Amount must be greater than zero');
throw new UnauthorizedError('Invalid API key');
```

---

### `shared/constants/payment.constants.ts`

```typescript
import { PaymentStatus, RefundStatus } from '../../../../shared/constants/payment.constants';

if (payment.status === PaymentStatus.CAPTURED) { ... }
```

---

### `shared/constants/kafka.constants.ts`

```typescript
import { KafkaTopic } from '../../../../shared/constants/kafka.constants';

await kafkaService.publish(KafkaTopic.PAYMENT_CAPTURED, paymentId, payload);
```

---

### `shared/dto/gateway.dto.ts`

Typed request/response shapes for all gateway operations:

```typescript
import { CreditCardSaleRequestDto, PaymentResponseDto } from '../../../../shared/dto/gateway.dto';

// All gateway adapters receive and return these standardized DTOs
abstract creditCardSale(req: CreditCardSaleRequestDto): Promise<PaymentResponseDto>;
```

---

### `shared/validators/payment.schemas.ts`

Zod schemas for validating incoming API payloads:

```typescript
import { createPaymentSchema } from '../../../../shared/validators/payment.schemas';

const result = createPaymentSchema.safeParse(req.body);
if (!result.success) throw new ValidationError(result.error.message);
```

---

### `shared/events/events.ts`

Typed Kafka event payloads ensuring all producers and consumers agree on the contract:

```typescript
import { PaymentCapturedEvent } from '../../../../shared/events/events';

const event: PaymentCapturedEvent = {
  paymentId,
  merchantId,
  amount,
  currency,
  gatewayToken,
  capturedAt: new Date().toISOString()
};
```

---

### `shared/crypto/credential-encryption.ts`

AES-256-GCM encryption for sensitive gateway API credentials stored in the database:

```typescript
import { credentialEncryptionService } from '../../../../shared/crypto/credential-encryption';

// Encrypt before storing:
const encrypted = credentialEncryptionService.encrypt(JSON.stringify(credentials));

// Decrypt before use:
const credentials = JSON.parse(credentialEncryptionService.decrypt(encrypted));
```

Requires `ENCRYPTION_MASTER_KEY` environment variable (base64-encoded 32-byte key).

---

### `shared/contracts/abstract-payment-gateway.ts`

The base class all gateway adapters **must** extend. Enforces a common interface across Stripe, Authorize.Net, NMI, and Cardpointe:

```typescript
import { AbstractPaymentGateway } from '../../../../shared/contracts/abstract-payment-gateway';

export class StripeGatewayAdapter extends AbstractPaymentGateway {
  async creditCardSale(req: CreditCardSaleRequestDto): Promise<PaymentResponseDto> { ... }
  async creditCardAuthorize(req: CreditCardSaleRequestDto): Promise<PaymentResponseDto> { ... }
  async creditCardCapture(req: CaptureRequestDto): Promise<PaymentResponseDto> { ... }
  async creditCardRefund(req: RefundRequestDto): Promise<PaymentResponseDto> { ... }
  async creditCardVoid(req: VoidRequestDto): Promise<PaymentResponseDto> { ... }
}
```

---

## Import Path Reference

| Importing from | Path prefix to shared/ |
|---|---|
| `payment-platform-core/src/**` | `../../shared/` |
| `services/*/src/**` | `../../../../shared/` |
| `payment-platform-portal/app/**` | ⛔ Not applicable (browser-only) |
| `payment-platform-sdk/**` | ⛔ Not applicable (standalone SDK) |

---

## Docker Build — How `shared/` Reaches Each Container

Since `shared/` is not an npm package, it must be explicitly copied into each service's Docker image. All service Dockerfiles handle this with:

```dockerfile
# Builder stage — needed for TypeScript compilation
COPY shared/ ./shared

# Runner stage — needed for Node.js runtime (relative path imports resolve here)
COPY --from=builder /app/shared ./shared
```

The build context in `docker-compose.yml` is the **repository root** (`context: .`), which makes `COPY shared/` valid in all Dockerfiles.

---

## Adding New Shared Code

1. Identify the correct subdirectory (`constants/`, `dto/`, `validators/`, etc.)
2. Create or update the file in `shared/`
3. Export the new symbol from the file
4. Import it in all consumers via the correct relative path
5. Verify TypeScript compilation: `npx tsc --noEmit` in each affected package
6. Update this document if adding a new module
