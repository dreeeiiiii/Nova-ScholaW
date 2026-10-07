// Safe localhost-only browser acceptance. Requires a current local Next build.
import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {createServer as createStorageServer} from 'node:http';
import sharp from 'sharp';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createRequire} from 'node:module';
import {application} from '../batch1/harness.js';
import {auditPageSet,assertPageAudit} from '../batch3/pageAudit.mjs';
const require=createRequire(new URL('../../../web/package.json',import.meta.url));
const {chromium,expect}=require('@playwright/test');
Object.assign(process.env,{EMAIL_MODE:'mock',ANNOUNCEMENT_SCHEDULER_ENABLED:'false'});
const stored=new Map();
const png=await sharp({create:{width:3,height:3,channels:3,background:'blue'}}).png().toBuffer();
stored.set('/fixture.png',{buffer:png,mime:'image/png'});
const storage=createStorageServer((req,res)=>{const image=stored.get(req.url);if(!image){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':image.mime});res.end(image.buffer);});
await new Promise(r=>storage.listen(0,'127.0.0.1',r));const storageOrigin=`http://127.0.0.1:${storage.address().port}`;
mock.module('../../src/shared/config/b2.js',{namedExports:{
 uploadBuffer:async(buffer,{contentType})=>{const key=`gallery/local-${stored.size}.png`;stored.set('/'+key,{buffer,mime:contentType});return {key};},
 getPresignedUrl:async key=>storageOrigin+'/'+key,
 deleteObject:async()=>assert.fail('Real or historical B2 deletion is forbidden'),
}});
const app=await application('batch2browser');let child,browser;
try{
 const departments=(await app.request('/auth/departments')).data.departments;const college=departments.find(d=>d.code==='college').id;
 const section=(await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('Browser Section','Year 1',$1) RETURNING id",[college])).rows[0].id;
 const admin=await app.seed('admin@nst.edu.ph','admin'),teacher=await app.seed('teacher@tr.nst.edu.ph','teacher',college),student=await app.seed('student@my.nst.edu.ph','student',college,section);
 await app.db.query("INSERT INTO announcements(author_id,type,title,content,status) VALUES($1,'general','Public General','General body','published')",[admin.id]);
 await app.db.query("INSERT INTO announcements(author_id,type,department_id,title,content,status) VALUES($1,'department',$2,'Private Department','Department body','published')",[admin.id,college]);
 const cls=(await app.db.query("INSERT INTO announcements(author_id,type,title,content,status) VALUES($1,'class','Private Class','Class body','published') RETURNING id",[teacher.id])).rows[0];
 await app.db.query("INSERT INTO announcement_targets(announcement_id,target_type,student_id) VALUES($1,'student',$2)",[cls.id,student.id]);
 await app.db.query("INSERT INTO gallery_media(uploader_id,media_type,file_url,original_filename,caption,status) VALUES($1,'image',$2,'fixture.png','Approved Event','approved')",[admin.id,storageOrigin+'/fixture.png']);
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));const origin=`http://127.0.0.1:${port}`;
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:new URL('../../../web/',import.meta.url),windowsHide:true,env:{...process.env,NODE_ENV:'production',API_URL:app.origin,NEXT_PUBLIC_API_URL:app.origin}});
 let output='';child.stdout.on('data',d=>{output+=d});child.stderr.on('data',d=>{output+=d});
 let ready=false;for(let i=0;i<120;i++){if(child.exitCode!==null)throw new Error(output);try{if((await fetch(origin+'/login')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();
 await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await auditPageSet(page,origin,'public',['/','/login','/register?role=student','/register?role=teacher','/gallery','/tv']);
 await page.goto(origin+'/');await expect(page.getByRole('heading',{name:'General Announcements',exact:true})).toBeVisible();await expect(page.getByText('Public General',{exact:true})).toBeVisible();
 await expect(page.getByText('Private Department',{exact:true})).toHaveCount(0);await expect(page.getByRole('img',{name:'Approved Event'})).toBeVisible();
 await page.getByRole('link',{name:'Create Teacher Account',exact:true}).click();await expect(page.getByLabel('Account type')).toHaveValue('teacher');
 await page.clock.install();
 await page.goto(origin+'/tv?animate=off');await expect(page.getByText('Public General',{exact:true})).toBeVisible();await expect(page.getByText('Private Class',{exact:true})).toHaveCount(0);
 await app.db.query("UPDATE announcements SET status='archived' WHERE title='Public General'");const refreshed=page.waitForResponse(r=>r.url().endsWith('/api/announcements/tv')&&r.status()===200);await page.clock.fastForward(31000);await refreshed;await expect(page.getByText('Public General',{exact:true})).toHaveCount(0);await page.clock.resume();
 const browserNow=await page.evaluate(()=>Date.now());
 await app.db.query("INSERT INTO announcements(author_id,type,title,content,status,expires_at) VALUES($1,'general','Expires Between Polls','Expiry body','published',$2)",[admin.id,new Date(browserNow+10000)]);
 await page.reload();await expect(page.getByText('Expires Between Polls',{exact:true})).toBeVisible();await page.clock.fastForward(11000);await expect(page.getByText('Expires Between Polls',{exact:true})).toHaveCount(0);
 console.log('PASS: public homepage, Teacher registration destination, TV isolation/refresh/local expiry');
 const signIn=async email=>{await context.clearCookies();const r=await context.request.post(origin+'/api/auth/login',{data:{email,password:'Initial-test-password'}});assert.equal(r.status(),200);};
 const category=(await app.db.query("INSERT INTO categories(name,created_by) VALUES('Browser Event Category',$1) RETURNING id",[admin.id])).rows[0];
 const uploadImage=async(email,title,direct=false)=>{
  await signIn(email);await page.goto(origin+'/gallery/upload');
  await page.getByLabel('Event name *',{exact:true}).fill(title);await page.getByLabel('Category *',{exact:true}).selectOption(String(category.id));
  await page.locator('input[type=file]').setInputFiles({name:'event.png',mimeType:'image/png',buffer:png});
  await page.getByRole('button',{name:direct?'Upload Image':'Submit for review',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Upload successful'})).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(direct?'public gallery':'pending Administrator review');
  const row=(await app.db.query('SELECT * FROM gallery_media WHERE caption=$1',[title])).rows[0];assert.ok(row);assert.equal(row.status,direct?'approved':'pending');return row;
 };
 const approved=await uploadImage(student.email,'Student Approved Image');
 const rejected=await uploadImage(teacher.email,'Teacher Rejected Image');
 await uploadImage(admin.email,'Administrator Direct Image',true);
 await page.goto(origin+'/admin/moderation');
 const approveCard=page.locator('li').filter({hasText:'Student Approved Image'});await approveCard.getByRole('button',{name:'Approve',exact:true}).click();await expect(approveCard).toHaveCount(0);
 const rejectCard=page.locator('li').filter({hasText:'Teacher Rejected Image'});await rejectCard.getByRole('button',{name:'Reject',exact:true}).click();
 await page.getByLabel('Rejection reason *',{exact:true}).fill('Test image rejected after local review');await page.getByRole('dialog').getByRole('button',{name:'Reject',exact:true}).click();await expect(rejectCard).toHaveCount(0);
 assert.equal((await app.request(`/gallery/${approved.id}`)).status,200);assert.equal((await app.request(`/gallery/${rejected.id}`)).status,404);
 await context.clearCookies();await page.goto(origin+'/gallery');await expect(page.getByText('Student Approved Image',{exact:true})).toBeVisible();await expect(page.getByText('Teacher Rejected Image',{exact:true})).toHaveCount(0);
 console.log('PASS: real browser image uploads, pending flow, approval, rejection, direct Admin upload and public gallery');
 for(const [email,role] of [[student.email,'student'],[teacher.email,'teacher'],[admin.email,'admin']]){
  await signIn(email);await page.goto(origin+'/dashboard');await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
  const common=['/dashboard','/announcements?type=general','/gallery','/gallery/upload','/gallery/mine','/account'];
  const routes=role==='admin'?[...common,'/admin/departments','/admin/events','/admin/moderation','/admin/categories','/admin/audit-logs',...departments.flatMap(d=>[`/admin/users?department_id=${d.id}&role=student`,`/admin/users?department_id=${d.id}&role=teacher`,`/announcements/create?type=department&department_id=${d.id}`])]:[...common,'/announcements?type=department','/announcements?type=class',...(role==='teacher'?['/announcements/create']:[])];
  await auditPageSet(page,origin,role,routes);
  if(process.argv.includes('--page-audit')){await signIn(email);await page.goto(origin+'/dashboard');}
  await page.getByTestId('logout').click();await expect(page).toHaveURL(/login/);
  assert.equal((await context.cookies()).filter(c=>c.name==='ns_token').length,0);
  await signIn(email);
  await page.goto(origin+'/admin/audit-logs');
  if(role==='admin'){
   await expect(page.getByRole('heading',{name:'Audit Logs',exact:true})).toBeVisible();
   await expect(page.getByRole('cell',{name:'gallery.upload',exact:true}).first()).toBeVisible();
   await page.getByLabel('Action',{exact:true}).selectOption('gallery.approve');
   await expect(page.locator('tbody tr').first()).toContainText('gallery.approve');
   await expect(page.locator('tbody')).not.toContainText('gallery.upload');
  }else{
   await expect(page).toHaveURL(/dashboard/);
   assert.equal(await page.evaluate(async()=> (await fetch('/api/audit-logs')).status),403);
  }
  if(role==='teacher'){await expect(page.getByRole('link',{name:'Create Class Announcement',exact:true})).toBeVisible();await page.goto(origin+'/announcements/create');await expect(page.getByRole('button',{name:'General',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Department',exact:true})).toHaveCount(0);await page.goto(origin+'/admin/categories');await expect(page).toHaveURL(/dashboard/);}
  if(role==='admin'){
   await page.goto(origin+'/admin/departments');for(const d of departments)await expect(page.getByRole('heading',{name:d.name,exact:true})).toBeVisible();
   const collegePanel=page.locator('section').filter({has:page.getByRole('heading',{name:'College',exact:true})});
   await collegePanel.getByLabel('Section name',{exact:true}).fill('Browser Created Section');await collegePanel.getByLabel('Grade / year level',{exact:true}).fill('Year 2');await collegePanel.getByRole('button',{name:'Create Section',exact:true}).click();await expect(collegePanel).toContainText('Browser Created Section');
   await collegePanel.getByRole('link',{name:'Teachers',exact:true}).click();await expect(page.getByText(teacher.email,{exact:true})).toBeVisible();await expect(page.getByText(student.email,{exact:true})).toHaveCount(0);
   await page.goto(origin+'/admin/departments');
   await collegePanel.getByRole('link',{name:'Students',exact:true}).click();await expect(page.getByText(student.email,{exact:true})).toBeVisible();await expect(page.getByText(teacher.email,{exact:true})).toHaveCount(0);
   await page.goto(origin+'/admin/departments');
   await page.getByRole('link',{name:'Create Department Announcement',exact:true}).first().click();await expect(page.locator('select').first()).toHaveValue(String(college));
   await page.goto(origin+'/admin/events');await expect(page.getByRole('heading',{name:'Event Management',exact:true})).toBeVisible();
  }
  await page.goto(origin+'/gallery/upload');await expect(page.getByRole('heading',{name:'Upload Event Image',exact:true})).toBeVisible();assert.equal(await page.locator('input[type=file]').getAttribute('accept'),'image/jpeg,image/png,image/webp');await expect(page.locator('video')).toHaveCount(0);
  await page.goto(origin+'/account');await page.getByLabel('Current password',{exact:true}).fill('wrong');await page.getByLabel('New password',{exact:true}).fill('Replacement-password');await page.getByLabel('Confirm new password',{exact:true}).fill('Replacement-password');await page.getByRole('button',{name:'Change Password',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Current password is incorrect'})).toContainText('incorrect');
  await page.getByLabel('Current password',{exact:true}).fill('Initial-test-password');await page.getByRole('button',{name:'Change Password',exact:true}).click();await expect(page.getByRole('status')).toContainText('Password changed');assert.equal((await context.cookies()).filter(c=>c.name==='ns_token').length,0);console.log(`PASS: ${role} Dashboard, image controls, Account and password/session invalidation`);
 }
 assertPageAudit();assert.deepEqual(errors,[]);console.log('Batch 2 browser acceptance passed. No external network permitted.');
}finally{if(browser)await browser.close();if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}await app.cleanup();await new Promise(r=>storage.close(r));}
