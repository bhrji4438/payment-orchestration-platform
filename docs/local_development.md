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

---

## 2. Platform Services, URLs & Ports

Below is the port map of all services running locally under Docker Compose:

### Application Services
- **Core Engine API**: `http://localhost:3000` (Main transaction interface)
- **Invoice Service**: `http://localhost:3001` (PDF generator)
- **Notification Service**: `http://localhost:3002` (SMTP/SMS dispatcher)
- **Audit Service**: `http://localhost:3003` (Compliance logging consumer)
- **Settlement Service**: `http://localhost:3004` (Payout reconciliations)
- **Reporting Service**: `http://localhost:3005` (Analytics dashboard aggregator)
- **Merchant Web Portal**: `http://localhost:3006` (Next.js 15 Console UI)

### Infrastructure consoles & DBs
- **PostgreSQL**: `localhost:5432` (Primary Database)
- **Redis**: `localhost:6379` (Idempotency and lock storage)
- **Kafka Broker**: `localhost:9092` / `localhost:29092` (Event bus broker)
- **MailHog UI**: `http://localhost:8025` (SMTP port: `1025`)
- **MinIO S3 Console**: `http://localhost:9001` (S3 API port: `9000`)

---

## 3. Default Credentials & Environment Configuration

### Seeds & DB Access
- **PostgreSQL Database**: `payment_orchestration`
- **PostgreSQL User / Password**: `postgres / postgres`
- **Seeded Merchant Admin Account**: `admin@paymentorchestrator.com / admin123`
- **Seeded Developer API Key**: `sk_test_demo_key_123456789`
- **MinIO Access / Secret Key**: `minioadmin / minioadmin`

### Key Environment Variables
All services read settings from their respective `.env` files. Ensure the following match local configurations:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/payment_orchestration?schema=public"
REDIS_URL="redis://localhost:6379"
KAFKA_BROKERS="localhost:9092"
ENCRYPTION_MASTER_KEY="ZGVtb19tYXN0ZXJfa2V5XzMyX2J5dGVzX2Jhc2U2NF9lbmNvZGVk" # AES key
KAFKA_ENABLED="true"
```

---

## 4. Boot Options

### Option A — Full Platform via Docker (Recommended)
Easiest setup requiring zero local Node modules installation:
```bash
# 1. Setup environment variables for root and all services
npm run bootstrap:env

# 2. Build and boot all containers
docker compose up --build -d
```

### Option B — Local Node.js Development
Best for active hot-reloads and rapid TypeScript debugging:
```bash
# 1. Setup environment variables for root and all services
npm run bootstrap:env

# 2. Boot infrastructure backing containers (DB, cache, message broker)
docker compose up postgres redis kafka mailhog minio -d

# 3. Install dependencies across the monorepo workspace
npm run install:all

# 4. Push database migrations, seed defaults, and generate Prisma clients
npm run db:setup

# 5. Start the monolith and front-end portal
npm run dev:all
```

To overwrite existing `.env` files with example defaults at any time, use the `--force` flag:
```bash
npm run bootstrap:env -- --force
```

---

## 5. Merchant Onboarding Workflow

To onboard a new merchant tenant and test transactions:

### Step 5.1 — Create a Tenant Merchant
- Log in to the Merchant Web Portal (`http://localhost:3006`) with credentials `admin@paymentorchestrator.com` / `admin123`.
- Navigate to **Merchants** → **Create Merchant**. Fill in the organization name. A unique merchant ID (UUIDv7) is generated.

### Step 5.2 — Generate API Credentials
- Go to the **Developers** tab.
- Click **API Keys** → **Generate Private Key**. Copy the generated key (starts with `sk_test_...`). This key is used in request headers to authenticate integrations.

### Step 5.3 — Configure Gateway Credentials
- Select **Gateway Configurations** → **Configure Gateway**.
- Choose a Provider (e.g. `Stripe`, `Cardpointe`).
- Enter sandbox credentials. The platform encrypts details via AES-256-GCM before saving.
- Set priority (e.g., `1` for primary routing) and check "Default".

### Step 5.4 — Configure Webhook Settings
- Go to **Webhooks** → **Register Endpoint**.
- Provide your integration's URL and select events (e.g., `payment.captured`). Copy the webhook signature secret to verify incoming signature headers.

### Step 5.5 — Test Sandbox Sale
Run a test transaction using curl:
```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer sk_test_demo_key_123456789" \
  -H "Idempotency-Key: 01917c4a-3b2f-7000-8000-a1b2c3d4e5f6" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 19.99,
    "currency": "USD",
    "card": {
      "pan": "4111111111111111",
      "expiryMonth": "12",
      "expiryYear": "2028",
      "cvv": "123",
      "holderName": "Jane Doe"
    },
    "capture": true
  }'
```

---

## 6. How to Add a New Payment Gateway Adapter

Follow this checklist to implement and register a new gateway provider integration:

### Step 6.1 — Create the Adapter File
Create a new subdirectory and adapter file under `payment-platform-core/src/modules/gateways/`:
- `[NEW]` [my-gateway.adapter.ts](../payment-platform-core/src/modules/gateways/my-gateway/my-gateway.adapter.ts)

### Step 6.2 — Implement the Gateway Contract
Your adapter class **must** extend `AbstractPaymentGateway` from `@shared/contracts/abstract-payment-gateway` and implement all abstract methods:
```typescript
import { AbstractPaymentGateway } from '@shared/contracts/abstract-payment-gateway';
import { 
  CreditCardSaleRequestDto, 
  PaymentResponseDto,
  CreditCardAuthorizeRequestDto,
  CreditCardCaptureRequestDto,
  CreditCardRefundRequestDto,
  CreditCardVoidRequestDto,
  EcheckSaleRequestDto,
  EcheckRefundRequestDto,
  EcheckVoidRequestDto
} from '@shared/dto/gateway.dto';

export class MyGatewayAdapter extends AbstractPaymentGateway {
  constructor(credentials: Record<string, string>, environment: string, merchantId: string) {
    super(credentials, environment, merchantId);
  }

  public async creditCardSale(request: CreditCardSaleRequestDto): Promise<PaymentResponseDto> {
    this.validateRequest(request);
    this.auditGatewayRequest('creditCardSale', request);

    try {
      // Execute network requests using fetch / axios...
      const mockTxnId = 'txn_' + Math.random().toString(36).substring(7);
      
      const response: PaymentResponseDto = {
        success: true,
        transactionReference: mockTxnId,
        responseCode: 'APPROVED',
        responseMessage: 'Mock approved',
        rawResponse: '{}'
      };

      this.auditGatewayResponse('creditCardSale', response);
      return response;
    } catch (err: any) {
      throw this.mapGatewayError('creditCardSale', err);
    }
  }

  // Implement the rest of required contract signatures:
  public async creditCardAuthorize(request: CreditCardAuthorizeRequestDto): Promise<PaymentResponseDto> { ... }
  public async creditCardCapture(request: CreditCardCaptureRequestDto): Promise<PaymentResponseDto> { ... }
  public async creditCardRefund(request: CreditCardRefundRequestDto): Promise<PaymentResponseDto> { ... }
  public async creditCardVoid(request: CreditCardVoidRequestDto): Promise<PaymentResponseDto> { ... }
  public async echeckSale(request: EcheckSaleRequestDto): Promise<PaymentResponseDto> { ... }
  public async echeckRefund(request: EcheckRefundRequestDto): Promise<PaymentResponseDto> { ... }
  public async echeckVoid(request: EcheckVoidRequestDto): Promise<PaymentResponseDto> { ... }
  public async getTransaction(transactionReference: string): Promise<PaymentResponseDto> { ... }
}
```

### Step 6.3 — Register the Adapter in the Factory
Add the adapter registration to the `GatewayFactory` constructor map:
- `[MODIFY]` [gateway.factory.ts](../payment-platform-core/src/modules/gateways/factory/gateway.factory.ts)

```typescript
import { MyGatewayAdapter } from '../my-gateway/my-gateway.adapter';

constructor() {
  this.gatewayClassMap.set('STRIPE', StripeGatewayAdapter);
  this.gatewayClassMap.set('MY_GATEWAY', MyGatewayAdapter); // <-- Add mapping here
}
```

### Step 6.4 — Add Unit Tests
Create unit tests to verify adapter transformations and mock API error maps:
- `[NEW]` [my-gateway.adapter.spec.ts](../payment-platform-core/src/modules/gateways/my-gateway/my-gateway.adapter.spec.ts)
```typescript
describe('MyGatewayAdapter', () => {
  it('should process sales successfully', async () => {
    const adapter = new MyGatewayAdapter({ apiKey: 'key_123' }, 'sandbox', 'm001');
    const res = await adapter.creditCardSale(mockSaleRequest);
    expect(res.success).toBe(true);
  });
});
```

### Step 6.5 — Update Documentation and Database Provider Seeds
- Seed your database `gateway_providers` table with code `MY_GATEWAY`.
- Update `docs/tech_stack.md` listing the new gateway adapter capabilities.
