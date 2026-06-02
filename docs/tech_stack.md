# Technology Stack and Platform Overview

This document provides a detailed overview of the technologies, tools, and libraries utilized across the Payment Orchestration Platform.

---

## 1. Shared SDK Layer (`payment-platform-sdk/shared/`)

A lightweight, non-transpiled TypeScript module shared across all platform boundaries containing definitions, enums, and base classes:
- **Language**: TypeScript
- **Shared Objects**:
  - `gateway.dto.ts`: Standardized payload definitions for credit card sale, authorization, refund, capture, void, and echeck.
  - `abstract-payment-gateway.ts`: Common base class for adapters implementing common logging, correlation, and error mapping logic.
  - `events.ts`: Core Kafka event contracts (`payment.created`, `payment.captured`, `notification.sent`, etc.).
  - `constants.ts`: Shared enums (Gateway providers, environments, transaction statuses, refund statuses).

---

## 2. Core Payment Engine (`payment-platform-core`)

A modular monolith written in TypeScript that exposes the transactional endpoints and handles ACID-guaranteed ledger actions:
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM & Database Client**: Prisma ORM with PostgreSQL client
- **Validation**: Zod (for payload verification and schema assertions)
- **Encryption**: Built-in `crypto` library (AES-256-GCM for credential encryption/decryption)
- **Circuit Breaker**: Opossum (for resilience, fallbacks, and retry boundaries)
- **Logging**: Pino (with `pino-pretty` for development logs)
- **Utilities**: Bcrypt (user password hashing), UUID (UUIDv7 generator)
- **Routing**: Modular controllers and routes for Payments, Refunds, Captures, Voids, Webhooks, and API authorization.

---

## 3. Supporting Services (`services/`)

Independent, event-driven microservices that listen to Kafka events or poll the transactional outbox:
- **Runtime**: Node.js
- **Broker Integration**: KafkaJS (for consumer groups and message pub/sub)
- **Mailing (Simulated)**: MailHog (SMTP client for mail dispatch)
- **Object Storage (Simulated)**: MinIO SDK / AWS S3 client (for PDF invoice uploads)
- **Logging**: Pino
- **Database Access**: Prisma ORM (independent clients per container)

---

## 4. Frontend Portal (`payment-platform-portal`)

A merchant dashboard and developer portal providing log analysis, configuration management, and API key generation:
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query (v5)
- **Charting & Visualizations**: Recharts
- **Iconography**: Lucide React
- **API Client**: Axios

---

## 5. Infrastructure & Storage (`payment-platform-infra`)

Backing components and IaC manifests designed for cloud deployment:
- **Relational DB**: PostgreSQL 16 (strict relational schema with foreign key constraints, indexes, and soft-delete states)
- **Key-Value Cache**: Redis 7 (idempotency key locks and rate-limiting counters)
- **Messaging Pipeline**: Confluent Platform Apache Kafka & Zookeeper
- **Cloud Infrastructure IaC**: Terraform (declaring AWS ECS Fargate, MSK, RDS, S3, KMS resources)
- **Orchestration / Containers**: Kubernetes manifests, ArgoCD application files, Helm charts, and custom Docker multi-stage build files.
