import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const records = JSON.parse(await readFile(new URL('./data/display-announcements.json', import.meta.url), 'utf8'));

export async function seedDisplayAnnouncements(client, { authorId } = {}) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query('SELECT pg_advisory_xact_lock(642032)');
    const authors = await client.query(
      "SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE AND ($1::bigint IS NULL OR id = $1) ORDER BY id LIMIT 1 FOR SHARE", [authorId ?? null]);
    if (!authors.rows.length) throw new Error('An existing active Admin is required; no users will be created.');
    const inserted = [];
    for (const record of records) {
      const result = await client.query(
        "INSERT INTO announcements (display_import_key, author_id, type, department_id, title, content, image_url, b2_key, show_on_tv, status, created_at, publish_at, email_eligible) VALUES ($1, $2, 'general', NULL, $3, $4, $5, NULL, TRUE, $6, COALESCE($7::timestamptz, NOW()), $7::timestamptz, FALSE) ON CONFLICT (display_import_key) DO NOTHING RETURNING id",
        [record.key, authors.rows[0].id, record.title, record.content, record.image_url, record.status,
          record.source_date ? record.source_date + 'T00:00:00Z' : null]);
      if (result.rows.length) inserted.push(result.rows[0].id);
    }
    const imported = await client.query('SELECT id, email_eligible, type, department_id FROM announcements WHERE display_import_key = ANY($1::text[])', [records.map(r => r.key)]);
    if (imported.rows.length !== records.length || imported.rows.some(r => r.email_eligible !== false || r.type !== 'general' || r.department_id !== null)) throw new Error('Display import safety validation failed.');
    const ids = imported.rows.map(r => r.id);
    const deliveries = await client.query('SELECT COUNT(*)::int AS total FROM announcement_email_deliveries WHERE announcement_id = ANY($1::bigint[])', [ids]);
    if (deliveries.rows[0].total !== 0) throw new Error('Unexpected delivery rows for display records; transaction rolled back.');
    await client.query('COMMIT');
    return { prepared: records.length, inserted: inserted.length, existing: records.length - inserted.length, ids, deliveryRows: 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--dry-run', '--apply'].includes(a)) || (args.includes('--apply') && args.includes('--dry-run'))) throw new Error('Use either --dry-run or --apply.');
  console.table(records.map(r => ({ key: r.key, title: r.title, status: r.status, email_eligible: false })));
  if (!args.includes('--apply')) {
    console.log('Dry run: 13 General display records; 10 published, 2 draft, 1 archived. No database connection or email service loaded.');
    return;
  }
  // Direct database import only. No app, controller, scheduler, or email service imports.
  const { getClient, closePool } = await import('../src/shared/config/db.js');
  try {
    const client = await getClient();
    try { console.log(await seedDisplayAnnouncements(client)); }
    finally { client.release(); }
  } finally { await closePool(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('[display-import]', error.message); process.exitCode = 1; });
}
