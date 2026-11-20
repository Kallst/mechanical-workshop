# Requirements catalog

Status: functional scope implemented in the academic application. See [implementation evidence](implementation.md) for per-capability verification and limits. Quality targets below remain proposed unless explicitly supported by measurements.

## Source and naming

The original course project and the second presentation establish six functional goals and a catalog of 15 functional requirements and nine nonfunctional requirements. Use English IDs `FR-01` through `FR-15` and `NFR-01` through `NFR-09`. The mapping to original `RF-*` and `RNF-*` IDs is preserved in `traceability.csv`.

Values proposed in the second presentation remain proposed. Extensions below support the accepted complete-application scope and must not be misrepresented as verbatim instructor requirements.

## Functional requirements

| ID | Requirement | Acceptance direction |
| --- | --- | --- |
| FR-01 | Register customers, vehicles, and service orders. | Each order retains customer, vehicle, creation time, and valid state. |
| FR-02 | Assign one or more technicians to a service order. | Active work requires at least one assigned technician. |
| FR-03 | Record intervention start and end times. | Running work is attributable; overlapping active work for one technician is rejected. |
| FR-04 | Record material issues against an order and technician. | Store item, quantity, unit, order, technician, responsible user, and cost snapshot. |
| FR-05 | Validate that a material recipient is assigned to an open order. | Reject missing, closed, or unassigned order references on the server. |
| FR-06 | Record inventory receipts and justified adjustments. | Retain timestamp, responsible user, quantity, and reason. |
| FR-07 | Update stock atomically with material issues. | Persist issue, stock change, and cost attribution together; prevent negative stock. |
| FR-08 | Calculate reorder points and suggest purchases. | Use documented demand and lead-time inputs; prevent duplicate active suggestions. |
| FR-09 | Record equipment power events. | Persist equipment, unique event ID, event time, and power state. |
| FR-10 | Detect equipment idle time and notify the workshop manager. | Use observed or simulated activity, not merely order assignment; show acknowledgement and resolution. |
| FR-11 | Calculate costs by order, vehicle, and technician. | Show material, labor, and estimated allocated energy separately and avoid duplicate allocation. |
| FR-12 | Generate an educational service invoice. | Preserve an attributable, stable snapshot with declared pricing and rounding rules. |
| FR-13 | Show automatically updated operational indicators. | Derive values from persisted operations and display refresh or connection status. |
| FR-14 | Generate period-based consumption, utilization, and cost reports. | Apply consistent filters, time boundaries, and totals. |
| FR-15 | Authenticate users and restrict operations by role. | Enforce server permissions and a documented failed-login policy. |

## Accepted-scope extensions

| ID | Requirement | Acceptance direction |
| --- | --- | --- |
| FR-16 | Manage material requests and attributable returns. | Preserve request fulfillment and prevent over-returning an issue. |
| FR-17 | Process purchase suggestions through purchasing and receipt. | Separate authorization, ordering, and receipt; update inventory once per receipt. |
| FR-18 | Run repeatable scenarios with accelerated simulation time. | Declare seed and clock rate; support controlled restart and pause without corrupting records. |
| FR-19 | Isolate demonstration sessions. | One visitor cannot read, modify, or reset another visitor's or presenter's scenario. |
| FR-20 | Preserve an audit trail for important operations. | Attribute creation, changes, reversals, acknowledgements, and resets. |

## Proposed quality targets

| ID | Target | Verification needed |
| --- | --- | --- |
| NFR-01 | Reflect operational events in indicators within 5 seconds for at least 95% of events. | End-to-end latency measurements under the declared workload. |
| NFR-02 | Support 40 concurrent users and 100 open service orders while meeting NFR-01. | Reproducible workload and concurrency test. |
| NFR-03 | Achieve 99.5% availability during workshop operating hours, measured monthly. | Hosting monitoring over a real observation period; not provable by a short demo. |
| NFR-04 | Protect data in transit and at rest. | Verify deployment TLS, storage protection, and secret handling; local HTTP is not proof of TLS. |
| NFR-05 | Let at least 90% of evaluated users submit a material request in at most four steps and under one minute without help. | Documented usability study with participants and results. |
| NFR-06 | Back up every 24 hours and restore service within four hours. | Configured backup job and a measured restoration exercise. |
| NFR-07 | Receive equipment events over MQTT with less than 1% event loss. | Future MQTT adapter and sent-versus-recorded measurement; initial simulator support is insufficient. |
| NFR-08 | Retain attributable material movement history for at least two years without ordinary-user edits. | Permissions and correction model tests, retention configuration, and operational evidence. |
| NFR-09 | Operate in supported Chrome, Edge, and Firefox releases and on phone and tablet layouts. | Record actual browser versions, viewport checks, and interaction results. |

## Language requirement

LNG-01: Use English throughout the software, codebase, tests, technical documentation, and GitHub workflow. Preserve proper names and accents. The Spanish presentation is a separate artifact. Verify UI text, error paths, fixtures, commits, issues, and pull requests as part of review.

## Business goals and evidence

The inherited goals include reducing material spend by 15%, energy cost by 10%, and powered idle time by 30%, plus complete material traceability, timely visibility, and totalized service invoicing. The percentages are proposed targets, not demonstrated savings.

Scenario comparisons must use equivalent demand, initial stock, pricing, time horizon, and event sequences, with control policy as the stated experimental change. Report any modeled savings as simulated results under those assumptions.
