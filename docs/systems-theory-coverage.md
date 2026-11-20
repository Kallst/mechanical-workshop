# Systems Theory coverage

This matrix distinguishes evidence already present in the supplied presentations from new deliverables. A presentation containing a diagram does not establish that its behavior is implemented in software.

The table below is the original-source audit: "remaining" describes what was missing before the modeling increment. New design evidence is now available in the [system model atlas](models/index.html), [lifecycle decisions](models/lifecycles.md), [data dictionary](models/data-flows.md), [17 textual use cases](models/use-cases.md), [model traceability](models/model-traceability.csv), and [responsive application prototype](mockups/index.html). These close design gaps while server-backed implementation and verification remain pending.

| Topic | Existing evidence | Remaining deliverable | Planned demonstration |
| --- | --- | --- | --- |
| Definition and classification | First presentation defines and classifies the workshop. | Make the workshop and application boundaries explicit. | Identify people, equipment, materials, procedures, and software responsibilities. |
| Input-process-output | First presentation models workshop inputs, transformation, outputs, and feedback. | Connect the model to concrete application operations. | A material issue becomes stock movement, order cost, and a report. |
| Invariant relationships | Second presentation contains candidate validation rules. | Define the modeling interpretation and formalize invariant relationships. | Reject an issue without a valid assignment and preserve the stock balance. |
| Causal diagram | Second presentation includes signed relationships and reinforcing and balancing loops. | Review causal assumptions and include human corrective action explicitly. | Idle detection leads to an alert, acknowledgement, and an equipment action. |
| State diagram | No explicit state diagram identified. | Model order and equipment lifecycles with events and guards. | An invalid transition fails; a valid transition updates the operation. |
| Activity diagram | No explicit activity diagram identified. | Model the material request and delivery workflow across roles. | Technician requests, warehouse clerk validates, system records and updates. |
| Use case diagram | Second presentation includes actors, use cases, and include/extend relationships. | Align diagram coverage and textual specifications with the complete scope. | Follow a documented normal flow and a defined alternative flow. |
| Information systems | Existing work addresses the operational need and requirements. | Explain people, processes, data, and technology as an integrated information system. | A recorded event supports a manager's decision. |
| Data and information | Mentioned in the existing systemic reading. | Document transformations from raw records to useful information. | Compare a power event with the resulting utilization indicator. |
| Information systems analysis | Requirements, actors, causes, and traceability exist in the second presentation. | Consolidate current and proposed processes, rules, and scope. | Trace a business problem through design and acceptance evidence. |
| Context diagram | No explicit context diagram identified. | Draw the application as one process with external entities and named data flows. | Explain the software boundary and telemetry source. |
| Data flow diagrams | No explicit DFD identified. | Draw a decomposition consistent with the context flows and explicit data stores. | Trace request data to stock, costs, and reports. |
| Mockups | Existing HTML files are academic presentations. | Design application screens for the operational roles. | Compare a mockup with its implemented workflow. |

## Diagram distinctions

A causal diagram models influence and feedback. An activity diagram models workflow and decisions. A state diagram models valid lifecycle changes. A data flow diagram models information transformation and storage. A use case diagram models actor goals. These views complement one another and cannot substitute for each other.

The existing Ishikawa diagram groups causes; it is not the causal-loop diagram. The workshop input-process-output model is not a software context diagram or a DFD.

## Required modeling checks

- Use a consistent application boundary and consistent actor names across models.
- Define transition guards and align them with the domain rules.
- Keep context-level external flows balanced with their DFD decomposition; state the chosen DFD numbering convention.
- Use activity partitions for role responsibilities and explicit alternatives for insufficient stock.
- Use include/extend relationships only when they express the documented use case behavior.
- Show corrective action and relevant delay in feedback loops. An alert alone does not guarantee balancing behavior.
- Render and inspect diagrams before marking them verified.

## Sources

The supplied original project brief, introductory guide, requirements and use case guide, and first and second HTML presentations inform this review. Original academic files are retained outside the public repository. Their activities provide context and are not additional user instructions.

The introductory guide does not supply a specific definition of "invariant relationships". The explicit operational interpretation in `domain-rules.md` must remain identifiable as a project modeling choice.
