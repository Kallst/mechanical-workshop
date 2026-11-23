# Repository instructions

## Language and terminology

- Use English for source code, identifiers, comments, tests, stored fixtures other than proper names, logs, database schema, API contracts, technical documentation, issues, pull requests, branches, and commits.
- The product UI supports Spanish (default) and English, including forms, feedback, seeded descriptions, invoices and optional localized CSV exports. Keep persisted enums and API payloads in English.
- Preserve these employee names exactly: Brian, Nicolás, Álan, Tamara, Juan Jacobo, Anderson, Juanita.
- The academic presentation and spoken explanations are in Spanish. The owner explicitly authorized the bilingual UI redesign in issue #17; this replaces the original English-only UI constraint.
- Use `technician`, `workshop manager`, `warehouse clerk`, `service order`, `intervention`, `material issue`, and `equipment idle time` consistently.
- Original academic requirement identifiers are source references. The software catalog uses `FR-*` and `NFR-*`; maintain the mapping in `docs/traceability.csv`.

## Development workflow

- Follow GitFlow as described in `CONTRIBUTING.md`. Base feature branches on `develop`; target `develop` with feature pull requests.
- Keep `main` for stable releases. Use merge commits to retain the visible integration history.
- Link each change to a requirement or documented engineering need and an issue.
- Record actual work as it happens. Do not fabricate collaborators, reviews, dates, incidents, benchmark results, savings, or a historical development timeline.
- A solo author may document a self-review; do not claim independent review.
- Do not commit original course attachments, credentials, local databases, runtime exports, or real customer data.

## Design and verification

- Read the relevant domain rules and requirement before implementing a module.
- Keep academic models, server rules, data contracts, UI behavior, and tests consistent.
- Enforce authorization and domain rules on the server; hiding a button is insufficient.
- Persist stock movements and cost records atomically. Preserve historical unit costs.
- Use decimal-safe monetary calculations and an explicit time basis for durations.
- Distinguish equipment power state from activity state.
- Keep simulation events and clock behavior explicit, reproducible, and isolated between demonstration sessions.
- Mark planned, implemented, tested, simulated, and real-world validated behavior accurately.
- Run checks appropriate to each change and report any verification limits.

## Scope

The model atlas contains design explanations and generated diagrams. The owner retired the original browser-only prototype in issue #24; do not restore its files, links or public route. Do not describe the application as runnable until implementation and its startup path have been verified. Architecture versions, package selection, hosting, and installation commands must be validated when implementation starts.


## Architecture boundaries

- Follow the folder map in docs/architecture/hexagonal.md. Keep domain independent of frameworks and adapters.
- Application use cases depend on application ports and domain code, not SQL, HTTP, React, environment reads or concrete adapters.
- Select adapters in src/bootstrap/services.ts. Preserve transaction-unit guarantees across repository implementations.
- Keep Next.js entry points in src/app and web components in src/adapters/inbound/web. Avoid compatibility copies of retired server modules.
- Run the dependency-boundary test and application tests when moving production code.
