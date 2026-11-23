import { readFile, readdir } from 'node:fs/promises';
import { migrationChecksums } from './migration-checksum';
import { pool } from '../src/adapters/outbound/persistence/postgres/pool';
const client = await pool().connect();
try {
  await client.query('SELECT pg_advisory_lock(713209126)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir('db/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(`db/migrations/${name}`, 'utf8'); const checksums = migrationChecksums(sql); const checksum = checksums.canonical;
    const applied = (await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name])).rows[0];
    if (applied) { if (!checksums.accepted.has(applied.checksum)) throw new Error(`Applied migration changed: ${name}`); continue; }
    await client.query('BEGIN');
    try { await client.query(sql); await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]); await client.query('COMMIT'); console.log(`Applied ${name}`); }
    catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally { await client.query('SELECT pg_advisory_unlock(713209126)'); client.release(); await pool().end(); }
