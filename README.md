# Mechanical Workshop

A full-stack heavy-vehicle workshop management and simulation project grounded in Systems Theory.

The workshop needs to connect technicians, service orders, material consumption, and equipment use so that managers can act while work is happening. The software makes those relationships visible and enforce the rules that keep the operation consistent.

## Current status

The repository contains a working Next.js/React/TypeScript application, PostgreSQL persistence, real employee sessions and server permissions, guarded workshop workflows, inventory and purchasing, simulated equipment events, operational reports, stable educational invoices, and isolated demonstration workspaces. The organized bilingual model atlas uses the current workshop theme. The retired browser-only prototype is available only in Git history.

Local production compilation, 15 domain tests, 10 HTTP integration subtests, backup restoration and 18 Chrome viewport checks passed. See [implementation evidence and limits](docs/implementation.md). Quality targets, physical telemetry and real savings are not proven by these tests.

## Run locally

Install Node 24 and PostgreSQL 18, then run:

```sh
npm start
```

The launcher installs locked dependencies, prepares the local database, applies migrations and seed, builds when needed, and keeps the application and its owned PostgreSQL process together. Keep its terminal open; Ctrl+C stops what it started. The first launch needs Internet for npm packages. Node 24 and PostgreSQL 18 must already be installed.

Open the **Workshop URL printed in the terminal** (normally http://127.0.0.1:3070) and choose **Create an isolated demo workspace**. A fresh clone selects free ports when defaults are occupied. Supply your own demonstration password and keep the generated workspace code. The seven fictional employee accounts use that chosen password for role play. Switching accounts requires a real sign-in. See [complete startup and demonstration instructions](docs/running.md), including external databases, backup verification and deployment limitations.

Active development takes place on `develop`. The `main` branch contains the stable baseline and will receive reviewed releases.

## Language

The application supports Spanish (default) and English. Use ES / EN at sign-in or in the header; the choice persists on this browser and also applies to printable invoices and UI-generated CSV reports. Source code, stored enums, API contracts, technical documentation, issues, pull requests, and commits remain English. Personal names retain their original spelling and accents.

## Visual operations cockpit

The graphite and orange interface groups work into Workshop, Warehouse, Purchasing, and Results. The native SVG isometric floor links visible vehicles to real service orders in the authenticated snapshot. Selecting a vehicle updates its technician and cost card. The floor shows up to three representative orders; use Service orders for the complete register. Positions are illustrative and do not represent physical bay tracking. Stock graphics show availability against the replenishment target, not storage capacity. Equipment diagrams and state strips reflect recorded simulated observations.

Long histories are expandable. The simulation remains explicitly identified; it is not live physical telemetry. See [visual design and asset provenance](docs/visual-redesign.md).

## Project structure

The application follows a hexagonal dependency structure: `domain` holds rules, `application` holds use cases and ports, `adapters` handles incoming web/HTTP and outgoing PostgreSQL/security, and `bootstrap` connects them. `app` remains the Next.js framework entry point. See the [folder map, dependency diagram and operation walkthrough](docs/architecture/hexagonal.md). Folder READMEs explain each boundary.

## Implemented academic capabilities

- Role-based access for administrators, workshop managers, warehouse clerks, and technicians.
- Customers, heavy vehicles, service orders, technician assignments, and interventions.
- Material requests, warehouse issues and returns, receipts, and justified adjustments.
- Inventory reorder points, purchase suggestions, purchase orders, and receipts.
- Equipment power and activity events, idle alerts, and estimated energy consumption.
- Material, labor, and energy cost breakdowns and educational service invoices.
- Live operational indicators, reports, and an audit trail.
- Reproducible workshop scenarios with an accelerated simulation clock.

## Documentation

| Document | Purpose |
| --- | --- |
| [Running and demonstration](docs/running.md) | Installation, accounts, workflows, backup and deployment |
| [Implementation evidence](docs/implementation.md) | Verified behavior, persistence decisions and limits |
| [Project scope](docs/project-scope.md) | Boundaries, users, planned capabilities, and completion criteria |
| [Requirements](docs/requirements.md) | Functional requirements and proposed quality targets |
| [Systems Theory coverage](docs/systems-theory-coverage.md) | Audit of original academic evidence and the delivered modeling increment |
| [Architecture decision](docs/architecture.md) | Stack, module boundaries, and links to physical persistence decisions |
| [Domain rules](docs/domain-rules.md) | Invariants, accounting relationships, and assumptions |
| [Traceability](docs/traceability.csv) | Links from original requirement IDs to the English catalog and planned work |
| [Delivery roadmap](docs/roadmap.md) | Implementation sequence and evidence required for each increment |
| [System model atlas](docs/models/index.html) | Context, DFDs, states, activities, causal loops, and use cases |
| [Model specifications](docs/models/README.md) | Policy decisions, textual use cases, data dictionary, and traceability |
| [Contributing](CONTRIBUTING.md) | GitFlow, review, validation, and English conventions |

## Demonstration team

The following names identify fictional workshop employees. Their initial roles are an editable demonstration assumption, not statements about real people.

| Employee | Initial role |
| --- | --- |
| Tamara | Administrator |
| Juan Jacobo | Workshop manager |
| Juanita | Warehouse clerk |
| Brian | Technician |
| Nicolás | Technician |
| Álan | Technician |
| Anderson | Technician |

## First end-to-end demonstration

Create a service order, assign Nicolás, start an intervention, request and issue a filter, observe inventory and cost changes, trigger a reorder suggestion, simulate an idle compressor, acknowledge its alert, finish the intervention, and close the order with its cost breakdown and educational invoice.

The application derives indicators from persisted operations. Simulation assumptions and measured software behavior will be reported separately from any claimed real-world savings.

## Previewing the design

Open Diagrams from the application header, or open `docs/models/index.html` locally without a server. The atlas groups 17 diagrams into six categories, supports Spanish/English labels, search, deep links, fit, zoom, drag, fullscreen and vector/source downloads. Keep its adjacent CSS/JS and diagrams directory when copying it. The former prototype and its `/design/mockups/*` URLs have been retired.

The atlas explains system design; it does not execute workshop operations. See [design verification](docs/models/verification.md) for the checks performed and their limits.
