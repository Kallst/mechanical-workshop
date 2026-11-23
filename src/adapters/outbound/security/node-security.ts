import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { SecurityPort } from '../../../application/ports/security';
const derive = promisify(scrypt);
export async function hashPassword(password: string) {
    const salt = randomBytes(24).toString('hex');
    const key = await derive(password, salt, 64) as Buffer;
    return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
    const [algorithm, salt, expected] = encoded.split(':');
    if (algorithm !== 'scrypt' || !/^[a-f0-9]{48}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? ''))
        return false;
    const actual = await derive(password, salt, 64) as Buffer;
    return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export const nodeSecurity: SecurityPort = { uuid: randomUUID, token: () => randomBytes(32).toString('base64url'), workspaceCode: () => `demo-${randomBytes(5).toString('hex')}`, digest: value => createHash('sha256').update(value).digest('hex'), hashPassword, verifyPassword, now: Date.now };
