# Production Deployment & Infrastructure Guide

This document details the configuration for deploying the Payment Orchestration Platform to production environments.

---

## 1. Pre-Deployment Checklist

Before deploying to any environment, ensure:

- [ ] All `package-lock.json` files are committed (run `npm run install:all` locally)
- [ ] `.env` secrets are stored in AWS Secrets Manager / Vault (never committed)
- [ ] `ENCRYPTION_MASTER_KEY` is set and rotated per environment
- [ ] Database migrations have been reviewed and tested
- [ ] Docker images build successfully with `docker compose up --build`
- [ ] All services pass health checks (`/health` endpoints return `200 OK`)

---

## 2. Docker Compose — Local & Staging Deployment

For staging and local environments, the entire platform is orchestrated via `docker-compose.yml` at the repository root.

```bash
# Build and start all services
docker compose up --build -d

# Check health of all containers
docker compose ps

# Stream logs from a specific service
docker compose logs -f payment-platform-core

# Stop all services
docker compose down

# Stop and destroy all volumes (full reset)
docker compose down -v
```

### Build Context Note

All Dockerfiles are built from the **repository root** as the Docker build context:
```yaml
build:
  context: .                        ← root of the monorepo
  dockerfile: services/<name>/Dockerfile
```

This allows each service Dockerfile to include the `shared/` library:
```dockerfile
COPY shared/ ./shared
```

---

## 3. Cloud Infrastructure: AWS Topologies

We use Terraform to define infrastructure as code (IaC) in AWS.

### 3.1 Core Monolith: AWS ECS Fargate
- **Reasoning**: Serverless container execution, eliminates EC2 cluster overhead.
- **Scaling**: Auto-scaling triggers at 70% average CPU or memory usage.
- **Image Registry**: Amazon ECR (one repository per service).

### 3.2 Supporting Services: AWS Lambda (or ECS)
- **Reasoning**: Asynchronous services (Invoice, Notification, Audit, Settlement) run on event-driven cycles.
- **Trigger**: AWS MSK (Kafka) topics trigger consumer groups.
- **Alternative**: Can be deployed as ECS Fargate tasks if Lambda cold-start latency is unacceptable.

### 3.3 Database & Message Queue
- **AWS RDS PostgreSQL 16**: Multi-AZ for high availability and failover.
- **Amazon MSK (Kafka)**: Fully managed Kafka with TLS encryption.
- **Amazon S3**: Secure bucket for PDF invoice storage.
- **Amazon ElastiCache (Redis)**: Managed Redis for idempotency locks.

### 3.4 Key Management
- **AWS KMS**: Used to protect the `ENCRYPTION_MASTER_KEY` used for AES-256-GCM credential encryption (managed via `shared/crypto/credential-encryption.ts`).

---

## 4. Kubernetes Deployment

For EKS environments, manifests are located under `payment-platform-infra/kubernetes/`.

### 4.1 Pod Resource Allocation

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| `payment-platform-core` | 250m | 500m | 256Mi | 512Mi |
| `reporting-service` | 100m | 250m | 128Mi | 256Mi |
| Microservices (`*-service`) | 100m | 250m | 128Mi | 256Mi |

### 4.2 Health Probes (All Services)

Every service exposes a `/health` HTTP endpoint:
- **Readiness Probe**: `GET /health` — if it fails, traffic is diverted from that pod.
- **Liveness Probe**: `GET /health` — if it hangs, the container is restarted.

### 4.3 ConfigMaps & Secrets
- Non-sensitive config (ports, feature flags): Kubernetes `ConfigMap`
- Sensitive values (DB passwords, API keys, `ENCRYPTION_MASTER_KEY`): Kubernetes `Secret` (backed by AWS Secrets Manager via External Secrets Operator)

---

## 5. CI/CD GitOps Pipeline

Deployments are automated via GitHub Actions with a GitOps approach.

### Pipeline Execution Steps

```
Push to main branch
  ──> 1. Lint & Type Check     (tsc --noEmit, ESLint)
  ──> 2. Run Tests             (Jest — payment-platform-core)
  ──> 3. Build Docker Images   (docker build for each service)
  ──> 4. Push to ECR           (tagged with git SHA and 'latest')
  ──> 5. Deploy                (ArgoCD / ECS service update)
```

### Service Build Order (dependencies first)
1. `shared/` is not built separately (part of service build context)
2. `payment-platform-core` (runs DB migrations via `prisma migrate deploy`)
3. Supporting services (`audit`, `invoice`, `notification`, `settlement`, `reporting`)
4. `payment-platform-portal`

---

## 6. Environment Variables per Service

| Variable | Core | Services | Portal |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | — |
| `REDIS_URL` | ✅ | — | — |
| `KAFKA_BROKERS` | ✅ | ✅ | — |
| `KAFKA_ENABLED` | ✅ | ✅ | — |
| `ENCRYPTION_MASTER_KEY` | ✅ | — | — |
| `SMTP_HOST` / `SMTP_PORT` | — | ✅ (notification) | — |
| `MINIO_ENDPOINT` | — | ✅ (invoice) | — |
| `NEXT_PUBLIC_CORE_API_URL` | — | — | ✅ |
| `NEXT_PUBLIC_REPORTING_API_URL` | — | — | ✅ |
| `PORT` | ✅ | ✅ | ✅ |
| `NODE_ENV` | ✅ | ✅ | ✅ |

See [`.env.example`](../.env.example) at the repository root for full values and descriptions.

---

## 7. Database Migrations in Production

Migrations are managed by Prisma and must be applied **before** starting new service versions:

```bash
# Run in the payment-platform-core container entrypoint (or as a pre-deploy job)
npx prisma migrate deploy

# Never use 'db push' in production — it bypasses migration history
```

The Prisma schema is located in `payment-platform-core/prisma/schema.prisma` and is shared with all services via `COPY payment-platform-core/prisma ./prisma` in each service Dockerfile.
