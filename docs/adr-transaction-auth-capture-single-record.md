# ADR: AUTH and CAPTURE Use One Merchant-Facing Transaction

## Status

Accepted

## Problem

Displaying AUTH and CAPTURE as separate merchant transactions creates duplicate transaction visibility, inconsistent reporting, and merchant confusion. A merchant expects an authorization to become captured, not to appear as a second independent payment.

## Decision

Represent AUTH and CAPTURE as one merchant-facing `payments` record. Capture transitions the original payment from `AUTHORIZED` to `CAPTURED`. Lifecycle history is persisted in `transaction_events`.

## Alternatives Considered

- Create a second merchant transaction for capture. Rejected because it duplicates visible transactions and breaks reconciliation expectations.
- Store only the current status and reconstruct history from attempts. Rejected because lifecycle history must be explicit and immutable.
- Use the ledger `transactions` table as the merchant list. Rejected because ledger entries are accounting movements, not the merchant-facing transaction model.

## Consequences

- Transaction listings show one row for an authorization and its capture.
- Reporting totals align with merchant expectations.
- Receipt timelines must read from `transaction_events`.
- Gateway attempts and ledger entries remain available for operational and accounting detail without becoming duplicate merchant transactions.
