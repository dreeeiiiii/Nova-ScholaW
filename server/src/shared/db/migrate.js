import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.resolve(directory, '../../../../DATABASE_SCHEMA.sql');
const migrationDirectory = path.join(directory, 'migrations');
const expectedTables = ['users', 'sections', 'courses', 'announcements', 'announcement_targets', 'categories', 'gallery_media', 'audit_logs'];

export async function migrate(client) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '60s'");
    await client.query('SELECT pg_advisory_xact_lock(642031)');
    const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const names = new Set(rows.map(row => row.tablename));
    if (names.size === 0) {
      await client.query(await readFile(baselinePath, 'utf8'));
    } else if (!expectedTables.every(name => names.has(name))) {
      throw new Error('Incomplete existing schema; review manually before migrating.');
    }
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const files = (await readdir(migrationDirectory)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
    for (const version of files) {
      const sql = await readFile(path.join(migrationDirectory, version), 'utf8');
      const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE version = $1', [version]);
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Previously applied migration changed: ${version}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [version, checksum]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('Plan only: baseline on empty database, then ' + (await readdir(migrationDirectory)).sort().join(', '));
    console.log('No database connection opened. Use --apply only for an explicitly approved database.');
    return;
  }
  const { getClient, closePool } = await import('../config/db.js');
  try {
    const client = await getClient();
    try { await migrate(client); } finally { client.release(); }
    console.log('Migrations applied. Existing department assignments were not inferred.');
  } finally { await closePool(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('[migrate]', error.message); process.exitCode = 1; });
}
