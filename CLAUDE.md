# Claude Code Instructions

* **Read `AGENTS.md` first:** `AGENTS.md` in the root directory is the single source of truth for all repository standards.
* **Treat `AGENTS.md` as authoritative:** Follow all rules and guidelines specified there.
* **Follow all repository standards:** Strictly adhere to the architecture, frontend/backend rules, testing, and definitions of done.
* **Never bypass architecture:** Always stick to the prescribed patterns (e.g., Repository, Unit of Work, Gateway Factory) and do not introduce new ones without explicit approval.
* **Use Platform DataTable:** Always use the platform `DataTable` and `ActionRegistry` components (`@components/datatable` and `@components/actions`). Never create page-specific table implementations or duplicate action buttons.
