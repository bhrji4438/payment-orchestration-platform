# Incident Response & Operations Runbooks

This document details runbooks for common operational events, incidents, system failures, and maintenance tasks.

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
Gateway credentials (API keys, passwords) must be rotated periodically or immediately if compromised.

### Resolution Steps
1. Generate new credentials in the gateway's merchant portal.
2. Encrypt the new credentials using the platform's AES-256-GCM utility from `@shared/crypto/credential-encryption`:
   ```typescript
   import { credentialEncryptionService } from '@shared/crypto/credential-encryption';
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

## Runbook 4: Settlement Discrepancy Detected

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

## Runbook 5: Database Migration Failures

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
4. If rollback is needed, restore from the latest RDS snapshot and re-apply migrations.

---

## Runbook 6: Shared Library Import Errors

### Context
After adding new code to `shared/`, TypeScript may fail to resolve imports in services if path mapping aliases are configured incorrectly.

### Resolution Steps
1. Verify the `@shared/*` alias is mapped correctly in `tsconfig.json`:
   ```json
   "@shared/*": ["../../shared/*"]
   ```
2. In Docker builds, verify the `Dockerfile` includes `COPY shared/ ./shared` in both builder and runner stages.
3. Run the TypeScript compiler to surface all import errors:
   ```bash
   npx tsc --noEmit
   ```

---

## Runbook 7: Kafka Connection Drops & Consumer Lag

### Symptoms
- Events are not processing downstream; notification emails and invoices are delayed.
- Consumer offset lag values continue to increase.

### Diagnostic Steps
1. Query consumer group descriptions inside the broker:
   ```bash
   docker exec -it payment_orchestrator_broker \
     kafka-consumer-groups.sh --bootstrap-server kafka:29092 \
     --describe --all-groups
   ```
2. Check logs for KafkaJS warning/error messages:
   ```bash
   docker compose logs invoice-service | grep -i "kafka\|connection\|disconnect"
   ```

### Resolution Steps
1. **Network Disruption**: If brokers are offline, verify MSK health. Restart local containers:
   ```bash
   docker compose restart kafka
   ```
2. **Backlog Mitigation**: If consumer group lag is due to a surge in traffic, scale consumer instances horizontally (Fargate tasks/Kubernetes replicas) to process messages in parallel.

---

## Runbook 8: Redis Failure & Cache Key Exhaustion

### Symptoms
- API write requests return `500 Internal Server Error` due to locking errors.
- Logs output `Command OOM not allowed` or Connection timeouts.

### Diagnostic Steps
1. Ping Redis:
   ```bash
   docker exec -it payment_orchestrator_redis redis-cli ping
   # Expected response: PONG
   ```
2. Check memory usage:
   ```bash
   docker exec -it payment_orchestrator_redis redis-cli info memory
   ```

### Resolution Steps
1. **Locked Idempotency Key**: Clear a stuck idempotency lock manually:
   ```bash
   docker exec -it payment_orchestrator_redis redis-cli del idemp:lock:<merchantId>:<key>
   ```
2. **Eviction Settings**: If Redis is out of memory (OOM), check the eviction policy. Force eviction of old keys using Least Recently Used (LRU) policy:
   ```bash
   docker exec -it payment_orchestrator_redis redis-cli config set maxmemory-policy allkeys-lru
   ```
3. **Connectivity Drops**: Restart local Redis container:
   ```bash
   docker compose restart redis
   ```

---

## Runbook 9: Microservice Startup Failures

### Symptoms
- Containers crash immediately upon booting, reporting loop exit code `1`.

### Diagnostics & Resolution
1. **Missing Environment Variables**:
   - Check container logs: `docker compose logs invoice-service`.
   - Verify that all environment properties defined in `.env.example` exist in the service `.env` file.
2. **Un-generated Prisma Client**:
   - If Prisma client files are missing, run compilation generation steps:
     ```bash
     npx prisma generate
     ```
3. **TypeScript Build Failures**:
   - Run compilation manually to verify that typescript compilation finishes cleanly:
     ```bash
     npm run build
     ```

---

## Runbook 10: Email Delivery & Mock MailHog Failures

### Symptoms
- Notifications status is `FAILED` in the database.
- Customers report they are not receiving emails.

### Diagnostics & Resolution
1. **MailHog Down**: Verify that MailHog UI is accessible at `http://localhost:8025`. If not, restart MailHog:
   ```bash
   docker compose restart mailhog
   ```
2. **SMTP Configuration Error**: Check `SMTP_HOST` and `SMTP_PORT` configuration parameters. For local dev, they must point to host `mailhog` on port `1025`.
3. **Invalid Email Schema**: Inspect the `notifications` table to see the failure log reasons:
   ```sql
   SELECT recipient, payload, status FROM notifications WHERE status = 'FAILED' LIMIT 5;
   ```

---

## Runbook 11: MinIO S3 Object Storage Failures

### Symptoms
- Invoice generation fails when uploading PDFs to S3 buckets.
- PDF links in the portal return `404` or permission errors.

### Diagnostics & Resolution
1. **Bucket Not Initialized**: Verify the default bucket exists. Access the console at `http://localhost:9001` (default credentials: `minioadmin` / `minioadmin`). Create the target bucket if missing.
2. **Access Policy Mismatch**: Ensure the bucket policy is set to `Public` or `Read-Only` for read endpoints, allowing browser downloads.
3. **Invalid Client Credentials**: Check env parameters: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`.

---

## Runbook 12: High CPU / Memory Spikes

### Symptoms
- Containers trigger auto-restart loops or drop requests.
- Node process memory footprint exceeds allocation limits.

### Diagnostics & Resolution
1. **CPU Profiling**:
   - Run `top` or check container resource usage:
     ```bash
     docker stats
     ```
   - Slow database queries are the primary cause of CPU spikes. Check PostgreSQL slow query logs:
     ```sql
     SELECT query, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;
     ```
2. **Memory Leaks**:
   - Check logs for `JS heap out of memory` errors.
   - Profile memory leaks using standard Node inspector flags: `--inspect`. Ensure that Express middleware objects and event listener arrays are properly garbage-collected and not accumulating requests.
