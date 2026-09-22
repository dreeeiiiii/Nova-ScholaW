import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../config/env.js';
import { getClient, closePool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../../../../DATABASE_SCHEMA.sql');

const run = async () => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Configure server/.env before migrating.');
  }

  console.log(`[migrate] Reading schema from ${schemaPath}`);
  const sql = await readFile(schemaPath, 'utf8');

  const client = await getClient();
  try {
    // NOTE: parser splits on ';' — does not handle ';' inside
    // strings, dollar-quoted functions, or comments. Acceptable for
    // the current schema. If future migrations need those, switch
    // to a proper SQL splitter (pg-query-parser or similar).
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let applied = 0;
    let skipped = 0;
    await client.query('BEGIN');
    for (const raw of statements) {
      // Skip pure comment blocks or empty
      const trimmed = raw.trim();
      if (!trimmed) continue;
      // If statement is only comments/whitespace, skip
      const withoutComments = trimmed
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (!withoutComments) continue;

      await client.query('SAVEPOINT s');
      try {
        await client.query(raw);
        await client.query('RELEASE SAVEPOINT s');
        applied++;
      } catch (err) {
        const code = err.code;
        if (['42P07', '42710', '42P06', '42P16'].includes(code)) {
          await client.query('ROLLBACK TO SAVEPOINT s');
          const short = trimmed.split('\n')[0].slice(0, 80).trim();
          console.log(`[migrate] Skipped (already exists): ${short}`);
          skipped++;
          continue;
        }
        await client.query('ROLLBACK');
        throw err;
      }
    }
    await client.query('COMMIT');
    console.log(`[migrate] Done. Applied ${applied}, skipped ${skipped} already-exists statements.`);
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[migrate] Failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
