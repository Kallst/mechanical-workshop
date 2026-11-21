import { setTimeout as delay } from 'node:timers/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function buildMkdir(operation, target, options, root, platform = process.platform, pause = delay) {
  const path = target instanceof URL ? fileURLToPath(target) : String(target);
  const allowed = resolve(root, '.next').toLowerCase() + sep;
  const scoped = resolve(path).toLowerCase().startsWith(allowed);
  for (let attempt = 0; ; attempt++) {
    try { return await operation(target, options); }
    catch (error) {
      if (platform !== 'win32' || !scoped || !options?.recursive || !['EPERM', 'EACCES'].includes(error?.code) || attempt >= 6) throw error;
      await pause(20 * 2 ** attempt);
    }
  }
}
