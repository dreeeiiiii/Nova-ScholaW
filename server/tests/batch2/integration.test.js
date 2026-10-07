import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {application} from '../batch1/harness.js';
Object.assign(process.env,{EMAIL_MODE:'mock',ANNOUNCEMENT_SCHEDULER_ENABLED:'false'});
// Storage is replaced before importing the app; no remote B2 requests or keys.
let uploads=0,failEmail=false;
mock.module('../../src/shared/services/emailService.js',{namedExports:{sendAnnouncementEmail:async(a,recipients)=>({status:failEmail?'failed':'mock',accepted:failEmail?0:recipients.length,failed:failEmail?recipients.length:0})}});
mock.module('../../src/shared/config/b2.js',{namedExports:{
 uploadBuffer:async()=>({key:`gallery/test-${++uploads}.png`}),getPresignedUrl:async key=>`http://127.0.0.1:1/${key}`,
 deleteObject:async()=>assert.fail('Historical storage must not be deleted'),
}});
const realFetch=globalThis.fetch;
globalThis.fetch=(url,...args)=>{const host=new URL(url).hostname;assert.ok(['localhost','127.0.0.1'].includes(host),'External network forbidden');return realFetch(url,...args);};
test('Batch 2 publication, image moderation, category permissions and password lifecycle',async t=>{
 const app=await application('batch2');
 try{
  const departments=(await app.request('/auth/departments')).data.departments;
  const college=departments.find(d=>d.code==='college').id,shs=departments.find(d=>d.code==='shs').id;
  const section=(await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('Local section','Year 1',$1) RETURNING id",[college])).rows[0].id;
  const course=(await app.db.query("INSERT INTO courses(name,code,department_id) VALUES('Local class','LOCAL',$1) RETURNING id",[college])).rows[0].id;
  await app.seed('admin@nst.edu.ph','admin');await app.seed('teacher@tr.nst.edu.ph','teacher',college);
  const student=await app.seed('student@my.nst.edu.ph','student',college,section);await app.db.query('UPDATE users SET course_id=$1 WHERE id=$2',[course,student.id]);
  await app.seed('other@my.nst.edu.ph','student',shs);await app.seed('inactive@my.nst.edu.ph','student',college,section,false);
  const admin=await app.login('admin@nst.edu.ph'),teacher=await app.login('teacher@tr.nst.edu.ph'),studentToken=await app.login(student.email);
  const {resolveRecipients}=await import('../../src/features/announcements/announcementModel.js');
  const {deliverPublication}=await import('../../src/features/announcements/announcementEmail.js');
  let general,department,classAnnouncement;
  await t.test('General, Department and overlapping Class targeting exclude inactive accounts',async()=>{
   general=(await app.request('/announcements/general',{token:admin,method:'POST',body:{title:'General',content:'Local'}})).data.announcement;
   department=(await app.request('/announcements/department',{token:admin,method:'POST',body:{title:'Department',content:'Local',department_id:college}})).data.announcement;
   classAnnouncement=(await app.request('/announcements/class',{token:teacher,method:'POST',body:{title:'Class',content:'Local',student_ids:[student.id],section_ids:[section],course_ids:[course]}})).data.announcement;
   assert.equal((await resolveRecipients(general.id)).length,2);
   assert.deepEqual((await resolveRecipients(department.id)).map(r=>r.email).sort(),['student@my.nst.edu.ph','teacher@tr.nst.edu.ph']);
   assert.deepEqual((await resolveRecipients(classAnnouncement.id)).map(r=>r.email),[student.email]);
   const ledger=await app.db.query('SELECT * FROM announcement_email_deliveries');assert.equal(ledger.rows.length,3);assert.ok(ledger.rows.every(r=>r.status==='mock'));
   await Promise.all([deliverPublication(general.id),deliverPublication(general.id)]);assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM announcement_email_deliveries')).rows[0].n,3);
  });
  await t.test('Email failure leaves publication intact and records safe failure',async()=>{
   failEmail=true;
   const r=await app.request('/announcements/general',{token:admin,method:'POST',body:{title:'Email failure',content:'Still published'}});
   failEmail=false;assert.equal(r.status,201);assert.equal(r.data.announcement.status,'published');
   const record=(await app.db.query('SELECT * FROM announcement_email_deliveries WHERE announcement_id=$1',[r.data.announcement.id])).rows[0];
   assert.equal(record.status,'failed');assert.equal(record.failed_count,2);assert.ok(!JSON.stringify(record).includes('api-key'));
  });
  await t.test('Historical, drafts, ordinary edits and republishing never resend',async()=>{
   await app.db.query('UPDATE announcements SET email_eligible=FALSE WHERE id=$1',[general.id]);await deliverPublication(general.id);
   const draft=(await app.request('/announcements/general',{token:admin,method:'POST',body:{title:'Draft',content:'Local',status:'draft'}})).data.announcement;
   assert.equal((await app.db.query('SELECT * FROM announcement_email_deliveries WHERE announcement_id=$1',[draft.id])).rowCount,0);
   await app.request(`/announcements/${draft.id}`,{token:admin,method:'PUT',body:{status:'published'}});
   await app.request(`/announcements/${draft.id}`,{token:admin,method:'PUT',body:{title:'Edited'}});
   await app.request(`/announcements/${draft.id}`,{token:admin,method:'DELETE'});
   await app.request(`/announcements/${draft.id}`,{token:admin,method:'PUT',body:{status:'published'}});
   assert.equal((await app.db.query('SELECT * FROM announcement_email_deliveries WHERE announcement_id=$1',[draft.id])).rowCount,1);
  });
  await t.test('Public and TV return only published, unexpired General content',async()=>{
   await app.db.query("UPDATE announcements SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[general.id]);
   for(const path of ['/announcements/public','/announcements/tv']){const r=await app.request(path);assert.equal(r.status,200);assert.ok(r.data.announcements.every(a=>a.type==='general'));assert.ok(!r.data.announcements.some(a=>a.id===general.id));}
  });
  const category=(await app.request('/categories',{token:admin,method:'POST',body:{name:'Local category'}})).data.category;
  const upload=async(token,buffer,mime)=>{
   const body=new FormData();body.append('category_id',String(category.id));body.append('title','Test image');body.append('file',new Blob([buffer],{type:mime}),'test.'+(mime.split('/')[1]));
   const r=await fetch(app.origin+'/api/gallery/upload',{method:'POST',headers:{Authorization:'Bearer '+token},body});return {status:r.status,data:await r.json()};
  };
  await t.test('JPEG, PNG, WebP pending/approve/reject, Admin direct upload and video rejection',async()=>{
   for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
    const bytes=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).toFormat(format).toBuffer();
    const r=await upload(studentToken,bytes,mime);assert.equal(r.status,201);assert.equal(r.data.media.status,'pending');
    const id=r.data.media.id;assert.equal((await app.request(`/gallery/${id}`)).status,404);
    assert.equal((await app.request(`/gallery/${id}/approve`,{token:teacher,method:'PATCH'})).status,403);
    assert.equal((await app.request(`/gallery/${id}/approve`,{token:admin,method:'PATCH'})).status,200);
    assert.equal((await app.request(`/gallery/${id}`)).status,200);
   }
   const bytes=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer();
   const pending=await upload(teacher,bytes,'image/png');assert.equal(pending.data.media.status,'pending');
   assert.equal((await app.request('/gallery/pending',{token:studentToken})).status,403);
   assert.ok((await app.request('/gallery/pending',{token:admin})).data.media.some(m=>m.id===pending.data.media.id));
   assert.equal((await app.request(`/gallery/${pending.data.media.id}/reject`,{token:admin,method:'PATCH',body:{rejection_reason:'Test rejection'}})).status,200);
   assert.equal((await app.request(`/gallery/${pending.data.media.id}`)).status,404);
   const direct=await upload(admin,bytes,'image/png');assert.equal(direct.data.media.status,'approved');assert.ok(direct.data.media.reviewed_by);
   const before=uploads;assert.equal((await upload(studentToken,Buffer.from('video'),'video/mp4')).status,400);assert.equal(uploads,before);
   assert.equal((await upload(studentToken,Buffer.from('fake image'),'image/png')).status,400);assert.equal(uploads,before);
   assert.equal((await upload(studentToken,Buffer.alloc(10*1024*1024+1),'image/png')).status,400);assert.equal(uploads,before);
   const original=direct.data.media;await app.request(`/gallery/${original.id}`,{token:admin,method:'DELETE'});
   const preserved=(await app.db.query('SELECT * FROM gallery_media WHERE id=$1',[original.id])).rows[0];assert.equal(preserved.b2_key,original.b2_key);assert.equal(preserved.status,'rejected');
   assert.equal((await app.request('/gallery?media_type=video')).status,400);
  });
  await t.test('10 MB boundary and actual image content',async()=>{
   const {validateMediaFile,validateUploadedFile}=await import('../../src/shared/utils/validateMedia.js');
   await validateMediaFile({mimetype:'image/png',size:10*1024*1024});
   const png=await sharp({create:{width:2,height:2,channels:3,background:'blue'}}).png().toBuffer();
   const exact=Buffer.concat([png,Buffer.alloc(10*1024*1024-png.length)]);
   assert.equal((await upload(admin,exact,'image/png')).status,201);
   await assert.rejects(validateMediaFile({mimetype:'image/png',size:10*1024*1024+1}),/File too large/);
   await assert.rejects(validateUploadedFile({mimetype:'image/png',size:3,buffer:Buffer.from('bad')}),/Could not validate/);
  });
  await t.test('Only Administrator can create/edit/delete categories, deletion preserves images',async()=>{
   for(const token of [teacher,studentToken])for(const [method,path,body] of [['POST','/categories',{name:'Forbidden'}],['PUT',`/categories/${category.id}`,{name:'Forbidden'}],['DELETE',`/categories/${category.id}`,undefined]])assert.equal((await app.request(path,{token,method,body})).status,403);
   assert.equal((await app.request(`/categories/${category.id}`,{token:admin,method:'PUT',body:{name:'Renamed'}})).status,200);
   const count=(await app.db.query('SELECT COUNT(*)::int AS n FROM gallery_media')).rows[0].n;
   assert.equal((await app.request(`/categories/${category.id}`,{token:admin,method:'DELETE'})).status,200);
   assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM gallery_media')).rows[0].n,count);
   const logs=(await app.db.query('SELECT action,details FROM audit_logs')).rows;
   for(const action of ['gallery.upload','gallery.approve','gallery.reject','gallery.withdraw','category.create','category.update','category.delete','email.delivery_failure']) assert.ok(logs.some(l=>l.action===action),action);
   assert.ok(logs.some(l=>l.action==='gallery.upload'&&l.details.direct_upload===true&&l.details.status==='approved'));
   assert.ok(logs.some(l=>l.action==='gallery.upload'&&l.details.direct_upload===false&&l.details.status==='pending'));
  });
  await t.test('Every role changes password safely and old tokens are invalidated',async()=>{
   for(const token of [studentToken,teacher,admin]){
    assert.equal((await app.request('/auth/change-password',{token,method:'POST',body:{current_password:'wrong',new_password:'Replacement-password'}})).status,400);
    assert.equal((await app.request('/auth/change-password',{token,method:'POST',body:{current_password:'Initial-test-password',new_password:'Replacement-password'}})).status,200);
    assert.equal((await app.request('/auth/me',{token})).status,401);
   }
   const details=(await app.db.query("SELECT details FROM audit_logs WHERE action='auth.password_change'")).rows;assert.ok(!JSON.stringify(details).includes('password'));
  });
 }finally{globalThis.fetch=realFetch;await app.cleanup();}
});
