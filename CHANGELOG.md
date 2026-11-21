# Changelog

## 1.1.0

- Replace the flat menu with four role-aware navigation groups and a graphite/orange visual operations cockpit.
- Add an interactive isometric workshop, vehicle/material/equipment illustrations, recorded cost proportions, stock levels and equipment observation timelines.
- Support Spanish by default and English throughout the application, browser form validation, invoices and optional localized CSV exports. Preserve IDs, proper names and user content.
- Make histories expandable and support mobile layouts, keyboard selection, reduced motion and invoice printing.
- Preserve domain rules, authentication and atomic stock/cost persistence.
- Accept equivalent LF/CRLF migration digests and bound transient Windows production-build directory retries without changing database contents.
- See [visual design and verification](docs/visual-redesign.md) and [browser evidence](docs/evidence/visual-1.1.0.json).

## 1.0.2

- Verify PostgreSQL cluster ownership using its authenticated system identifier when an occupied Windows port cannot be identified through pg_ctl and Unicode paths.
- Preserve existing ports, data and credentials; reject mismatched cluster identities.
- Stop only the PostgreSQL child owned by the launcher using its native handle identity.


## 1.0.1

- Add one-command local startup with `npm start`: locked dependency installation, local PostgreSQL supervision, migrations, idempotent seed and conditional production compilation.
- Preserve saved ports and data; select free defaults for new clones, accept PowerShell UTF-8 BOM configuration and reject duplicate launchers clearly.
- Keep `start:server` for CI and managed hosting; add startup regression tests.
- Node 24 and PostgreSQL 18 remain installation prerequisites.


## 1.0.0 — Academic application

The first executable release connects the Systems Theory model baseline to persistent workshop operations. It adds real employee sessions, workspace isolation, guarded orders and interventions, atomic stock movements, partial requests and deliveries, attributable returns, purchasing, simulated equipment states and idle alerts, cost reconciliation, educational invoices and date-filtered CSV exports. The UI and all technical artifacts use English.

The scenario clock and policy comparison are explicitly synthetic. Energy uses configured power estimates and preserves unknown coverage. Cost snapshots remain stable after closure; staff reports do not invent technician energy allocation. Staff share a chosen workspace demonstration password for role play, while real sessions enforce account roles.

Verification includes production compilation, strict TypeScript, 15 domain tests, 10 HTTP subtests, PostgreSQL concurrency and rollback checks, 18 Chrome viewport checks and a small-fixture backup restoration. GitHub Actions run 44806930267 passed on Linux with PostgreSQL 18. See [verification details](docs/implementation.md) and [startup instructions](docs/running.md).

Release stabilization records browser evidence and normalizes the requirement CSV. The earlier diagrams and prototype remain design artifacts. No MQTT adapter, physical sensor integration, public hosting, measured real savings, monthly availability, 40-user benchmark, participant usability study or scheduled 24-hour backup service is claimed.

This is a solo-authored project with documented self-review. Feature PR #6 integrates into develop; the release branch supplies stabilization changes before promotion to main and integration back into develop. This describes actual work rather than invented collaboration.
