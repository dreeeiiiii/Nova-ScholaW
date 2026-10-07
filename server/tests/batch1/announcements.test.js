import test from 'node:test';
import assert from 'node:assert/strict';
import { application } from './harness.js';

test('paper-aligned announcement lifecycle and recipient isolation',async t=>{
  const app=await application('announcements'); t.after(app.cleanup);
  const departments=(await app.request('/auth/departments')).data.departments;
  const college=departments.find(d=>d.code==='college').id,shs=departments.find(d=>d.code==='shs').id;
  const section=(await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('C-1','1st Year',$1) RETURNING id",[college])).rows[0].id;
  const otherSection=(await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('SHS-1','Grade 11',$1) RETURNING id",[shs])).rows[0].id;
  const course=(await app.db.query("INSERT INTO courses(name,code,department_id) VALUES('Class C','C1',$1) RETURNING id",[college])).rows[0].id;
  const admin=await app.seed('admin@nst.edu.ph','admin');
  const teacher=await app.seed('teacher@tr.nst.edu.ph','teacher',college);
  const otherTeacher=await app.seed('other@tr.nst.edu.ph','teacher',shs);
  const student=await app.seed('student@my.nst.edu.ph','student',college,section);
  const other=await app.seed('other@my.nst.edu.ph','student',shs,otherSection);
  const legacy=await app.seed('legacy@my.nst.edu.ph','student');
  await app.seed('inactive@my.nst.edu.ph','student',college,section,false);
  await app.db.query('UPDATE users SET course_id=$1 WHERE id=$2',[course,student.id]);
  const a=await app.login(admin.email),tr=await app.login(teacher.email),tr2=await app.login(otherTeacher.email),
    s=await app.login(student.email),s2=await app.login(other.email),unassigned=await app.login(legacy.email);
  const create=(type,token,body={})=>app.request('/announcements/'+type,{token,method:'POST',body:{title:type+' announcement',content:'Test content',...body}});
  let general,department,klass;
  await t.test('creation permissions and exact department requirement',async()=>{
    assert.equal((await create('general',tr)).status,403);
    assert.equal((await create('department',tr,{department_id:college})).status,403);
    assert.equal((await create('class',a,{student_ids:[student.id]})).status,403);
    assert.equal((await create('general',s)).status,403);
    assert.equal((await create('department',a)).status,400);
    assert.equal((await create('department',a,{department_id:9999})).status,400);
    assert.equal((await create('general',a,{student_ids:[student.id]})).status,400);
    assert.equal((await create('class',tr,{student_ids:[teacher.id]})).status,400);
    assert.equal((await create('class',tr,{student_ids:['bad']})).status,400);
    assert.equal((await create('class',tr)).status,400);
    general=await create('general',a,{show_on_tv:false}); assert.equal(general.status,201);
    assert.equal(general.data.announcement.show_on_tv,true);
    department=await create('department',a,{department_id:college}); assert.equal(department.status,201);
    klass=await create('class',tr,{student_ids:[student.id,student.id],section_ids:[section],course_ids:[course]}); assert.equal(klass.status,201);
    assert.equal(klass.data.targets.length,3);
  });
  await t.test('same visibility rules apply to lists, counts, filters, and detail URLs',async()=>{
    const id=department.data.announcement.id,cid=klass.data.announcement.id;
    for(const token of [s,tr])assert.equal((await app.request('/announcements/'+id,{token})).status,200);
    for(const token of [s2,tr2,unassigned])assert.equal((await app.request('/announcements/'+id,{token})).status,404);
    assert.equal((await app.request('/announcements/'+cid,{token:s})).status,200);
    assert.deepEqual((await app.request('/announcements/'+cid,{token:s})).data.targets,[]);
    for(const token of [s2,tr2,unassigned,a])assert.equal((await app.request('/announcements/'+cid,{token})).status,404);
    const list=await app.request('/announcements?limit=1',{token:s});assert.equal(list.data.announcements.length,1);assert.equal(list.data.total,3);
    const filtered=await app.request('/announcements?type=department',{token:s});assert.equal(filtered.data.total,1);assert.equal(filtered.data.announcements[0].type,'department');
    assert.equal((await app.request('/announcements?type=class',{token:s2})).data.total,0);
    assert.equal((await app.request('/announcements?status=draft',{token:s})).data.total,0);
    assert.equal((await app.request('/announcements?type=general',{token:unassigned})).data.total,1);
  });
  await t.test('public/TV feeds contain only published General announcements',async()=>{
    const draft=await create('general',a,{status:'draft'});
    const scheduled=await create('general',a,{publish_at:new Date(Date.now()+3600000).toISOString()});
    for(const path of ['/announcements/public','/announcements/tv']){
      const response=await app.request(path);assert.equal(response.status,200);
      assert.deepEqual(response.data.announcements.map(r=>r.id),[general.data.announcement.id]);
      assert.equal(response.data.announcements[0].author_id,undefined);
    }
    for(const id of [draft.data.announcement.id,scheduled.data.announcement.id]){
      assert.equal((await app.request('/announcements/'+id,{token:s})).status,404);
      assert.equal((await app.request('/announcements/'+id,{token:tr})).status,404);
    }
    assert.equal((await app.request('/announcements?upcoming=true',{token:s})).data.total,0);
    assert.equal((await create('general',a,{publish_at:'not-a-date'})).status,400);
    assert.equal((await create('general',a,{expires_at:new Date(Date.now()-1000).toISOString()})).status,400);
  });
  await t.test('ownership, partial target updates, and history preservation',async()=>{
    const id=klass.data.announcement.id;
    assert.equal((await app.request('/announcements/'+id,{token:tr2,method:'PUT',body:{title:'blocked'}})).status,403);
    assert.equal((await app.request('/announcements/'+id,{token:a,method:'PUT',body:{title:'blocked'}})).status,403);
    const edited=await app.request('/announcements/'+id,{token:tr,method:'PUT',body:{student_ids:[other.id]}});
    assert.equal(edited.status,200);assert.equal(edited.data.targets.length,3);
    assert.equal((await app.request('/announcements/'+id,{token:s2})).status,200);
    const historical=(await app.db.query("INSERT INTO announcements(author_id,type,title,content,status,show_on_tv) VALUES($1,'general','Historical','Preserve author','published',false) RETURNING id",[teacher.id])).rows[0];
    assert.equal((await app.request('/announcements/'+historical.id,{token:tr,method:'PUT',body:{title:'blocked'}})).status,403);
    assert.ok((await app.request('/announcements/tv')).data.announcements.some(r=>r.id===historical.id));
    assert.equal((await app.request('/announcements/'+id,{token:tr,method:'DELETE'})).status,200);
    assert.equal((await app.request('/announcements/'+id,{token:s})).status,404);
    assert.equal((await app.db.query('SELECT status FROM announcements WHERE id=$1',[id])).rows[0].status,'archived');
    assert.equal((await app.db.query('SELECT COUNT(*)::int AS n FROM announcement_targets WHERE announcement_id=$1',[id])).rows[0].n,3);
  });
  await t.test('recipient resolver follows paper and deduplicates active official addresses',async()=>{
    const {resolveRecipients}=await import('../../src/features/announcements/announcementModel.js');
    const emails=async id=>(await resolveRecipients(id)).map(u=>u.email).sort();
    assert.deepEqual(await emails(general.data.announcement.id),[student.email,other.email,legacy.email].sort());
    assert.deepEqual(await emails(department.data.announcement.id),[student.email,teacher.email].sort());
    const fresh=await create('class',tr,{student_ids:[student.id],section_ids:[section],course_ids:[course]});
    assert.deepEqual(await emails(fresh.data.announcement.id),[student.email]);
  });
  await t.test('scheduled publication becomes visible only when due',async()=>{
    const due=(await app.db.query("INSERT INTO announcements(author_id,type,title,content,status,publish_at) VALUES($1,'general','Due','Scheduled content','scheduled',NOW()-INTERVAL '1 minute') RETURNING id",[admin.id])).rows[0];
    assert.equal((await app.request('/announcements/'+due.id,{token:s})).status,404);
    const legacySchedule=(await app.db.query("INSERT INTO announcements(author_id,type,title,content,status,publish_at) VALUES($1,'general','Legacy scheduled','Await review','scheduled',NOW()-INTERVAL '1 minute') RETURNING id",[teacher.id])).rows[0];
    const {publishScheduled}=await import('../../src/features/announcements/announcementScheduler.js');
    assert.equal((await publishScheduled()).length,1);
    assert.equal((await publishScheduled()).length,0);
    assert.equal((await app.request('/announcements/'+due.id,{token:s})).status,200);
    assert.equal((await app.db.query('SELECT status FROM announcements WHERE id=$1',[legacySchedule.id])).rows[0].status,'scheduled');
    assert.equal((await app.request('/announcements/'+legacySchedule.id,{token:a,method:'PUT',body:{publish_at:new Date(Date.now()+3600000).toISOString()}})).status,400);
    assert.equal((await app.request('/announcements/'+legacySchedule.id,{token:a,method:'PUT',body:{publish_at:null,status:'published'}})).status,200);
    assert.equal((await app.db.query('SELECT author_id FROM announcements WHERE id=$1',[legacySchedule.id])).rows[0].author_id,teacher.id);
  });
});
