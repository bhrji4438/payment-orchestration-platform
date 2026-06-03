# Kafka & Event-Driven Architecture Guide

This document outlines the Apache Kafka system design, event schemas, consumer group structures, Dead Letter Queue (DLQ) routing patterns, CLI testing tools, and event replay runbooks.

---

## 1. Kafka Architecture Overview

Apache Kafka acts as the async communications pipeline connecting the Modular Monolith (`payment-platform-core`) with supporting microservices (`services/*`).

- **Broker Setup**: Local development uses a single confluentinc-community broker container running on port `9092` (advertised host: `kafka`).
- **Production Topology**: Managed via **AWS MSK (Managed Streaming for Apache Kafka)** across three Availability Zones.
- **Client client**: Services use `KafkaJS` to manage connections, produce payloads, and orchestrate consumer loop offsets.

---

## 2. Topic Conventions

Topics are structured logically according to their target resource domain and past-tense action:

| Topic Name | Producer Service | Consumer Services | Payload Details |
|---|---|---|---|
| `payment.captured` | `payment-platform-core` | `invoice-service`, `audit-service`, `reporting-service` | Payment details, merchant, customer, capture timestamp |
| `payment.failed` | `payment-platform-core` | `audit-service`, `reporting-service` | Error codes, transaction metadata, card brand masks |
| `invoice.created` | `invoice-service` | `notification-service`, `audit-service` | Invoice record ID, MinIO S3 URL, recipient email |
| `notification.sent`| `notification-service` | `audit-service` | Recipient address, notification status, dispatch timestamp |

---

## 3. Event Lifecycle & Outbox Pattern

To ensure database state commits are never out-of-sync with published events, the system utilizes the **Transactional Outbox Pattern**:

```
[API POST request]
       │
       ▼
┌──────────────────────────────────────┐
│  Unit of Work SQL Transaction        │
│  - Commit payment record             │
│  - Commit event row to outbox_events │
└──────────────────┬───────────────────┘
                   │
                   ▼ (Commit Succeeded)
┌──────────────────────────────────────┐
│  OutboxPublisher Worker (polls 5s)   │
│  - Read 'PENDING' events             │
│  - Publish event payload to Kafka    │
│  - Mark outbox row as 'PUBLISHED'    │
└──────────────────┬───────────────────┘
                   │
                   ▼ (Event Received)
┌──────────────────────────────────────┐
│  Kafka Topic: 'payment.captured'     │
└──────────────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ invoice-service │ │  audit-service  │
└─────────────────┘ └─────────────────┘
```

---

## 4. Consumer Groups & Partition Offsets

Each microservice runs in its own distinct **Consumer Group**:
- `invoice-service-group`
- `notification-service-group`
- `audit-service-group`
- `settlement-service-group`
- `reporting-service-group`

Because each service runs in a separate group, they maintain their own distinct offset counters. If `notification-service` goes offline, it will not affect the processing of `invoice-service`. Once restarted, it resumes reading from its last committed partition offset.

---

## 5. Dead Letter Queue (DLQ) Strategy

If a consumer encounters a terminal execution error (e.g. invalid payload formatting or corrupted invoice schema) it must not block the queue.

### DLQ Routing Rule
1. Wrap message processing inside a `try/catch` block.
2. If validation fails or processing throws an unrecoverable exception, extract the raw message payload.
3. Publish the message to a dedicated `.dlq` topic (e.g., `payment.captured.dlq`).
4. Append execution error headers detailing the exception class, timestamp, and host machine details.
5. Commit the offset of the original topic so consumer groups can continue to the next offset.

---

## 6. Kafka CLI Command Reference

Execute these commands inside the running broker container for local debugging:
```bash
docker exec -it payment_orchestrator_broker bash
```

### 6.1 Inspecting Consumer Groups & Lag
```bash
# Describe all consumer groups and list lag per partition
kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --all-groups
```

### 6.2 Reading Events (Console Consumer)
```bash
# Listen to a topic from the beginning
kafka-console-consumer.sh --bootstrap-server kafka:29092 --topic payment.captured --from-beginning

# Listen to a topic in real-time, displaying headers
kafka-console-consumer.sh --bootstrap-server kafka:29092 --topic payment.captured \
  --property print.key=true \
  --property print.headers=true
```

### 6.3 Manually Publishing Events (Console Producer)
```bash
kafka-console-producer.sh --bootstrap-server kafka:29092 --topic payment.captured
# > Enter raw JSON payloads here...
```

---

## 7. Event Replay Runbook

If a consumer service bug is discovered and fixed, you may need to replay historical events.

### Step-by-Step Replay Workflow:
1. **Stop the Consumer**: Scale down or stop the consumer service instance.
2. **Reset the Offset**: Reset the offset for the consumer group to a specific time or offset:
   ```bash
   # Reset all partition offsets to the beginning for a specific group
   kafka-consumer-groups.sh --bootstrap-server kafka:29092 --group invoice-service-group \
     --reset-offsets --to-earliest --execute --topic payment.captured
   
   # Reset offsets to a specific timestamp (format: YYYY-MM-DDTHH:mm:SS.xxx)
   kafka-consumer-groups.sh --bootstrap-server kafka:29092 --group invoice-service-group \
     --reset-offsets --to-datetime 2026-06-01T00:00:00.000 --execute --topic payment.captured
   ```
3. **Start the Consumer**: Restart the service. The service will rebuild its state by consuming all historical events from the target offset forward.
