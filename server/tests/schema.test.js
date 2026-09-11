import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { EXPECTED_TABLES, listMissingTables, fetchExistingTables, closePool } from './helpers/db.js';

describe('database schema', () => {
  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set — cannot run schema test.');
    }
  });

  after(() => closePool());

  it('connects and all 8 expected tables exist', async () => {
    const missing = await listMissingTables();
    assert.deepEqual(missing, [], `missing tables: ${missing.join(', ')}`);
  });

  it('does not include extra unexpected tables', async () => {
    const existing = await fetchExistingTables();
    const extras = existing.filter((t) => !EXPECTED_TABLES.includes(t));
    assert.deepEqual(extras, [], `unexpected tables: ${extras.join(', ')}`);
  });
});