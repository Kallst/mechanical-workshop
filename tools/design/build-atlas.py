"""Build a standalone, offline diagram atlas from the rendered SVGs."""
from pathlib import Path
import csv
import shutil
import json

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT/'docs/models'
catalog = [
    ('Context', 'context-operations', 'Operational boundary', 'Process 0 receives workshop commands and returns operational results. This and the next view are two projections of one system boundary.'),
    ('Context', 'context-control', 'Monitoring and delivery boundary', 'The same process 0 receives telemetry, report queries, and owned-scenario commands. Generated invoice documents are delivered by the administrator; no customer portal or email integration is implied.'),
    ('Data flows', 'dfd-p1', '1.0 Identity and access', 'Shared sign-in establishes a server-derived identity and role context. The staff actor groups the same four operational roles shown individually elsewhere.'),
    ('Data flows', 'dfd-p2', '2.0 Workshop operations', 'Order, assignment, and intervention records establish responsibility and labor intervals. Simulation commands use the same domain behavior.'),
    ('Data flows', 'dfd-p3', '3.0 Stock and purchasing', 'Material requests and stock movements connect an assigned technician to a service order. Purchase commitments and receipts have different effects on inventory.'),
    ('Data flows', 'dfd-p4', '4.0 Equipment monitoring', 'Power, activity, and heartbeat observations produce intervals, coverage, alerts, and auditable action results.'),
    ('Data flows', 'dfd-p5', '5.0 Costs and invoices', 'Separate source records become a cost breakdown and stable educational invoice. Shared equipment cost is allocated without duplication.'),
    ('Data flows', 'dfd-p6', '6.0 Reporting and scenarios', 'Reporting transforms persisted records into authorized information. Owned scenario commands maintain a declared clock and seed, and produce domain commands rather than bypassing rules.'),
    ('Data flows', 'dfd-level-1', 'Complete Level 1 reference', 'This full reference includes every logical process, store, internal flow, and external flow. It is intentionally large; use the six process projections for normal reading, or choose 100% and scroll.'),
    ('States', 'order-states', 'Service order lifecycle', 'Assigning a technician does not start work. Start, hold, review, and closure have explicit guards. Closure and cancellation are terminal for the initial design.'),
    ('States', 'intervention-states', 'Intervention lifecycle', 'Only running segments add labor time. Pauses do not. A technician can have several planned assignments but only one running intervention.'),
    ('States', 'equipment-states', 'Equipment observation lifecycle', 'Power and activity are separate observations. Stale activity is not measured idle. Lost power knowledge creates an unknown interval; new samples do not rewrite the gap.'),
    ('Activities', 'material-delivery-activity', 'Material delivery across roles', 'Responsibility partitions show the technician, application, and warehouse clerk. Insufficient stock is a business alternative; a technical or concurrent-write failure rolls back the entire movement.'),
    ('Feedback', 'causal-inventory', 'B1 Inventory replenishment', 'One negative influence makes this a balancing loop under the stated purchasing policy. Suggestions alone do not restore inventory: approval, ordering, delivery, and receipt complete the response.'),
    ('Feedback', 'causal-energy', 'B2 Idle equipment control', 'An alert is a signal. A confirmed human action changes future idle time. The 15-minute detection threshold and human response time introduce delays.'),
    ('Use cases', 'use-cases-operations', 'Workshop and warehouse goals', 'External actor classifiers are outside the subject boundary. Required include arrows point to supporting behavior. Conditional replenishment extends material issue after commit.'),
    ('Use cases', 'use-cases-control', 'Monitoring and control goals', 'Monitoring, costs, invoicing, reports, access, simulation, and audit are separate goals. An idle alert conditionally extends monitoring; acknowledging it is distinct from corrective action.'),
]
requirements = list(csv.DictReader((DEST/'model-traceability.csv').open(encoding='utf-8',newline='')))
models = []
for group, identifier, title, description in catalog:
    models.append(dict(group=group,id=identifier,title=title,description=description,requirements=[row['requirement_id'] for row in requirements if identifier in row['model_ids'].split(';')]))
localization = json.loads((ROOT/'tools/design/atlas-language.json').read_text(encoding='utf-8'))
template = (ROOT/'tools/design/atlas-template.html').read_text(encoding='utf-8')
payload = json.dumps(models,ensure_ascii=False).replace('</','<\\/')
language = json.dumps(localization,ensure_ascii=False).replace('</','<\\/')
(DEST/'index.html').write_text(template.replace('/* MODEL_DATA */',payload).replace('/* LANGUAGE_DATA */',language),encoding='utf-8')
print(json.dumps({'atlas_views':len(models),'locales':['es','en'],'external_resources':0}))

for asset in ['atlas.css','atlas.js']:
    shutil.copyfile(ROOT/'tools/design'/asset,DEST/asset)
