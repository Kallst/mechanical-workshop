# System models

Status: reviewed design baseline. These models specify intended application behavior. They do not establish that the full-stack application, authentication, persistence, or telemetry adapter exists.

## Visual navigation

Open [the model atlas](index.html) to inspect six organized categories using the current graphite/orange theme, search and the vector viewer. Spanish and English diagram renderings are available; source DOT and technical specifications remain English. The atlas works locally with no external services. Every diagram is also available as an editable DOT source and a rendered SVG in [diagrams](diagrams/).

| View | Purpose | Source |
| --- | --- | --- |
| Context, operational view | One application process and the workshop-facing external flows | [SVG](diagrams/context-operations.svg) · [DOT](diagrams/context-operations.dot) |
| Context, monitoring and delivery view | The same application process with telemetry, reports, invoicing, and simulation flows | [SVG](diagrams/context-control.svg) · [DOT](diagrams/context-control.dot) |
| DFD Level 1 | Complete first logical decomposition, processes 1.0 through 6.0 and stores D1 through D7 | [SVG](diagrams/dfd-level-1.svg) · [DOT](diagrams/dfd-level-1.dot) |
| DFD process projections | Six readable views of the same Level 1 diagram; not additional decomposition levels | [1.0](diagrams/dfd-p1.svg) · [2.0](diagrams/dfd-p2.svg) · [3.0](diagrams/dfd-p3.svg) · [4.0](diagrams/dfd-p4.svg) · [5.0](diagrams/dfd-p5.svg) · [6.0](diagrams/dfd-p6.svg) |
| Service order states | Events, guards, review, closure, and cancellation | [SVG](diagrams/order-states.svg) · [DOT](diagrams/order-states.dot) |
| Intervention states | Running segments, pauses, and completion | [SVG](diagrams/intervention-states.svg) · [DOT](diagrams/intervention-states.dot) |
| Equipment states | Known power, observed activity, stale data, and idle alerts | [SVG](diagrams/equipment-states.svg) · [DOT](diagrams/equipment-states.dot) |
| Material activity | Responsibility partitions and stock delivery alternatives | [SVG](diagrams/material-delivery-activity.svg) · [DOT](diagrams/material-delivery-activity.dot) |
| Inventory causal loop | Purchase decisions and delivery close the balancing loop | [SVG](diagrams/causal-inventory.svg) · [DOT](diagrams/causal-inventory.dot) |
| Energy causal loop | Human corrective action reduces future powered idle duration | [SVG](diagrams/causal-energy.svg) · [DOT](diagrams/causal-energy.dot) |
| Operational use cases | Workshop and warehouse actor goals and supporting behavior | [SVG](diagrams/use-cases-operations.svg) · [DOT](diagrams/use-cases-operations.dot) |
| Control use cases | Monitoring, finance, reporting, access, and demonstration actor goals | [SVG](diagrams/use-cases-control.svg) · [DOT](diagrams/use-cases-control.dot) |

Supporting specifications: [lifecycles and policy decisions](lifecycles.md), [context and data dictionary](data-flows.md), [use case specifications](use-cases.md), [model traceability](model-traceability.csv).

## Notation and boundaries

The context diagram is process 0. Its first decomposition is called DFD Level 1 and numbers logical processes 1.0 through 6.0. DFDs use rectangles for external entities, ellipses for processes, record-style compartments for data stores, and named directed flows. This is a declared logical DFD convention, not UML. Internal storage and subprocesses appear only in Level 1.

For readability, the context is shown as two projections of the same process 0. Together, they contain exactly the 23 external flows F01 through F23. They are not two different systems. Each external flow appears with the same ID, name, direction, and external entity in the Level 1 model. The six process projections repeat internal boundary connections intentionally without adding a decomposition level.

The staff actor groups the four operational roles for shared sign-in. Role-specific actors represent those same people in their operational capacity, not additional employees. The demonstration operator is a staff member acting as the owner of a scenario. The simulated telemetry source is outside the application boundary; it supplies events through an explicit contract. Invoice recipients receive a generated document through the administrator's delivery process; there is no customer portal or implied outbound email integration.

UML-oriented state and activity diagrams use initial nodes, final nodes, guarded transitions, action nodes, decision nodes, and responsibility partitions. Actor rectangles use the `«actor»` classifier notation. Dashed `«include»` arrows point to required included behavior; dashed `«extend»` arrows point from conditional extension behavior to its base use case. Event and state names must agree with the lifecycle tables.

The equipment diagram groups Working, Idle, and unknown activity inside the Powered composite state. Shared power-off and heartbeat transitions apply to every substate; `model-contract.json` contains the expanded leaf-state transitions. Idle alert creation is an internal action, so it does not exit or reset Idle. The intervention diagram distinguishes guards in brackets from effects following `/`. Diagram stereotype labels use ASCII `<< >>` notation for reliable offline font metrics.

Reference: [OMG UML 2.5.1 specification](https://www.omg.org/spec/UML/2.5.1). The diagrams are a deliberately bounded modeling subset, not a claim of machine-validated compliance with the entire UML metamodel.

## Causal review

The earlier reinforcing loop treated purchases as an automatic response to spending and stock as a direct cause of unrestricted withdrawal. Those links depend on business policies and are not established by the project brief. The new baseline keeps them as hypotheses to investigate rather than a confirmed causal loop.

The two balancing loops model explicit control policies. Their signs assume other relevant factors remain fixed. An inventory suggestion becomes control only after approval, ordering, and receipt. An idle alert becomes control only when someone takes an action that changes equipment use. Detection and response delays remain visible. The simulation must test these policies against an equivalent demand sequence; the diagrams alone do not prove savings.

## Reproduction

From the repository root, with Python 3 and Node.js available:

```sh
python tools/design/build-models.py
python tools/design/specify-use-cases.py
npm install --prefix tools/design
npm run --prefix tools/design render
python tools/design/build-atlas.py
python tools/design/verify-design.py
```

The generator writes the shared [model contract](model-contract.json), DOT files, and traceability. The renderer creates SVGs using the pinned Viz.js version. The atlas builder embeds the rendered SVGs in a standalone page so viewing requires no CDN. Generated files are committed for immediate viewing without installing authoring tools. Review generated changes before committing them.


## Atlas organization and regeneration

Six categories organize the 17 diagrams: Context, Data flows, States, Activities, Feedback and Use cases. Search accepts topics, IDs and linked requirement IDs without requiring accents. Each diagram supports deep links, adjacent-model navigation, fit/zoom/drag, fullscreen and vector/source access. English DOT and technical specifications remain authoritative; the Spanish SVGs are localized presentations of the same node/edge topology. When hosted, SVG links download; when opened from file, they open the existing local vector in another tab.

Developer regeneration, from the repository root:

```sh
npm install --prefix tools/design --ignore-scripts --no-package-lock
python tools/design/build-models.py
node tools/design/render-models.mjs
python tools/design/build-atlas.py
npm run check:design
```

The render helper uses pinned Viz.js and measures Spanish with equivalent Latin base glyphs before restoring accents in the SVG. This avoids the bundled metric limitation while preserving readable translated labels. The atlas keeps local CSS, JavaScript and vector assets next to its HTML; it uses no remote fonts or rendering services. The legacy prototype files and route are retired; do not restore them as atlas navigation.
