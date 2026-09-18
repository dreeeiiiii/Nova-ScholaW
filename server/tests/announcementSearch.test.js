import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { signToken } from '../src/shared/utils/jwt.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `qsearch_admin@${domain}`;
const TEACHER_EMAIL = `qsearch_teacher@${domain}`;
const STUDENT_EMAIL = `qsearch_student@${domain}`;
const STUDENT_OTHER_SECTION_EMAIL = `qsearch_student_other@${domain}`;
const PASSWORD = 'QSearch123!';

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe('B1.2 GET /api/announcements?q (search)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let teacherToken;
  let studentToken;
  let sectionId;
  let courseId;
  let otherSectionId;
  let generalId;
  let classTargetedId;
  let classUntargetedId;

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

    // sections/courses
    const secRes = await query(`INSERT INTO sections (name, grade_level) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET grade_level=EXCLUDED.grade_level RETURNING id`, ['QSearch Section A', 'Grade 10']);
    sectionId = secRes.rows[0].id;
    const secOther = await query(`INSERT INTO sections (name, grade_level) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET grade_level=EXCLUDED.grade_level RETURNING id`, ['QSearch Section B', 'Grade 11']);
    otherSectionId = secOther.rows[0].id;
    const couRes = await query(`INSERT INTO courses (name, code) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET code=EXCLUDED.code RETURNING id`, ['QSearch Course', 'QSEARCH101']);
    courseId = couRes.rows[0].id;

    const adminHash = await hashPassword(PASSWORD);
    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'QSearch Admin','admin',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,
      [ADMIN_EMAIL, adminHash]
    );
    adminToken = signToken({ userId: adminRes.rows[0].id, role: 'admin' });

    const teacherHash = await hashPassword(PASSWORD);
    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'QSearch Teacher','teacher',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,
      [TEACHER_EMAIL, teacherHash]
    );
    teacherToken = signToken({ userId: teacherRes.rows[0].id, role: 'teacher' });

    const stuHash = await hashPassword(PASSWORD);
    const stuRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active) VALUES ($1,$2,'QSearch Student','student',$3,$4,TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, section_id=EXCLUDED.section_id, course_id=EXCLUDED.course_id RETURNING id`,
      [STUDENT_EMAIL, stuHash, sectionId, courseId]
    );
    studentToken = signToken({ userId: stuRes.rows[0].id, role: 'student' });

    const stuOtherHash = await hashPassword(PASSWORD);
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active) VALUES ($1,$2,'QSearch Student Other','student',$3,$4,TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,
      [STUDENT_OTHER_SECTION_EMAIL, stuOtherHash, otherSectionId, courseId]
    );

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Clean any leftover qsearch announcements (by title prefix)
    await query(`DELETE FROM announcements WHERE title LIKE 'QSEARCH_%'`).catch(() => {});

    // Create general announcement with unique qsearch token in title
    const genRes = await postJson(baseUrl, '/api/announcements/general', { title: 'QSEARCH_Title_Alpha UNIQUE', content: 'General content without token' }, adminToken);
    assert.equal(genRes.status, 201);
    const genBody = await genRes.json();
    generalId = genBody.announcement.id;

    // Create general with token in content
    const genContentRes = await postJson(baseUrl, '/api/announcements/general', { title: 'General Without Token', content: 'QSEARCH_Content_Beta unique content' }, teacherToken);
    assert.equal(genContentRes.status, 201);

    // Create class announcement targeted to student's section (visible to student)
    const classRes = await postJson(baseUrl, '/api/announcements/class', {
      title: 'QSEARCH_Class_Targeted Gamma',
      content: 'Targeted content',
      section_ids: [sectionId],
    }, teacherToken);
    assert.equal(classRes.status, 201);
    classTargetedId = classRes.rows ? classRes.rows : classRes; // not needed
    const classBody = await classRes.json();
    classTargetedId = classBody.announcement.id;

    // Create class announcement NOT targeted to student (other section)
    const classOtherRes = await postJson(baseUrl, '/api/announcements/class', {
      title: 'QSEARCH_Class_Untargeted Delta',
      content: 'Untargeted for other section',
      section_ids: [otherSectionId],
    }, adminToken);
    assert.equal(classOtherRes.status, 201);
    classUntargetedId = (await classOtherRes.json()).announcement.id;

    // Create additional QSEARCH announcements for type filter test
    await postJson(baseUrl, '/api/announcements/general', { title: 'QSEARCH_General_ForType', content: 'type filter general' }, adminToken);
  });

  after(async () => {
    await query(`DELETE FROM announcements WHERE title LIKE 'QSEARCH_%' OR title LIKE 'General Without Token'`).catch(() => {});
    // leave users for other tests isolation; delete qsearch users
    await query('DELETE FROM users WHERE email LIKE $1', ['qsearch_%@%']).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it('q matches title (mixed case, teacher/admin)', async () => {
    const res = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('qsearch_title_alpha')}`, teacherToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.some((a) => a.title.includes('QSEARCH_Title_Alpha')));
    assert.ok(body.total >= 1);
  });

  it('q matches content (mixed case)', async () => {
    const res = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('qsearch_content_beta')}`, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.some((a) => a.content.includes('QSEARCH_Content_Beta')));
  });

  it('q + type filter additive (q matches but type mismatch -> 0)', async () => {
    // QSEARCH_Title_Alpha is general; with type=class should be 0
    const res = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_Title_Alpha')}&type=class`, teacherToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcements.length, 0);
    assert.equal(body.total, 0);

    // same q with type=general -> at least 1
    const res2 = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_Title_Alpha')}&type=general`, teacherToken);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.ok(body2.announcements.length >= 1);
  });

  it('q no match -> empty array total 0', async () => {
    const res = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_NONEXISTENT_999')}`, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcements.length, 0);
    assert.equal(body.total, 0);
  });

  it('student q does not leak untargeted class announcements', async () => {
    // Student searches for untargeted delta title — should be 0 for student
    const resStudent = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_Class_Untargeted')}`, studentToken);
    assert.equal(resStudent.status, 200);
    const bodyS = await resStudent.json();
    assert.equal(bodyS.announcements.length, 0);
    assert.equal(bodyS.total, 0);

    // Same q as admin should return 1
    const resAdmin = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_Class_Untargeted')}`, adminToken);
    assert.equal(resAdmin.status, 200);
    const bodyA = await resAdmin.json();
    assert.ok(bodyA.announcements.some((a) => a.title.includes('QSEARCH_Class_Untargeted')));
  });

  it('student q returns targeted class announcement', async () => {
    const res = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_Class_Targeted')}`, studentToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.some((a) => a.title.includes('QSEARCH_Class_Targeted')));
  });

  it('empty q / missing q -> no filter (regression)', async () => {
    const resNoQ = await getJson(baseUrl, `/api/announcements`, adminToken);
    const bodyNoQ = await resNoQ.json();
    const countNoQ = bodyNoQ.total;

    const resEmpty = await getJson(baseUrl, `/api/announcements?q=`, adminToken);
    assert.equal(resEmpty.status, 200);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.total, countNoQ);

    const resSpace = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('   ')}`, adminToken);
    assert.equal(resSpace.status, 200);
    const bodySpace = await resSpace.json();
    assert.equal(bodySpace.total, countNoQ);
  });

  it('SCHEDULING_FILTER preserved: scheduled announcement not returned by q', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const r = await postJson(baseUrl, '/api/announcements/general', { title: 'QSEARCH_Scheduled_Epsilon', content: 'scheduled', publish_at: future }, adminToken);
    assert.equal(r.status, 201);
    const j = await r.json();
    assert.equal(j.announcement.status, 'scheduled');

    const res = await getJson(baseUrl, `/api/announcements?q=${encodeURIComponent('QSEARCH_Scheduled_Epsilon')}`, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcements.length, 0, 'scheduled should be hidden by SCHEDULING_FILTER');
    // cleanup
    await query('DELETE FROM announcements WHERE id=$1', [j.announcement.id]);
  });
});
