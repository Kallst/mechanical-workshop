"""Check cross-view consistency, lifecycle reachability, and local references."""
from pathlib import Path
import csv
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT/'docs/models'
contract = json.loads((MODELS/'model-contract.json').read_text(encoding='utf-8'))
checks = []

def require(condition, message):
    if not condition:
        raise SystemExit(message)
    checks.append(message)

def edges(path):
    source = path.read_text(encoding='utf-8')
    pattern = r'"([^"\n]+)" -> "([^"\n]+)" \[label=("(?:\\.|[^"\\])*")'
    return [(a,b,json.loads(label)) for a,b,label in re.findall(pattern,source)]

boundary = contract['boundary_flows']
actors = set(contract['actors'])
processes = set(contract['processes'])
stores = set(contract['stores'])
require(len(boundary)==23 and len({flow['id'] for flow in boundary})==23, '23 unique context flows')
view_ids = [fid for ids in contract['context_views'].values() for fid in ids]
require(sorted(view_ids)==sorted(flow['id'] for flow in boundary), 'Context projections partition the boundary without duplicate flows')
for flow in boundary:
    require((flow['source'] in actors and flow['target'] in processes) or (flow['source'] in processes and flow['target'] in actors), f"Valid external endpoints: {flow['id']}")
rendered_context = {}
for name in contract['context_views']:
    for a,b,label in edges(MODELS/'diagrams'/f'{name}.dot'):
        fid,*name_lines=label.split('\n')
        require(fid not in rendered_context, f'No duplicated rendered context flow: {fid}')
        rendered_context[fid]=(a,b,' '.join(' '.join(name_lines).split()))
rendered_dfd = {}
for a,b,label in edges(MODELS/'diagrams/dfd-level-1.dot'):
    fid,*name_lines=label.split('\n')
    if re.fullmatch('F[0-9]{2}',fid):
        rendered_dfd[fid]=(a,b,' '.join(' '.join(name_lines).split()))
require(len(rendered_context)==len(rendered_dfd)==23, 'Rendered context and Level 1 have exactly 23 boundary flows')
for flow in boundary:
    fid=flow['id']
    name=' '.join(flow['name'].split())
    expected_context=(flow['source'] if flow['source'] in actors else 'app',flow['target'] if flow['target'] in actors else 'app',name)
    require(rendered_context[fid]==expected_context, f'Context preserves entity direction and name: {fid}')
    require(rendered_dfd[fid]==(flow['source'],flow['target'],name), f'Level 1 balances boundary flow: {fid}')
for flow in contract['internal_flows']:
    a,b=flow['source'],flow['target']
    require(a in processes|stores and b in processes|stores and not(a in stores and b in stores), f'Valid internal endpoints: {a} to {b}')
for process in processes:
    all_flows=boundary+contract['internal_flows']
    require(any(flow['source']==process for flow in all_flows) and any(flow['target']==process for flow in all_flows), f'Process has input and output: {process}')
for name,lifecycle in contract['lifecycles'].items():
    known=set(lifecycle['states']); reached={lifecycle['initial']}
    for a,b,event,guard in lifecycle['transitions']:
        require(a in known and b in known and bool(event) and bool(guard), f'Valid transition: {name} {a} to {b}')
        require(a not in lifecycle['terminal'], f'Terminal states have no outgoing transitions: {name} {a}')
    while True:
        expanded=reached|{b for a,b,_,_ in lifecycle['transitions'] if a in reached}
        if expanded==reached: break
        reached=expanded
    require(known==reached, f'Every state is reachable: {name}')
cases=json.loads((MODELS/'use-case-specifications.json').read_text(encoding='utf-8'))
require(len(cases)==17 and {c['id'] for c in cases}=={c['id'] for c in contract['use_cases']}, '17 matching graphical and textual use cases')
for case in cases:
    require(all(case.get(field) for field in ['preconditions','normal_flow','alternative_flow','technical_exception','postconditions','requirements']), f"Complete use case specification: {case['id']}")
required={f'FR-{i:02}' for i in range(1,21)}
require(required <= {rid for c in cases for rid in c['requirements']}, 'All 20 functional requirements map to use cases')
rows=list(csv.DictReader((MODELS/'model-traceability.csv').open(encoding='utf-8',newline='')))
original=list(csv.DictReader((ROOT/'docs/traceability.csv').open(encoding='utf-8',newline='')))
require(len(rows)==30 and {r['requirement_id'] for r in rows}=={r['requirement_id'] for r in original}, '30 requirements and constraints retained in model traceability')
for row in rows:
    if row['requirement_id'].startswith('FR-'):
        for name in row['model_ids'].split(';'):
            require((MODELS/'diagrams'/f'{name}.svg').is_file(), f"Traceable rendered model: {row['requirement_id']} {name}")
svgs=sorted((MODELS/'diagrams').glob('*.svg'))
require(len(svgs)==17, '17 rendered SVG diagrams')
for path in svgs:
    document=ET.fromstring(path.read_text(encoding='utf-8'))
    require(document.tag.endswith('svg') and 'viewBox' in document.attrib, f'Valid vector output: {path.stem}')
for path in [ROOT/'README.md', ROOT/'CONTRIBUTING.md', ROOT/'AGENTS.md', *sorted((ROOT/'docs').rglob('*'))]:
    if not path.is_file() or path.suffix not in {'.md','.html'} or path.name=='atlas-template.html': continue
    source=path.read_text(encoding='utf-8')
    links=re.findall(r'\]\(([^)]+)\)',source) if path.suffix=='.md' else re.findall(r'(?:href|src)="([^"]+)"',source)
    for link in links:
        if link.startswith(('#','data:','mailto:')) or '://' in link or '${' in link: continue
        target=link.split('#',1)[0].split('?',1)[0]
        require((path.parent/target).exists(), f'Local reference resolves: {path.relative_to(ROOT)} {target}')
seed=(ROOT/'src/domain/seed.ts').read_text(encoding='utf-8')
for name in ['Brian','Nicolás','Álan','Tamara','Juan Jacobo','Anderson','Juanita']:
    require(name in seed, f'Employee name preserved: {name}')
require(not (ROOT/'docs/mockups/index.html').exists(), 'Legacy prototype page is retired')
spanish=sorted((MODELS/'diagrams/es').glob('*.svg'))
require(len(spanish)==17, '17 Spanish vector diagrams')
for translated in spanish:
    english=ET.fromstring((MODELS/'diagrams'/translated.name).read_text(encoding='utf-8'))
    localized=ET.fromstring(translated.read_text(encoding='utf-8'))
    topology=lambda doc:[(e.attrib.get('class'),e.attrib.get('id')) for e in doc.iter() if e.attrib.get('class') in ['node','edge']]
    require(topology(english)==topology(localized), f'Localized diagram retains nodes and edges: {translated.stem}')
print(json.dumps({'result':'passed','structural_checks':len(checks),'boundary_flows':23,'diagrams':17,'locales':2,'textual_use_cases':17,'traced_requirements':30}))
