# Mechanical Workshop

A full-stack heavy-vehicle workshop management and simulation project grounded in Systems Theory.

The workshop needs to connect technicians, service orders, material consumption, and equipment use so that managers can act while work is happening. The software will make those relationships visible and enforce the rules that keep the operation consistent.

## Current status

This first increment establishes the project scope, requirements, architecture direction, and development workflow. The application is not implemented yet. Features and quality targets described here are planned unless explicitly marked as verified.

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
