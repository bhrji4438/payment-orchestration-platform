# AGENTS.md - Authoritative AI Instructions

This document is the master AI instruction file for this repository. It serves as the single source of truth for all AI coding agents (Claude Code, Codex, Gemini, Cursor, Copilot, Antigravity, VS Code AI agents, and any future agents).

## Required Reading

Before modifying code, AI agents must review the following documentation:

* `docs/development/development-rules.md`
* `docs/architecture/architecture.md`
* `docs/architecture/design_patterns.md`
* `docs/architecture/shared_library.md`
* `docs/api/api_specification.md`
* `docs/database/database_schema.md`

## Architecture Rules

* **Follow existing architecture:** Modify code without changing architecture, patterns, conventions, or engineering standards unless explicitly instructed.
* **Do not redesign architecture:** Never redesign architecture unless explicitly requested.
* **Do not introduce alternative patterns:** Extend existing patterns; never replace them with personal preferences.
* **Reuse existing implementations:** Do not create duplicate implementations.

## Shared Library Rules

* **Shared library is the single source of truth.**
* No duplicate DTOs
* No duplicate validators
* No duplicate loggers
* No duplicate constants
* No duplicate utilities
* If functionality already exists, reuse it. If it is shared by multiple services, place it inside the `shared/` directory.

## Import Rules

Never use deep relative imports.

**Forbidden:**
```typescript
import { createLogger } from '../../../../shared/logger/create-logger';
```

**Required:**
```typescript
import { createLogger } from '@shared/logger/create-logger';
```

Use aliases only. Never introduce deep relative imports. If aliases do not exist, create alias support, update tsconfig, build tooling, and linting configuration.

## Frontend Rules

The frontend must remain a presentation layer.

**Forbidden:**
* No mock data
* No static dashboards
* No hardcoded merchants
* No hardcoded payments
* No hardcoded configurations
* No local fake state

All business data must come from APIs. If an API does not exist, build the backend API (Service, Repository, DTO) and connect the frontend.

### DataTable & Action Framework Rules

* **Never** create page-specific tables.
* **Always** use the platform `DataTable` framework (`@components/datatable`).
* **Never** create duplicate table implementations or action buttons.
* **Always** use `ActionRegistry` for defining actions.
* **Always** use schema-driven tables.
* **Always** use API-driven data.
* **Never** hardcode table columns or dropdown actions.

## Backend Rules

**Required Patterns:**
* Repository Pattern
* Unit Of Work Pattern
* Gateway Factory Pattern
* Adapter Pattern
* Outbox Pattern

Never bypass architecture. A Controller must call a Service, which calls a Repository, which interacts with the Database.

## Documentation Rules

Update documentation whenever architecture, APIs, database schemas, workflows, or setup instructions change. Documentation must remain synchronized with implementation.

## Testing Rules

* All new features require unit and integration tests.
* Bug fixes require regression tests.
* No untested business logic.

## Definition Of Done

A task is not complete unless:
✓ Types pass
✓ Lint passes
✓ Tests pass
✓ Documentation updated
✓ No duplicate code
✓ No hardcoded data
✓ Uses aliases (no relative imports)
✓ Follows existing architecture
