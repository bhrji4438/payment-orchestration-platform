# Database Design & Persistence Strategy

This document details the PostgreSQL database layout, table directory, index optimizations, UUIDv7 primary keys, and historical audit preservation strategies.

---

## 1. ID Generation Strategy: UUIDv7

The Payment Orchestration Platform uses time-ordered **UUIDv7** identifiers for all entity primary keys (e.g. users, merchants, payments, attempts).

### Why UUIDv7?
1. **Time-Ordered Sorting**: Unlike standard random UUIDv4, UUIDv7 embeds a millisecond-precision Unix timestamp in the most significant 48 bits. This makes keys monotonically increasing over time.
2. **Preventing B-Tree Index Fragmentation**: In relational databases like PostgreSQL, primary keys are indexed using B-Trees. Random UUIDv4 keys cause frequent page splits and re-balancing. UUIDv7 keys behave like auto-incrementing integers, appending new entries at the end of the index and keeping indexes highly performant.
3. **Decentralized Generation**: IDs are generated in-application memory without requesting sequences from the database, eliminating network blocking.
4. **Security**: They do not leak sequence counts (preventing ID enumeration/scraping attacks).

---

## 2. Table Directory & Model Relations

- **`users`**: Platform user accounts. Has a foreign key to `roles`.
- **`roles` / `permissions` / `role_permissions`**: The RBAC authorization schema.
- **`merchants`**: Tenant metadata (multi-tenancy isolation).
- **`merchant_users`**: Many-to-many join table mapping users to merchant accounts.
- **`customers`**: Holds tokenized profile contacts associated with merchants.
- **`gateway_providers`**: Master reference list of supported gateway systems (`STRIPE`, `AUTHORIZE_NET`, `NMI`, `CARDPOINTE`, `CUSTOM`).
- **`merchant_gateway_configurations`**: Decrypted gateway credentials, priorities, and environment flags.
- **`payments`**: Core transaction details (amount, status, optimistic lock version, card metadata masks, gateway token references).
- **`payment_attempts`**: Audit trail of every single gateway call, storing raw gateway response codes, logs, and transaction reference IDs.
- **`transactions`**: Ledger entries tracking credits and debits.
- **`refunds` / `voids`**: Reversal transactions.
- **`invoices`**: Links transaction IDs with PDF files.
- **`notifications`**: Audits SMS and email dispatches.
- **`idempotency_keys`**: Request cache for replay prevention.
- **`outbox_events`**: Transactional outbox pattern queue.
- **`settlements` / `settlement_items`**: Reconciliations records.
- **`api_keys` / `api_key_usage`**: Developer API authentication keys.
- **`webhook_deliveries`**: Records incoming/outgoing webhooks.
- **`event_store`**: Event sourcing store for compliance logs.

---

## 3. Database Indexes Optimization

To optimize lookup speeds, explicit indexing is applied to target query paths:
- `payments(merchantId, status)`: Accelerates dashboard analytics aggregation queries.
- `idempotency_keys(merchantId, idempotencyKey)`: Unique constraint and index for rapid double-charge prevention locks.
- `api_keys(hashedKey)`: Unique index to authenticate API keys.
- `outbox_events(status)`: Enables polling workers to quickly query `PENDING` outbox records.
- `event_store(aggregateType, aggregateId)`: Optimizes auditing lookups by payment ID.

---

## 4. The Transactional Outbox Schema (`outbox_events`)

The `outbox_events` table acts as a reliable buffer queue to ensure at-least-once delivery of event payloads.

### Schema Fields
| Column Name | SQL Type | Description |
|---|---|---|
| `id` | `UUID` (v7) | Primary key, time-sorted |
| `topic` | `VARCHAR` | Kafka target topic (e.g. `payment.captured`) |
| `key` | `VARCHAR` | Optional routing key (e.g. `paymentId`) |
| `payload` | `TEXT` | JSON event payload string |
| `status` | `VARCHAR` | `PENDING`, `PUBLISHED`, `FAILED` |
| `attempts` | `INT` | Delivery attempt count |
| `createdAt` | `TIMESTAMP` | Timestamp of creation |
| `updatedAt` | `TIMESTAMP` | Timestamp of last status change |

---

## 5. Soft Delete Pattern

To ensure auditability, critical business entities (payments, users, gateway configs) are never deleted via `DELETE` SQL commands.
- They include a nullable `deletedAt` field.
- Active records are queried using `deletedAt: null` in Prisma client layers.
- Deletions are executed by updating `deletedAt` to the current timestamp.
- Audit fields (`createdBy`, `updatedBy`) track the user executing the change.
