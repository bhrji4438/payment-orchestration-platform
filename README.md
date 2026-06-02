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
# 1. Copy environment config
cp .env.example .env

# 2. Start all containers (DB, Kafka, Redis, MinIO, MailHog, all services)
docker compose up --build
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

# 2. Install all workspace dependencies
npm run install:all

# 3. Run DB migrations & seed data (run once)
cd payment-platform-core
npx prisma db push
npm run prisma:seed
cd ..

# 4. Start the core engine and portal
npm run dev:all
```

---

## 4. Root Workspace Scripts

All scripts are defined in the [root package.json](./package.json) and can be run from the repository root:

| Command | Description |
|---|---|
| `npm run install:all` | Runs `npm ci` in every package (core, portal, SDK, all 5 services) |
| `npm run dev:core` | Starts the core payment engine in dev mode |
| `npm run dev:portal` | Starts the Next.js portal in dev mode |
| `npm run dev:all` | Starts core + portal concurrently |
| `npm run build:all` | Builds core, portal, and SDK |
| `npm run test:core` | Runs Jest tests for the core engine |

---

## 5. Key Architecture Rules

> **Every shared utility must live in exactly one location — `shared/`.**
> Business services must never directly call Stripe, NMI, Authorize.Net, or Cardpointe adapters. All gateway operations go through the Gateway Abstraction Layer.

See [docs/architecture.md](./docs/architecture.md) and [docs/design_patterns.md](./docs/design_patterns.md) for full details.
