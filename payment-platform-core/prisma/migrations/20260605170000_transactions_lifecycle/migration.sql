ALTER TABLE "payments"
  ADD COLUMN "transactionType" TEXT NOT NULL DEFAULT 'SALE',
  ADD COLUMN "refundableAmount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "gatewayTransactionId" TEXT,
  ADD COLUMN "receiptNumber" TEXT;

UPDATE "payments"
SET
  "transactionType" = CASE
    WHEN "status" = 'AUTHORIZED' THEN 'AUTH'
    WHEN "status" = 'VOIDED' THEN 'VOID'
    WHEN "status" = 'REFUNDED' THEN 'REFUND'
    ELSE 'SALE'
  END,
  "refundableAmount" = CASE
    WHEN "status" = 'CAPTURED' THEN "amount"
    ELSE 0
  END,
  "gatewayTransactionId" = "gatewayToken",
  "receiptNumber" = CONCAT('rcpt_', REPLACE("id"::TEXT, '-', ''))
WHERE "receiptNumber" IS NULL;

CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");
CREATE INDEX "payments_merchantId_status_createdAt_idx" ON "payments"("merchantId", "status", "createdAt");
CREATE INDEX "payments_merchantId_transactionType_idx" ON "payments"("merchantId", "transactionType");
CREATE INDEX "payments_merchantId_cardBrand_idx" ON "payments"("merchantId", "cardBrand");
CREATE INDEX "payments_merchantId_gatewayConfigId_idx" ON "payments"("merchantId", "gatewayConfigId");
CREATE INDEX "payments_merchantId_amount_createdAt_idx" ON "payments"("merchantId", "amount", "createdAt");

CREATE TABLE "transaction_events" (
  "id" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "amount" DECIMAL(18, 4),
  "gatewayTxnId" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  CONSTRAINT "transaction_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transaction_events"
  ADD CONSTRAINT "transaction_events_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "transaction_events_paymentId_createdAt_idx" ON "transaction_events"("paymentId", "createdAt");
CREATE INDEX "transaction_events_eventType_createdAt_idx" ON "transaction_events"("eventType", "createdAt");

INSERT INTO "transaction_events" (
  "id",
  "paymentId",
  "eventType",
  "fromStatus",
  "toStatus",
  "amount",
  "gatewayTxnId",
  "metadata",
  "createdAt"
)
SELECT
  (
    SUBSTR(MD5("id"::TEXT || ':' || "status"), 1, 8) || '-' ||
    SUBSTR(MD5("id"::TEXT || ':' || "status"), 9, 4) || '-' ||
    SUBSTR(MD5("id"::TEXT || ':' || "status"), 13, 4) || '-' ||
    SUBSTR(MD5("id"::TEXT || ':' || "status"), 17, 4) || '-' ||
    SUBSTR(MD5("id"::TEXT || ':' || "status"), 21, 12)
  )::UUID,
  "id",
  "status",
  NULL,
  "status",
  "amount",
  "gatewayToken",
  jsonb_build_object('source', 'migration'),
  "createdAt"
FROM "payments"
WHERE "deletedAt" IS NULL;
