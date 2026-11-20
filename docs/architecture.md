# Architecture decision

Status: implemented academic application. See [physical persistence decisions and verified versions](implementation.md) and [startup instructions](running.md). The logical boundaries below remain the design baseline.

## Stack and structure

Use a modular monolith with Next.js, React, and TypeScript for the responsive interface and HTTP API, backed by PostgreSQL. Keep domain rules separate from rendering and request handling. One application deployment reduces operational overhead for a solo project while preserving visible module responsibilities.

Next.js Route Handlers provide an HTTP API surface. PostgreSQL provides relational constraints and transactions. The implementation uses pg with single-client transactions, custom scrypt password hashes and opaque database-backed sessions; there is no external identity provider. Pinned versions and limitations are documented in implementation.md.

References: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), and [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html).

## Logical modules

| Module | Owns |
| --- | --- |
| Identity | Users, roles, sessions, permissions, login attempts |
| Workshop operations | Customers, vehicles, orders, assignments, interventions |
| Inventory | Items, stock movements, material requests, cost snapshots |
| Purchasing | Reorder calculations, suggestions, purchase orders, receipts |
| Equipment | Power and activity events, sessions, utilization, idle alerts |
| Finance | Order cost allocation, invoice snapshots, cost breakdowns |
| Reporting | Aggregated indicators and period-based exports |
| Simulation | Scenario definitions, simulation time, synthetic telemetry, session isolation |
| Audit | Attributed records of important operations and corrections |

## Data path

A user action enters an authenticated request handler. Server authorization and input validation run before a domain operation. The operation reads and writes through a transaction where related updates must succeed together. After commit, the reporting layer exposes the resulting state to authorized clients.

The interface polls versioned snapshots every 2.5 seconds while visible; this does not establish a latency percentile under load. Report data staleness and connection failures visibly.

## Inventory integrity

Use a stock movement ledger with explicit receipt, issue, return, and adjustment types. Use database constraints where applicable and transactional concurrency control for multi-row rules. Validate availability while holding an appropriate database lock or through a conditional atomic update. A preflight stock check in the UI cannot prevent concurrent over-withdrawal.

Snapshot unit costs on issues and preserve original records. Corrections append attributable compensating records instead of silently rewriting history. Define the inventory valuation policy before implementation and use it consistently for returns and reporting.

## Equipment and simulation

Power and activity are separate observations. An assigned service order does not prove that an equipment item is working. Unknown activity cannot be counted as measured idle time without a documented assumption.

The simulator produces timestamped, uniquely identified events through the same domain contract used by any future telemetry adapter. Deduplicate event ingestion and handle out-of-order or missing events explicitly.

Keep wall-clock timestamps distinct from simulation time. A scenario has a declared start time, speed, and deterministic seed. Persist or derive progress so closing the presenter's browser does not silently change the model. Simulation session isolation must be enforced in server queries, writes, reports, and exports.

## Money and time

The chosen implementation stores integer COP cents and integer thousandth-unit quantities inside the PostgreSQL JSONB scenario aggregate, using BigInt intermediate calculations and explicit rounding. This refines the initial decimal-column proposal; see implementation.md. Store timestamps with an explicit timezone convention and display the demonstration timezone consistently. Duration calculations use a single declared time basis per scenario.

Energy is an estimate from configured power profiles and elapsed states unless actual measured energy is available. Preserve the power profile, tariff, and allocation assumptions used in a calculation. Attribute shared-equipment costs without charging the same session twice.

## Hosting and operations

Provide a verified local startup path first. A local PostgreSQL instance or a project-scoped container may be used after checking the available environment. Do not modify an existing database or reuse unrelated credentials.

Public demonstration hosting is a later delivery decision. Use synthetic data, session isolation, server-side authorization, controlled reset operations, secrets outside Git, and resource limits. Backup recovery and availability claims require operational evidence; a configured task alone is insufficient.
