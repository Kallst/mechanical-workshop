import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const modulePath = process.env.MODEL_RENDER_MODULE;
const { instance } = await import(modulePath ? pathToFileURL(modulePath).href : '@viz-js/viz');
const viz = await instance();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = join(root, 'docs/models/diagrams');
const translations = JSON.parse(await readFile(join(root,'tools/design/diagram-labels-es.json'),'utf8'));
await mkdir(join(directory,'es'),{recursive:true});
function localize(source) {
  return source.replace(/\blabel=("(?:\\.|[^"\\])*")/g, (_,quoted) => {
    const value=JSON.parse(quoted);
    const spanish=value.split(/(\n|\||[{}])/).map(part=>{const key=part.trim();return translations[key] ? part.replace(key,translations[key]) : part;}).join('');
    return 'label='+JSON.stringify(spanish);
  });
}
// Measure Spanish using equivalent Latin base glyphs, then restore accents in SVG.
// Viz's bundled font metrics do not measure accented UTF-8 bytes correctly.
const fold=value=>value.normalize('NFD').replace(/\p{M}/gu,'').replaceAll('¿','?').replaceAll('¡','!');
const restore=new Map(Object.values(translations).map(value=>[fold(value),value]));
const decode=value=>value.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function restoreAccents(svg){return svg.replace(/(<text\b[^>]*>)([\s\S]*?)(<\/text>)/g,(_,start,text,end)=>start+(restore.has(decode(text))?escape(restore.get(decode(text))):text)+end);}
let count=0;
for(const name of (await readdir(directory)).filter(name=>name.endsWith('.dot')).sort()) {
  const source=await readFile(join(directory,name),'utf8');
  for(const locale of ['en','es']) {
    const rendered=viz.render(locale==='es'?fold(localize(source)):source,{format:'svg',engine:'dot'});
    if(rendered.status!=='success'||rendered.errors?.length)throw Error(name+': '+JSON.stringify(rendered.errors));
    await writeFile(join(directory,locale==='es'?'es':'',name.replace(/\.dot$/,'.svg')),locale==='es'?restoreAccents(rendered.output):rendered.output);
  }
  count++;
}
console.log(JSON.stringify({diagrams:count,locales:2,graphviz:viz.graphvizVersion,result:'passed'}));
