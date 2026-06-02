# Incident Response & Operations Runbooks

This document details runbooks for common operational events, incidents, and maintenance tasks.

---

## Runbook 1: Gateway Outage & Failover Mitigation

### Alert Trigger
- High failure rate alerts for a specific gateway (e.g., Stripe) in Grafana.
- Increase in `payment.failed` events.

### Diagnostic Steps
1. Query the database to check error messages:
   ```sql
   SELECT "responseCode", "responseMessage", "gatewayConfigId"
   FROM payment_attempts
   WHERE status = 'FAILED'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```
2. Check the circuit breaker state in the logs.

### Resolution Steps
- The platform automatically fails over to the next priority active gateway configured for the merchant.
- If the primary gateway is completely down, log in to the Web Portal, go to **Gateway Routing**, and temporarily disable the failing gateway configuration to bypass it.

---

## Runbook 2: Resetting a Tripped Circuit Breaker

### Context
A circuit breaker trips to `OPEN` state after 3 consecutive failures, blocking traffic for 30 seconds before entering `HALF_OPEN`.

### Diagnostic Steps
Verify the circuit status in Grafana or application logs.

### Resolution Steps
- The breaker will automatically transition to `HALF_OPEN` after 30 seconds.
- If the issue is resolved, the next request will reset the breaker to `CLOSED`.
- If manual intervention is required, restart the core backend instance to reset all breakers.

---

## Runbook 3: Rotating Gateway Credentials

### Context
Gateway credentials (such as Stripe API keys or Cardpointe passwords) must be rotated periodically or if they are compromised.

### Resolution Steps
1. Encrypt the new credentials:
   ```typescript
   const encrypted = credentialEncryptionService.encrypt(JSON.stringify(newCredentials));
   ```
2. Update the `encryptedCredentials` field in the `merchant_gateway_configurations` table.
3. Test the connection from the Web Portal.
