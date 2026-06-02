# API Specification & Authentication Guide

This document details the public API interface, authentication standards, webhook signatures, and rate limit rules.

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

## 2. API Endpoints

All endpoints require API key authentication and accept the `Idempotency-Key` header for write operations.

### 2.1 POST `/v1/payments`
Processes a credit card payment (sale or authorization).
- **Request Body**:
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

### 2.2 POST `/v1/captures`
Captures a pre-authorized payment.
- **Request Body**:
  ```json
  {
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "amount": 100.00
  }
  ```

### 2.3 POST `/v1/refunds`
Refunds a captured payment.
- **Request Body**:
  ```json
  {
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "amount": 50.00,
    "reason": "Customer request"
  }
  ```

### 2.4 POST `/v1/voids`
Voids a pre-authorized payment.
- **Request Body**:
  ```json
  {
    "paymentId": "p0000001-1111-7000-8000-000000000001",
    "reason": "Order cancelled"
  }
  ```

---

## 3. Webhook Signature Verification

Webhooks are signed using HMAC-SHA256.

### Verification Flow:
- Calculate the HMAC-SHA256 signature of the raw request body using the shared webhook secret.
- Compare the calculated signature against the signature header.
- Reject the request if they do not match.
- This logic is handled by `verifySignature()` in the SDK.
