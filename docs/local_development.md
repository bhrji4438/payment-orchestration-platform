# Local Development Guide

This guide details instructions for setting up, running, testing, and developing the Payment Orchestration Platform on your local machine.

---

## 1. Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| **Docker Desktop** | Latest | Run all backing services and the full platform |
| **Node.js** | 22+ (LTS) | Local TypeScript development only |
| **Git** | Any | Version control |

> **Tip**: Docker is the only hard requirement. You can run the entire platform with `docker compose up --build` without any local Node.js installation.

---

## 2. Directory Structure

The repository is a monorepo with a root-level shared library:

| Path | Role | Port |
|---|---|---|
| `shared/` | Single source of truth — loggers, UUIDs, DTOs, validators, constants | — |
| `payment-platform-core/` | Core ACID payment engine (Express + Prisma) | `3000` |
| `payment-platform-portal/` | Next.js 15 merchant & developer dashboard | `3006` |
| `payment-platform-sdk/` | Client SDK for Node.js integrations | — |
| `services/invoice-service/` | PDF invoice generator | `3001` |
| `services/notification-service/` | SMTP email & SMS dispatcher | `3002` |
| `services/audit-service/` | Compliance audit logger | `3003` |
| `services/settlement-service/` | Bank reconciliation engine | `3004` |
| `services/reporting-service/` | Analytics aggregation service | `3005` |

---

## 3. Backing Services & Ports

All infrastructure is provided via Docker. Default ports:

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL | `5432` | Relational database |
| Redis | `6379` | Idempotency locks, rate limiting |
| Kafka | `9092` | Async event broker |
| MailHog (SMTP) | `1025` | Email sending (dev only) |
| MailHog (UI) | `8025` | Email inbox viewer |
| MinIO (S3 API) | `9000` | Object storage for PDF invoices |
| MinIO (Console) | `9001` | MinIO admin UI |

---

## 4. Option A — Full Platform via Docker (Recommended)

The easiest way to run the entire platform with **zero local Node.js setup**:

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and boot all containers
docker compose up --build
```

Once all containers are healthy, access the platform:

| Interface | URL |
|---|---|
| Merchant Portal | http://localhost:3006 |
| Core Engine API | http://localhost:3000 |
| Reporting API | http://localhost:3005 |
| MailHog (Email UI) | http://localhost:8025 |
| MinIO (S3 Console) | http://localhost:9001 |

To rebuild a specific service after code changes:
```bash
docker compose up --build payment-platform-core
docker compose up --build reporting-service
```

---

## 5. Option B — Local Node.js Development

Use this option when actively developing and want hot-reload without rebuilding Docker images.

### Step 5.1 — Boot Only Backing Infrastructure

```bash
docker compose up postgres redis kafka mailhog minio -d
```

### Step 5.2 — Configure Environment Variables

Copy the root `.env.example` to `.env` and update host names from Docker service names (`postgres`, `kafka`) to `localhost` for local access:

```bash
cp .env.example .env
# Edit .env: change DATABASE_URL host from 'postgres' to 'localhost', etc.
```

### Step 5.3 — Install All Dependencies (One Command)

From the repository root:
```bash
npm run install:all
```

This runs `npm ci` sequentially across all 8 packages:
- `payment-platform-core`
- `payment-platform-portal`
- `payment-platform-sdk`
- `services/audit-service`
- `services/invoice-service`
- `services/notification-service`
- `services/reporting-service`
- `services/settlement-service`

> **Note**: Each service installs its own `node_modules`. The `shared/` library is consumed via relative path imports and has no separate `package.json` — it is copied alongside each service at build time.

### Step 5.4 — Run Database Migrations & Seed Data (First Time Only)

```bash
cd payment-platform-core

# Generate Prisma client
npm run prisma:generate

# Push schema to the database
npm run prisma:migrate
# (or for quick dev: npx prisma db push)

# Seed with demo merchants, gateways, API keys, and transactions
npm run prisma:seed
```

### Step 5.5 — Generate Prisma Client for Supporting Services

Each microservice that queries the database needs its own generated Prisma client:

```bash
cd services/audit-service && npm run prisma:generate && cd ../..
cd services/invoice-service && npm run prisma:generate && cd ../..
cd services/notification-service && npm run prisma:generate && cd ../..
cd services/settlement-service && npm run prisma:generate && cd ../..
cd services/reporting-service && npm run prisma:generate && cd ../..
```

### Step 5.6 — Start Services in Dev Mode

```bash
# Start core engine + portal simultaneously (from repo root)
npm run dev:all

# Or start individually:
npm run dev:core      # Core API on :3000
npm run dev:portal    # Next.js Portal on :3006

# Start microservices separately:
cd services/reporting-service && npm run dev
cd services/settlement-service && npm run dev
```

---

## 6. Root Workspace Scripts Reference

All commands are run from the **repository root**:

| Command | Description |
|---|---|
| `npm run install:all` | `npm ci` in all 8 packages sequentially |
| `npm run dev:core` | Start core engine (hot-reload) |
| `npm run dev:portal` | Start Next.js portal (hot-reload) |
| `npm run dev:all` | Start core + portal concurrently |
| `npm run build:all` | TypeScript build for core, portal, and SDK |
| `npm run test:core` | Run Jest tests for the core engine |

---

## 7. Shared Library Development

The `shared/` directory is the single source of truth for all cross-cutting concerns. It is **not a separate npm package** — services import from it via relative paths:

```typescript
// From payment-platform-core (2 levels up):
import { createLogger } from '../../shared/logger/create-logger';
import { generateUuidV7 } from '../../shared/ids/generate-uuid-v7';

// From services/* (4 levels up):
import { createLogger } from '../../../../shared/logger/create-logger';
import { generateUuidV7 } from '../../../../shared/ids/generate-uuid-v7';
```

When adding new shared code, place it in the appropriate `shared/` subdirectory. All consumers will automatically pick up the changes since they import by relative path.

---

## 8. Running Tests

```bash
# Unit and integration tests for the core engine
cd payment-platform-core
npm run test

# Or from root:
npm run test:core
```

---

## 9. Environment Variables Reference

See [`.env.example`](../.env.example) at the repository root for the full list of required environment variables. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `KAFKA_BROKERS` | Kafka broker addresses |
| `ENCRYPTION_MASTER_KEY` | AES-256-GCM master key (base64) |
| `KAFKA_ENABLED` | `"true"` to enable Kafka publishing |
| `SMTP_HOST` / `SMTP_PORT` | Email server (MailHog in dev) |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint for invoice storage |
