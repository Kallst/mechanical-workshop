import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
export const runtime = 'nodejs';
const contentTypes: Record<string, string> = { '.html': 'text/html', '.svg': 'image/svg+xml', '.dot': 'text/plain', '.json': 'application/json', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/plain', '.csv': 'text/csv' };
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!['models', 'mockups'].includes(path[0]) || path.some(part => !/^[a-zA-Z0-9._-]+$/.test(part) || ['.', '..'].includes(part))) return new Response('Not found', { status: 404 });
  const root = resolve(process.cwd(), 'docs'); const target = resolve(root, ...path); const type = contentTypes[extname(target)];
  if (!type || !target.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  try { return new Response(await readFile(target), { headers: { 'Content-Type': `${type};charset=utf-8`, 'Cache-Control': 'public,max-age=60', 'Content-Security-Policy': "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'" } }); }
  catch { return new Response('Not found', { status: 404 }); }
}
