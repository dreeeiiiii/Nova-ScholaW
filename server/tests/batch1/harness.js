import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { migrate } from '../../src/shared/db/migrate.js';

export async function isolatedDatabase(label) {
  const url = new URL(process.env.BATCH1_DATABASE_URL ?? 'invalid:');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.includes('test')) {
    throw new Error('BATCH1_DATABASE_URL must be an isolated localhost test database.');
  }
  const name = `batch1_${label}_test_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  url.pathname = '/' + name;
  const db = new pg.Client({ connectionString: url.toString() }); await db.connect();
  return { db, url: url.toString(), cleanup: async () => { await db.end(); await admin.query(`DROP DATABASE "${name}"`); await admin.end(); } };
}
export async function application(label) {
  const isolated = await isolatedDatabase(label);
  await migrate(isolated.db);
  Object.assign(process.env, {
    NODE_ENV: 'test', DATABASE_URL_TEST: isolated.url, DATABASE_URL: 'postgresql://unused@127.0.0.1/unused',
    EMAIL_MODE: 'mock', ANNOUNCEMENT_SCHEDULER_ENABLED: 'false',
    JWT_SECRET: 'batch1-only-fake-secret-never-production', B2_BUCKET_NAME: 'local-test', B2_BUCKET_ID: 'local-test',
    B2_ENDPOINT: 'http://127.0.0.1:1', B2_REGION: 'us-west-004', B2_KEY_ID: 'fake', B2_APPLICATION_KEY: 'fake',
  });
  const { default: createApp } = await import('../../src/app.js');
  const { closePool } = await import('../../src/shared/config/db.js');
  const { hashPassword } = await import('../../src/shared/utils/password.js');
  const server = await new Promise(resolve => { const s = createApp().listen(0, '127.0.0.1', () => resolve(s)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { token, method = 'GET', body } = {}) => {
    const response = await fetch(origin + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  const seed = async (email, role, department = null, section = null, active = true) => (await isolated.db.query(
    'INSERT INTO users(email,password_hash,full_name,role,department_id,section_id,is_active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [email, await hashPassword('Initial-test-password'), email.split('@')[0], role, department, section, active]
  )).rows[0];
  const login = async email => {
    const response = await request('/auth/login', { method: 'POST', body: { email, password: 'Initial-test-password' } });
    if (response.status !== 200) throw new Error('Test login failed: ' + JSON.stringify(response));
    return response.data.token;
  };
  return { ...isolated, origin, request, seed, login, cleanup: async () => { await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await closePool(); await isolated.cleanup(); } };
}
