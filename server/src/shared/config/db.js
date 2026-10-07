import pg from 'pg';

import config from './env.js';
import { assertTestDatabaseSafety } from './testGuard.js';

const { Pool } = pg;

// In NODE_ENV=test the connection ALWAYS comes from DATABASE_URL_TEST via the
// fail-closed testGuard (never the production DATABASE_URL). Every other
// environment uses the production DATABASE_URL unchanged.
const connectionString =
  config.nodeEnv === 'test' ? assertTestDatabaseSafety(process.env.DATABASE_URL_TEST) : config.databaseUrl;

const pool = new Pool({
  connectionString,
  ssl: config.nodeEnv === 'test' ? false : { rejectUnauthorized: false },
});

pool.on('error', () => {
  console.error('[db] Unexpected error on idle client');
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();

export const checkConnection = async () => {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
};

export const closePool = () => pool.end();

export default pool;
