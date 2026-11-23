import { ensure } from '../../../domain/engine';
export const COOKIE_NAME = 'workshop_session';
export function sessionToken(request: Request) { const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`)); return cookie?.slice(COOKIE_NAME.length + 1); }
export function assertOrigin(request: Request, expected: string | undefined) { ensure(expected, 'APP_ORIGIN must be configured.', 503); ensure(request.headers.get('origin') === expected, 'This request origin is not allowed.', 403); ensure(request.headers.get('sec-fetch-site') !== 'cross-site', 'Cross-site commands are not allowed.', 403); }
