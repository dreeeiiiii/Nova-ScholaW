import pg from 'pg';

import config from './env.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();

export const checkConnection = async () => {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
};

export const closePool = () => pool.end();

export default pool;
