import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';

import config from '../src/config/env.js';
import createApp from '../src/app.js';
import { query, closePool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ACTIVE_EMAIL = `authtest_active@${domain}`;
const INACTIVE_EMAIL = `authtest_inactive@${domain}`;
const GHOST_EMAIL = `authtest_ghost@${domain}`;
const ACTIVE_PASSWORD = 'AuthPass123!';
const INACTIVE_PASSWORD = 'AuthPass456!';

const postJson = async (baseUrl, path, body) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const getMe = async (baseUrl, token) =>
  fetch(`${baseUrl}/api/auth/me`, {
    headers: token === null ? {} : { Authorization: `Bearer ${token}` },
  });

describe('auth endpoints', () => {
  let server;
  let baseUrl;
  let activeUserId;
  let activeToken;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set — cannot run auth tests.');
    }

    const activeHash = await hashPassword(ACTIVE_PASSWORD);
    const activeRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Auth Test Active', 'student', TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             is_active = TRUE
       RETURNING id`,
      [ACTIVE_EMAIL, activeHash]
    );
    activeUserId = activeRes.rows[0].id;

    const inactiveHash = await hashPassword(INACTIVE_PASSWORD);
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Auth Test Inactive', 'student', FALSE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             is_active = FALSE`,
      [INACTIVE_EMAIL, inactiveHash]
    );

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = ANY($1)', [[ACTIVE_EMAIL, INACTIVE_EMAIL, GHOST_EMAIL]]).catch(() => {});
    await closePool().catch(() => {});
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('logs in successfully and returns a token plus the user (password_hash redacted)', async () => {
    const res = await postJson(baseUrl, '/api/auth/login', { email: ACTIVE_EMAIL, password: ACTIVE_PASSWORD });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.token, 'string');
    assert.ok(body.token.length > 0);
    assert.equal(body.user.email, ACTIVE_EMAIL);
    assert.equal(body.user.role, 'student');
    assert.equal(body.user.is_active, true);
    assert.equal(body.user.password_hash, undefined);
    activeToken = body.token;
  });

  it('issued token carries userId and role in its payload', async () => {
    const decoded = jwt.decode(activeToken);
    assert.equal(decoded.userId, activeUserId);
    assert.equal(decoded.role, 'student');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await postJson(baseUrl, '/api/auth/login', { email: ACTIVE_EMAIL, password: 'definitely-wrong' });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.status, 401);
    assert.equal(body.message, 'Invalid email or password.');
  });

  it('rejects a nonexistent email with the same generic message as a wrong password', async () => {
    const res = await postJson(baseUrl, '/api/auth/login', { email: GHOST_EMAIL, password: 'whatever123' });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.message, 'Invalid email or password.');
  });

  it('rejects a deactivated account with 403', async () => {
    const res = await postJson(baseUrl, '/api/auth/login', { email: INACTIVE_EMAIL, password: INACTIVE_PASSWORD });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /deactivat/i);
  });

  it('returns 400 when email or password is missing', async () => {
    const res = await postJson(baseUrl, '/api/auth/login', { email: ACTIVE_EMAIL });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 400);
  });

  it('returns the current user for a valid token', async () => {
    const res = await getMe(baseUrl, activeToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, ACTIVE_EMAIL);
    assert.equal(body.user.role, 'student');
    assert.equal(body.user.id, activeUserId);
  });

  it('rejects /me without a token', async () => {
    const res = await getMe(baseUrl, null);
    assert.equal(res.status, 401);
  });

  it('rejects /me with a malformed token', async () => {
    const res = await getMe(baseUrl, 'not-a-real-token');
    assert.equal(res.status, 401);
  });

  it('rejects /me with a token signed by an unknown secret', async () => {
    const forged = jwt.sign({ userId: activeUserId, role: 'student' }, 'wrong-secret-for-test');
    const res = await getMe(baseUrl, forged);
    assert.equal(res.status, 401);
  });

  it('logout returns a success message', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.message, 'string');
  });
});