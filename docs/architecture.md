# Systems Architecture & Component Topology

This document details the architectural boundaries, container scopes, and integration paths for the Payment Orchestration Platform.

---

## 1. Transactional Boundaries

To balance data consistency and service scale, the system uses two main deployment patterns:

### 1.1 The Core Payment Modular Monolith (`payment-platform-core`)
- **Reasoning**: Processing currency capture requires strict ACID guarantees. Distributing authorization and capture across network boundaries risks split-brain or double-charge scenarios.
- **Transactional Scope**: Utilizes the Repository and Unit of Work patterns inside PostgreSQL transactions. This ensures payments, attempts, ledger transactions, and event outbox entries are committed atomically.

### 1.2 Event-Driven Supporting Services (`/services`)
- **Reasoning**: Operations like generating PDFs, sending emails, reconciliations, and dashboard caches do not block the transactional response thread.
- **Mechanism**: The outbox worker publishes events to Apache Kafka. The microservices consume these messages asynchronously, isolating transaction latency from external delays.

---

## 2. C4 Model Layout

### 2.1 C4 Level 1: System Context
```
┌─────────────────┐       HTTPS API        ┌─────────────────────────┐
│                 ├───────────────────────>│                         │
│  Merchant       │                        │   Payment Platform      │
│  Systems        │<───────────────────────┤   Orchestration Monolith│
│                 │      Webhook Call      │                         │
└─────────────────┘                        └────────────┬────────────┘
                                                        │
                                                        │ HTTPS Gateway API
                                                        ▼
                                           ┌─────────────────────────┐
                                           │  External Gateways      │
                                           │ (Stripe, Auth.Net, etc.) │
                                           └─────────────────────────┘
```

### 2.2 C4 Level 2: Container Topology
- **Merchant Web Dashboard (Next.js 15)**: React portal for managing logs and setting gateway routing priorities.
- **Express Core Engine (Node.js)**: Handles HTTPS traffic, API keys, checks idempotency keys, loads and runs the gateway factory, and writes to database.
- **backing Services (PostgreSQL & Redis)**: Stores persistent state and handles distributed locks.
- **Kafka Cluster Broker**: Buffers and passes events (topics like `payment.captured`, `invoice.created`) to lambdas.
- **Serverless Lambdas (Invoice, Notification, Audit, Settlement)**: Run event-specific tasks off the main path.

---

## 3. Asynchronous Event-Driven Messaging Lifecycle

```
[Payment Captured] 
  ──> Ingested by OutboxPublisher 
  ──> Dispatched to Kafka Topic 'payment.captured'
  ──> Consumed by Invoice Service
      ──> Creates DB record and S3 PDF link
      ──> Emits Kafka Event 'invoice.created'
  ──> Consumed by Notification Service
      ──> Resolves contact emails/SMS
      ──> Dispatches notification to customer
      ──> Resolves audit logging
```
This decoupling ensures that even if SMTP or S3 goes offline, payment collection continues without interruption.
