# Database Design & Persistence Strategy

This document details the PostgreSQL schema layouts, database relations, indexing strategies, and soft delete patterns for the platform.

---

## 1. ID Generation Strategy: UUIDv7

The system uses **UUIDv7** for all public keys.

### Why UUIDv7?
1. **Time-Ordered Sorting**: UUIDv7 embeds a millisecond-precision Unix timestamp in the most significant 48 bits. This makes them sortable, which prevents key fragmentation and index re-sorting in B-Tree tables (common with random UUIDv4).
2. **Security**: They do not expose database sequence patterns like auto-incrementing integers, preventing enumeration attacks on public API endpoints.
3. **Decentralized Generation**: IDs are safely generated in-memory without blocking network queries to database sequences.

---

## 2. Core Tables Directory

- **`users`**: Contains core user accounts. Linked to roles and audit logs.
- **`roles` / `permissions` / `role_permissions`**: RBAC permissions matrix.
- **`merchants`**: Tenants. Contains active status blocks.
- **`merchant_users`**: Associates users with tenants (multi-tenancy isolation).
- **`customers`**: Holds tokenized profile contacts associated with merchants.
- **`gateway_providers`**: Master record list of supported gateways (Stripe, Authorize.Net, Cardpointe, NMI).
- **`merchant_gateway_configurations`**: Holds encrypted gateway credentials, Priorities, and Environment flags.
- **`payments`**: Contains transaction states, optimistic lock version keys, card masks (brand, last four, expiry), and gateway tokens.
- **`payment_attempts`**: Logging table tracking every gateway transaction attempt.
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

## 3. Database Indexes

To optimize lookup speeds, explicit indexing is applied to target query paths:
- `payments(merchantId, status)`: Accelerates dashboard analytics aggregation queries.
- `idempotency_keys(merchantId, idempotencyKey)`: Unique constraint and index for rapid double-charge prevention locks.
- `api_keys(hashedKey)`: Unique index to authenticate API keys.
- `outbox_events(status)`: Enables polling workers to quickly query `PENDING` outbox records.
- `event_store(aggregateType, aggregateId)`: Optimizes auditing lookups by payment ID.

---

## 4. Soft Delete Pattern

To ensure auditability, critical business entities (payments, users, gateway configs) are never deleted via `DELETE` SQL commands.
- They include a nullable `deletedAt` field.
- Active records are queried using `deletedAt: null` in Prisma client layers.
- Deletions are executed by updating `deletedAt` to the current timestamp.
- Audit fields (`createdBy`, `updatedBy`) track the user executing the change.
