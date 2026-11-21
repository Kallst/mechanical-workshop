import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const env = { ...process.env };
if (process.platform === 'win32') {
  const preload = pathToFileURL(resolve('scripts/windows-build-preload.mjs')).href;
  env.NODE_OPTIONS = [env.NODE_OPTIONS, `--import=${preload}`].filter(Boolean).join(' ');
}
const build = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], { env, stdio: 'inherit', windowsHide: true });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => build.kill());
build.on('error', error => { console.error(error.message); process.exitCode = 1; });
const [code] = await once(build, 'exit');
process.exitCode = code ?? 1;
