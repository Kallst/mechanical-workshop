"""Generate the reviewed DOT views from a shared, explicit design contract."""
from pathlib import Path
import json
import textwrap

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'docs/models'
DIAGRAMS = DEST / 'diagrams'
DIAGRAMS.mkdir(parents=True, exist_ok=True)

ACTORS = {
    'staff': 'Staff member\n(all four operational roles)',
    'manager': 'Workshop manager',
    'technician': 'Technician',
    'clerk': 'Warehouse clerk',
    'admin': 'Administrator',
    'telemetry': 'Simulated telemetry source',
    'recipient': 'Invoice recipient\n(no customer portal)',
    'operator': 'Demonstration operator\n(own scenario only)',
}
PROCESSES = {
    'p1': '1.0\nManage identity and access',
    'p2': '2.0\nManage workshop operations',
    'p3': '3.0\nManage stock and purchasing',
    'p4': '4.0\nMonitor equipment',
    'p5': '5.0\nCalculate costs and invoice',
    'p6': '6.0\nReport and run scenarios',
}
# A flow retains exactly the same ID, name, direction, and external entity at
# the context boundary and the first decomposition. Authentication is modeled
# once through the staff role grouping, not repeated as a different person.
BOUNDARY = [
    ('F01', 'staff', 'p1', 'Sign-in credentials'),
    ('F02', 'p1', 'staff', 'Session or access error'),
    ('F03', 'manager', 'p2', 'Orders and assignment commands'),
    ('F04', 'p2', 'manager', 'Order and workload status'),
    ('F05', 'technician', 'p2', 'Intervention commands'),
    ('F06', 'p2', 'technician', 'Assigned work and intervention status'),
    ('F07', 'technician', 'p3', 'Material requests and return declarations'),
    ('F08', 'p3', 'technician', 'Request and return status'),
    ('F09', 'clerk', 'p3', 'Issues receipts returns and adjustments'),
    ('F10', 'p3', 'clerk', 'Stock and fulfillment results'),
    ('F11', 'admin', 'p3', 'Purchase decisions and reorder settings'),
    ('F12', 'p3', 'admin', 'Purchase suggestions and order status'),
    ('F13', 'telemetry', 'p4', 'Power activity and heartbeat events'),
    ('F14', 'p4', 'telemetry', 'Event acceptance or rejection'),
    ('F15', 'manager', 'p4', 'Equipment actions and alert acknowledgement'),
    ('F16', 'p4', 'manager', 'Utilization alerts and action results'),
    ('F17', 'admin', 'p5', 'Cost review and invoice command'),
    ('F18', 'p5', 'admin', 'Cost breakdown and invoice result'),
    ('F19', 'p5', 'recipient', 'Educational invoice document'),
    ('F20', 'admin', 'p6', 'Report and history query'),
    ('F21', 'p6', 'admin', 'Indicators and period reports'),
    ('F22', 'operator', 'p6', 'Scenario create pause advance and reset commands'),
    ('F23', 'p6', 'operator', 'Scenario status and comparison results'),
]
STORES = {
    'd1': 'D1 | Identity and permissions',
    'd2': 'D2 | Customers vehicles orders and interventions',
    'd3': 'D3 | Items requests movements and purchases',
    'd4': 'D4 | Equipment events sessions and alerts',
    'd5': 'D5 | Cost snapshots and invoices',
    'd6': 'D6 | Scenario clock and ownership',
    'd7': 'D7 | Audit trail',
}
INTERNAL = [
    ('p1', 'd1', 'Session and login attempt record'),
    ('d1', 'p1', 'Account role and credential verifier'),
    ('p1', 'p2', 'Authorized identity and scenario context'),
    ('p1', 'p3', 'Authorized identity and scenario context'),
    ('p1', 'p4', 'Authorized identity or telemetry principal'),
    ('p1', 'p5', 'Authorized identity and scenario context'),
    ('p1', 'p6', 'Authorized identity and scenario context'),
    ('p2', 'd2', 'Order assignment and intervention changes'),
    ('d2', 'p2', 'Customer vehicle and work records'),
    ('d2', 'p3', 'Order state and assigned technician'),
    ('p3', 'd3', 'Requests movements and purchase changes'),
    ('d3', 'p3', 'Stock costs demand and outstanding purchases'),
    ('d2', 'p4', 'Order links and assignment data'),
    ('p4', 'd4', 'Events sessions alerts and acknowledgements'),
    ('d4', 'p4', 'Equipment profile and session history'),
    ('d2', 'p5', 'Intervention durations and rates'),
    ('d3', 'p5', 'Net issue cost snapshots'),
    ('d4', 'p5', 'Estimated energy and allocation records'),
    ('p5', 'd5', 'Cost and invoice snapshots'),
    ('d5', 'p5', 'Existing invoice and snapshot data'),
    ('d2', 'p6', 'Order and labor records'),
    ('d3', 'p6', 'Inventory and purchasing records'),
    ('d4', 'p6', 'Equipment and alert records'),
    ('d5', 'p6', 'Cost and invoice records'),
    ('d7', 'p6', 'Attributed operation history'),
    ('p6', 'd6', 'Owned scenario and clock state'),
    ('d6', 'p6', 'Scenario seed clock and ownership'),
    ('p6', 'p2', 'Scenario workshop commands'),
    ('p6', 'p3', 'Scenario material and purchase commands'),
    ('p6', 'p4', 'Scenario equipment events'),
    ('p6', 'p5', 'Scenario cost and invoice commands'),
] + [(p, 'd7', 'Attributed operation record') for p in PROCESSES]

ORDER = {
    'initial': 'Draft',
    'states': ['Draft', 'Open', 'In progress', 'On hold', 'Ready for review', 'Closed', 'Cancelled'],
    'terminal': ['Closed', 'Cancelled'],
    'transitions': [
        ['Draft', 'Open', 'submit', 'customer and vehicle valid'],
        ['Draft', 'Cancelled', 'cancel', 'no fulfilled work'],
        ['Open', 'Cancelled', 'cancel', 'no net issues or started work'],
        ['Open', 'In progress', 'start intervention', 'technician assigned and no overlapping running work'],
        ['In progress', 'On hold', 'hold', 'no running intervention or active exclusive equipment session'],
        ['On hold', 'In progress', 'resume', 'assigned technician available'],
        ['In progress', 'Ready for review', 'request review', 'all interventions completed and requests settled and no active exclusive session'],
        ['Ready for review', 'In progress', 'return for work', 'reason recorded'],
        ['Ready for review', 'Closed', 'close', 'costs reconciled and manager authorized'],
    ],
    'material_issue_states': ['Open', 'In progress'],
}
INTERVENTION = {
    'initial': 'Planned',
    'states': ['Planned', 'Running', 'Paused', 'Completed'],
    'terminal': ['Completed'],
    'transitions': [
        ['Planned', 'Running', 'start', 'order permits work and technician assigned and free'],
        ['Running', 'Paused', 'pause', 'caller owns running intervention'],
        ['Paused', 'Running', 'resume', 'order permits work and technician free'],
        ['Running', 'Completed', 'finish', 'outcome supplied and caller authorized'],
        ['Paused', 'Completed', 'finish', 'outcome supplied and caller authorized'],
    ],
    'effects': {
        'Planned:start': 'open running time segment',
        'Running:pause': 'close running time segment',
        'Paused:resume': 'open new running time segment',
        'Running:finish': 'close segment and record outcome',
        'Paused:finish': 'record outcome; do not add paused time',
    },
}
EQUIPMENT = {
    'initial': 'Unknown power',
    'states': ['Unknown power', 'Off', 'Powered unknown activity', 'Working', 'Idle'],
    'terminal': [],
    'transitions': [
        ['Unknown power', 'Off', 'power sample', 'off observed'],
        ['Unknown power', 'Powered unknown activity', 'power sample', 'on observed and activity unknown'],
        ['Unknown power', 'Working', 'complete sample', 'on and working observed'],
        ['Unknown power', 'Idle', 'complete sample', 'on and idle observed'],
        ['Off', 'Powered unknown activity', 'power on', 'new event accepted'],
        ['Powered unknown activity', 'Working', 'activity sample', 'working observed'],
        ['Powered unknown activity', 'Idle', 'activity sample', 'idle observed'],
        ['Working', 'Idle', 'activity idle', 'timestamp accepted'],
        ['Idle', 'Working', 'activity working', 'timestamp accepted'],
        ['Working', 'Powered unknown activity', 'activity stale', 'power remains known on'],
        ['Idle', 'Powered unknown activity', 'activity stale', 'power remains known on'],
    ] + [[s, 'Off', 'power off', 'timestamp accepted'] for s in ['Powered unknown activity', 'Working', 'Idle']]
      + [[s, 'Unknown power', 'heartbeat timeout', 'freshness limit exceeded'] for s in ['Off', 'Powered unknown activity', 'Working', 'Idle']],
}

def q(text):
    return json.dumps(text, ensure_ascii=False)

def graph(name, title, body, direction='LR'):
    source = ('digraph ' + name.replace('-', '_') + ' {\n'
        + f'graph [rankdir={direction}, bgcolor="#ffffff", pad="0.35", nodesep="0.55", ranksep="0.8", fontname="Arial", fontsize=20, labelloc=t, label={q(title)}, compound=true];\n'
        + 'node [shape=box, style="rounded,filled", fillcolor="#f3f6fa", color="#a8b5c7", fontcolor="#17253b", fontname="Arial", fontsize=13, margin="0.18,0.13"];\n'
        + 'edge [fontname="Arial", fontsize=11, fontcolor="#374862", color="#65758c", arrowsize=0.75];\n'
        + body + '\n}\n')
    # ASCII notation avoids unsupported glyph-width metrics in the offline
    # Graphviz build; personal names remain unchanged in product mockups.
    source = source.replace('·', '-').replace('−', '-').replace('«', '<<').replace('»', '>>')
    (DIAGRAMS / (name + '.dot')).write_text(source, encoding='utf-8')

def edge(a, b, label, attributes=''):
    wrapped = '\n'.join(textwrap.fill(line, width=36, break_long_words=False, break_on_hyphens=False) for line in label.split('\n'))
    return f'{q(a)} -> {q(b)} [label={q(wrapped)}{attributes}];\n'

def context_view(name, ids, title):
    lines = 'app [shape=ellipse, fillcolor="#e5f3f1", color="#227b70", penwidth=1.6, label="0\\nMechanical Workshop\\ninformation system"];\n'
    entities = set()
    for fid, a, b, label in BOUNDARY:
        if fid not in ids:
            continue
        external = a if a in ACTORS else b
        entities.add(external)
        lines += edge(a if a in ACTORS else 'app', b if b in ACTORS else 'app', fid + '\n' + label)
    lines += '\n'.join(f'{k} [shape=box, style="filled", fillcolor="#ffffff", label={q(ACTORS[k])}];' for k in sorted(entities))
    graph(name, title, lines)

context_view('context-operations', {f'F{i:02}' for i in range(1, 13)}, 'Application context · operational view')
context_view('context-control', {f'F{i:02}' for i in range(13, 24)}, 'Application context · monitoring and delivery view')

lines = '\n'.join(f'{k} [shape=box, style=filled, fillcolor="#ffffff", label={q(v)}];' for k, v in ACTORS.items()) + '\n'
lines += 'subgraph cluster_app { label="Mechanical Workshop · first decomposition"; color="#bdc9d8";\n'
lines += '\n'.join(f'{k} [shape=ellipse, fillcolor="#e5f3f1", label={q(v)}];' for k, v in PROCESSES.items()) + '\n'
lines += '\n'.join(f'{k} [shape=record, style=filled, fillcolor="#fff8eb", label={q(v)}];' for k, v in STORES.items()) + '\n}\n'
lines += ''.join(edge(a, b, fid + '\n' + label) for fid, a, b, label in BOUNDARY)
lines += ''.join(edge(a, b, label, ', color="#94a0b1", fontcolor="#5f6c7f"') for a, b, label in INTERNAL)
graph('dfd-level-1', 'DFD Level 1 · logical processes and data stores', lines, 'TB')

# Process projections keep the same logical DFD readable at normal zoom.
# They do not introduce another decomposition level or change flow semantics.
for process, title in PROCESSES.items():
    boundary = [(fid,a,b,label) for fid,a,b,label in BOUNDARY if process in (a,b)]
    internal = [(a,b,label) for a,b,label in INTERNAL if process in (a,b)]
    nodes = {process} | {n for _,a,b,_ in boundary for n in (a,b)} | {n for a,b,_ in internal for n in (a,b)}
    lines = ''
    for node in sorted(nodes):
        if node in ACTORS:
            lines += f'{node} [shape=box, style=filled, fillcolor="#ffffff", label={q(ACTORS[node])}];\n'
        elif node in STORES:
            lines += f'{node} [shape=record, style=filled, fillcolor="#fff8eb", label={q(STORES[node])}];\n'
        else:
            lines += f'{node} [shape=ellipse, fillcolor="' + ('#c9e8e1' if node == process else '#f3f6fa') + f'", label={q(PROCESSES[node])}];\n'
    lines += ''.join(edge(a,b,fid+'\n'+label) for fid,a,b,label in boundary)
    lines += ''.join(edge(a,b,label) for a,b,label in internal)
    graph('dfd-'+process, 'DFD Level 1 projection · '+title.replace('\n',' '), lines)

for name, title, model in [('order-states', 'Service order lifecycle', ORDER), ('intervention-states', 'Intervention lifecycle', INTERVENTION), ('equipment-states', 'Equipment observation states', EQUIPMENT)]:
    lines = 'start [shape=point, width=0.14, fillcolor="#17253b", color="#17253b"];\n'
    lines += ''.join(f'{q(s)} [label={q(s)}];\n' for s in model['states'])
    lines += edge('start', model['initial'], '')
    for a, b, event, guard in model['transitions']:
        effect = model.get('effects', {}).get(a+':'+event)
        lines += edge(a, b, event + '\n[' + guard + ']' + ('\n/ '+effect if effect else ''))
    if name == 'equipment-states':
        lines += 'note [shape=note, fillcolor="#fff8eb", label="Idle alert after 15 simulated minutes.\\nAcknowledgement does not change activity.\\nUnknown intervals are never counted as measured idle."];\n'
        lines += edge('Idle', 'Idle', 'after 15 min [continuous observed idle]\n/ open one alert per episode', ', color="#b46a19"')
    for i, state in enumerate(model['terminal']):
        lines += f'end{i} [shape=doublecircle, label="", width=0.18, height=0.18, fixedsize=true, fillcolor="#17253b", color="#17253b"];\n'
        lines += edge(state, f'end{i}', '')
    graph(name, title, lines, 'TB' if name == 'equipment-states' else 'LR')

# Compact the equipment view using a composite state. Shared transitions at its
# boundary apply to each known-powered activity substate; the JSON contract
# retains their full leaf-state expansion for unambiguous implementation.
equipment_view = '''
newrank=true;
start [shape=point, width=0.14, fillcolor="#17253b", color="#17253b"];
"Unknown power" [label="Unknown power"];
Off [label="Off"];
subgraph cluster_powered {
  label="Powered - power known on"; color="#9cb5bf"; style=rounded;
  "Powered unknown activity" [label="Unknown activity"];
  Working [label="Working"];
  Idle [shape=record, label="{Idle|after 15 min [no alert for episode]\\n/ open alert (internal action)}"];
}
note [shape=note, fillcolor="#fff8eb", label="Shared power-off and heartbeat transitions\\napply to every Powered substate.\\nOpening or acknowledging an alert\\ndoes not leave or reset Idle.\\nUnknown intervals remain explicit."];
'''
equipment_view += edge('start','Unknown power','')
for a,b,event,guard in EQUIPMENT['transitions']:
    if event=='power off' or (event=='heartbeat timeout' and a!='Off'):
        continue
    equipment_view += edge(a,b,event+'\n['+guard+']')
equipment_view += edge('Working','Off','power off\n[timestamp accepted]',', ltail=cluster_powered')
equipment_view += edge('Idle','Unknown power','heartbeat timeout\n[freshness limit exceeded]',', ltail=cluster_powered')
graph('equipment-states','Equipment observation states - composite view',equipment_view,'LR')

# UML activity actions are partitioned by responsible actor. The empty diamonds
# are merge/decision nodes; labels on outgoing edges specify their guards.
activity = '''
newrank=true;
subgraph cluster_technician { label="Technician"; color="#bdc9d8";
start [shape=point, width=0.14, fillcolor="#17253b"];
tech_end [shape=point, style=invis, width=0.01];
request [label="Select order, item, quantity\\nand submit request"];
correct [label="Correct request or wait\\nfor assignment / order reopening"];
partial [shape=diamond, label="Accept partial\\ndelivery?", style=filled];
wait [label="Keep remaining request pending\\nor cancel unfulfilled remainder"];
}
subgraph cluster_system { label="Application"; color="#bdc9d8";
app_anchor [shape=point, style=invis, width=0.01];
validate [label="Validate session, role, order\\nand assigned technician"];
valid [shape=diamond, label="Valid?", style=filled];
invalid [label="Show rejection reason\\nNo stock change"];
stock [label="Read current availability"];
enough [shape=diamond, label="Enough stock?", style=filled];
transaction [label="Within one transaction:\\nlock and revalidate stock,\\norder and assignment\\nrecord issue + unit cost\\nupdate stock + audit"];
saved [shape=diamond, label="Committed?", style=filled];
failure [label="Roll back all changes\\nReport conflict or technical failure"];
result [label="Update fulfilled quantity,\\norder cost and reorder suggestion"];
end [shape=doublecircle, label="", width=0.18, height=0.18, fixedsize=true, fillcolor="#17253b"];
}
subgraph cluster_clerk { label="Warehouse clerk"; color="#bdc9d8";
clerk_anchor [shape=point, style=invis, width=0.01];
clerk_end [shape=point, style=invis, width=0.01];
review [label="Review request and\\nconfirm quantity to issue"];
retry [label="Refresh availability\\nand retry when appropriate"];
}
{ rank=same; start; app_anchor; clerk_anchor; }
{ rank=same; tech_end; end; clerk_end; }
start -> app_anchor -> clerk_anchor [style=invis];
app_anchor -> validate [style=invis];
clerk_anchor -> review [style=invis];
wait -> tech_end [style=invis];
retry -> clerk_end [style=invis];
'''
for a, b, label in [
    ('start','request',''), ('request','validate',''), ('validate','valid',''),
    ('valid','invalid','[no]'), ('invalid','correct',''), ('correct','request','resubmit'),
    ('valid','stock','[yes]'), ('stock','enough',''), ('enough','review','[yes]'),
    ('enough','partial','[no]'), ('partial','review','[yes and available > 0]'),
    ('partial','wait','[no or available = 0]'), ('wait','end',''), ('review','transaction',''),
    ('transaction','saved',''), ('saved','failure','[no]'),
    ('failure','retry',''), ('retry','stock','retry after refresh'), ('saved','result','[yes]'),
    ('result','end','')]:
    activity += edge(a,b,label, ', constraint=false' if (a,b) in [('correct','request'),('retry','stock')] else '')
graph('material-delivery-activity', 'Material request and delivery · responsibility partitions', activity, 'TB')

inventory = '''
stock [label="Available inventory"];
shortage [label="Inventory shortfall\\nagainst replenishment target"];
suggestions [label="Suggested replenishment\\nquantity"];
authorization [label="Authorized purchase\\nquantity"];
receipts [label="Received material\\nquantity"];
control [shape=note, fillcolor="#fff8eb", label="B1 · balancing loop\\nOne negative influence.\\nReorder suggestion alone does not restore stock.\\nPurchasing and supplier lead time create delays."];
'''
for a,b,label in [('stock','shortage','−'),('shortage','suggestions','+'),('suggestions','authorization','+\n[administrator approval required]'),('authorization','receipts','+\n[ordering and delivery delay]'),('receipts','stock','+')]:
    inventory += edge(a,b,label)
graph('causal-inventory', 'B1 · inventory replenishment feedback', inventory)
energy = '''
idle [label="Powered idle time\\nper operating window"];
alerts [label="Open idle alerts"];
response [label="Acknowledged alerts\\nwith corrective action"];
cost [label="Estimated idle energy cost\\nper operating window"];
control [shape=note, fillcolor="#fff8eb", label="B2 · balancing loop\\nAction reduces future powered idle duration.\\nDetection threshold and human response add delay.\\nAcknowledgement without action has no guaranteed effect."];
'''
for a,b,label in [('idle','alerts','+\n[15-minute detection delay]'),('alerts','response','+\n[human response delay]'),('response','idle','−\n[power off or resume useful work]'),('idle','cost','+\n[fixed power profile and tariff]')]:
    energy += edge(a,b,label)
graph('causal-energy', 'B2 · idle equipment control feedback', energy)

UC = [
    ('UC-01','Maintain customers and vehicles',['manager'],'FR-01'),
    ('UC-02','Manage service orders',['manager'],'FR-01'),
    ('UC-03','Assign technicians',['manager'],'FR-02'),
    ('UC-04','Record interventions',['technician'],'FR-03'),
    ('UC-05','Request materials',['technician'],'FR-16'),
    ('UC-06','Issue materials',['clerk'],'FR-04 FR-05 FR-07'),
    ('UC-07','Accept material returns',['clerk'],'FR-16'),
    ('UC-08','Receive or adjust stock',['clerk'],'FR-06'),
    ('UC-09','Manage replenishment',['admin','clerk'],'FR-08 FR-17'),
    ('UC-10','Monitor equipment',['manager','telemetry'],'FR-09 FR-10'),
    ('UC-11','Resolve idle alerts',['manager'],'FR-10'),
    ('UC-12','Review order costs',['admin','manager'],'FR-11'),
    ('UC-13','Issue educational invoice',['admin','recipient'],'FR-12'),
    ('UC-14','View indicators and reports',['admin','manager','clerk'],'FR-13 FR-14'),
    ('UC-15','Sign in',['staff'],'FR-15'),
    ('UC-16','Run owned demonstration',['operator'],'FR-18 FR-19'),
    ('UC-17','Inspect operation history',['admin'],'FR-20'),
]
SUPPORT = {
    'S1':'Validate order and assignment',
    'S2':'Commit stock movement',
    'S3':'Suggest replenishment',
    'S4':'Create idle alert',
    'S5':'Calculate cost breakdown',
}
REL = [
    ('UC-06','S1','include',''),
    ('UC-06','S2','include',''),
    ('UC-07','S2','include',''),
    ('UC-08','S2','include',''),
    ('S3','UC-06','extend','after stock commit [inventory position below reorder point]'),
    ('S4','UC-10','extend','after duration update [observed idle >= threshold]'),
    ('UC-12','S5','include',''),
    ('UC-13','S5','include',''),
]
for name,title,subset in [
    ('use-cases-operations','Use cases · workshop and warehouse',{f'UC-{i:02}' for i in range(1,10)}),
    ('use-cases-control','Use cases · monitoring, finance, and demonstration',{f'UC-{i:02}' for i in range(10,18)}),
]:
    supports={b if b.startswith('S') else a for a,b,kind,condition in REL if a in subset or b in subset}
    actors={actor for uid,label,roles,fr in UC if uid in subset for actor in roles}
    lines=''.join(f'{actor} [shape=box, style=filled, fillcolor="#ffffff", label={q("«actor»"+chr(10)+ACTORS[actor])}];\n' for actor in sorted(actors))
    lines+='subgraph cluster_subject { label="Mechanical Workshop"; labeljust=l; color="#bdc9d8";\n'
    lines+=''.join(f'{q(uid)} [shape=ellipse, label={q(uid+chr(10)+label)}];\n' for uid,label,roles,fr in UC if uid in subset)
    lines+=''.join(f'{support} [shape=ellipse, fillcolor="#fff8eb", label={q(SUPPORT[support])}];\n' for support in sorted(supports))+'}\n'
    for uid,label,roles,fr in UC:
        if uid in subset:
            lines+=''.join(edge(actor,uid,'',', dir=none') for actor in roles)
    for a,b,kind,condition in REL:
        if a in subset or b in subset:
            lines+=edge(a,b,'«'+kind+'»'+ ('\n'+condition if condition else ''),', style=dashed, arrowhead=vee, color="#a66a21"')
    graph(name,title,lines)

contract={
    'status':'Design contract, not application implementation',
    'actors':ACTORS,
    'processes':PROCESSES,
    'stores':STORES,
    'boundary_flows':[dict(id=fid,source=a,target=b,name=name) for fid,a,b,name in BOUNDARY],
    'context_views':{'context-operations':[f'F{i:02}' for i in range(1,13)],'context-control':[f'F{i:02}' for i in range(13,24)]},
    'internal_flows':[dict(source=a,target=b,name=name) for a,b,name in INTERNAL],
    'lifecycles':{'service_order':ORDER,'intervention':INTERVENTION,'equipment':EQUIPMENT},
    'use_cases':[dict(id=uid,name=label,actors=roles,requirements=fr.split()) for uid,label,roles,fr in UC],
    'use_case_relationships':[dict(source=a,target=b,kind=kind,condition=condition) for a,b,kind,condition in REL],
}
(DEST/'model-contract.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'diagrams':len(list(DIAGRAMS.glob('*.dot'))),'boundary_flows':len(BOUNDARY),'use_cases':len(UC)}))
