# Release Notes

## Transactions Module Enhancement

- Redesigned the Transactions table with lifecycle-aware status badges and transaction type badges.
- Added payment method visualization for card, eCheck, wallet, and future method expansion.
- Replaced inline action icons with a context-aware actions dropdown.
- Added server-side transaction search across IDs, customers, last4, gateway references, and receipt numbers.
- Added filters for status, transaction type, payment method, gateway, date range, and amount range with active filter chips.
- Added capture, void, and full/partial refund support from the portal.
- Preserved AUTH to CAPTURE as one merchant-facing transaction.
- Added immutable `transaction_events` lifecycle history.
- Enhanced receipt/details pages with gateway details, refund information, payment method details, and lifecycle timelines.
