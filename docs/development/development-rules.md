# Development & Coding Rules

This document outlines the coding standards, TypeScript rules, naming conventions, architectural boundaries, security expectations, testing rules, and Git workflows for the Payment Orchestration Platform.

---

## 1. Coding Standards (ES6+ / ES2023)

All Javascript and TypeScript code must utilize modern ECMAScript standards:
- **Asynchronous Flow**: Use `async/await` syntax exclusively. Avoid raw promises, callback chains, or `then/catch` blocks.
- **Destructuring**: Use array and object destructuring to extract properties.
- **Spread & Rest Operators**: Use spread (`...`) for shallow copies and function arguments.
- **Immutable Declarations**: Prefer `const` over `let`. Avoid using `var` entirely.
- **Array Methods**: Use functional array operations (`map`, `filter`, `reduce`, `find`, `some`, `every`) instead of manual `for` loops where applicable.
- **Nullish Coalescing & Optional Chaining**: Use `??` and `?.` to handle optional or nullable properties.

### Standard Code Example
```typescript
// Good Practice
export const processCapturedPayments = async (payments: PaymentDto[]): Promise<string[]> => {
  const capturedIds = payments
    .filter(({ status }) => status === PaymentStatus.CAPTURED)
    .map(({ id }) => id);

  for (const id of capturedIds) {
    await publishEvent(id ?? 'default-id');
  }
  return capturedIds;
};
```

---

## 2. Strict TypeScript Rules

TypeScript must be configured and enforced in **strict mode** (`"strict": true` in `tsconfig.json`).
- **No Implicit `any`**: Every variable, function parameter, and return value must have an explicit type.
- **Strict Null Checks**: Explicitly declare when a value can be `null` or `undefined` (e.g. `String | null`).
- **No Type Assertions**: Avoid `<Type>` casting or the `as` operator unless dealing with external libraries where type inference fails. Never use `as any`.
- **Explicit Return Types**: All exported functions must declare their return types.

```typescript
// Bad Practice
function getPayment(id) { // implicit any error
  return paymentService.find(id) as any; // type evasion
}

// Good Practice
export async function getPayment(id: string): Promise<PaymentResponseDto | null> {
  const result: PaymentResponseDto | null = await paymentService.find(id);
  return result;
}
```

---

## 3. Folder Structure & Naming Conventions

### Folder Structure Pattern
All microservices and the core monolith modules must follow a clean architecture layout:
```
module-name/
│
├── controllers/          ← REST controllers, receives requests, executes validation
├── services/             ← Pure business logic & orchestration
├── repositories/         ← Database queries, extends Prisma clients
└── dto/                  ← Typed data transfer objects
```

### Naming Conventions
- **Files & Folders**: Use kebab-case for filenames (e.g. `payment-attempt.repository.ts`, `invoice-service`).
- **Classes**: Use PascalCase (e.g. `StripeGatewayAdapter`, `GatewayFactory`).
- **Interfaces & Types**: Use PascalCase. Interface names must not be prefixed with `I`.
- **Functions & Variables**: Use camelCase (e.g. `generateUuidV7()`, `idempotencyKey`).
- **Constants & Enums**: Use UPPER_SNAKE_CASE (e.g. `PaymentStatus.CAPTURED`).

---

## 4. Logging Standards (Pino)

Logging must be structured, named, and created via the named logger factory.
- **Logger Factory**: Retrieve named loggers using `createLogger(name)` from `@shared/logger/create-logger`.
- **Structured Fields**: Log events alongside contextual data objects rather than string concatenation.
- **Levels**:
  - `info`: Key operational milestones (e.g., payment processed, server started).
  - `warn`: Recoverable failures, retries, or validation warnings.
  - `error`: Unrecoverable errors, failed transactions, down dependencies.
  - `debug`: Verbose logs for developer troubleshooting (never log sensitive card numbers or CVVs).

```typescript
import { createLogger } from '@shared/logger/create-logger';
const logger = createLogger('payment-service');

// Bad Practice
logger.info("Payment completed for merchant " + merchantId + " with amount " + amount);

// Good Practice
logger.info({ merchantId, amount, paymentId }, 'Payment captured successfully');
```

---

## 5. Unified Error Handling Standards

Errors must not leak stack traces or raw database structures to client APIs. All operational errors must extend `AppError` from `@shared/errors/errors`.

### Custom Error Subclasses
- `NotFoundError` (maps to `404`)
- `ValidationError` (maps to `400`)
- `ConflictError` (maps to `409` - e.g. idempotency conflicts)
- `UnauthorizedError` (maps to `401`)

### Implementation Pattern
```typescript
import { NotFoundError } from '@shared/errors/errors';

export async function capturePayment(id: string): Promise<void> {
  const payment = await db.payments.find(id);
  if (!payment) {
    throw new NotFoundError(`Payment with ID ${id} was not found.`);
  }
}
```

---

## 6. Boundary Validation Standards (Zod)

- All HTTP request bodies, parameters, and query parameters must be validated at the entrypoint using Zod schemas.
- Place all validation schemas in `@shared/validators/payment.schemas.ts`.
- Throw a `ValidationError` if parsing fails.

```typescript
import { createPaymentSchema } from '@shared/validators/payment.schemas';
import { ValidationError } from '@shared/errors/errors';

export const handleCreatePayment = async (req: Request, res: Response) => {
  const result = createPaymentSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  // Proceed with request...
};
```

---

## 7. Security Best Practices

- **Gateway Credentials**: Must never be stored in plain text. Always encrypt configurations before database insert using `credentialEncryptionService.encrypt()` from `@shared/crypto/credential-encryption`.
- **Sensitive Data Masking**: PANs (card numbers) and CVVs must be masked before saving to databases or outputting to logs.
- **SQL Injection Prevention**: Always use Prisma parameterized queries (standard queries are automatically parameterized).
- **Secrets Management**: Read configuration from `process.env`. Never hardcode secrets in source files.

---

## 8. Testing Standards

- **Framework**: Jest.
- **Naming**: Test files must be named `*.spec.ts` or `*.test.ts`.
- **Mocking**: Use `jest.mock()` to isolate testing scopes from database, Kafka, or network interfaces.
- **Coverage**: Aim for at least 80% coverage on core business service files.

---

## 9. Git Workflow & PR Rules

- **Branch Naming**:
  - `feat/feature-name`
  - `fix/bug-fix-name`
  - `docs/doc-update-name`
- **Pull Request Checklist**:
  - [ ] Code compiles without errors (`npm run build:all`).
  - [ ] All tests pass successfully (`npm run test:core`).
  - [ ] No debugger lines or `console.log` statements.
  - [ ] Modified schemas have corresponding database migrations.

---

## 10. Code Review Checklist & Definition of Done

### Reviewer Checklist
1. **SOLID Principles**: Are classes and functions focused on a single responsibility?
2. **Duplication**: Does this code duplicate functions already present in `@shared/`?
3. **Safety**: Are external integrations wrapped in circuit breakers? Is the outbox table used for Kafka event generation?

### Definition of Done (DoD)
- [ ] Code is formatted (Prettier) and linted (ESLint).
- [ ] All strict TypeScript errors are resolved.
- [ ] Zod schema validation is applied on new public endpoints.
- [ ] Local tests and build scripts complete successfully.
- [ ] Operational runbooks are updated for any new dependency or failure point.

---

## 11. AI Coding Rules (Co-Pilot Guidelines)

When using AI agents or LLMs to refactor or extend the codebase, follow these rules:
- **No Placeholders**: Never generate `// TODO` or placeholders in production files. Write complete, functional code blocks.
- **Docstring Preservation**: Do not remove existing comments, documentation blocks, or symbol links.
- **Shared First**: Always search the `@shared/` directory for existing helper utilities, errors, or enums before generating a new one.
- **No Direct SDK Imports**: Never import external gateway SDKs inside core services. Create adapters mapping to `AbstractPaymentGateway` instead.

---

## 12. Frontend Coding Standards (Portal)

These rules apply specifically to `payment-platform-portal`. They enforce a consistent, auditable, and i18n-ready frontend.

### 12.1 Message Registry (Single Source of Truth)

All user-facing strings must be imported from `app/lib/messages.ts`. This includes:
- Zod schema validation messages
- Toast notification messages (success, error, warning, info)
- Fallback messages passed to `handleApiError()`

**Forbidden:**
```typescript
// Hardcoded strings in Zod schemas
z.string().min(1, 'Email address is required')

// Hardcoded strings in catch blocks
notification.error('Failed to save gateway')
```

**Required:**
```typescript
import { Messages } from '@/lib/messages';

// Zod schemas
z.string().min(1, Messages.VALIDATION.EMAIL_REQUIRED).email(Messages.VALIDATION.EMAIL_INVALID)

// Catch blocks
notification.error(Messages.GATEWAY.CREATE_FAILED)
```

To add new messages, append a domain block to `messages.ts` following the established namespace pattern. Never add strings inline.

---

### 12.2 Notification System

All user-facing feedback (success, error, warning, info) must use the centralized notification system.

**Forbidden:**
```typescript
alert('Key copied to clipboard');
alert('Failed to rotate key');
// Custom toast implementations
// inline <div> banners for success/error
```

**Required:**
```typescript
// Inside React components
import { useNotification } from '@components/notification';
const notification = useNotification();
notification.success(Messages.DEVELOPER.KEY_COPIED_SUCCESS);
notification.error(Messages.DEVELOPER.KEY_ROTATE_FAILED);

// Outside React (interceptors, utilities)
import { NotificationService } from '@components/notification';
NotificationService.error(Messages.SYSTEM.NETWORK_ERROR);
```

**Validation errors are never toasts.** Field-level errors are always shown inline below the field via `@components/validation`.

---

### 12.3 API Error Routing

All API `catch` blocks must delegate to `handleApiError()`. No custom error routing.

**Forbidden:**
```typescript
} catch (err: any) {
  setFieldError('submit', err.response?.data?.error || 'Failed to save');
}
```

**Required:**
```typescript
import { handleApiError } from '@/lib/api';
import { Messages } from '@/lib/messages';

} catch (err) {
  handleApiError(err, setFieldError, Messages.CUSTOMER.UPDATE_FAILED);
}
```

**Exception**: Auth forms (`login`, `signup`) may use `setFieldError('submit', msg)` for credential errors that are directly actionable on the same form.

---

### 12.4 Inline Validation Standard

Validation errors must never be displayed as global banners, top alerts, or toasts. They must appear inline, directly below the offending field.

- Use `ValidationField` + `InputErrorState` / `SelectErrorState` from `@components/validation` for every form field.
- Use `useFormValidation` hook for all form state (values, errors, touched, blur, submit).
- Validation fires: on blur, on change (if field already has an error), and on submit (all fields + focus-first-error).
- `ValidationMessage` is only permitted for auth `submit` errors (login/signup credential failures).

