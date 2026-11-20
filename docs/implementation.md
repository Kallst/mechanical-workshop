# Implementation and verification record

## Delivered application

The application implements FR-01 through FR-20 as an academic workshop simulation. See [running instructions](running.md). The earlier static prototype remains a design artifact and does not share state with this application.

| Capability | Implemented behavior | Verification |
| --- | --- | --- |
| Orders and work, FR-01–03 | Customer/vehicle creation, Draft submission, assignment, timed work, hold, review, rework, guarded closure and unused cancellation | Production browser navigation, domain state and overlap checks, guided HTTP closeout |
| Materials, FR-04–07 and FR-16 | Attributable requests, partial issues, receipts, adjustments and bounded returns at the original cost | Domain insufficient-stock and valuation tests; real PostgreSQL concurrency, rollback and constraint checks |
| Purchasing, FR-08 and FR-17 | Thirty completed scenario-day demand window, declared synthetic history, lead time, safety stock, seven-day review horizon, pack rounding; approval/order/partial receipt/cancellation | Rolling-window, duplicate receipt and outstanding-quantity domain checks |
| Equipment, FR-09–10 | Explicit five-state observations, event deduplication, late-event quarantine, profile snapshots, 15-minute continuous-idle alerts, acknowledgement and observed resolution | Domain duplicate/late/unknown/idle checks; guided HTTP workflow |
| Finance, FR-11–12 | Original material value, recorded active labor, known estimated energy by order, vehicle aggregation, attributed technician material/labor exports, stable educational invoice | Baseline and guided cost reconciliation, return valuation, HTTP reports and closed snapshot tests |
| Indicators and reports, FR-13–14 | Versioned snapshots, visible connection status, 2.5-second visible-tab polling, date/order-filtered CSV costs, movements and utilization | Browser views; HTTP date filters, source rows and financial restrictions |
| Identity and isolation, FR-15 and FR-19 | Scrypt hashes, opaque expiring HttpOnly sessions, server-derived roles, exact write origin, account lockout, workspace scoping | Anonymous, role forgery, origin rejection, tenant isolation, five-attempt lock and logout tests |
| Simulation and history, FR-18 and FR-20 | Persisted accelerated clock, bounded elapsed catch-up, reset scoped to workspace, deterministic policy comparison, initiating-account audit, command receipts | Clock cap, reproducibility, replay, audit immutability and reset-history tests |

These are local academic acceptance checks, not independent business validation. Some paths are verified through domain tests rather than exhaustive UI automation. MQTT ingestion and physical sensors are deferred. An administrator explicitly initiates synthetic delegated operations in the guided scenario; the audit never claims those employees independently signed in.

## Physical persistence decision

The context diagram and DFD define logical stores D1–D7. They do not require seven physical SQL tables. Identity, sessions, workspace ownership, migration history, command receipts and audit events use relational tables. Each owned workshop scenario stores its coherent operational aggregate as JSONB in `scenarios.state`.

A command selects that scenario with `FOR UPDATE`, validates against the locked state, updates the aggregate, appends audit history and writes an idempotency receipt in the same PostgreSQL transaction. Readers settle persisted simulation time while holding the same lock. The database also rejects negative item stock and malformed aggregate versions. Cross-workspace access is filtered before state is read or locked. Referential and lifecycle rules inside the JSON aggregate are server domain invariants rather than SQL foreign keys.

This deliberate first implementation favors a reproducible demonstration and understandable atomic invariants. Writes to a single scenario serialize, whole-state updates grow with history, and internal array references rely on the application. It is not a claim of horizontally scalable inventory processing. A future high-volume implementation should normalize ledger, intervals and requests, keep row-level inventory locks, and migrate historical snapshots explicitly. NFR-02 remains unproven.

## Numerical and temporal policy

Quantities are integer thousandths of the declared material unit; money is integer COP cents. Decimal strings are parsed exactly; multiplication uses BigInt intermediates and rounds nonnegative results half-up to cents. Aggregates are checked against safe integer limits. Receipts use a weighted average inventory unit value; returns use their original issue's snapshot. Labor is the sum of active intervals at the intervention's frozen hourly rate; paused time is excluded. Equipment intervals freeze work/idle watts and tariff. Estimated energy is watts × minutes × tariff / 60,000. Unknown observations carry uncovered minutes and do not invent a consumption estimate.

An equipment interval belongs to at most one order. Energy is not arbitrarily distributed to technicians. Technician reports identify only their attributed material and active labor; vehicle reports sum orders without double allocation. Date-based exports clip actual intervals and select movements in America/Bogota. They show period activity, which can differ from cumulative frozen invoice totals. Scenario origin is 2026-11-20 09:00 America/Bogota; baseline time is minute 70. Audit timestamps use PostgreSQL wall time separately.

Automatic time is derived lazily from persisted wall time at the configured 1×, 5×, 30× or 60× speed. A browser is not required to remain open; reopening settles elapsed time. It is not a continuously running sensor service: an alert becomes persisted/visible when the next read or command settles time. Catch-up is bounded to 24 wall hours and a 30-simulated-day horizon, where the clock pauses. Manual advance requires pause. Alerts refer to the threshold-crossing scenario minute.

## Evidence and limits

Local environment: Windows, Node 24.19.0, PostgreSQL 18.6; Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3 and pg 8.23.1 are locked. Production compilation and strict TypeScript validation passed. Domain tests: 15 passed. HTTP integration checks: 10 subtests plus their parent passed, covering the production app against actual PostgreSQL. Model verification checks 17 diagrams, 23 balanced boundary flows, 17 textual use cases and 30 traced requirements; its check count grows when documentation links are added.

The small-fixture backup restoration exercise completed in 2.319 seconds with matching workspace/scenario/audit counts, restoring into a newly created database and dropping only that disposable target. It demonstrates the recovery mechanism for this fixture; it does not establish backup frequency, full semantic integrity, encrypted off-host retention or production recovery time.

NFR-01 and NFR-02 need a declared workload and latency/load measurements. NFR-03 needs monthly hosting observations. NFR-04 needs deployment TLS/storage verification. NFR-05 needs participant usability evaluation. NFR-06 has a manual tested mechanism but no scheduled 24-hour job. NFR-07 needs an MQTT adapter and loss measurement. NFR-08 has append-only ordinary application history but no two-year operational observation. NFR-09 has local Chrome viewport checks, not Edge/Firefox or physical device certification. Docker configuration and CI are provided; describe them as validated remotely only after those runs succeed.

The proposed 15% material, 10% energy and 30% idle-time improvements remain hypotheses. The seeded comparison is an analytical experiment under displayed assumptions, including an assumed human response delay; it is not a measured workshop outcome or a simulation of technician capacity scheduling.
