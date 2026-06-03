# Shared Library Reference (`shared/`)

The `shared/` directory at the repository root is the **single source of truth** for all cross-cutting concerns in the monorepo. It is consumed by `payment-platform-core` and all five microservices.

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
│   └── abstract-payment-gateway.ts  ← AbstractPaymentGateway base contract class
│
├── crypto/
│   └── credential-encryption.ts    ← AES-256-GCM encrypt/decrypt for gateway credentials
│
├── dates/
│   └── date-utils.ts               ← ISO formatting, timezone helpers
│
├── dto/
│   ├── gateway.dto.ts              ← CreditCardSaleRequestDto, PaymentResponseDto, etc.
│   └── common.dto.ts               ← PaginationDto, ApiResponseDto, etc.
│
├── errors/
│   └── errors.ts                   ← AppError, ValidationError, NotFoundError, etc.
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
import { generateUuidV7 } from '@shared/ids/generate-uuid-v7';

const paymentId = generateUuidV7(); // "01917c4a-3b2f-7000-8000-a1b2c3d4e5f6"
```

---

### `shared/logger/create-logger.ts`
Creates a named [Pino](https://github.com/pinojs/pino) logger instance with `pino-pretty` transport for development.
```typescript
import { createLogger } from '@shared/logger/create-logger';

const logger = createLogger('settlement-service');
logger.info({ settlementId }, 'Settlement reconciliation complete');
```
Always pass the **service name** as the argument so log entries are easily filtered in centralized logs (Loki, CloudWatch).

---

### `shared/errors/errors.ts`
A typed error hierarchy for consistent HTTP error responses and logging.
```typescript
import { NotFoundError, ValidationError } from '@shared/errors/errors';

throw new NotFoundError('Payment not found');
```

---

### `shared/constants/payment.constants.ts`
Standardized transaction status enums:
```typescript
import { PaymentStatus } from '@shared/constants/payment.constants';

if (payment.status === PaymentStatus.CAPTURED) { ... }
```

---

### `shared/constants/kafka.constants.ts`
Unified topic name constants:
```typescript
import { KafkaTopic } from '@shared/constants/kafka.constants';

await kafkaService.publish(KafkaTopic.PAYMENT_CAPTURED, paymentId, payload);
```

---

### `shared/dto/gateway.dto.ts`
Typed request/response shapes for all gateway operations:
```typescript
import { CreditCardSaleRequestDto, PaymentResponseDto } from '@shared/dto/gateway.dto';
```

---

### `shared/validators/payment.schemas.ts`
Zod schemas for validating incoming API payloads:
```typescript
import { createPaymentSchema } from '@shared/validators/payment.schemas';

const result = createPaymentSchema.safeParse(req.body);
```

---

### `shared/events/events.ts`
Typed Kafka event payloads ensuring all producers and consumers agree on the contract:
```typescript
import { PaymentCapturedEvent } from '@shared/events/events';
```

---

### `shared/crypto/credential-encryption.ts`
AES-256-GCM encryption for sensitive gateway credentials stored in the database:
```typescript
import { credentialEncryptionService } from '@shared/crypto/credential-encryption';

const encrypted = credentialEncryptionService.encrypt(JSON.stringify(credentials));
```
Requires the `ENCRYPTION_MASTER_KEY` environment variable.

---

### `shared/contracts/abstract-payment-gateway.ts`
The base class all gateway adapters **must** extend. Enforces a common interface:
```typescript
import { AbstractPaymentGateway } from '@shared/contracts/abstract-payment-gateway';

export class StripeGatewayAdapter extends AbstractPaymentGateway { ... }
```

---

## Path Mapping Import Rules

To avoid complex relative path depths (e.g., `../../../../shared/logger`), both the core monolith and the services configure **tsconfig path mappings**.

### Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/*"] // resolves to shared directory
    }
  }
}
```

### Import Usage Guidelines
Always use the `@shared/` path alias instead of relative imports:

- **Correct**:
  ```typescript
  import { createLogger } from '@shared/logger/create-logger';
  ```
- **Incorrect**:
  ```typescript
  import { createLogger } from '../../../../shared/logger/create-logger';
  ```

---

## Docker Build — How `shared/` Reaches Each Container

Since `shared/` is not published to an npm registry, it is copied directly into each service container during the build stage. The build context in `docker-compose.yml` is the monorepo root:

```dockerfile
# Stage 1: Build compiles with access to shared/
COPY shared/ ./shared

# Stage 2: Runtime keeps files for relative imports
COPY --from=builder /app/shared ./shared
```

---

## Adding New Shared Code

1. Identify the target module folder in `shared/`.
2. Create or edit files inside that folder, exporting all symbols cleanly.
3. Import the shared module in consumer code using the `@shared/*` alias.
4. Verify compiling health:
   ```bash
   npx tsc --noEmit
   ```
5. Update this documentation file if adding a brand new module.
