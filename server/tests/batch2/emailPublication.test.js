import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { application } from '../batch1/harness.js';

// Exercise the real service/resolver/ledger on a disposable localhost DB.
// Only the provider transport is stubbed. No Brevo account is contacted.
const settings = {emailMode:'live',isProduction:true,brevoApiKey:'fake-key',emailSender:'controlled@gmail.com',emailSenderName:'Nova Schola Hub',emailEnabledAt:'2026-01-01T00:00:00Z'};
const calls=[];
let providerStatus=201, networkFailure=false;
mock.module('../../src/shared/services/emailService.js', {namedExports:{sendAnnouncementEmail:async (announcement,recipients,options) => {
 const {sendAnnouncementEmail}=await import('../../src/shared/services/emailService.js?real');
 return sendAnnouncementEmail(announcement,recipients,{...options,settings,transport:async(url,init)=>{
  calls.push(JSON.parse(init.body));if(networkFailure)throw new Error('fake-key');return {ok:providerStatus===201,status:providerStatus,json:async()=>({messageId:`<fake-${calls.length}>`})};
 }});
}}});

test('live publication uses real recipient rules, persists detail and never resends claims',async()=>{
 const app=await application('email_live');
 try {
  const departments=(await app.request('/auth/departments')).data.departments;
  const college=departments.find(d=>d.code==='college').id,shs=departments.find(d=>d.code==='shs').id;
  await app.seed('admin@nst.edu.ph','admin');await app.seed('teacher@tr.nst.edu.ph','teacher',college);
  const student=await app.seed('student@my.nst.edu.ph','student',college);
  await app.seed('other@my.nst.edu.ph','student',shs);await app.seed('inactive@my.nst.edu.ph','student',college,null,false);
  await app.seed('inactive@tr.nst.edu.ph','teacher',college,null,false);
  const admin=await app.login('admin@nst.edu.ph'),teacher=await app.login('teacher@tr.nst.edu.ph');
  const publish=async(type,token,extra={})=>(await app.request(`/announcements/${type}`,{token,method:'POST',body:{title:`Live ${type}`,content:'Body\nNext line',...extra}})).data.announcement;
  const general=await publish('general',admin);
  assert.deepEqual(calls.splice(0).map(c=>c.to[0].email).sort(),['other@my.nst.edu.ph','student@my.nst.edu.ph']);
  await publish('department',admin,{department_id:college});
  assert.deepEqual(calls.splice(0).map(c=>c.to[0].email).sort(),['student@my.nst.edu.ph','teacher@tr.nst.edu.ph']);
  const klass=await publish('class',teacher,{student_ids:[student.id]});
  assert.equal(calls.length,1);assert.deepEqual(calls[0].sender,{email:'controlled@gmail.com',name:'Nova Schola Hub'});assert.equal(calls[0].to[0].email,student.email);calls.length=0;
  const {deliverPublication}=await import('../../src/features/announcements/announcementEmail.js');
  await Promise.all([deliverPublication(general.id),deliverPublication(general.id),deliverPublication(klass.id)]);
  assert.equal(calls.length,0);
  const ledger=(await app.db.query('SELECT * FROM announcement_email_deliveries WHERE announcement_id=$1',[klass.id])).rows[0];
  assert.equal(ledger.status,'accepted');assert.equal(ledger.delivery_details.length,1);assert.equal(ledger.delivery_details[0].recipient_email,student.email);assert.ok(ledger.delivery_details[0].message_id);assert.ok(ledger.completed_at);
  assert.equal((await app.db.query("SELECT details FROM audit_logs WHERE action='email.delivery_result' AND entity_id=$1",[klass.id])).rows[0].details.status,'accepted');
  // Competing first claims (not just a repeat of an existing claim).
  const concurrent=(await app.request('/announcements/class',{token:teacher,method:'POST',body:{title:'Concurrent',content:'one',status:'draft',student_ids:[student.id]}})).data.announcement;
  await app.db.query("UPDATE announcements SET status='published' WHERE id=$1",[concurrent.id]);
  await Promise.all([deliverPublication(concurrent.id),deliverPublication(concurrent.id)]);assert.equal(calls.length,1);calls.length=0;
  const scheduled=(await app.request('/announcements/class',{token:teacher,method:'POST',body:{title:'Scheduled',content:'one',status:'scheduled',publish_at:new Date(Date.now()+60000).toISOString(),student_ids:[student.id]}})).data.announcement;
  await app.db.query("UPDATE announcements SET publish_at=NOW()-INTERVAL '1 second' WHERE id=$1",[scheduled.id]);
  const {publishScheduled}=await import('../../src/features/announcements/announcementScheduler.js');
  await Promise.all([publishScheduled(),publishScheduled()]);await deliverPublication(scheduled.id);assert.equal(calls.length,1);calls.length=0;
  for (const [status,category] of [[400,'provider_request_rejected'],[401,'authentication_rejected'],[403,'sender_or_permission_rejected'],[429,'rate_limited'],[null,'network_or_timeout']]) {
   providerStatus=status;networkFailure=status===null;
   const failed=await publish('class',teacher,{student_ids:[student.id]});calls.length=0;
   await deliverPublication(failed.id);assert.equal(calls.length,0);
   const failure=(await app.db.query('SELECT * FROM announcement_email_deliveries WHERE announcement_id=$1',[failed.id])).rows[0];
   assert.equal(failure.status,'failed');assert.equal(failure.delivery_details[0].error,category);assert.equal(failure.failed_count,1);
   assert.equal(failure.delivery_details[0].http_status??null,status);
  }
  providerStatus=201;networkFailure=false;
  // A no-recipient skip must not create a permanent claim before a first send.
  const empty=(await app.request('/announcements/class',{token:teacher,method:'POST',body:{title:'No active recipient',content:'one',status:'draft',student_ids:[student.id]}})).data.announcement;
  await app.db.query('UPDATE users SET is_active=FALSE WHERE id=$1',[student.id]);
  await app.db.query("UPDATE announcements SET status='published' WHERE id=$1",[empty.id]);
  const {resolveRecipients}=await import('../../src/features/announcements/announcementModel.js');
  assert.equal((await resolveRecipients(empty.id)).length,0);
  await deliverPublication(empty.id);
  assert.equal((await app.db.query('SELECT * FROM announcement_email_deliveries WHERE announcement_id=$1',[empty.id])).rowCount,0);
  assert.equal(calls.length,0);
  await app.db.query('UPDATE users SET is_active=TRUE WHERE id=$1',[student.id]);
  assert.equal((await resolveRecipients(empty.id)).length,1);
  await deliverPublication(empty.id);assert.equal(calls.length,1);calls.length=0;
  const old=(await app.request('/announcements/class',{token:teacher,method:'POST',body:{title:'Old draft',content:'old',status:'draft',student_ids:[student.id]}})).data.announcement;
  await app.db.query("UPDATE announcements SET created_at='2025-01-01' WHERE id=$1",[old.id]);
  await app.request(`/announcements/${old.id}`,{token:teacher,method:'PUT',body:{status:'published'}});assert.equal(calls.length,0);
  const seeded=(await app.request('/announcements/class',{token:teacher,method:'POST',body:{title:'Seeded',content:'old',status:'draft',student_ids:[student.id]}})).data.announcement;
  await app.db.query('UPDATE announcements SET email_eligible=FALSE WHERE id=$1',[seeded.id]);await app.request(`/announcements/${seeded.id}`,{token:teacher,method:'PUT',body:{status:'published'}});assert.equal(calls.length,0);
 } finally {await app.cleanup();}
});
