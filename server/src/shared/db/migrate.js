import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../config/env.js';
import { getClient, closePool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../../DATABASE_SCHEMA.sql');

const run = async () => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Configure server/.env before migrating.');
  }

  console.log(`[migrate] Reading schema from ${schemaPath}`);
  const sql = await readFile(schemaPath, 'utf8');

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[migrate] Schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
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
