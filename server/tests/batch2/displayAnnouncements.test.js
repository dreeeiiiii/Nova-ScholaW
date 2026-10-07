import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { application } from '../batch1/harness.js';
import { records, seedDisplayAnnouncements } from '../../scripts/seed-display-announcements.js';

const emailCalls = [];
mock.module('../../src/shared/services/emailService.js', { namedExports: {
  sendAnnouncementEmail: async (...args) => { emailCalls.push(args); return { status:'mock', accepted:0, failed:0 }; },
} });

test('display import is idempotent, email-ineligible and visible only as General content', async () => {
  const app = await application('display_import');
  try {
    const departments = (await app.request('/auth/departments')).data.departments;
    const department = departments[0].id;
    await app.seed('admin@nst.edu.ph','admin');
    await app.seed('teacher@tr.nst.edu.ph','teacher',department);
    await app.seed('student@my.nst.edu.ph','student',department);
    const admin=await app.login('admin@nst.edu.ph'), teacher=await app.login('teacher@tr.nst.edu.ph'), student=await app.login('student@my.nst.edu.ph');
    const before = (await app.db.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n;
    const galleryBefore = (await app.db.query('SELECT COUNT(*)::int AS n FROM gallery_media')).rows[0].n;
    const first = await seedDisplayAnnouncements(app.db);
    assert.equal(first.inserted,13); assert.equal(first.deliveryRows,0);
    const second = await seedDisplayAnnouncements(app.db);
    assert.equal(second.inserted,0); assert.equal(second.existing,13);
    assert.equal(emailCalls.length,0,'Import must never call emailService/Brevo');
    const imported = (await app.db.query('SELECT * FROM announcements WHERE display_import_key IS NOT NULL')).rows;
    assert.ok(imported.every(a=>a.email_eligible===false && a.type==='general' && a.department_id===null && a.b2_key===null));
    assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,before);
    assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM gallery_media')).rows[0].n,galleryBefore);
    const publishedTitles=records.filter(a=>a.status==='published').map(a=>a.title).sort();
    for (const route of ['/announcements/public?limit=100','/announcements/tv?limit=100']) {
      const response=await app.request(route);
      assert.deepEqual(response.data.announcements.map(a=>a.title).sort(),publishedTitles);
      assert.equal(response.data.total,10);
      assert.ok(response.data.announcements.every(a=>a.type==='general'&&a.status==='published'&&a.image_url.startsWith('/nst/')));
      const page1=(await app.request(route.split('?')[0]+'?limit=3&offset=0')).data;
      // Explicit pagination with an unambiguous limit.
      const page2=(await app.request(route.split('?')[0]+'?limit=3&offset=3')).data;
      assert.equal(page2.announcements.length,3);
      assert.ok(page2.announcements.every(a=>!page1.announcements.some(b=>b.id===a.id)));
    }
    for (const token of [student,teacher]) {
      const feed=(await app.request('/announcements?type=general&limit=100',{token})).data;
      assert.deepEqual(feed.announcements.map(a=>a.title).sort(),publishedTitles);
      for (const type of ['class','department']) assert.equal((await app.request('/announcements?type='+type,{token})).data.total,0);
    }
    assert.equal((await app.request('/announcements?type=general&limit=100',{token:admin})).data.total,13);
    await app.db.query("INSERT INTO announcements(author_id,type,department_id,title,content,status,email_eligible) SELECT id, 'department', $1, 'Private department notice', 'Private', 'published', FALSE FROM users WHERE role='admin'",[department]);
    await app.db.query("INSERT INTO announcements(author_id,type,title,content,status,email_eligible) SELECT id, 'class', 'Private class notice', 'Private', 'published', FALSE FROM users WHERE role='teacher'");
    assert.deepEqual((await app.request('/announcements/tv?limit=100')).data.announcements.map(a=>a.title).sort(),publishedTitles);
    const { deliverPublication }=await import('../../src/features/announcements/announcementEmail.js');
    for (const a of imported) await deliverPublication(a.id);
    assert.equal(emailCalls.length,0,'Even an explicit publication attempt must exit before email');
    const draft=imported.find(a=>a.status==='draft');
    await app.request('/announcements/'+draft.id,{token:admin,method:'PUT',body:{status:'published'}});
    assert.equal(emailCalls.length,0,'Admin publishing an imported draft must remain email-ineligible');
    assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM announcement_email_deliveries')).rows[0].n,0);
    await assert.rejects(app.db.query('UPDATE announcements SET email_eligible=TRUE WHERE id=$1',[draft.id]),/display_import_email_safety/);
    // Real Admin publications keep the existing live behavior/default.
    const live=(await app.request('/announcements/general',{token:admin,method:'POST',body:{title:'Real Admin notice',content:'Live workflow'}})).data.announcement;
    assert.equal(live.email_eligible,true); assert.equal(emailCalls.length,1);
    assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM announcement_email_deliveries WHERE announcement_id=ANY($1::bigint[])',[first.ids])).rows[0].n,0);
    console.log('Display import: emailService/Brevo calls = 0; delivery rows = 0; 13 records; 10 public General records; rerun inserts = 0.');
  } finally {await app.cleanup();}
});
