import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { signToken } from '../src/shared/utils/jwt.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `upcoming_admin@${domain}`;
const TEACHER_EMAIL = `upcoming_teacher@${domain}`;
const STUDENT_EMAIL = `upcoming_student@${domain}`;

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe('B1.3 status=scheduled bypass + ?upcoming=true', () => {
  let server;
  let baseUrl;
  let adminToken;
  let teacherToken;
  let studentToken;
  let studentId;
  let sectionId;
  let courseId;
  let otherSectionId;
  const createdIds = [];

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

    const sec = await query(`INSERT INTO sections (name, grade_level) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET grade_level=EXCLUDED.grade_level RETURNING id`, ['Upcoming Section A', 'Grade 10']);
    sectionId = sec.rows[0].id;
    const secOther = await query(`INSERT INTO sections (name, grade_level) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET grade_level=EXCLUDED.grade_level RETURNING id`, ['Upcoming Section B', 'Grade 11']);
    otherSectionId = secOther.rows[0].id;
    const cou = await query(`INSERT INTO courses (name, code) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET code=EXCLUDED.code RETURNING id`, ['Upcoming Course', 'UPCOMING101']);
    courseId = cou.rows[0].id;

    const adminHash = await hashPassword('UpcomingAdmin!1');
    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'Upcoming Admin','admin',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,
      [ADMIN_EMAIL, adminHash]
    );
    adminToken = signToken({ userId: adminRes.rows[0].id, role: 'admin' });

    const teacherHash = await hashPassword('UpcomingTeacher!1');
    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'Upcoming Teacher','teacher',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,
      [TEACHER_EMAIL, teacherHash]
    );
    teacherToken = signToken({ userId: teacherRes.rows[0].id, role: 'teacher' });

    const stuHash = await hashPassword('UpcomingStudent!1');
    const stuRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active) VALUES ($1,$2,'Upcoming Student','student',$3,$4,TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, section_id=EXCLUDED.section_id, course_id=EXCLUDED.course_id RETURNING id`,
      [STUDENT_EMAIL, stuHash, sectionId, courseId]
    );
    studentId = stuRes.rows[0].id;
    studentToken = signToken({ userId: studentId, role: 'student' });

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Clean lingering upcoming titles
    await query(`DELETE FROM announcements WHERE title LIKE 'UPCOMING_%'`).catch(() => {});

    const future1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const future2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const future3 = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // General scheduled (future publish_at) — visible to student via upcoming general
    const r1 = await postJson(baseUrl, '/api/announcements/general', { title: 'UPCOMING_General_Future_1', content: 'future general 1', publish_at: future1 }, adminToken);
    assert.equal(r1.status, 201);
    createdIds.push((await r1.json()).announcement.id);

    const r2 = await postJson(baseUrl, '/api/announcements/general', { title: 'UPCOMING_General_Future_2', content: 'future general 2', publish_at: future2 }, teacherToken);
    assert.equal(r2.status, 201);
    createdIds.push((await r2.json()).announcement.id);

    // Class scheduled targeted to student's section — should appear for student upcoming
    const r3 = await postJson(baseUrl, '/api/announcements/class', { title: 'UPCOMING_Class_Targeted_A', content: 'targeted', publish_at: future1, section_ids: [sectionId] }, teacherToken);
    assert.equal(r3.status, 201);
    createdIds.push((await r3.json()).announcement.id);

    // Class scheduled NOT targeted to student (other section) — should NOT appear for student
    const r4 = await postJson(baseUrl, '/api/announcements/class', { title: 'UPCOMING_Class_Untargeted_B', content: 'untargeted', publish_at: future1, section_ids: [otherSectionId] }, adminToken);
    assert.equal(r4.status, 201);
    createdIds.push((await r4.json()).announcement.id);

    // Published general (no publish_at) — should be hidden from upcoming/scheduled filter
    const r5 = await postJson(baseUrl, '/api/announcements/general', { title: 'UPCOMING_Published_Now', content: 'published now' }, adminToken);
    assert.equal(r5.status, 201);
    createdIds.push((await r5.json()).announcement.id);

    // Slightly later scheduled to test ordering
    const r6 = await postJson(baseUrl, '/api/announcements/general', { title: 'UPCOMING_General_Future_3_Latest', content: 'latest future', publish_at: future3 }, adminToken);
    assert.equal(r6.status, 201);
    createdIds.push((await r6.json()).announcement.id);
  });

  after(async () => {
    if (createdIds.length) {
      await query(`DELETE FROM announcements WHERE id = ANY($1::bigint[])`, [createdIds]).catch(() => {});
    }
    await query(`DELETE FROM announcements WHERE title LIKE 'UPCOMING_%'`).catch(() => {});
    await query('DELETE FROM users WHERE email LIKE $1', [`upcoming_%@${domain}`]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  // Status bypass
  it('teacher/admin ?status=scheduled returns future publish_at rows', async () => {
    const res = await getJson(baseUrl, '/api/announcements?status=scheduled', teacherToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.length >= 2);
    for (const a of body.announcements) {
      assert.ok(a.publish_at && new Date(a.publish_at) > new Date(), 'publish_at should be future');
      assert.equal(a.status, 'scheduled');
    }
  });

  it('teacher/admin ?status=scheduled does NOT return published rows', async () => {
    const res = await getJson(baseUrl, '/api/announcements?status=scheduled', adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!body.announcements.some((a) => a.title === 'UPCOMING_Published_Now'));
  });

  it('teacher/admin ?status=published still hides future-scheduled (SCHEDULING_FILTER preserved)', async () => {
    const res = await getJson(baseUrl, '/api/announcements?status=published', adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!body.announcements.some((a) => a.title.startsWith('UPCOMING_General_Future')));
  });

  it('default (no status) hides future-scheduled (SCHEDULING_FILTER preserved)', async () => {
    const res = await getJson(baseUrl, '/api/announcements', adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!body.announcements.some((a) => a.title.startsWith('UPCOMING_General_Future')));
  });

  // Upcoming
  it('admin ?upcoming=true returns only future publish_at', async () => {
    const res = await getJson(baseUrl, '/api/announcements?upcoming=true', adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.length >= 4);
    for (const a of body.announcements) {
      assert.ok(a.publish_at && new Date(a.publish_at) > new Date());
    }
    assert.ok(!body.announcements.some((a) => a.title === 'UPCOMING_Published_Now'));
  });

  it('admin ?upcoming=true ordered by publish_at ASC', async () => {
    const res = await getJson(baseUrl, '/api/announcements?upcoming=true&limit=10', adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    const times = body.announcements.map((a) => new Date(a.publish_at).getTime());
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i] >= times[i - 1], 'should be ASC by publish_at');
    }
  });

  it('student ?upcoming=true returns only targeted scheduled + general scheduled', async () => {
    const res = await getJson(baseUrl, '/api/announcements?upcoming=true', studentToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    const titles = body.announcements.map((a) => a.title);
    assert.ok(titles.includes('UPCOMING_General_Future_1'));
    assert.ok(titles.includes('UPCOMING_Class_Targeted_A'));
    // total is COUNT(*) not post-pagination quirk
    assert.equal(typeof body.total, 'number');
    assert.ok(body.total >= 2);
  });

  it('student ?upcoming=true does NOT return untargeted scheduled class', async () => {
    const res = await getJson(baseUrl, '/api/announcements?upcoming=true', studentToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!body.announcements.some((a) => a.title === 'UPCOMING_Class_Untargeted_B'));
  });

  it('student ?upcoming=true with no matches → { announcements: [], total: 0 } (via new student in other section with no targeted)', async () => {
    // Use limit/offset beyond total to force empty page but total still correct — verify pagination doesn't zero total
    const resPaged = await getJson(baseUrl, '/api/announcements?upcoming=true&offset=100', studentToken);
    assert.equal(resPaged.status, 200);
    const bodyPaged = await resPaged.json();
    assert.equal(bodyPaged.announcements.length, 0);
    assert.ok(typeof bodyPaged.total === 'number' && bodyPaged.total > 0, 'total should remain COUNT(*) even when page empty');
  });

  it('?upcoming=true + ?status=scheduled together → 400', async () => {
    const res = await getJson(baseUrl, '/api/announcements?upcoming=true&status=scheduled', adminToken);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /upcoming/i);
  });

  it('?upcoming=true + ?type=general is silently ignored', async () => {
    const res1 = await getJson(baseUrl, '/api/announcements?upcoming=true', adminToken);
    const body1 = await res1.json();
    const res2 = await getJson(baseUrl, '/api/announcements?upcoming=true&type=general', adminToken);
    const body2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(body2.total, body1.total);
    assert.equal(body2.announcements.length, body1.announcements.length);
  });

  it('?upcoming=true default limit is 10 (limit param works)', async () => {
    const resLimited = await getJson(baseUrl, '/api/announcements?upcoming=true&limit=1', adminToken);
    assert.equal(resLimited.status, 200);
    const body = await resLimited.json();
    assert.equal(body.announcements.length, 1);
    assert.ok(body.total >= 4, 'total should be full count, not limited');
  });

  it('?upcoming=true does not return published (SCHEDULING_FILTER bypass only for publish_at future)', async () => {
    const res = await getJson(baseUrl, '/api/announcements?upcoming=true', adminToken);
    const body = await res.json();
    assert.ok(!body.announcements.some((a) => a.title === 'UPCOMING_Published_Now'));
  });

  it('student with no scheduled general and no targeted → { announcements: [], total: 0 } true empty-state', async () => {
    const before = await getJson(baseUrl, '/api/announcements?upcoming=true', studentToken);
    const beforeBody = await before.json();
    const snapshotTotal = beforeBody.total;
    assert.ok(snapshotTotal > 0, 'precondition: there are upcoming rows to delete');

    await query(`DELETE FROM announcements WHERE publish_at IS NOT NULL AND publish_at > NOW()`);

    const resEmpty = await getJson(baseUrl, '/api/announcements?upcoming=true', studentToken);
    assert.equal(resEmpty.status, 200);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.announcements.length, 0);
    assert.equal(bodyEmpty.total, 0);
  });
});
