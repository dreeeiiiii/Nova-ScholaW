import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/config/env.js';
import createApp from '../src/app.js';
import { query, closePool } from '../src/config/db.js';
import { signToken } from '../src/utils/jwt.js';
import { hashPassword } from '../src/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `usertest_admin@${domain}`;
const STUDENT_EMAIL = `usertest_student@${domain}`;
const TARGET_EMAIL = `usertest_target@${domain}`;
const NON_NST_EMAIL = 'usertest_external@gmail.com';

const request = async (baseUrl, path, { method = 'GET', token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
};

describe('user endpoints (admin CRUD)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let foreignToken;
  let targetId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set — cannot run user tests.');
    }

    const adminHash = await hashPassword('UserTestAdmin!1');
    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'User Test Admin', 'admin', TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             is_active = TRUE
       RETURNING id`,
      [ADMIN_EMAIL, adminHash]
    );
    adminToken = signToken({ userId: adminRes.rows[0].id, role: 'admin' });

    const studentHash = await hashPassword('UserTestStuden1!');
    const studentRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'User Test Student', 'student', TRUE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             is_active = TRUE
       RETURNING id`,
      [STUDENT_EMAIL, studentHash]
    );
    foreignToken = signToken({ userId: studentRes.rows[0].id, role: 'student' });

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = ANY($1)', [
      [ADMIN_EMAIL, STUDENT_EMAIL, TARGET_EMAIL],
    ]).catch(() => {});
    await closePool().catch(() => {});
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects the users list without a token (401)', async () => {
    const res = await request(baseUrl, '/api/users');
    assert.equal(res.status, 401);
  });

  it('rejects the users list for a non-admin role (403)', async () => {
    const res = await request(baseUrl, '/api/users', { token: foreignToken });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.status, 403);
  });

  it('creates a user with an NST email (password_hash never returned)', async () => {
    const res = await request(baseUrl, '/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        email: TARGET_EMAIL,
        password: 'TempPass123!',
        full_name: 'Target Person',
        role: 'student',
      },
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.email, TARGET_EMAIL);
    assert.equal(body.user.full_name, 'Target Person');
    assert.equal(body.user.role, 'student');
    assert.equal(body.user.password_hash, undefined);
    assert.equal(body.user.is_active, true);
    targetId = body.user.id;
  });

  it('rejects creating a user with a non-NST email (400)', async () => {
    const res = await request(baseUrl, '/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        email: NON_NST_EMAIL,
        password: 'TempPass123!',
        full_name: 'External Person',
        role: 'student',
      },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, new RegExp(`@${domain}`));
  });

  it('rejects creating a duplicate email (409)', async () => {
    const res = await request(baseUrl, '/api/users', {
      method: 'POST',
      token: adminToken,
      body: {
        email: TARGET_EMAIL,
        password: 'TempPass123!',
        full_name: 'Duplicate Person',
        role: 'student',
      },
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.message, /already exists/i);
  });

  it('lists users and supports role + search filters', async () => {
    const all = await request(baseUrl, '/api/users?limit=200', { token: adminToken });
    assert.equal(all.status, 200);
    const allBody = await all.json();
    assert.ok(Array.isArray(allBody.users));
    assert.ok(allBody.users.length >= 3);
    assert.equal(allBody.users.some((u) => u.email === TARGET_EMAIL), true);
    assert.equal(allBody.users.some((u) => u.password_hash !== undefined), false);

    const byRole = await request(baseUrl, `/api/users?role=student&limit=200`, {
      token: adminToken,
    });
    const byRoleBody = await byRole.json();
    assert.ok(byRoleBody.users.every((u) => u.role === 'student'));

    const bySearch = await request(baseUrl, `/api/users?search=${encodeURIComponent('Target Person')}`, {
      token: adminToken,
    });
    const bySearchBody = await bySearch.json();
    assert.equal(bySearchBody.users.length, 1);
    assert.equal(bySearchBody.users[0].email, TARGET_EMAIL);
  });

  it('gets a single user by id', async () => {
    const res = await request(baseUrl, `/api/users/${targetId}`, { token: adminToken });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, TARGET_EMAIL);
  });

  it('updates a user full_name', async () => {
    const res = await request(baseUrl, `/api/users/${targetId}`, {
      method: 'PUT',
      token: adminToken,
      body: { full_name: 'Renamed Person' },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.full_name, 'Renamed Person');
    assert.equal(body.user.email, TARGET_EMAIL);
  });

  it('deactivates a user (is_active false)', async () => {
    const res = await request(baseUrl, `/api/users/${targetId}/deactivate`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.is_active, false);
  });

  it('a deactivated user can no longer authenticate', async () => {
    const target = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: TARGET_EMAIL, password: 'TempPass123!' },
    });
    assert.equal(target.status, 403);
    const body = await target.json();
    assert.match(body.message, /deactivat/i);
  });

  it('activates a user (is_active true)', async () => {
    const res = await request(baseUrl, `/api/users/${targetId}/activate`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.is_active, true);
  });

  it('returns 404 for a missing user', async () => {
    const res = await request(baseUrl, '/api/users/999999999', { token: adminToken });
    assert.equal(res.status, 404);
  });
});