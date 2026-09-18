import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { signToken } from '../src/shared/utils/jwt.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';

const ADMIN_EMAIL = `stub_search_admin@${domain}`;
const TEACHER_EMAIL = `stub_search_teacher@${domain}`;
const STUDENT_A_EMAIL = `stub_search_alice@${domain}`;
const STUDENT_B_EMAIL = `stub_search_bob@${domain}`;
const STUDENT_INACTIVE_EMAIL = `stub_search_inactive@${domain}`;

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

describe('GET /api/users/students/search (B1.1)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let teacherToken;
  let studentToken;

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');

    const adminHash = await hashPassword('SearchAdmin!1');
    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1,$2,'Search Admin','admin',TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name, role=EXCLUDED.role, is_active=TRUE
       RETURNING id`,
      [ADMIN_EMAIL, adminHash]
    );
    adminToken = signToken({ userId: adminRes.rows[0].id, role: 'admin' });

    const teacherHash = await hashPassword('SearchTeacher!1');
    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1,$2,'Search Teacher','teacher',TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name, role=EXCLUDED.role, is_active=TRUE
       RETURNING id`,
      [TEACHER_EMAIL, teacherHash]
    );
    teacherToken = signToken({ userId: teacherRes.rows[0].id, role: 'teacher' });

    const stuAHash = await hashPassword('SearchAlice!1');
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1,$2,'Alice Searchable','student',TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name, role=EXCLUDED.role, is_active=TRUE`,
      [STUDENT_A_EMAIL, stuAHash]
    );

    const stuBHash = await hashPassword('SearchBob!1');
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1,$2,'Bob Searchable','student',TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name, role=EXCLUDED.role, is_active=TRUE`,
      [STUDENT_B_EMAIL, stuBHash]
    );

    const stuInactiveHash = await hashPassword('SearchInactive!1');
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1,$2,'Inactive Student','student',FALSE)
       ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name, role=EXCLUDED.role, is_active=FALSE`,
      [STUDENT_INACTIVE_EMAIL, stuInactiveHash]
    );

    // Seed extra students to test limit
    for (let i = 0; i < 5; i++) {
      const h = await hashPassword(`SearchExtra${i}!1`);
      const email = `stub_search_extra_${i}@${domain}`;
      await query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1,$2,$3,'student',TRUE)
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name`,
        [email, h, `Extra Student ${i}`]
      );
    }

    const anyStudentRes = await query(`SELECT id FROM users WHERE email=$1`, [STUDENT_A_EMAIL]);
    studentToken = signToken({ userId: anyStudentRes.rows[0].id, role: 'student' });

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await query('DELETE FROM users WHERE email LIKE $1', ['stub_search_%@%']).catch(() => {});
    // close pool handled by other suites; don't close here to avoid race
    if (server) await new Promise((r) => server.close(r));
  });

  it('teacher can search students by name (ILIKE)', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('Alice')}`, { token: teacherToken });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.students));
    assert.ok(body.students.length >= 1);
    assert.ok(body.students.some((s) => s.email === STUDENT_A_EMAIL));
    // shape minimal (pg returns BIGINT as string)
    const sample = body.students.find((s) => s.email === STUDENT_A_EMAIL);
    assert.ok(typeof sample.id === 'number' || typeof sample.id === 'string');
    assert.equal(typeof sample.full_name, 'string');
    assert.equal(typeof sample.email, 'string');
    assert.ok('section_id' in sample);
    assert.ok('course_id' in sample);
    assert.equal(sample.password_hash, undefined);
  });

  it('teacher search by email substring is case-insensitive', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('ALICE@')}`, { token: teacherToken });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.students.some((s) => s.email === STUDENT_A_EMAIL));
  });

  it('admin can search students', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('Bob')}`, { token: adminToken });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.students.some((s) => s.email === STUDENT_B_EMAIL));
  });

  it('inactive students are excluded', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('Inactive')}`, { token: teacherToken });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.students.length, 0);
  });

  it('student role cannot search (403)', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=Alice`, { token: studentToken });
    assert.equal(res.status, 403);
  });

  it('unauthenticated returns 401', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=Alice`);
    assert.equal(res.status, 401);
  });

  it('empty q returns 400', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=`, { token: teacherToken });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /q query parameter is required/i);
  });

  it('missing q returns 400', async () => {
    const res = await request(baseUrl, `/api/users/students/search`, { token: teacherToken });
    assert.equal(res.status, 400);
  });

  it('whitespace-only q returns 400', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('   ')}`, { token: teacherToken });
    assert.equal(res.status, 400);
  });

  it('limit defaults to 20 and caps at 50', async () => {
    const resDefault = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('stub_search')}`, { token: teacherToken });
    assert.equal(resDefault.status, 200);
    const bodyDefault = await resDefault.json();
    // we have at least ~7 matching stub_search_* students, so with default limit we get all but not over 20
    assert.ok(bodyDefault.students.length <= 20);

    const resCapped = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('stub_search')}&limit=99`, { token: teacherToken });
    assert.equal(resCapped.status, 200);
    const bodyCapped = await resCapped.json();
    assert.ok(bodyCapped.students.length <= 50);

    const resOne = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('stub_search')}&limit=1`, { token: teacherToken });
    assert.equal(resOne.status, 200);
    const bodyOne = await resOne.json();
    assert.equal(bodyOne.students.length, 1);
  });

  it('does not return non-student roles', async () => {
    const res = await request(baseUrl, `/api/users/students/search?q=${encodeURIComponent('Search Teacher')}`, { token: adminToken });
    assert.equal(res.status, 200);
    const body = await res.json();
    // Teacher should not be in results even though name matches
    assert.equal(body.students.length, 0);
  });

  it('GET /api/users remains admin-only (teacher 403)', async () => {
    const res = await request(baseUrl, `/api/users?role=student&search=Alice`, { token: teacherToken });
    assert.equal(res.status, 403);
  });
});
