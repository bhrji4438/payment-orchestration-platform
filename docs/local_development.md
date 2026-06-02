# Local Development Guide

This guide details instructions for setting up, running, testing, and developing the Payment Orchestration Platform on your local machine.

---

## 1. Prerequisites

Before starting, ensure you have the following installed:
- **Node.js**: Version 20 or higher (version 22 recommended).
- **Docker Desktop**: Required to spin up backing services and run containerized environments.
- **Git**: For version control.

---

## 2. Directory Structure

The repository is organized as a collection of independent applications:
- [payment-platform-core](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core): Core transaction orchestrator (Express + Prisma, Port `3000`).
- [payment-platform-portal](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-portal): Next.js 15 merchant and developer UI dashboard (Port `3006`).
- [payment-platform-sdk](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-sdk): Shared types, DTOs, and abstract base classes.
- [services/](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services): Asynchronous microservices.
  - [audit-service](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services/audit-service) (Port `3003` health check)
  - [invoice-service](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services/invoice-service) (Port `3001` health check)
  - [notification-service](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services/notification-service) (Port `3002` health check)
  - [reporting-service](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services/reporting-service) (Port `3005` analytics)
  - [settlement-service](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services/settlement-service) (Port `3004` health check)

---

## 3. Backing Services & Ports

Backing services are run via Docker. They bind to the following default ports:
- **PostgreSQL**: `5432`
- **Redis**: `6379`
- **Kafka**: `9092`
- **MailHog (SMTP)**: `1025`
- **MailHog (UI Dashboard)**: `8025`
- **MinIO (S3)**: `9000` (API), `9001` (Console)

---

## 4. Spin Up Environment via Docker (Zero-Install Execution)

The easiest way to run the entire system is using `docker compose`:

```bash
# Build and boot all 13 containers (backends, services, database, cache, broker, etc.)
docker compose up --build
```

Once running, you can access:
- **Merchant Portal**: [http://localhost:3006](http://localhost:3006)
- **Core Engine API**: [http://localhost:3000](http://localhost:3000)
- **Reporting Analytics Service**: [http://localhost:3005](http://localhost:3005)
- **MailHog UI (Emails)**: [http://localhost:8025](http://localhost:8025)
- **MinIO Console (S3 Files)**: [http://localhost:9001](http://localhost:9001)

---

## 5. Local Service Development (Without Docker Compose)

To run a service locally for development/debugging:

### Step 5.1: Boot only Backing Services
```bash
docker compose up postgres redis kafka mailhog minio -d
```

### Step 5.2: Configure Environment Variables
Copy `.env.example` at the root or within specific folders to `.env` and adjust the variables (e.g., set hosts to `localhost` instead of Docker service names like `postgres` or `kafka`).

### Step 5.3: Run Database Migrations & Seeds
In `payment-platform-core`:
```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run schema migrations
npm run prisma:migrate

# Seed DB with mock merchants, gateways, users, api keys, and transactions
npm run prisma:seed
```

### Step 5.4: Generate Prisma Client in Supporting Services
For each microservice under `services/`, run the prisma generator locally so that TypeScript can resolve the database models correctly:
```bash
cd services/audit-service
npm install
npm run prisma:generate
```

### Step 5.5: Run the Services in Dev Mode
```bash
# Start Core
cd payment-platform-core
npm run dev

# Start Reporting Service
cd services/reporting-service
npm run dev

# Start Portal
cd payment-platform-portal
npm run dev
```

---

## 6. Running Tests

To run Jest unit/integration tests:
```bash
cd payment-platform-core
npm run test
```
