# GitHub Copilot Instructions

* **Read `AGENTS.md`:** The `AGENTS.md` file in the root directory is the single source of truth.
* **Follow `AGENTS.md`:** Strictly adhere to the engineering standards defined there.
* **Use aliases:** Always use path aliases (e.g., `@shared/*`, `@modules/*`) instead of deep relative imports.
* **No hardcoded data:** Never use mock data; all business data must come from APIs.
* **No duplicate implementations:** Always reuse existing code from the shared library (DTOs, loggers, validators, etc.).
* **Use Platform DataTable:** Always use `@components/datatable` and `@components/actions` for tables. Never build custom ones.
