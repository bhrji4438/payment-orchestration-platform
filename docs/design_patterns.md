# Design Patterns Architecture Implementation Reference Guide

This document catalogs and explains the 11 design patterns implemented in the Payment Orchestration Platform.

---

## 1. Adapter Pattern
- **Why Used**: Gateway APIs use different payload structures and protocols (Stripe uses JSON, Authorize.Net uses XML/JSON envelopes, NMI uses Key-Value URL parameters, and Cardpointe uses raw REST basic auth). The Adapter pattern standardizes them.
- **Justification**: Decouples the core transaction service from specific gateway API implementations.
- **File Location**: [stripe-gateway.adapter.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/modules/payment/gateways/stripe/stripe-gateway.adapter.ts)
- **Production Code Example**:
  ```typescript
  export class StripeGatewayAdapter extends AbstractPaymentGateway {
    public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
       // Convert standardized DTO to Stripe form request parameters...
    }
  }
  ```
- **Benefits**: Simplifies onboarding new gateways.

---

## 2. Strategy Pattern
- **Why Used**: To select and swap payment acquisition strategies at runtime depending on configuration rules.
- **Justification**: Encapsulates specific authorization, sale, or echeck capture strategies away from routing services.
- **File Location**: [custom-gateway.adapter.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/modules/payment/gateways/custom/custom-gateway.adapter.ts)
- **Production Code Example**:
  ```typescript
  // Resolves the creditCardSale or echeckSale (ACH) strategy dynamically inside the concrete adapter.
  ```
- **Benefits**: Gateway logic is completely modular and interchangeable.

---

## 3. Factory Pattern
- **Why Used**: To dynamically instantiate concrete gateway adapters pre-configured with environment variables and decrypted credentials.
- **Justification**: Prevents the payment service from having to instantiate gateways directly.
- **File Location**: [gateway.factory.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/modules/payment/gateways/gateway.factory.ts)
- **Production Code Example**:
  ```typescript
  const providerCode = config.gatewayProvider.code.toUpperCase();
  const GatewayClass = this.gatewayClassMap.get(providerCode);
  return new GatewayClass(decryptedCredentials, config.environment, merchantId);
  ```
- **Benefits**: Enforces the Open-Closed Principle. Adding a new gateway requires registering it in the factory without modifying transaction orchestration.

---

## 4. Repository Pattern
- **Why Used**: To isolate data access queries away from core domain operations.
- **Justification**: Abstracts the database operations, allowing queries to be swapped or mocked in tests.
- **File Location**: [uow.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/repositories/uow.ts)
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
- **Why Used**: To run multiple repository operations (Payments, Transactions ledger, Outbox events) inside a single database transaction.
- **Justification**: Enforces relational consistency, preventing orphan records or un-notified captures.
- **File Location**: [uow.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/repositories/uow.ts)
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
- **File Location**: [kafka.service.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/services/kafka.service.ts)
- **Production Code Example**:
  ```typescript
  await kafkaService.publish('payment.captured', paymentId, payload);
  ```
- **Benefits**: Reduces latency for client payment operations.

---

## 7. Circuit Breaker Pattern
- **Why Used**: To isolate gateway failures, preventing failing connections from slowing down the platform.
- **Justification**: Trips to `OPEN` state after consecutive gateway timeout failures, bypassing the failing adapter to trigger failovers.
- **File Location**: [circuit-breaker.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/utils/circuit-breaker.ts)
- **Production Code Example**:
  ```typescript
  const breaker = CircuitBreaker.getBreaker(config.id);
  await breaker.execute(async () => { ... });
  ```
- **Benefits**: Protects platform thread pools and ensures high availability.

---

## 8. Outbox Pattern
- **Why Used**: To avoid data loss if Kafka is offline during payment commit.
- **Justification**: Saves events to a database outbox table in the same transaction as the payment, then publishes them asynchronously.
- **File Location**: [outbox-publisher.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/services/outbox-publisher.ts)
- **Production Code Example**:
  ```typescript
  // Scans outboxEvent table for PENDING and publishes them to Kafka in batches.
  ```
- **Benefits**: Guarantees at-least-once message delivery.

---

## 9. Saga Pattern
- **Why Used**: To orchestrate multi-step transactions across distributed service namespaces (Auth -> Capture -> Invoice -> Notification).
- **Justification**: Uses choreographical Saga triggers: if capture succeeds, invoice is generated; if invoice succeeds, notification is sent; if capture fails, saga triggers rollback/fail logs.
- **File Location**: [index.ts (notification-service)](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/services/notification-service/src/index.ts)
- **Benefits**: Maintains eventual consistency across distributed domains.

---

## 10. Dependency Injection Pattern
- **Why Used**: To resolve class dependencies at runtime rather than hardcoding them.
- **Justification**: The `PaymentService` is injected with configurations and adapters dynamically resolved via `GatewayFactory`.
- **File Location**: [payment.service.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/services/payment.service.ts)
- **Benefits**: Loose coupling, making code easier to test.

---

## 11. Domain Service Pattern
- **Why Used**: To encapsulate complex business rules that do not naturally belong inside a single database entity model.
- **Justification**: The `PaymentService` acts as a domain service orchestrator, coordinating validation, gateway calls, audit trails, and outbox logs.
- **File Location**: [payment.service.ts](file:///c:/Mohit/Projects/Mohit/Payment%20Structure/payment-platform-core/src/services/payment.service.ts)
- **Benefits**: Clear separation of domain logic.
