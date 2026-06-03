# Redis Architecture & Caching Guide

This document outlines the Redis integration architecture, caching strategies, distributed idempotency locking mechanism, rate-limiting rules, local setup, CLI usage, and troubleshooting procedures.

---

## 1. Redis Architecture Overview

Redis 7 serves as the high-speed data buffer and distributed lock manager.

- **Local Development**: Runs as a single containerized instance mapped to port `6379`.
- **Production Environment**: Deployed via **AWS ElastiCache Redis** with cluster mode enabled, replication groups, and automatic failover.
- **Client Client Library**: The platform uses `ioredis` for asynchronous Node.js connection pools.

---

## 2. Idempotency Key Locking Strategy

To prevent double-charging credit cards, the platform requires an `Idempotency-Key` header on all write operations (`/v1/payments`, `/v1/captures`, `/v1/refunds`, `/v1/voids`).

### Sequence of Idempotency Checks
```
[Client Request] 
      │ (Idempotency-Key & MerchantId)
      ▼
Check Redis for Key "idemp:lock:{merchantId}:{key}"
      ├── EXISTS? ──> Return cached response or error if status is "PROCESSING"
      ▼
Key NOT EXISTS:
  1. Acquire lock: SET "idemp:lock:{merchantId}:{key}" "PROCESSING" NX PX 10000 (10s TTL)
  2. Parse & validate request payload via Zod schemas.
  3. execute database operations (Unit of Work transaction) & Gateway call.
  4. Write response payload into database table `idempotency_keys`.
  5. Update Redis key to "COMPLETED" and cache the response payload.
  6. Release temporary transaction lock.
```

- **Lock TTL**: A temporary transaction lock expires in 10 seconds to prevent deadlocks if a thread crashes during processing.
- **Cache TTL**: Completed response payloads are stored with a **24-hour expiration time** (`86400` seconds).

---

## 3. Sliding Window Rate Limiting

Rate limiting is enforced at the API gateway level using Redis sorted sets (`ZSET`) to count client hits in a sliding window.

- **Data Structure**: A `ZSET` key is created per client API key: `ratelimit:{apiKey}`.
- **Algorithm**:
  1. Add a member to the `ZSET` with the current timestamp as both the score and the value: `ZADD key timestamp timestamp`.
  2. Remove all elements with a score older than the window limit (e.g. 1 minute): `ZREMRANGEBYSCORE key 0 (timestamp - window)`.
  3. Get the count of elements currently in the set: `ZCARD key`.
  4. If the count exceeds the threshold (e.g. 100 requests/min), reject the request with `429 Too Many Requests`.
  5. Set a TTL on the `ZSET` to clean up inactive limits: `EXPIRE key 60`.

---

## 4. Local Setup & Reference

### Running Redis locally
Redis is started automatically via the root `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  container_name: payment_orchestrator_redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

### Environment Config
```env
REDIS_URL=redis://localhost:6379
```

---

## 5. Redis CLI Command Reference

Access the Redis CLI container to run diagnostics:
```bash
docker exec -it payment_orchestrator_redis redis-cli
```

### 5.1 Key Inspection
```bash
# List all active idempotency keys
KEYS idemp:lock:*

# Scan keys in a non-blocking manner (recommended for production instead of KEYS)
SCAN 0 MATCH idemp:lock:* COUNT 100

# Inspect the status of a specific idempotency key
GET idemp:lock:m001:key_abc123
```

### 5.2 Checking Key TTL (Time to Live)
```bash
# Return remaining time in seconds (-1 means no TTL, -2 means key does not exist)
TTL idemp:lock:m001:key_abc123
```

### 5.3 Manual Key Deletion (Reset Lock)
If an idempotency lock is stuck or needs clearing for testing:
```bash
DEL idemp:lock:m001:key_abc123
```

### 5.4 Monitoring Redis Metrics
```bash
# Get memory usage metrics
INFO memory

# Stream all commands executing against Redis in real time
MONITOR
```

---

## 6. Troubleshooting Redis Issues

### 6.1 Cache Stampede (Thundering Herd)
- **Problem**: Hot cache keys (like configuration schemas) expire simultaneously, causing all application threads to hit the PostgreSQL database at once, causing CPU spikes.
- **Resolution**: Use probabilistic early expiration or compute values in background Cron jobs before key expiration.

### 6.2 Redis Connection Failures
- **Symptom**: Core logs report `Redis connection lost` or Express returns `500` for all write endpoints.
- **Diagnostics**:
  1. Check Redis container health: `docker compose ps`.
  2. Verify network configuration. Ensure `REDIS_URL` matches the container hostname inside Docker.
- **Resolution**: Restart the container:
  ```bash
  docker compose restart redis
  ```

### 6.3 Redis Out of Memory (OOM)
- **Symptom**: Logs report `OOM command not allowed when used memory > 'maxmemory'`.
- **Resolution**: Check Redis eviction policy. Ensure `maxmemory-policy` is set to `allkeys-lru` or `volatile-lru` in `redis.conf` to automatically evict old keys.
