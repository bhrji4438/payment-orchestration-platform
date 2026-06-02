# Technology Stack and Platform Overview

This document provides a detailed overview of the technologies, tools, and libraries utilized across the Payment Orchestration Platform.

---

## 1. Shared Library (`shared/`)

The root-level `shared/` directory is the **single source of truth** for all cross-cutting concerns. It is not an npm package — services consume it via relative TypeScript imports. This eliminates duplication across the entire monorepo.

| Module | Path | Contents |
|---|---|---|
| UUID Generator | `shared/ids/generate-uuid-v7.ts` | Single `generateUuidV7()` implementation (UUIDv7, time-sortable) |
| Logger Factory | `shared/logger/create-logger.ts` | `createLogger(name)` → Named Pino logger with `pino-pretty` transport |
| Date Utilities | `shared/dates/date-utils.ts` | ISO formatting, timezone helpers |
| Error Classes | `shared/errors/errors.ts` | `AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError` |
| Constants | `shared/constants/` | `payment.constants`, `kafka.constants`, `notification.constants`, `event.constants` |
| DTOs | `shared/dto/gateway.dto.ts`, `common.dto.ts` | Typed `CreditCardSaleRequestDto`, `PaymentResponseDto`, etc. |
| Zod Validators | `shared/validators/payment.schemas.ts` | Zod schemas for all payment API endpoints |
| Event Contracts | `shared/events/events.ts` | Typed Kafka event payloads (`payment.captured`, `invoice.created`, etc.) |
| Credential Crypto | `shared/crypto/credential-encryption.ts` | AES-256-GCM envelope encryption/decryption for gateway credentials |
| Gateway Contract | `shared/contracts/abstract-payment-gateway.ts` | `AbstractPaymentGateway` base class — all adapters must extend this |

**Import pattern** (relative path, no npm install required):
```typescript
import { createLogger } from '../../../../shared/logger/create-logger';
import { generateUuidV7 } from '../../../../shared/ids/generate-uuid-v7';
import { AbstractPaymentGateway } from '../../../../shared/contracts/abstract-payment-gateway';
```

---

## 2. Core Payment Engine (`payment-platform-core`)

A modular monolith that exposes transactional endpoints and handles ACID-guaranteed ledger actions.

| Concern | Library / Tool |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express.js |
| ORM & DB Client | Prisma ORM with PostgreSQL driver |
| Validation | Zod (schemas from `shared/validators/`) |
| Encryption | Node.js built-in `crypto` (AES-256-GCM via `shared/crypto/`) |
| Circuit Breaker | Opossum |
| Logging | Pino via `shared/logger/create-logger.ts` |
| ID Generation | UUIDv7 via `shared/ids/generate-uuid-v7.ts` |
| Kafka Client | KafkaJS |
| Cache & Locks | Redis (`ioredis`) |

### Gateway Adapters

All gateway adapters extend `AbstractPaymentGateway` from `shared/contracts/`:

| Adapter | Provider | Protocol |
|---|---|---|
| `StripeGatewayAdapter` | Stripe | Stripe Node.js SDK |
| `AuthorizeNetGatewayAdapter` | Authorize.Net | `authorizenet` npm SDK |
| `NmiGatewayAdapter` | NMI | Key-value URL-encoded POST |
| `CardpointeGatewayAdapter` | Cardpointe / CardConnect | Plain HTTPS REST (no npm SDK) |

> **Note**: The Cardpointe adapter uses native `https`/`fetch` requests with Basic Auth — this is intentional to avoid npm SDK dependencies for third-party REST APIs.

---

## 3. Supporting Microservices (`services/`)

Independent, event-driven services that listen to Kafka events or poll the database outbox.

| Service | Runtime | Key Libraries | Port |
|---|---|---|---|
| `audit-service` | Node.js 22 | KafkaJS, Prisma, `shared/logger`, `shared/ids` | 3003 |
| `invoice-service` | Node.js 22 | KafkaJS, Prisma, MinIO SDK, `shared/logger`, `shared/ids` | 3001 |
| `notification-service` | Node.js 22 | KafkaJS, Prisma, Nodemailer, `shared/logger`, `shared/ids` | 3002 |
| `reporting-service` | Node.js 22 | Express, Prisma, `shared/logger` | 3005 |
| `settlement-service` | Node.js 22 | Prisma, `shared/logger`, `shared/ids` | 3004 |

All services consume their logger and UUID utilities exclusively from `shared/`. **No local logger instantiations or UUID function duplicates exist.**

---

## 4. Frontend Portal (`payment-platform-portal`)

A merchant dashboard and developer portal for log analysis, gateway configuration, API key management, and sandbox testing.

| Concern | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Iconography | Lucide React |
| Data Fetching | Native `fetch` API (no backend calls in browser-side components) |

> The portal is a **browser-only** React application. Server-side Node.js libraries like Pino are not used here.

---

## 5. Client SDK (`payment-platform-sdk`)

A standalone, publishable Node.js/TypeScript client library for merchants integrating with the platform.

| Concern | Library |
|---|---|
| HTTP Client | Axios |
| Crypto | Node.js built-in `crypto` (HMAC webhook verification) |
| Language | TypeScript (strict) |

The SDK is self-contained and does not import from `shared/` — it is designed to be published as an independent npm package.

---

## 6. Infrastructure & Storage (`payment-platform-infra`)

Backing components and IaC manifests for cloud deployment.

| Component | Technology | Notes |
|---|---|---|
| Relational DB | PostgreSQL 16 | Multi-AZ in production (AWS RDS) |
| Cache | Redis 7 | Idempotency key TTL locks |
| Messaging | Confluent Kafka + Zookeeper | AWS MSK in production |
| Email (Dev) | MailHog | SMTP sink for local email testing |
| Object Storage (Dev) | MinIO | S3-compatible local bucket |
| IaC | Terraform | AWS ECS Fargate, MSK, RDS, S3, KMS |
| Containers | Docker, Docker Compose | Multi-stage Dockerfiles per service |
| Orchestration | Kubernetes, Helm, ArgoCD | Manifests in `payment-platform-infra/` |
| CI/CD | GitHub Actions | Lint → Test → Build → Push → Deploy |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki | Traces, metrics, and structured logs |

---

## 7. Containerization — Docker Multi-Stage Build Pattern

All service Dockerfiles follow the same pattern to include the `shared/` library:

```dockerfile
# Build stage: compiles TypeScript with access to shared/
FROM node:22-alpine AS builder
COPY services/<name>/package*.json ./
RUN npm ci
COPY services/<name>/ .
COPY shared/ ./shared                      ← shared library
COPY payment-platform-core/prisma ./prisma
RUN npx prisma generate && npm run build

# Runtime stage: lean production image
FROM node:22-alpine AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared   ← needed at runtime (relative imports)
```

Build context is the **repository root** (`context: .` in `docker-compose.yml`), making `COPY shared/` valid in all Dockerfiles.
