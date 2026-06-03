# Payment Orchestration Platform

Enterprise-grade multi-gateway payment orchestration platform using a **Modular Monolith** for core payment processing and **Event-Driven Microservices** communicating via Apache Kafka. All shared utilities, DTOs, validators, loggers, and contracts live in a single root-level `shared/` library — the single source of truth for the entire monorepo.

---

## 1. Project Directory Structure

```
payment-orchestration-platform/
│
├── shared/                           # ← Single source of truth (shared library)
│   ├── constants/                    #   payment, kafka, notification, event constants
│   ├── contracts/                    #   AbstractPaymentGateway base class
│   ├── crypto/                       #   AES-256-GCM credential encryption
│   ├── dates/                        #   Date formatting & timezone helpers
│   ├── dto/                          #   Typed gateway DTOs (charge, response, etc.)
│   ├── errors/                       #   AppError, ValidationError, NotFoundError, etc.
│   ├── events/                       #   Kafka event contract definitions
│   ├── ids/                          #   UUIDv7 generator
│   ├── logger/                       #   Named Pino logger factory (createLogger)
│   └── validators/                   #   Zod payment request schemas
│
├── payment-platform-core/            # Modular Monolith — Core Payment Engine
│   ├── src/
│   │   ├── modules/
│   │   │   ├── payments/             #   Payment controller, service, routes
│   │   │   ├── gateways/             #   Gateway factory + adapters
│   │   │   │   ├── stripe/           #     StripeGatewayAdapter
│   │   │   │   ├── authorize-net/    #     AuthorizeNetGatewayAdapter
│   │   │   │   ├── nmi/              #     NmiGatewayAdapter
│   │   │   │   └── cardpointe/       #     CardpointeGatewayAdapter (REST/cURL)
│   │   │   ├── webhooks/             #   Webhook receiver routes
│   │   │   └── auth/                 #   API key middleware
│   │   ├── infrastructure/
│   │   │   ├── database/             #   Unit of Work + Repositories (Prisma)
│   │   │   ├── kafka/                #   KafkaJS producer client
│   │   │   └── outbox/               #   Transactional outbox publisher
│   │   └── services/                 #   Idempotency service
│   └── prisma/                       # Prisma schema & DB seeds
│
├── services/                         # Event-Driven Supporting Microservices
│   ├── audit-service/                #   Immutable compliance log consumer (Port 3003)
│   ├── invoice-service/              #   PDF invoice generator & S3 uploader (Port 3001)
│   ├── notification-service/         #   SMTP email & SMS dispatcher (Port 3002)
│   ├── reporting-service/            #   Dashboard analytics aggregation (Port 3005)
│   └── settlement-service/           #   Bank payout reconciliation engine (Port 3004)
│
├── payment-platform-portal/          # Next.js 15 Merchant & Developer Console
├── payment-platform-sdk/             # Client SDK for Node.js/TypeScript integrations
├── payment-platform-infra/           # Kubernetes, Terraform, Helm, CI/CD pipelines
├── docs/                             # All documentation
├── docker-compose.yml                # Full platform orchestration
├── .gitignore                        # Node.js / TypeScript monorepo gitignore
├── .dockerignore                     # Docker build context exclusions
├── .env.example                      # Environment variable reference
└── package.json                      # Root workspace scripts
```

---

## 2. Technology Stack

### Backend & Core
- **Node.js**: v22+
- **TypeScript**: strict mode
- **Framework**: Express.js
- **Database Access**: Prisma ORM
- **Database**: PostgreSQL 16
- **Cache & Locks**: Redis 7
- **Message Broker**: Apache Kafka (Confluent Platform)
- **Logging**: Pino (`shared/logger/create-logger.ts`)
- **Validation**: Zod (`shared/validators/`)
- **Encryption**: AES-256-GCM (`shared/crypto/`)
- **ID Generation**: UUIDv7 (`shared/ids/`)

### Frontend Portal
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Iconography**: Lucide React

### Operations & Observability
- **Containerization**: Docker, Docker Compose
- **Infrastructure IaC**: Terraform
- **Orchestration**: Kubernetes, Helm, ArgoCD
- **CI/CD**: GitHub Actions
- **Traces & Metrics**: OpenTelemetry, Prometheus, Grafana, Loki

---

## 3. Local Development Quick-Start

### Option A — Full Platform via Docker (Recommended, zero local Node install needed)

```bash
# 1. Setup environment variables for root and all services
npm run bootstrap:env

# 2. Start all containers (DB, Kafka, Redis, MinIO, MailHog, all services)
docker compose up --build -d
```

Once running:
| Service | URL |
|---|---|
| Merchant Portal | http://localhost:3006 |
| Core Engine API | http://localhost:3000 |
| Reporting Service | http://localhost:3005 |
| MailHog (Email UI) | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |

### Option B — Local Node.js Development

```bash
# 1. Start only backing infrastructure
docker compose up postgres redis kafka mailhog minio -d

# 2. Setup environment variables for root and all services
npm run bootstrap:env

# 3. Install all workspace dependencies
npm run install:all

# 4. Push migrations, seed defaults, and generate Prisma Clients
npm run db:setup

# 5. Start the core engine and portal
npm run dev:all
```

---

## 4. Root Workspace Scripts

All scripts are defined in the [root package.json](./package.json) and can be run from the repository root:

| Command | Description |
|---|---|
| `npm run bootstrap:env` | Safely creates `.env` from `.env.example` in root and all service folders (supports `-- --force` to overwrite) |
| `npm run db:setup` | Pushes database schema, seeds default configurations, and generates Prisma Clients for all microservices |
| `npm run install:all` | Runs `npm i` in every package (core, portal, SDK, all 5 services) |
| `npm run dev:core` | Starts the core payment engine in dev mode |
| `npm run dev:portal` | Starts the Next.js portal in dev mode |
| `npm run dev:all` | Starts core + portal concurrently |
| `npm run build:all` | Builds core, portal, and SDK |
| `npm run test:core` | Runs Jest tests for the core engine |

---

## 5. Documentation Directory & Architecture Rules

> **Every shared utility must live in exactly one location — `shared/`.**
> Business services must never directly call Stripe, NMI, Authorize.Net, or Cardpointe adapters. All gateway operations go through the Gateway Abstraction Layer.

For detailed guidelines and technical specifications, refer to the following documents:

### Core Architecture & Design
- **[System Architecture](./docs/architecture.md)**: Modular Monolith + Event-Driven Services, C4 models, transactional boundaries, and outbox publisher lifecycle.
- **[Design Patterns](./docs/design_patterns.md)**: Implementation reference for Adapter, Strategy, Factory, Outbox, Saga, Circuit Breaker, and Repository/Unit of Work patterns.
- **[Shared Library Guide](./docs/shared_library.md)**: Usage guide for the single source of truth (`shared/`) modules, constants, validators, and error hierarchy.
- **[Database Schema](./docs/database_schema.md)**: Schema topology, indexing strategy, and soft delete patterns using UUIDv7.
- **[API Specification](./docs/api_specification.md)**: REST endpoints, authentication (Developer keys/JWTs), Zod request/response validation, and webhook HMAC signature verification.

### Development & Operations
- **[Development & Coding Rules](./docs/development/development-rules.md)**: (NEW) Coding standards (ES6+/ES2023, strict TypeScript), project structure, testing requirements, security best practices, and code review Definition of Done.
- **[Redis Architecture & Cache Guide](./docs/redis-guide.md)**: (NEW) Idempotency locking strategies, rate limiting rules, local setup, CLI usage, and TTL checks.
- **[Kafka & Event-Driven Guide](./docs/kafka-guide.md)**: (NEW) Event schemas, topic conventions, DLQ processing, consumer group lag checks, event replay procedures, and local debug scripts.
- **[Local Development Guide](./docs/local_development.md)**: Booting options, credential setups, merchant onboarding workflow, and adding a new payment gateway adapter step-by-step.
- **[Production Deployment & Infrastructure Guide](./docs/deployment.md)**: Multi-stage Docker configurations, AWS ECS/Fargate deployment topologies, Kubernetes manifests, and CI/CD GitOps pipelines.
- **[Incident Response & Operations Runbooks](./docs/runbooks.md)**: Disaster recovery procedures, troubleshooting guides (Kafka lag, Redis down, database locks, MinIO/MailHog issues).

---

## 6. AI Development & Governance

This repository strictly enforces engineering standards for all AI coding agents (Claude, Copilot, Cursor, Antigravity, etc.). 

- **Single Source of Truth**: The [`AGENTS.md`](./AGENTS.md) file at the root of the repository is the authoritative configuration for all AI agents.
- **Workflow**: Before making any code modifications, AI agents are instructed to read `AGENTS.md` and strictly adhere to the repository's architecture, path aliases, and shared library patterns.
- **Enforcement**: Any AI-generated code that bypasses existing architecture, hardcodes data, or duplicates existing shared utilities will be considered invalid. 
- **Tool-Specific Configs**: Files like `CLAUDE.md`, `.github/copilot-instructions.md`, and `.cursor/rules/project.mdc` are lightweight pointers that refer back to `AGENTS.md`.
