# Design Patterns Architecture Implementation Reference Guide

This document catalogs and explains the design patterns implemented in the Payment Orchestration Platform, serving as a technical guide for developers.

---

## 1. Adapter Pattern

- **Why Used**: Gateway APIs use different payload structures and protocols. Stripe uses JSON, Authorize.Net uses XML/JSON, NMI uses Key-Value URL parameters, and Cardpointe uses plain REST. The Adapter pattern standardizes them all behind a common interface.
- **Justification**: Decouples the core transaction service from specific gateway API implementations.
- **File Location**: [`stripe-gateway.adapter.ts`](../payment-platform-core/src/modules/gateways/stripe/stripe-gateway.adapter.ts)
- **Production Code Example**:
  ```typescript
  export class StripeGatewayAdapter extends AbstractPaymentGateway {
    public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
       // Convert standardized DTO to Stripe-specific parameters...
    }
  }
  ```
- **Benefits**: Simplifies onboarding new gateways — register in the factory, no core service changes required.

---

## 2. Strategy Pattern

- **Why Used**: To select and swap payment acquisition strategies at runtime depending on transaction configuration rules.
- **Justification**: Encapsulates specific authorization, sale, or echeck capture strategies away from routing services.
- **File Location**: [`cardpointe-gateway.adapter.ts`](../payment-platform-core/src/modules/gateways/cardpointe/cardpointe-gateway.adapter.ts)
- **Production Code Example**:
  ```typescript
  // Resolves the creditCardSale or echeckSale strategy dynamically inside the concrete adapter.
  // Cardpointe uses plain HTTPS REST calls — no npm SDK required.
  ```
- **Benefits**: Gateway logic is completely modular and interchangeable.

---

## 3. Factory Pattern

- **Why Used**: To dynamically instantiate concrete gateway adapters pre-configured with decrypted credentials.
- **Justification**: Prevents the payment service from having to instantiate gateways directly or know about their constructors.
- **File Location**: [`gateway.factory.ts`](../payment-platform-core/src/modules/gateways/factory/gateway.factory.ts)
- **Production Code Example**:
  ```typescript
  const providerCode = config.gatewayProvider.code.toUpperCase();
  const GatewayClass = this.gatewayClassMap.get(providerCode);
  return new GatewayClass(decryptedCredentials, config.environment, merchantId);
  ```
- **Benefits**: Enforces the Open-Closed Principle. Adding a new gateway only requires registering it in the factory.

---

## 4. Repository Pattern

- **Why Used**: To isolate data access queries away from core domain operations.
- **Justification**: Abstracts database operations, allowing queries to be swapped or mocked in tests.
- **File Location**: [`uow.ts`](../payment-platform-core/src/infrastructure/database/uow.ts)
- **Production Code Example**:
  ```typescript
  export class PaymentRepository {
    constructor(private readonly tx: Prisma.TransactionClient) {}
    public async findById(id: string) { ... }
  }
  ```
- **Benefits**: Testability and separation of concerns.

---

## 5. Unit of Work Pattern

- **Why Used**: To run multiple repository operations (Payments, Ledger, Outbox) inside a single database transaction.
- **Justification**: Enforces relational consistency, preventing orphan records or un-notified captures.
- **File Location**: [`uow.ts`](../payment-platform-core/src/infrastructure/database/uow.ts)
- **Production Code Example**:
  ```typescript
  export class UnitOfWork {
    public async run<T>(callback: (repos: { payments: PaymentRepository; ... }, tx: Prisma.TransactionClient) => Promise<T>) {
      return prisma.$transaction(async (tx) => {
        return callback({ payments: new PaymentRepository(tx), ... }, tx);
      });
    }
  }
  ```
- **Benefits**: Ensures transactional consistency across distinct entity tables.

---

## 6. Observer (Pub/Sub) Pattern

- **Why Used**: To distribute events to supporting services asynchronously without blocking the API call.
- **Justification**: Supporting services subscribe to events published via Apache Kafka, decoupling them from the core.
- **File Location**: [`kafka.service.ts`](../payment-platform-core/src/infrastructure/kafka/kafka.service.ts)
- **Production Code Example**:
  ```typescript
  await kafkaService.publish('payment.captured', paymentId, payload);
  ```
- **Benefits**: Reduces latency for client payment operations. See **[Kafka & Event-Driven Guide](./kafka-guide.md)**.

---

## 7. Circuit Breaker Pattern

- **Why Used**: To isolate gateway failures, preventing failing connections from slowing down the platform.
- **Justification**: Trips to `OPEN` state after consecutive gateway timeout failures, bypassing the failing adapter to trigger failovers.
- **File Location**: [`circuit-breaker.ts`](../payment-platform-core/src/modules/gateways/circuit-breaker.ts)
- **Production Code Example**:
  ```typescript
  const breaker = CircuitBreaker.getBreaker(config.id);
  await breaker.execute(async () => { ... });
  ```
- **Benefits**: Protects platform thread pools and ensures high availability.

---

## 8. Outbox Pattern

- **Why Used**: To avoid data loss if Kafka is offline during payment commit.
- **Justification**: Saves events to a database outbox table in the same transaction as the payment, then publishes asynchronously.
- **File Location**: [`outbox-publisher.ts`](../payment-platform-core/src/infrastructure/outbox/outbox-publisher.ts)
- **Production Code Example**:
  ```typescript
  // Scans outboxEvent table for PENDING entries and publishes them to Kafka in batches.
  // Event delivery is guaranteed at-least-once.
  ```
- **Benefits**: Guarantees at-least-once message delivery even during broker downtime. See **[Kafka & Event-Driven Guide](./kafka-guide.md)**.

---

## 9. Saga Pattern (Choreography)

- **Why Used**: To orchestrate multi-step transactions across distributed service namespaces.
- **Justification**: Uses choreographical Saga triggers: if capture succeeds → invoice generated → notification sent → audit logged. If any step fails, the saga emits a failure event to trigger compensation.
- **Event Chain**:
  ```
  payment.captured  ──> invoice-service  ──> invoice.created
  invoice.created   ──> notification-service ──> notification.sent
  payment.*         ──> audit-service    ──> audit.logged
  ```
- **Benefits**: Maintains eventual consistency across distributed service domains. See **[Kafka & Event-Driven Guide](./kafka-guide.md)**.

---

## 10. Dependency Injection Pattern

- **Why Used**: To resolve class dependencies at runtime rather than hardcoding them.
- **Justification**: The `PaymentService` is injected with configurations and adapters dynamically resolved via `GatewayFactory`.
- **File Location**: [`payment.service.ts`](../payment-platform-core/src/modules/payments/payment.service.ts)
- **Benefits**: Loose coupling, easier testing and mocking.

---

## 11. Domain Service Pattern

- **Why Used**: To encapsulate complex business rules that do not naturally belong inside a single database entity model.
- **Justification**: The `PaymentService` acts as a domain service orchestrator, coordinating validation, gateway calls, audit trails, and outbox logs.
- **File Location**: [`payment.service.ts`](../payment-platform-core/src/modules/payments/payment.service.ts)
- **Benefits**: Clear separation of domain logic from infrastructure concerns.

---

## 12. Shared Library / Single Source of Truth Pattern

- **Why Used**: To eliminate code duplication across a monorepo where multiple packages need the same utilities, constants, DTOs, and validators.
- **Justification**: Before consolidation, each service had its own logger, UUID generator, and error classes, causing inconsistencies.
- **File Location**: [`shared/`](../shared/)
- **Benefits**: Single point of change, consistent behavior, zero duplication. See **[Shared Library Guide](./shared_library.md)**.

---

## 13. Abstract Gateway Contract Pattern

- **Why Used**: To enforce a common interface across all payment gateway adapters.
- **Justification**: Without a contract, each adapter could implement different method signatures, making the factory and service code fragile.
- **File Location**: [`shared/contracts/abstract-payment-gateway.ts`](../shared/contracts/abstract-payment-gateway.ts)
- **Production Code Example**:
  ```typescript
  export abstract class AbstractPaymentGateway {
    abstract creditCardSale(req: CreditCardSaleRequestDto): Promise<PaymentResponseDto>;
    abstract creditCardAuthorize(req: CreditCardSaleRequestDto): Promise<PaymentResponseDto>;
    abstract creditCardCapture(req: CaptureRequestDto): Promise<PaymentResponseDto>;
    abstract creditCardRefund(req: RefundRequestDto): Promise<PaymentResponseDto>;
    abstract creditCardVoid(req: VoidRequestDto): Promise<PaymentResponseDto>;
  }
  ```
- **Benefits**: Guarantees all adapters are interchangeable through the factory.
