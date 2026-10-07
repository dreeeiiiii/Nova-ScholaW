import test from 'node:test';
import assert from 'node:assert/strict';
import { application } from './harness.js';

test('strict student sections: reuse, concurrency, integrity, management and login', async t => {
  const app = await application('registration_sections');
  t.after(app.cleanup);
  const departments = (await app.request('/auth/departments')).data.departments;
  const college = departments.find(d => d.code === 'college').id;
  const shs = departments.find(d => d.code === 'shs').id;
  const section = (await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('BSIS 1-A','1st Year',$1) RETURNING id", [college])).rows[0];
  const courses = (await app.db.query("INSERT INTO courses(name,code,department_id) VALUES('Information Systems','BSIS',$1),('Hospitality','BSHM',$1),('STEM','STEM',$2) RETURNING id,code", [college, shs])).rows;
  const bsis = courses.find(c => c.code === 'BSIS').id;
  const bshm = courses.find(c => c.code === 'BSHM').id;
  const stem = courses.find(c => c.code === 'STEM').id;
  const { register: handler } = await import('../../src/features/auth/authController.js');
  const register = async (email, fields = {}) => {
    let status = 200, data;
    const response = { status(code) { status = code; return this; }, json(value) { data = value; return this; } };
    await handler({ body: { email, role: 'student', full_name: 'Section Student', password: 'Initial-test-password', department_id: college, course_id: bsis, ...fields } }, response, e => { throw e; });
    return { status, data };
  };
  const student = async email => (await app.db.query('SELECT * FROM users WHERE email=$1', [email])).rows[0];
  await t.test('existing section registration assigns real foreign keys and supports login', async () => {
    const result = await app.request('/auth/register', { method: 'POST', body: { email: 'existing@my.nst.edu.ph', role: 'student', full_name: 'Existing Student', password: 'Initial-test-password', department_id: college, course_id: bsis, section_id: section.id, grade_level: '1st Year' } });
    assert.equal(result.status, 201);
    const user = await student('existing@my.nst.edu.ph');
    assert.equal(user.section_id, section.id); assert.equal(user.course_id, bsis); assert.equal(user.department_id, college);
    assert.ok(await app.login(user.email));
  });
  await t.test('missing section creates an official record and assigns student; second student reuses normalized name', async () => {
    assert.equal((await register('created@my.nst.edu.ph', { new_section_name: '  BSIS   1-C ', grade_level: '1st Year' })).status, 201);
    const first = await student('created@my.nst.edu.ph');
    assert.equal((await register('reused@my.nst.edu.ph', { new_section_name: 'bsis 1-c', grade_level: '1st Year' })).status, 201);
    assert.equal((await student('reused@my.nst.edu.ph')).section_id, first.section_id);
    const rows = (await app.db.query("SELECT * FROM sections WHERE normalize_section_name(name)='bsis 1-c'")).rows;
    assert.equal(rows.length, 1); assert.equal(rows[0].name, 'BSIS 1-C'); assert.equal(rows[0].department_id, college);
    const logs = (await app.db.query("SELECT * FROM audit_logs WHERE action='section.created_during_registration' AND entity_id=$1", [first.section_id])).rows;
    assert.equal(logs.length, 1); assert.equal(logs[0].details.section_name, 'BSIS 1-C');
    assert.equal(logs[0].details.password, undefined);
    assert.ok(await app.login('created@my.nst.edu.ph'));
  });
  await t.test('simultaneous requests resolve one section ID', async () => {
    const results = await Promise.all([
      register('concurrent-a@my.nst.edu.ph', { new_section_name: 'BSIS 1-D', grade_level: '1st Year' }),
      register('concurrent-b@my.nst.edu.ph', { new_section_name: ' bsis   1-d ', grade_level: '1st Year' }),
    ]);
    assert.deepEqual(results.map(r => r.status), [201, 201]);
    assert.equal((await student('concurrent-a@my.nst.edu.ph')).section_id, (await student('concurrent-b@my.nst.edu.ph')).section_id);
    assert.equal((await app.db.query("SELECT count(*)::int AS n FROM sections WHERE normalize_section_name(name)='bsis 1-d'")).rows[0].n, 1);
  });
  await t.test('database index prevents whitespace and capitalization duplicates from every writer', async () => {
    for (const name of ['bsis   1-a', 'BSIS\u00a01-A', ' BSIS\t1-A ']) {
      await assert.rejects(app.db.query('INSERT INTO sections(name,grade_level,department_id) VALUES($1,$2,$3)', [name, '1st Year', college]), { code: '23505' });
    }
  });
  await t.test('concurrent double submit creates one student and section', async () => {
    const results = await Promise.all([1, 2].map(() => register('double@my.nst.edu.ph', { new_section_name: 'BSIS 1-E', grade_level: '1st Year' })));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    assert.equal((await app.db.query("SELECT count(*)::int AS n FROM sections WHERE normalize_section_name(name)='bsis 1-e'")).rows[0].n, 1);
  });
  await t.test('account creation failure rolls back newly created section', async () => {
    assert.equal((await register('existing@my.nst.edu.ph', { new_section_name: 'BSIS 1-Z', grade_level: '1st Year' })).status, 409);
    assert.equal((await app.db.query("SELECT count(*)::int AS n FROM sections WHERE name='BSIS 1-Z'")).rows[0].n, 0);
  });
  for (const [label, fields] of [
    ['missing section', {}], ['invalid section ID', { section_id: 999999 }], ['malformed ID', { section_id: 'oops' }],
    ['wrong department section', { department_id: shs, course_id: null, section_id: section.id }],
    ['invalid department', { department_id: 999999, section_id: section.id }],
    ['wrong department course', { course_id: stem, section_id: section.id }],
    ['invalid course', { course_id: 999999, section_id: section.id }],
    ['wrong level', { section_id: section.id, grade_level: '2nd Year' }],
    ['blank manual section', { new_section_name: '   ', grade_level: '1st Year' }],
    ['markup manual section', { new_section_name: '<script>', grade_level: '1st Year' }],
    ['garbage manual section', { new_section_name: 'asdf', grade_level: '1st Year' }],
    ['invalid manual level', { new_section_name: 'BSIS 1-X', grade_level: 'Unknown' }],
    ['both section choices', { section_id: section.id, new_section_name: 'BSIS 1-A', grade_level: '1st Year' }],
    ['equivalent name wrong department', { department_id: shs, course_id: null, new_section_name: 'bsis 1-a', grade_level: 'Grade 11' }],
  ]) await t.test(label + ' is rejected', async () => assert.equal((await register('invalid@my.nst.edu.ph', fields)).status, 400));
  await t.test('independent course assignments preserve shared sections in the actual schema', async () => {
    assert.equal((await register('shared@my.nst.edu.ph', { course_id: bshm, section_id: section.id })).status, 201);
    assert.equal((await student('shared@my.nst.edu.ph')).section_id, section.id);
  });
  await t.test('cross-student legacy course/department inconsistency requires Admin review', async () => {
    const legacy = (await app.db.query("INSERT INTO users(email,password_hash,full_name,role,section_id,course_id) VALUES('legacy-mismatch@my.nst.edu.ph','unused-hash','Legacy Student','student',$1,$2) RETURNING id", [section.id, stem])).rows[0];
    try {
      assert.equal((await register('blocked-legacy@my.nst.edu.ph', { new_section_name: 'bsis 1-a', grade_level: '1st Year' })).status, 400);
    } finally { await app.db.query('DELETE FROM users WHERE id=$1', [legacy.id]); }
  });
  await t.test('registration-created sections appear in Admin management and history stays protected', async () => {
    const admin = await app.seed('admin@nst.edu.ph', 'admin'); const token = await app.login(admin.email);
    const created = await student('created@my.nst.edu.ph');
    const list = await app.request('/sections?department_id=' + college, { token });
    assert.ok(list.data.sections.some(s => s.id === created.section_id && s.student_count === 2));
    assert.equal((await app.request('/sections/' + created.section_id, { token, method: 'PUT', body: { name: 'BSIS 1-C Updated' } })).status, 200);
    assert.equal((await app.request('/sections/' + created.section_id, { token, method: 'DELETE' })).status, 409);
    assert.equal((await app.request('/sections', { token, method: 'POST', body: { name: ' bsis  1-a ', grade_level: '1st Year', department_id: college } })).status, 409);
  });
  await t.test('Admin-created and edited sections appear in registration and assign the existing record', async () => {
    const token = await app.login('admin@nst.edu.ph');
    const response = await app.request('/sections', { token, method: 'POST', body: { name: 'BSIS 3-A', grade_level: '3rd Year', department_id: college } });
    assert.equal(response.status, 201);
    const id = response.data.section.id;
    let options = await app.request('/auth/sections?department_id=' + college + '&grade_level=3rd%20Year');
    assert.ok(options.data.sections.some(s => s.id === id && s.name === 'BSIS 3-A'));
    assert.equal((await app.request('/sections/' + id, { token, method: 'PUT', body: { name: 'BSIS 3-B' } })).status, 200);
    options = await app.request('/auth/sections?department_id=' + college + '&grade_level=3rd%20Year');
    assert.ok(options.data.sections.some(s => s.id === id && s.name === 'BSIS 3-B'));
    assert.equal((await register('admin-section@my.nst.edu.ph', { section_id: id, grade_level: '3rd Year' })).status, 201);
    assert.equal((await student('admin-section@my.nst.edu.ph')).section_id, id);
  });
  await t.test('zero matching sections permits manual registration and is immediately shared in both lists', async () => {
    const token = await app.login('admin@nst.edu.ph');
    const url = '/auth/sections?department_id=' + shs + '&grade_level=Grade%2011';
    assert.deepEqual((await app.request(url)).data.sections, []);
    assert.equal((await register('zero-section@my.nst.edu.ph', { department_id: shs, course_id: stem, grade_level: 'Grade 11', new_section_name: 'STEM 11-A' })).status, 201);
    const first = await student('zero-section@my.nst.edu.ph');
    assert.ok(first.section_id);
    assert.ok((await app.request('/sections?department_id=' + shs, { token })).data.sections.some(s => s.id === first.section_id));
    assert.ok((await app.request(url)).data.sections.some(s => s.id === first.section_id));
    assert.equal((await register('zero-select@my.nst.edu.ph', { department_id: shs, course_id: stem, grade_level: 'Grade 11', section_id: first.section_id })).status, 201);
    assert.equal((await student('zero-select@my.nst.edu.ph')).section_id, first.section_id);
    assert.equal((await register('zero-normalized@my.nst.edu.ph', { department_id: shs, course_id: stem, grade_level: 'Grade 11', new_section_name: ' stem   11-a ' })).status, 201);
    assert.equal((await student('zero-normalized@my.nst.edu.ph')).section_id, first.section_id);
    const unused = await app.request('/sections', { token, method: 'POST', body: { name: 'STEM 12-Z', grade_level: 'Grade 12', department_id: shs } });
    assert.equal(unused.status, 201);
    assert.equal((await app.request('/sections/' + unused.data.section.id, { token, method: 'DELETE' })).status, 200);
    assert.ok(!(await app.request('/auth/sections?department_id=' + shs)).data.sections.some(s => s.id === unused.data.section.id));
    assert.equal((await app.request('/sections/' + first.section_id, { token, method: 'DELETE' })).status, 409);
  });
  await t.test('public choices validate course department and filter grade', async () => {
    const result = await app.request('/auth/sections?department_id=' + college + '&course_id=' + bsis + '&grade_level=2nd%20Year');
    assert.equal(result.status, 200); assert.equal(result.data.sections.length, 0); assert.ok(result.data.courses.some(c => c.id === bsis));
    assert.equal((await app.request('/auth/sections?department_id=' + college + '&course_id=' + stem)).status, 400);
  });
  await t.test('Teacher registration and login need no section or course', async () => {
    assert.equal((await register('teacher@tr.nst.edu.ph', { role: 'teacher', course_id: null })).status, 201);
    const teacher = await student('teacher@tr.nst.edu.ph'); assert.equal(teacher.section_id, null); assert.equal(teacher.course_id, null);
    assert.ok(await app.login(teacher.email));
    assert.equal((await register('teacher-create@tr.nst.edu.ph', { role: 'teacher', course_id: null, new_section_name: 'BSIS 1-T' })).status, 400);
  });
});
