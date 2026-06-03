# Production Deployment & Infrastructure Guide

This document details the configuration, workflows, and procedures for deploying the Payment Orchestration Platform to staging and production environments.

---

## 1. Pre-Deployment & Production Readiness Checklist

Before deploying changes to staging or production, ensure:

- [ ] **Dependencies**: All `package-lock.json` files are updated and committed (run `npm run install:all` locally).
- [ ] **Secrets Management**: Secrets are retrieved at runtime from a secure store (AWS Secrets Manager, HashiCorp Vault). Never commit credentials.
- [ ] **Encryption Keys**: The `ENCRYPTION_MASTER_KEY` (base64-encoded 32-byte key) is configured via env.
- [ ] **Database Migrations**: Database schema changes are validated, and dry-runs have been tested against staging clones.
- [ ] **Docker Compliance**: Docker containers build successfully under a multi-stage environment context.
- [ ] **Health Endpoints**: All service `/health` endpoints are verified.
- [ ] **Redis Setup**: Cache and lock clustering configurations are verified. See **[Redis Architecture & Cache Guide](./redis-guide.md)**.
- [ ] **Kafka Topics**: All required topic names exist on the target cluster. See **[Kafka & Event-Driven Guide](./kafka-guide.md)**.

---

## 2. Containerization & Docker Compose

For local development and staging environments, the system uses the `docker-compose.yml` located at the root of the workspace.

### Operations Commands
```bash
# Build and start all services in detached mode
docker compose up --build -d

# Verify container statuses and health probes
docker compose ps

# Stream logs for a specific service
docker compose logs -f payment-platform-core

# Stop all services and maintain volumes
docker compose down

# Fully reset the stack (erases databases and volumes)
docker compose down -v
```

### Docker Context Configuration
All services utilize a **multi-stage build pattern** to compile TypeScript files with relative path access to the root `shared/` library:
```dockerfile
# Stage 1: Build compilation
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared/ ./shared
COPY payment-platform-core/prisma ./prisma
# ... compile code
```

The build context is configured at the **repository root** (`context: .` in `docker-compose.yml`), making relative imports resolvable during compilation.

---

## 3. Cloud Infrastructure: AWS Topologies

We define cloud infrastructure using Terraform.

```
                  ┌───────────────────────┐
                  │      AWS Route 53     │
                  └───────────┬───────────┘
                              │
                  ┌───────────▼───────────┐
                  │    Application ALB    │
                  └───────────┬───────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│  payment-core (ECS)   │           │  reporting-core (ECS) │
└───────────┬───────────┘           └───────────┬───────────┘
            │                                   │
            ├───────────────┬───────────────────┤
            ▼               ▼                   ▼
     ┌─────────────┐ ┌─────────────┐    ┌───────────────┐
     │ ElastiCache │ │   RDS PG    │    │ Supporting    │
     │   (Redis)   │ │TransactionDB│    │ Services (ECS)│
     └─────────────┘ └─────────────┘    └───────┬───────┘
                                                │
                                                ▼
                                         ┌───────────────┐
                                         │  Amazon MSK   │
                                         │    (Kafka)    │
                                         └───────────────┘
```

### 3.1 Core Monolith: AWS ECS Fargate
- **Reasoning**: Serverless execution reduces cluster management complexity.
- **Scaling**: Auto-scaling rules scale out at 70% CPU or memory utilization.

### 3.2 Microservices: AWS ECS Fargate (or AWS Lambda)
- Asynchronous consumers (`invoice-service`, `notification-service`, `audit-service`) poll Kafka topics continuously. They run on Fargate for persistent connection efficiency.

### 3.3 Relational DB: AWS RDS PostgreSQL 16
- Deployed in Multi-AZ mode for automated failover.
- Read replicas handle reporting service workloads.

### 3.4 Managed Services
- **Amazon MSK**: Managed, secure Apache Kafka cluster.
- **Amazon ElastiCache Redis**: High-availability Redis cluster with clustering enabled.
- **AWS KMS**: Manages the `ENCRYPTION_MASTER_KEY` master key.

---

## 4. Kubernetes Topology

Kubernetes manifests are located under `payment-platform-infra/kubernetes/`.

### 4.1 Pod Resource Allocation Rules

| Pod Container | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| `payment-platform-core` | `250m` | `500m` | `256Mi` | `512Mi` |
| `reporting-service` | `100m` | `250m` | `128Mi` | `256Mi` |
| Supporting Services (`*-service`) | `100m` | `250m` | `128Mi` | `256Mi` |

### 4.2 Health Probes
Kubernetes performs readiness and liveness queries:
- **Readiness Probe**: `GET /health` determines if traffic can flow to the pod.
- **Liveness Probe**: `GET /health` restarts the container if it hangs.

---

## 5. CI/CD GitOps Pipeline

Pipelines are orchestrated via GitHub Actions.

```
Push to main branch
  ──> 1. Code Quality   (Linting & Type checks via 'tsc --noEmit')
  ──> 2. Run Tests      (Jest execution in core)
  ──> 3. Build Images   (Docker builds with root context mapping)
  ──> 4. Push Registry  (Upload to Amazon ECR with git SHA)
  ──> 5. Deploy GitOps  (ArgoCD sync or ECS update task)
```

---

## 6. Environment Variables Reference

| Variable | Core | Services | Portal | Description |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | — | Redis connection string |
| `KAFKA_BROKERS` | ✅ | ✅ | — | Comma-separated list of brokers |
| `KAFKA_ENABLED` | ✅ | ✅ | — | Set `"true"` to enable event streaming |
| `ENCRYPTION_MASTER_KEY` | ✅ | — | — | AES-256-GCM secret master key |
| `SMTP_HOST` / `SMTP_PORT` | — | ✅ (notification) | — | Mail server variables |
| `MINIO_ENDPOINT` | — | ✅ (invoice) | — | S3 storage API endpoint |
| `NEXT_PUBLIC_CORE_API_URL` | — | — | ✅ | Core engine endpoint URL |

---

## 7. Database Migrations in Production

Prisma schema migrations are applied as a **pre-deployment task** before starting the new service versions.

```bash
# Run inside the container entrypoint
npx prisma migrate deploy

# WARNING: Never run 'prisma db push' in production environments
```
