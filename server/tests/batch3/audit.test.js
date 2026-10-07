import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { application } from '../batch1/harness.js';
import { safeAuditDetails } from '../../src/features/audit/auditDetails.js';

Object.assign(process.env, { EMAIL_MODE: 'mock', ANNOUNCEMENT_SCHEDULER_ENABLED: 'false' });
mock.module('../../src/shared/services/emailService.js', { namedExports: {
  sendAnnouncementEmail: async () => ({ status: 'partial_failure', accepted: 1, failed: 1 }),
} });

test('audit details allow only structured nonsecret summaries', () => {
  const secret = 'SECRET-password-JWT-api-key-signed-url';
  assert.deepEqual(safeAuditDetails({ password: secret, jwt: secret, url: secret, nested: { key: secret },
    title: secret, name: secret, rejection_reason: secret, email: secret, status: secret,
    department_id: 3, role: 'teacher', updated_fields: ['password', 'token', 'department_id'], direct_upload: true }),
  { department_id: 3, role: 'teacher', updated_fields: ['department_id'], direct_upload: true });
});

test('audit coverage, assignments, publication failures and Administrator-only access', async t => {
  const app = await application('batch3audit');
  try {
    const departments = (await app.request('/auth/departments')).data.departments;
    const college = departments.find(d => d.code === 'college').id;
    const shs = departments.find(d => d.code === 'shs').id;
    await app.seed('admin@nst.edu.ph', 'admin');
    await app.seed('teacher@tr.nst.edu.ph', 'teacher', college);
    const student = await app.seed('student@my.nst.edu.ph', 'student', college);
    const admin = await app.login('admin@nst.edu.ph'), teacher = await app.login('teacher@tr.nst.edu.ph'), learner = await app.login(student.email);
    await t.test('nonadministrators cannot read logs or manage accounts/sections', async () => {
      assert.equal((await app.request('/audit-logs')).status, 401);
      for (const token of [teacher, learner]) {
        for (const path of ['/audit-logs', '/users']) assert.equal((await app.request(path, { token })).status, 403);
        assert.equal((await app.request('/sections', { token, method: 'POST', body: { name: 'Denied', grade_level: '1', department_id: college } })).status, 403);
      }
    });
    await t.test('account creation, edits, status and explicit department assignment are recorded', async () => {
      for (const [role, email] of [['student', 'created@my.nst.edu.ph'], ['teacher', 'created@tr.nst.edu.ph']]) {
        const r = await app.request('/users', { token: admin, method: 'POST', body: { role, email, full_name: 'Created', password: 'Initial-test-password', department_id: college } });
        assert.equal(r.status, 201); const id = r.data.user.id;
        assert.equal((await app.request(`/users/${id}`, { token: admin, method: 'PUT', body: { full_name: 'Edited', department_id: shs } })).status, 200);
        for (const status of ['deactivate', 'activate']) assert.equal((await app.request(`/users/${id}/${status}`, { token: admin, method: 'PATCH' })).status, 200);
        const row = (await app.db.query("SELECT details FROM audit_logs WHERE action='user.update' AND entity_id=$1", [id])).rows[0];
        assert.equal(row.details.department_id, Number(shs)); assert.equal(row.details.previous_department_id, Number(college));
      }
    });
    await t.test('section creation, edits, assignment and deletion are recorded', async () => {
      const created = await app.request('/sections', { token: admin, method: 'POST', body: { name: 'Audit Section', grade_level: 'Year 1', department_id: college } });
      assert.equal(created.status, 201); const id = created.data.section.id;
      assert.equal((await app.request(`/sections/${id}`, { token: admin, method: 'PUT', body: { name: 'Edited Section', department_id: shs } })).status, 200);
      assert.equal((await app.request(`/sections/${id}`, { token: admin, method: 'DELETE' })).status, 200);
      const row = (await app.db.query("SELECT details FROM audit_logs WHERE action='section.update' AND entity_id=$1", [id])).rows[0];
      assert.equal(row.details.previous_department_id, Number(college)); assert.equal(row.details.department_id, Number(shs));
    });
    await t.test('all announcement types record creation/publication and safe email failures', async () => {
      for (const [type, token, extra] of [['general', admin, {}], ['department', admin, { department_id: college }], ['class', teacher, { student_ids: [student.id] }]]) {
        const r = await app.request(`/announcements/${type}`, { token, method: 'POST', body: { title: 'Audit announcement', content: 'Local', ...extra } });
        assert.equal(r.status, 201); const id = r.data.announcement.id;
        const logs = (await app.db.query("SELECT action,details FROM audit_logs WHERE entity_type='announcement' AND entity_id=$1", [id])).rows;
        for (const action of ['announcement.create', 'announcement.publish', 'email.delivery_failure']) assert.ok(logs.some(l => l.action === action));
        assert.equal(logs.find(l => l.action === 'announcement.create').details.type, type);
        assert.equal(r.data.announcement.status, 'published');
      }
    });
    await t.test('legacy secrets are hidden; logger failures never expose credentials', async () => {
      await app.db.query("INSERT INTO audit_logs(action,entity_type,details) VALUES('legacy','user',$1)", [JSON.stringify({ password: 'secret', signed_url: 'secret', department_id: college })]);
      const listed = await app.request('/audit-logs?action=legacy', { token: admin });
      assert.equal(listed.status, 200); assert.equal(listed.data.logs.length, 1); assert.ok(!JSON.stringify(listed.data.logs).includes('secret'));
      const { logAction } = await import('../../src/features/audit/auditService.js');
      const messages = []; const original = console.error; console.error = (...args) => messages.push(args.join(' '));
      try { assert.equal(await logAction({ userId: 999999, action: 'test', entityType: 'user', details: { password: 'secret' } }), null); }
      finally { console.error = original; }
      assert.deepEqual(messages, ['[audit] failed to write audit log']);
    });
    const actions = (await app.db.query('SELECT DISTINCT action FROM audit_logs')).rows.map(r => r.action);
    for (const action of ['auth.login_success', 'user.create', 'user.update', 'user.activate', 'user.deactivate', 'section.create', 'section.update', 'section.delete']) assert.ok(actions.includes(action));
  } finally { await app.cleanup(); }
});
