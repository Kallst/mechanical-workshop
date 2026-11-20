import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// MODEL_RENDER_MODULE can point to a preinstalled Viz.js module for offline use.
const modulePath = process.env.MODEL_RENDER_MODULE;
const { instance } = await import(modulePath ? pathToFileURL(modulePath).href : '@viz-js/viz');
const viz = await instance();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = join(root, 'docs/models/diagrams');
let count = 0;
for (const name of (await readdir(directory)).filter(name => name.endsWith('.dot')).sort()) {
  const source = await readFile(join(directory, name), 'utf8');
  const rendered = viz.render(source, { format: 'svg', engine: 'dot' });
  if (rendered.status !== 'success') throw new Error(JSON.stringify(rendered.errors));
  const warnings = rendered.errors?.filter(error => error.level === 'warning') ?? [];
  if (warnings.length) throw new Error(`${name}: ${JSON.stringify(warnings)}`);
  await writeFile(join(directory, name.replace(/\.dot$/, '.svg')), rendered.output);
  count += 1;
}
console.log(JSON.stringify({ diagrams: count, graphviz: viz.graphvizVersion, result: 'passed' }));
