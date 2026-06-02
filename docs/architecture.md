# Systems Architecture & Component Topology

This document details the architectural boundaries, container scopes, shared library design, and integration paths for the Payment Orchestration Platform.

---

## 1. Monorepo Architecture Overview

The repository follows a **clean monorepo** pattern with a strict single-source-of-truth shared library:

```
payment-orchestration-platform/
│
├── shared/                    ← Single source of truth for all shared code
│   ├── constants/             ← Enums: payment statuses, Kafka topics, gateway codes
│   ├── contracts/             ← AbstractPaymentGateway base class
│   ├── crypto/                ← AES-256-GCM encryption/decryption
│   ├── dates/                 ← Date formatting & timezone utilities
│   ├── dto/                   ← Typed gateway request/response DTOs
│   ├── errors/                ← Custom error hierarchy (AppError, ValidationError…)
│   ├── events/                ← Typed Kafka event contract definitions
│   ├── ids/                   ← UUIDv7 generator (single implementation)
│   ├── logger/                ← createLogger(name) Pino factory
│   └── validators/            ← Zod schemas for payment API validation
│
├── payment-platform-core/     ← Core modular monolith — imports from shared/
├── services/*/                ← Microservices — all import from shared/
├── payment-platform-portal/   ← Next.js browser app (standalone)
└── payment-platform-sdk/      ← Node.js client SDK (standalone)
```

### Architectural Rules (Non-Negotiable)
- **Every logger** must be created via `createLogger(name)` from `shared/logger/create-logger.ts`.
- **Every UUID** must be generated via `generateUuidV7()` from `shared/ids/generate-uuid-v7.ts`.
- **Every gateway adapter** must extend `AbstractPaymentGateway` from `shared/contracts/`.
- **No business service** may directly call a gateway SDK (Stripe, NMI, Authorize.Net, Cardpointe).
- **No duplication** of constants, DTOs, validators, or error classes across packages.

---

## 2. Transactional Boundaries

### 2.1 Core Payment Modular Monolith (`payment-platform-core`)
- **Reasoning**: Processing currency capture requires strict ACID guarantees. Distributing authorization and capture across network boundaries risks split-brain or double-charge scenarios.
- **Transactional Scope**: Uses the Repository and Unit of Work patterns inside PostgreSQL transactions. Payments, attempts, ledger transactions, and outbox entries are committed **atomically**.

### 2.2 Event-Driven Supporting Services (`services/`)
- **Reasoning**: Operations like generating PDFs, sending emails, reconciliations, and dashboard caches do not block the transactional response thread.
- **Mechanism**: The outbox worker publishes events to Apache Kafka. Microservices consume asynchronously, isolating transaction latency from external delays.

---

## 3. C4 Model Layout

### 3.1 C4 Level 1: System Context
```
┌─────────────────┐       HTTPS API        ┌─────────────────────────┐
│                 ├───────────────────────>│                         │
│  Merchant       │                        │   Payment Platform      │
│  Systems        │<───────────────────────┤   Orchestration Engine  │
│                 │      Webhook Call      │                         │
└─────────────────┘                        └────────────┬────────────┘
                                                        │
                                                        │ HTTPS Gateway API
                                                        ▼
                                           ┌─────────────────────────┐
                                           │  External Gateways      │
                                           │ (Stripe, Auth.Net, NMI, │
                                           │  Cardpointe REST API)   │
                                           └─────────────────────────┘
```

### 3.2 C4 Level 2: Container Topology

| Container | Technology | Port | Role |
|---|---|---|---|
| `payment-platform-core` | Express + Prisma | 3000 | Core ACID payment engine |
| `invoice-service` | Node.js + KafkaJS | 3001 | PDF invoice generator |
| `notification-service` | Node.js + KafkaJS | 3002 | Email/SMS dispatcher |
| `audit-service` | Node.js + KafkaJS | 3003 | Compliance audit logger |
| `settlement-service` | Node.js + Prisma | 3004 | Bank reconciliation engine |
| `reporting-service` | Express + Prisma | 3005 | Analytics aggregator |
| `payment-platform-portal` | Next.js 15 | 3006 | Merchant web dashboard |
| `postgres` | PostgreSQL 16 | 5432 | Relational data store |
| `redis` | Redis 7 | 6379 | Idempotency locks & rate limiting |
| `kafka` | Confluent Kafka | 9092 | Async event streaming |
| `mailhog` | MailHog | 1025 / 8025 | SMTP email (dev) |
| `minio` | MinIO | 9000 / 9001 | S3 object storage (dev) |

---

## 4. Gateway Abstraction Layer

All payment gateway integrations **must** inherit from `AbstractPaymentGateway`:

```
Payment Service
     │
     ▼
Gateway Factory  ──── resolves at runtime from GatewayProvider code
     │
     ▼
AbstractPaymentGateway  (shared/contracts/abstract-payment-gateway.ts)
     │
     ├── StripeGatewayAdapter
     ├── AuthorizeNetGatewayAdapter
     ├── NmiGatewayAdapter
     └── CardpointeGatewayAdapter  (plain REST/cURL, no npm SDK)
```

The `CardpointeGatewayAdapter` (formerly `Custom`) is implemented using native `https`/`fetch` requests — **no npm SDK required** — converting the original PHP `Cardpointe` class to a TypeScript adapter.

---

## 5. Asynchronous Event-Driven Messaging Lifecycle

```
[Payment Captured]
  ──> Committed atomically to DB + OutboxEvent table
  ──> OutboxPublisher polls PENDING events every 5s
  ──> Publishes to Kafka topic: 'payment.captured'
      │
      ├──> invoice-service consumes
      │      ──> Generates PDF → uploads to MinIO
      │      ──> Emits 'invoice.created'
      │
      ├──> notification-service consumes 'invoice.created'
      │      ──> Sends email via SMTP (MailHog in dev)
      │      ──> Emits 'notification.sent'
      │
      └──> audit-service consumes all events
             ──> Writes immutable compliance log entry
```

This decoupling ensures that even if SMTP or S3 goes offline, payment collection continues without interruption.

---

## 6. Docker Build Architecture

All service Dockerfiles use a **multi-stage build** pattern:

```dockerfile
# Stage 1: Builder — compiles TypeScript, generates Prisma client
FROM node:22-alpine AS builder
COPY services/<name>/package*.json ./
RUN npm ci
COPY services/<name>/ .
COPY shared/ ./shared          ← shared library (relative imports resolve here)
COPY payment-platform-core/prisma ./prisma
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner — lean production image
FROM node:22-alpine AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared   ← required at runtime
```

The root `docker-compose.yml` uses the **repository root** as build context (`context: .`), making all `COPY shared/` instructions valid across all Dockerfiles.
