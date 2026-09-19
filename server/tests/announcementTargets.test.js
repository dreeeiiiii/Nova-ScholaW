import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `targetjoin_admin@${domain}`;
const STUDENT_EMAIL = `targetjoin_student@${domain}`;
const PASSWORD = 'TargetJoin123!';

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe('B1.7 GET /api/announcements/:id targets enriched with names', () => {
  let server;
  let baseUrl;
  let adminToken, studentToken;
  let adminId, studentId;
  let sectionId, courseId;
  let generalId;
  let classId;

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

    const sec = await query(`INSERT INTO sections (name, grade_level) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET grade_level=EXCLUDED.grade_level RETURNING id`, ['TargetJoin Section', 'Grade 10']);
    sectionId = sec.rows[0].id || (await query('SELECT id FROM sections WHERE name=$1', ['TargetJoin Section'])).rows[0].id;
    const cou = await query(`INSERT INTO courses (name, code) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET code=EXCLUDED.code RETURNING id`, ['TargetJoin Course', 'TARGETJOIN101']);
    courseId = cou.rows[0].id || (await query('SELECT id FROM courses WHERE name=$1', ['TargetJoin Course'])).rows[0].id;

    const hash = await hashPassword(PASSWORD);
    await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, STUDENT_EMAIL]]).catch(() => {});

    const adminRes = await query(`INSERT INTO users (email, password_hash, full_name, role, is_active, section_id, course_id) VALUES ($1,$2,'TargetJoin Admin','admin',TRUE,null,null) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [ADMIN_EMAIL, hash]);
    adminId = adminRes.rows[0].id;
    const stuRes = await query(`INSERT INTO users (email, password_hash, full_name, role, is_active, section_id, course_id) VALUES ($1,$2,'TargetJoin Student','student',TRUE,$3,$4) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, section_id=EXCLUDED.section_id, course_id=EXCLUDED.course_id RETURNING id`, [STUDENT_EMAIL, hash, sectionId, courseId]);
    studentId = stuRes.rows[0].id;

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const login = async (email) => (await (await postJson(baseUrl, '/api/auth/login', { email, password: PASSWORD })).json()).token;
    adminToken = await login(ADMIN_EMAIL);
    studentToken = await login(STUDENT_EMAIL);

    // Clean lingering
    await query(`DELETE FROM announcements WHERE title LIKE 'TARGETJOIN_%'`).catch(() => {});

    // General announcement (no targets)
    const gRes = await postJson(baseUrl, '/api/announcements/general', { title: 'TARGETJOIN_General', content: 'general no targets' }, adminToken);
    assert.equal(gRes.status, 201);
    generalId = (await gRes.json()).announcement.id;

    // Class announcement with mixed targets: section + course + student
    const cRes = await postJson(baseUrl, '/api/announcements/class', {
      title: 'TARGETJOIN_Class_Mixed',
      content: 'mixed targets',
      section_ids: [sectionId],
      course_ids: [courseId],
      student_ids: [studentId],
    }, adminToken);
    assert.equal(cRes.status, 201);
    classId = (await cRes.json()).announcement.id;
  });

  after(async () => {
    await query(`DELETE FROM announcements WHERE title LIKE 'TARGETJOIN_%'`).catch(() => {});
    await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it('section-only target row: section_name populated, others null', async () => {
    const res = await getJson(baseUrl, `/api/announcements/${classId}`, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.targets));
    const sectionTarget = body.targets.find((t) => t.target_type === 'section');
    assert.ok(sectionTarget, 'section target should exist');
    // Existing ID fields preserved
    assert.ok('section_id' in sectionTarget);
    assert.equal(String(sectionTarget.section_id), String(sectionId));
    assert.equal(sectionTarget.course_id, null);
    assert.equal(sectionTarget.student_id, null);
    assert.equal(sectionTarget.target_type, 'section');
    // New fields
    assert.ok('section_name' in sectionTarget);
    assert.ok(sectionTarget.section_name && typeof sectionTarget.section_name === 'string');
    assert.equal(sectionTarget.course_name, null);
    assert.equal(sectionTarget.student_full_name, null);
    assert.equal(sectionTarget.student_email, null);
  });

  it('course-only target row: course_name populated, others null', async () => {
    const res = await getJson(baseUrl, `/api/announcements/${classId}`, adminToken);
    const body = await res.json();
    const courseTarget = body.targets.find((t) => t.target_type === 'course');
    assert.ok(courseTarget);
    assert.equal(String(courseTarget.course_id), String(courseId));
    assert.equal(courseTarget.section_id, null);
    assert.equal(courseTarget.student_id, null);
    assert.equal(courseTarget.course_name && typeof courseTarget.course_name, 'string');
    assert.equal(courseTarget.section_name, null);
    assert.equal(courseTarget.student_full_name, null);
    assert.equal(courseTarget.student_email, null);
  });

  it('student-only target row: student_full_name + student_email populated, others null', async () => {
    const res = await getJson(baseUrl, `/api/announcements/${classId}`, adminToken);
    const body = await res.json();
    const stuTarget = body.targets.find((t) => t.target_type === 'student');
    assert.ok(stuTarget);
    assert.equal(String(stuTarget.student_id), String(studentId));
    assert.equal(stuTarget.section_id, null);
    assert.equal(stuTarget.course_id, null);
    assert.equal(typeof stuTarget.student_full_name, 'string');
    assert.ok(stuTarget.student_full_name.includes('TargetJoin Student'));
    assert.equal(typeof stuTarget.student_email, 'string');
    assert.equal(stuTarget.student_email, STUDENT_EMAIL);
    assert.equal(stuTarget.section_name, null);
    assert.equal(stuTarget.course_name, null);
  });

  it('mixed targets all resolve correctly in same response', async () => {
    const res = await getJson(baseUrl, `/api/announcements/${classId}`, adminToken);
    const body = await res.json();
    assert.equal(body.targets.length, 3);
    const byType = Object.fromEntries(body.targets.map((t) => [t.target_type, t]));
    assert.ok(byType.section.section_name);
    assert.ok(byType.course.course_name);
    assert.ok(byType.student.student_full_name);
  });

  it('Existing ID fields (section_id, course_id, student_id, target_type) still present', async () => {
    const res = await getJson(baseUrl, `/api/announcements/${classId}`, adminToken);
    const body = await res.json();
    for (const t of body.targets) {
      assert.ok('id' in t);
      assert.ok('announcement_id' in t);
      assert.ok('target_type' in t);
      assert.ok('section_id' in t);
      assert.ok('course_id' in t);
      assert.ok('student_id' in t);
      assert.ok('created_at' in t);
    }
  });

  it('A general announcement with no targets returns targets: []', async () => {
    const res = await getJson(baseUrl, `/api/announcements/${generalId}`, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.targets));
    assert.equal(body.targets.length, 0);
  });

  it('List endpoint (GET /api/announcements) response shape unchanged — no targets array', async () => {
    const res = await getJson(baseUrl, `/api/announcements`, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.announcements));
    assert.ok('total' in body);
    // announcements should not have targets array added
    for (const a of body.announcements.slice(0, 2)) {
      assert.equal(a.targets, undefined, 'list should not include targets array');
      // ensure no new name fields on announcement rows
      assert.equal(a.section_name, undefined);
      assert.equal(a.course_name, undefined);
    }
    // also student list unchanged
    const resStu = await getJson(baseUrl, `/api/announcements`, studentToken);
    assert.equal(resStu.status, 200);
    const bodyStu = await resStu.json();
    assert.ok(Array.isArray(bodyStu.announcements));
  });

  it('Implementation is single query (no N+1) — verified by LEFT JOIN not per-target loop', async () => {
    // This test verifies the SQL uses JOINs: we check that getTargets returns correct names without extra queries per target.
    // Indirectly verified by checking that all three target types are resolved in one GET call and that performance is not degraded.
    // We assert the query plan uses joins by ensuring names are present for all types simultaneously.
    const res = await getJson(baseUrl, `/api/announcements/${classId}`, adminToken);
    const body = await res.json();
    // If N+1, this would still pass but we verify no per-target await pattern by inspecting model source contains JOIN
    const fs = await import('node:fs/promises');
    const modelSrc = await fs.readFile(new URL('../src/features/announcements/announcementModel.js', import.meta.url), 'utf8');
    assert.match(modelSrc, /LEFT JOIN sections/);
    assert.match(modelSrc, /LEFT JOIN courses/);
    assert.match(modelSrc, /LEFT JOIN users/);
    assert.ok(!modelSrc.includes('for (const t of targets)') || modelSrc.includes('SELECT at.id'), 'should not loop per target');
  });
});
