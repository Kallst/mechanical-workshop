import { createHash } from 'node:crypto';
// Git may check out the same SQL migration with LF or CRLF on different systems.
export function migrationChecksums(sql: string) {
  const normalized = sql.replace(/\r\n/g, '\n');
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  return { canonical: digest(normalized), accepted: new Set([digest(normalized), digest(normalized.replace(/\n/g, '\r\n'))]) };
}
