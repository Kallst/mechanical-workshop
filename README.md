# Mechanical Workshop

A full-stack heavy-vehicle workshop management and simulation project grounded in Systems Theory.

The workshop needs to connect technicians, service orders, material consumption, and equipment use so that managers can act while work is happening. The software will make those relationships visible and enforce the rules that keep the operation consistent.

## Current status

The repository contains the scope, requirements, architecture direction, development workflow, a reviewed system-model baseline, and a responsive browser-only design prototype. The full-stack application is not implemented yet. The prototype has temporary local state and no server, authentication, or database. Features and quality targets described here are planned unless explicitly marked as verified.

Active development takes place on `develop`. The `main` branch contains the stable baseline and will receive reviewed releases.

## Language

All software interfaces, source code, identifiers, comments, errors, API contracts, technical documentation, issues, pull requests, and commits use English. The academic presentation and spoken explanations use Spanish and are separate deliverables. Personal names retain their original spelling and accents.

## Planned capabilities

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
| [Project scope](docs/project-scope.md) | Boundaries, users, planned capabilities, and completion criteria |
| [Requirements](docs/requirements.md) | Functional requirements and proposed quality targets |
| [Systems Theory coverage](docs/systems-theory-coverage.md) | Existing academic work and models still to develop |
| [Architecture decision](docs/architecture.md) | Proposed stack, module boundaries, and implementation constraints |
| [Domain rules](docs/domain-rules.md) | Invariants, accounting relationships, and assumptions |
| [Traceability](docs/traceability.csv) | Links from original requirement IDs to the English catalog and planned work |
| [Delivery roadmap](docs/roadmap.md) | Implementation sequence and evidence required for each increment |
| [System model atlas](docs/models/index.html) | Context, DFDs, states, activities, causal loops, and use cases |
| [Model specifications](docs/models/README.md) | Policy decisions, textual use cases, data dictionary, and traceability |
| [Application prototype](docs/mockups/index.html) | Seven responsive English views with temporary scenario interactions |
| [Prototype walkthrough](docs/mockups/README.md) | Reproducible scenarios and explicit prototype limits |
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

The implementation must derive indicators from persisted operations. Simulation assumptions and measured software behavior will be reported separately from any claimed real-world savings.

## Previewing the design

Open `docs/mockups/index.html` or `docs/models/index.html` in a current browser. Both use local resources and work without a build. Alternatively, run `python -m http.server 8000` from the repository root and visit `/docs/mockups/` or `/docs/models/` on that local server.

Role selection in the prototype is a design preview, not authentication. Local prototype checks do not establish server integrity or security. See [design verification](docs/models/verification.md) for the checks performed and their limits.
