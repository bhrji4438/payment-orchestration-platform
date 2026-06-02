# Payment Orchestration Platform

Enterprise-grade multi-gateway payment orchestration platform using a **Modular Monolith** for core payment processing (capturing, refunding, voiding, authorization) and **Event-Driven Services** communicating via Apache Kafka.

---

## 1. Project Directory Structure

```
payment-platform/
├── payment-platform-core/        # Modular Monolith Payment Engine (TypeScript/Express/Prisma)
│   ├── src/
│   │   ├── modules/
│   │   │   └── payment/
│   │   │       └── gateways/     # Gateway Abstraction Standard Adapters
│   │   │           ├── contracts/# Base Abstract Gateway
│   │   │           ├── stripe/   # Stripe Adapter
│   │   │           ├── authorize-net/ # Authorize.Net Adapter
│   │   │           ├── nmi/      # NMI Adapter
│   │   │           └── custom/   # Converted Cardpointe Adapter (REST API)
│   │   ├── repositories/         # Unit of Work and Repositories
│   │   ├── services/             # Core encryption, payment, and outbox publisher services
│   │   ├── middleware/           # Idempotency, auth, and validation middlewares
│   │   └── index.ts              # Entrypoint
│   └── prisma/                   # Prisma Schema & Database Seeds
│
├── services/                     # Supporting Event-Driven Microservices
│   ├── invoice-service/          # PDF Invoice Generator & S3 uploader
│   ├── notification-service/     # SMTP & SMS carriers (transient retry simulated)
│   ├── audit-service/            # Immutable compliance logging
│   ├── settlement-service/       # Bank payout reconciliations
│   └── reporting-service/        # Dashboard Analytics aggregation service
│
├── payment-platform-portal/      # Next.js 15 Merchant & Developer Console Web App
├── payment-platform-sdk/         # Client SDK Node/TypeScript integration package
├── payment-platform-infra/       # Kubernetes deployments, Terraform plans, and CI/CD pipelines
└── docs/                         # Architecture, Database, Patterns, and Runbook documents
```

---

## 2. Technology Stack Checklist

### Backend & Core
- **Node.js**: v22+
- **TypeScript**: strict mode configuration
- **Framework**: Express.js
- **Database Access**: Prisma ORM
- **Database**: PostgreSQL 16
- **Cache & Locks**: Redis
- **Message Broker**: Apache Kafka

### Frontend Portal
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Query Handler**: React Query

### Operations & Observability
- **Infrastructure**: Terraform, Helm Charts, ArgoCD, Kubernetes manifests
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions CI/CD workflows
- **Traces & Metrics**: OpenTelemetry, Prometheus, Grafana, Loki

---

## 3. Local Development Quick-Start

To spin up the platform in under 5 minutes:

1. **Spin up Infrastructure Containers**:
   ```bash
   docker-compose up -d
   ```
2. **Install Workspace Dependencies**:
   ```bash
   npm run install:all
   ```
3. **Execute DB Push and Seeds**:
   ```bash
   cd payment-platform-core
   npx prisma db push
   npm run prisma:seed
   ```
4. **Start Core Engine**:
   ```bash
   npm run dev --workspace=payment-platform-core
   ```
5. **Start Frontend Portal**:
   ```bash
   npm run dev --workspace=payment-platform-portal
   ```
6. **Open Dashboard**: Go to `http://localhost:3000` to interact with the Console.
