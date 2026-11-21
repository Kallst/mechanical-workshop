import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { buildMkdir } from './windows-build-mkdir.mjs';
// Loaded only by the Windows production build and inherited by its export workers.
if (process.platform === 'win32') {
  const original = fs.promises.mkdir.bind(fs.promises);
  fs.promises.mkdir = (target, options) => buildMkdir(original, target, options, process.cwd());
  syncBuiltinESMExports();
}
