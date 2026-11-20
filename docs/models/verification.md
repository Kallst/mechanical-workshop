# Design verification

Verification scope: the system-model baseline and browser-only design prototype. This document does not certify the future full-stack application, server authorization, persistence, concurrency safety, telemetry delivery, or business savings.

The recorded browser assertions, layout measurements, atlas image checks, and final typography checks are available in [the browser verification record](browser-verification.json).

## Structural and semantic review

- Rendered 17 diagrams and projections from editable DOT sources with the pinned Viz.js 3.25.0 tooling and its Graphviz 14.1.3 build, with no renderer warnings.
- Inspected rasterized diagram output. Revised the material activity partitions, long edge labels, equipment composite view, transition effects, and use case boundary heading for readability.
- Checked the 23 context boundary flows against the Level 1 DFD by ID, entity, name, and direction. Checked that the two context views partition the boundary and internal flows do not connect stores directly to each other or to external entities.
- Checked lifecycle endpoint validity, terminal-state rules, and reachability of every declared state.
- Reviewed guarded transitions against domain rules. Pausing closes a running segment as an effect rather than treating it as a condition; alert creation is internal to Idle and does not reset its duration.
- Matched 17 textual use cases with the graphical catalog, including preconditions, normal flows, business alternatives, technical exceptions, and postconditions.
- Traced all 20 functional requirements to use cases and retained all 30 requirement/constraint rows in model traceability. Quality targets remain unproven by diagrams or mockups.
- Checked local documentation and asset references and preserved the seven employee names.
- Checked JavaScript syntax and inspected the browser console for prototype runtime errors.

Run `python tools/design/verify-design.py` from the repository root to repeat the structural checks. Rendering and inspection remain separate from structural validation.

## Browser behavior checks

The local preview was exercised in the Codex in-app Chromium browser. Thirty targeted behavioral assertions covered:

- Baseline totals and derived indicators.
- Material delivery changing stock, fulfillment, and cost together in temporary state.
- Duplicate delivery and receipt prevention in the preview workflow.
- Reorder recalculation, approval without on-hand change, and receipt of the ordered quantity.
- Exactly one idle alert per observed episode, acknowledgement without resolution, and confirmed power-off resolving the alert.
- Explicit unknown-power coverage without invented energy for the gap.
- Running work blocking hold, paused time exclusion, and On hold blocking work starts.
- A request not reserving stock; an insufficient-stock issue leaving stock and cost unchanged.
- Scoped warehouse report fields, administrator-only history, and single-order filtering.
- Completion, guarded order closure, educational invoicing, and a stable closed total as the clock advances.

These assertions validate prototype behavior only. In-memory changes cannot prove database atomicity, idempotency under concurrent requests, permission enforcement, or visitor isolation.

## Layout and atlas checks

Reviewed all seven application views at desktop 1440 × 1000, tablet 768 × 1024, and phone 390 × 844 sizes. Wide data tables and mobile navigation have local scrolling containers. Reviewed the request dialog and role-specific actions. Screenshots were captured for desktop, tablet, and phone layouts.

Checked all 17 atlas images for successful loading and nonzero intrinsic dimensions. Inspected the atlas and its zoom behavior; the complete Level 1 reference remains intentionally large, with six process projections provided for normal reading.

## Known limits and follow-up

- This is not cross-browser certification. Firefox, Edge, physical mobile devices, assistive-technology testing, and a participant usability study are pending.
- The prototype uses a fixed synthetic one-day dataset, explicit five-minute advances, and temporary state. Its role selector is not sign-in.
- Login, returns, partial deliveries and receipts, manual adjustments, assignment editing, new customer/vehicle forms, and production recovery remain specified rather than interactive.
- No public deployment, measured availability, backup recovery exercise, MQTT adapter, or real-world savings measurement is included.
- The initial reinforcing causal loop is treated as a hypothesis; the two revised balancing loops describe a proposed control policy under explicit assumptions.

The next implementation increment must turn this design into a verified Next.js/PostgreSQL foundation with migrations, server authorization, seeded employees, and automated checks for the actual domain rules.
