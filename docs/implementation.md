# Implementation and verification record

## Delivered application

The application implements FR-01 through FR-20 as an academic workshop simulation. See [running instructions](running.md). The earlier static prototype was retired in issue #24; its historical evidence remains in Git history. The current model atlas explains the application design without executing operations.

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

## Release validation

GitHub Actions [run 44806930267](https://github.com/Kallst/mechanical-workshop/actions/runs/44806930267) completed successfully for application PR #6 on a fresh Linux runner with PostgreSQL 18. This independently executes the supplied workflow environment, but is not an independent human review. The local [browser evidence](evidence/browser-results.json) records Chrome 157.0.8103.80, nine screens at both 1440 and 390 pixels wide, persistence after reload and real employee switching, with no page errors or page-level horizontal overflow. Container deployment itself remains untested.

## One-command local startup (1.0.1)

`npm start` now bootstraps locked dependencies, generates private configuration only for a new clone, supervises a project-owned PostgreSQL child, applies migrations and idempotent seed, and caches the production build by its inputs. Existing custom ports and credentials remain unchanged. Local configuration accepts a PowerShell UTF-8 BOM. Direct managed hosting retains `npm run start:server`.

The Windows acceptance exercise started from a separate copy without node_modules, .env.local, .next or a database. One command installed 46 packages, initialized PostgreSQL 18, migrated, seeded, compiled, and served HTTP. Registration created seven employees; the guided scenario produced COP 599,770. After stopping and restarting, dependency installation and compilation were skipped, the same authenticated session and invoice persisted, and a duplicate launcher was rejected. Six startup regression tests, 15 domain tests, strict TypeScript and 10 HTTP integration subtests passed. This is local startup evidence, not a participant usability study or a production availability claim.

GitHub Actions [run 44860796248](https://github.com/Kallst/mechanical-workshop/actions/runs/44860796248) passed for startup PR #11, including the one-command startup against its external PostgreSQL service and production HTTP integration tests. This complements the Windows project-owned cluster exercise; it does not test Docker or replace a human review.

## Windows cluster identity correction (1.0.2)

A reported startup in an accented Windows path exposed a gap in 1.0.1: pg_ctl status said no server was running even though the saved database port accepted authenticated connections. The server's data_directory contained a replacement character in the path. The corrected launcher compares the authenticated pg_control_system system_identifier with pg_controldata for this clone before reusing an occupied database port. A port alone, or a damaged path string, is not accepted as ownership evidence.

The user's existing cluster was recognized without changing its saved port, credentials or data. A different local cluster's control identity was rejected against that same server. An owned child was separately started and stopped with a native fast-shutdown signal; PostgreSQL logged a completed shutdown. Seven startup regression tests, 15 domain tests, strict TypeScript and model checks passed. Existing databases remain running when a preview/application launcher stops.


## Visual bilingual interface (1.1.0)

Issue #17 supersedes the original English-only product-copy constraint while preserving English technical artifacts and stored enums. The overview now links an illustrative native SVG workshop to authenticated orders, pending material requests, recorded costs and technician activity. Equipment diagrams and interval strips show simulated observations; placement does not track physical bays. Four navigation groups retain role-scoped actions. Histories are expandable. Spanish is the default, with persistent ES / EN selection including validation feedback, printable educational invoices and optional localized CSV headers and statuses.

Local verification: strict TypeScript; 17 domain/localization/migration checks; eight startup checks; ten HTTP integration subtests plus their parent; production startup and compilation; 18 view/viewport combinations at 1440 and 390 pixels; keyboard map/equipment navigation; real role switching, localized closeout rejection, intervention pause/resume, material request, partial issue, return, guided closeout, invoice persistence, localized CSV and logout. No browser page errors or page-level horizontal overflow were observed. See [machine-readable evidence](evidence/visual-1.1.0.json). These checks are not a participant usability study or physical sensor validation.

The Windows verification also exposed newline-only legacy migration checksums and transient Next export directory locks. Migration matching accepts only the LF/CRLF equivalents of the supplied SQL. Production builds retry only recursive mkdir EPERM/EACCES inside .next, with bounded delays; persistent denials still fail. Existing data and credentials are preserved.

## Organized bilingual atlas (1.2.0)

Issue #24 replaces the old atlas/prototype navigation with the current graphite/orange workshop theme. Six categories organize 17 models. The atlas supports topic/requirement search, deep links, related models, fit/zoom/drag, fullscreen and local vector/source access. The application header links directly to Diagrams; returning preserves the authenticated session. Spanish and English SVGs share the same node/edge topology. Technical DOT and contracts remain English. The original prototype files and /design/mockups routes are retired; there is no link back to that interface.

Verification: 68 diagram/locale/viewport combinations passed at 1440 and 390 pixels without page errors or page-level overflow. Offline browsing made no external requests. Search, hash/history navigation, shared locale, fullscreen, zoom, keyboard controls and the mobile drawer passed. The application header was checked at 1440, 390 and 320 pixels. Hosted Spanish SVG download and return to the current workshop passed. Strict TypeScript, 17 domain/localization tests, eight startup checks, eleven HTTP subtests plus parent and 376 model checks passed. See evidence/atlas-1.2.0.json. These are local Chrome checks, not a participant study or cross-browser certification.
