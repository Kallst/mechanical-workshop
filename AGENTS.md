# Repository instructions

## Language and terminology

- Use English for all software artifacts: UI copy, source code, identifiers, comments, tests, fixtures other than proper names, logs, errors, database schema, API contracts, documentation, issues, pull requests, branches, and commits.
- Preserve these employee names exactly: Brian, Nicolás, Álan, Tamara, Juan Jacobo, Anderson, Juanita.
- The academic presentation and spoken explanations are in Spanish and are separate from the English software project. Do not translate the product UI into Spanish.
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

The initial increment contains documentation only. Do not describe the application as runnable until implementation and its startup path have been verified. Architecture versions, package selection, hosting, and installation commands must be validated when implementation starts.
