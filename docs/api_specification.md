# API Specification & Authentication Guide

This document details the public API interface, authentication standards, request/response validation rules, unified error formats, and webhook verification procedures.

---

## 1. Authentication

The platform supports two authentication strategies:

### 1.1 Developer API Keys
- **Format**: Private keys start with `sk_` (e.g., `sk_test_demo_key_123456789`).
- **Header**: Passed in the authorization header:
  ```http
  Authorization: Bearer sk_test_demo_key_123456789
  ```
- **Security**: Keys are stored as SHA-256 hashes in the database. Plaintext keys are never stored.

### 1.2 JWT Tokens
- Used for merchant dashboard portal requests.

---

## 2. Request Headers

All write operations (`POST`, `PUT`, `PATCH`, `DELETE`) require the following headers:

| Header | Type | Required | Description |
|---|---|---|---|
| `Authorization` | String | Yes | Bearer token format (`Bearer sk_...`) |
| `Idempotency-Key` | UUIDv7 | Yes (Write) | Unique request token. Prevents duplicate charges. See **[Redis Architecture & Cache Guide](./redis-guide.md)** |
| `Content-Type` | String | Yes | Must be `application/json` |

---

## 3. Validation and Zod Schemas

All incoming payloads are strictly validated at the controller boundary using Zod schemas imported from `@shared/validators/payment.schemas`. If validation fails, the API returns a `400 Bad Request` containing details of the validation errors.

---

## 4. API Endpoints

### 4.1 POST `/v1/payments`
Processes a credit card payment (sale or authorization).
- **Request Body (Zod validated)**:
  ```json
  {
    "amount": 100.00,
    "currency": "USD",
    "gatewayConfigurationId": "a1111111-1111-1111-1111-111111111111",
    "card": {
      "pan": "4111111111111111",
      "expiryMonth": "12",
      "expiryYear": "2028",
      "cvv": "123",
      "holderName": "John Doe"
    },
    "capture": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "p0000001-1111-7000-8000-000000000001",
    "status": "CAPTURED",
    "amount": "100.00",
    "currency": "USD",
    "gatewayToken": "pi_mock_123456"
  }
  ```

### 4.2 POST `/v1/captures`
Captures a pre-authorized payment.
- **Request Body**:
  ```json
  {
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "amount": 100.00
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "p0000001-1111-7000-8000-000000000001",
    "status": "CAPTURED",
    "amount": "100.00",
    "currency": "USD"
  }
  ```

### 4.3 POST `/v1/refunds`
Refunds a captured payment.
- **Request Body**:
  ```json
  {
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "amount": 50.00,
    "reason": "Customer request"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "r0000001-1111-7000-8000-000000000001",
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "amount": "50.00",
    "status": "SUCCESS",
    "gatewayTxnId": "txn_mock_refund_123"
  }
  ```

### 4.4 POST `/v1/voids`
Voids a pre-authorized payment.
- **Request Body**:
  ```json
  {
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "reason": "Order cancelled"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "v0000001-1111-7000-8000-000000000001",
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "status": "SUCCESS",
    "gatewayTxnId": "txn_mock_void_123"
  }
  ```

### 4.5 GET `/v1/customers`
Lists merchant customers with pagination and optional search.

Query parameters:

| Parameter | Type | Description |
|---|---|---|
| `search` | String | Case-insensitive token search across email, first name, last name, and company name. Multi-word searches match across fields, so `mohit g` can match `mohit gupta`. |
| `activeOnly` | Boolean | When `true`, returns only active customers. Used by Virtual Terminal customer selection. |
| `isActive` | Boolean | Alias for `activeOnly=true`. |
| `pageSize` | Number | Number of records per page. |
| `limit` | Number | Legacy alias for `pageSize`. |
| `page` | Number | Page number, defaults to `1`. |

---

## 5. Unified Error Response Format

Errors are serialized consistently across all endpoints. They derive from the custom error hierarchy in `@shared/errors/errors`.

### Error Response Schema
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payment details provided.",
    "details": [
      {
        "field": "card.pan",
        "message": "PAN must be a valid 13-19 digit credit card number."
      }
    ]
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request payload failed validation checks. |
| `401` | `UNAUTHORIZED` | API key is missing, invalid, or expired. |
| `404` | `NOT_FOUND` | The requested entity does not exist. |
| `409` | `CONFLICT` | Key collision (e.g. active idempotency key with different body). |
| `500` | `INTERNAL_SERVER_ERROR` | An unexpected server-side error occurred. |

For detailed handling and implementation, refer to the **[Development & Coding Rules](./development/development-rules.md)** guide.

---

## 6. Webhook Signature Verification

Webhooks are signed using HMAC-SHA256. This ensures payloads are sent by the platform and have not been tampered with in transit.

### Header Format
```http
X-Webhook-Signature: t=1685600000,v1=a62fd9b31d2798e4f1648a336338573130dcf2f5b4de09148d28a5ff6b1424e8
```
- `t`: The epoch timestamp when the webhook was sent.
- `v1`: The computed HMAC-SHA256 signature.

### Verification Flow:
1. Extract the timestamp `t` and the signature `v1` from the `X-Webhook-Signature` header.
2. Construct the signature payload by concatenating: `t` + `.` + raw request body string.
3. Compute the HMAC-SHA256 of the payload using the merchant's webhook secret as the key.
4. Perform a constant-time string comparison to compare the computed hash against `v1`.
5. Reject the webhook if they do not match or if the timestamp `t` is older than 5 minutes (preventing replay attacks).

This flow is pre-implemented in the SDK client's `verifyWebhook()` method.
