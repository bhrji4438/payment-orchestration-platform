# Incident Response & Operations Runbooks

This document details runbooks for common operational events, incidents, and maintenance tasks.

---

## Runbook 1: Gateway Outage & Failover Mitigation

### Alert Trigger
- High failure rate alerts for a specific gateway (e.g., Stripe) in Grafana.
- Spike in `payment.failed` Kafka events.
- Circuit breaker tripped to `OPEN` state in application logs.

### Diagnostic Steps

1. Query the database to check recent failure messages:
   ```sql
   SELECT "responseCode", "responseMessage", "gatewayConfigId", "createdAt"
   FROM payment_attempts
   WHERE status = 'FAILED'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

2. Check circuit breaker state in Pino structured logs (search by service name):
   ```bash
   docker compose logs payment-platform-core | grep "circuit"
   ```

### Resolution Steps
- The platform **automatically fails over** to the next priority active gateway configured for the merchant.
- If the primary gateway is completely down, log in to the Web Portal → **Gateway Routing** → disable the failing gateway configuration to force bypass.
- Once the gateway recovers, re-enable the configuration to restore primary routing.

---

## Runbook 2: Resetting a Tripped Circuit Breaker

### Context
A circuit breaker trips to `OPEN` state after 3 consecutive failures, blocking traffic for 30 seconds before entering `HALF_OPEN`.

### Diagnostic Steps
Verify the circuit status in Grafana dashboards or application logs:
```bash
docker compose logs payment-platform-core | grep -i "breaker\|OPEN\|HALF_OPEN\|CLOSED"
```

### Resolution Steps
1. The breaker will automatically transition to `HALF_OPEN` after 30 seconds.
2. If the underlying issue is resolved, the next successful request resets the breaker to `CLOSED`.
3. If manual intervention is required, restart the core backend instance to reset all breakers:
   ```bash
   docker compose restart payment-platform-core
   ```

---

## Runbook 3: Rotating Gateway Credentials

### Context
Gateway credentials (Stripe API keys, Cardpointe passwords, NMI security keys) must be rotated periodically or immediately if compromised.

### Resolution Steps

1. Generate new credentials in the gateway's merchant portal.

2. Encrypt the new credentials using the platform's AES-256-GCM utility from `shared/crypto/`:
   ```typescript
   import { credentialEncryptionService } from '../../shared/crypto/credential-encryption';
   const encrypted = credentialEncryptionService.encrypt(JSON.stringify(newCredentials));
   ```

3. Update the `encryptedCredentials` field in the `merchant_gateway_configurations` table:
   ```sql
   UPDATE merchant_gateway_configurations
   SET "encryptedCredentials" = '<new_encrypted_value>', "updatedAt" = NOW()
   WHERE id = '<config_id>';
   ```

4. Test the connection from the Web Portal → **Gateway Routing** → **Ping Health**.

---

## Runbook 4: Kafka Consumer Lag / Delayed Events

### Alert Trigger
- Invoice, Notification, or Audit service consumer groups are lagging behind the Kafka topic offset.
- Customers not receiving emails; invoices not generated.

### Diagnostic Steps
```bash
# Check consumer group lag
docker exec -it payment_orchestrator_broker \
  kafka-consumer-groups.sh --bootstrap-server kafka:29092 \
  --describe --all-groups
```

### Resolution Steps
1. Check service health:
   ```bash
   docker compose ps
   curl http://localhost:3001/health  # invoice-service
   curl http://localhost:3002/health  # notification-service
   curl http://localhost:3003/health  # audit-service
   ```
2. If a service is down, restart it:
   ```bash
   docker compose restart invoice-service
   ```
3. Once restarted, KafkaJS consumer groups automatically resume from the last committed offset. Events are **not lost** due to the transactional outbox pattern.

---

## Runbook 5: Settlement Discrepancy Detected

### Alert Trigger
- `settlement.discrepancy` Kafka event emitted.
- `Settlement` record in the database has `status = 'DISCREPANCY'`.

### Diagnostic Steps
```sql
-- Find all discrepancy settlements
SELECT s.id, s."merchantId", s."totalAmount", s.status, s."settlementDate"
FROM settlements s
WHERE s.status = 'DISCREPANCY'
ORDER BY s."settlementDate" DESC;

-- Find the specific mismatched items
SELECT si."paymentId", si."gatewayTxnId", si.amount, si.status
FROM settlement_items si
WHERE si."settlementId" = '<settlement_id>'
  AND si.status = 'VARIANCE';
```

### Resolution Steps
1. Cross-reference the `gatewayTxnId` with the gateway's merchant portal to verify the actual charged amount.
2. If the variance is a legitimate gateway fee, update the settlement item status to `MATCHED` after accounting for the fee.
3. If the variance is a genuine discrepancy (gateway charged less), raise a dispute via the gateway's merchant portal.

---

## Runbook 6: Database Migration Failures

### Context
Prisma migration failures during deployment can leave the schema in an inconsistent state.

### Resolution Steps
1. Check migration status:
   ```bash
   cd payment-platform-core
   npx prisma migrate status
   ```
2. If a migration is stuck in `pending` state, apply it manually:
   ```bash
   npx prisma migrate deploy
   ```
3. **Never** run `prisma db push` in production — it bypasses migration history and can cause irreversible schema drift.
4. If rollback is needed, restore from the latest RDS snapshot and re-apply migrations up to the last known-good version.

---

## Runbook 7: Shared Library Import Errors

### Context
After adding new code to `shared/`, TypeScript may fail to resolve imports in services if relative paths are incorrect.

### Resolution Steps
1. Verify the import depth is correct (count directory levels from the service to `shared/`):
   - From `payment-platform-core/src/*`: `../../shared/`
   - From `services/*/src/*`: `../../../../shared/`
2. Ensure the `tsconfig.json` in the service has `"moduleResolution": "bundler"` or `"node"`.
3. In Docker builds, verify the `Dockerfile` includes:
   ```dockerfile
   COPY shared/ ./shared        # in builder stage
   COPY --from=builder /app/shared ./shared   # in runner stage
   ```
4. Run the TypeScript compiler to surface all import errors:
   ```bash
   cd payment-platform-core && npx tsc --noEmit
   cd services/settlement-service && npx tsc --noEmit
   ```
