// Local-only browser smoke test. Requires an existing local production build.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { application } from './harness.js';
const require=createRequire(new URL('../../../web/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const app=await application('browser');
let child,browser,page,childOutput='';
try{
  const college=(await app.request('/auth/departments')).data.departments.find(d=>d.code==='college').id;
  const section=(await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('Browser C-1','1st Year',$1) RETURNING id",[college])).rows[0].id;
  await app.seed('admin@nst.edu.ph','admin');
  await app.seed('teacher@tr.nst.edu.ph','teacher',college);
  await app.seed('student@my.nst.edu.ph','student',college,section);
  const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const origin='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
    cwd:new URL('../../../web/',import.meta.url),windowsHide:true,
    env:{...process.env,NODE_ENV:'production',API_URL:app.origin,NEXT_PUBLIC_API_URL:app.origin}
  });
  child.stdout.on('data',d=>{childOutput+=d.toString();});child.stderr.on('data',d=>{childOutput+=d.toString();});
  const deadline=Date.now()+60000;let ready=false;
  while(Date.now()<deadline){
    if(child.exitCode!==null)throw new Error('Local Next server failed: '+childOutput);
    try{if((await fetch(origin+'/login')).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(ready,'Local Next server did not start.');
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext();
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/register');
  await page.getByLabel('Department',{exact:true}).selectOption(String(college));
  await page.getByLabel('Section',{exact:true}).selectOption(String(section));
  await page.getByLabel('Full name',{exact:true}).fill('Browser Student');
  await page.getByLabel('Email',{exact:true}).fill('browserstudent@my.nst.edu.ph');
  await page.getByLabel('Password',{exact:true}).fill('Browser-test-password');
  await page.getByLabel('Confirm password',{exact:true}).fill('Browser-test-password');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Account created'}).waitFor();
  await page.goto(origin+'/register');
  await page.getByLabel('Account type').selectOption('teacher');
  await page.getByLabel('Department',{exact:true}).selectOption(String(college));
  assert.equal(await page.getByLabel('Section',{exact:true}).count(),0);
  await page.getByLabel('Full name',{exact:true}).fill('Browser Teacher');
  await page.getByLabel('Email',{exact:true}).fill('browserteacher@tr.nst.edu.ph');
  await page.getByLabel('Password',{exact:true}).fill('Browser-test-password');
  await page.getByLabel('Confirm password',{exact:true}).fill('Browser-test-password');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Account created'}).waitFor();
  const signIn=async email=>{
    await context.clearCookies();
    const response=await context.request.post(origin+'/api/auth/login',{data:{email,password:'Initial-test-password'}});
    assert.equal(response.status(),200);assert.equal((await response.json()).token,undefined);
  };
  await signIn('admin@nst.edu.ph');await page.goto(origin+'/announcements/create');
  assert.equal(await page.getByRole('button',{name:'Class',exact:true}).count(),0);
  assert.equal(await page.getByText('Target Audience',{exact:true}).count(),0);
  assert.equal(await page.getByRole('checkbox').count(),0);
  await page.getByLabel('Title *',{exact:true}).fill('Browser general announcement');
  await page.getByLabel('Content *',{exact:true}).fill('School-wide browser test');
  await page.getByRole('button',{name:'Publish',exact:true}).click();
  await page.waitForURL(origin+'/announcements');
  const tv=await context.request.get(origin+'/api/announcements/tv');
  assert.equal(tv.status(),200);assert.ok((await tv.json()).announcements.some(a=>a.title==='Browser general announcement'));
  await page.goto(origin+'/announcements/create');
  await page.getByRole('button',{name:'Department',exact:true}).click();
  await page.getByLabel('Title *',{exact:true}).fill('Browser department announcement');
  await page.getByLabel('Content *',{exact:true}).fill('College-only browser test');
  await page.getByLabel('Department *',{exact:true}).selectOption(String(college));
  await page.getByRole('button',{name:'Publish',exact:true}).click();
  await page.waitForURL(origin+'/announcements');
  await page.getByText('Browser department announcement',{exact:true}).waitFor();
  await signIn('teacher@tr.nst.edu.ph');await page.goto(origin+'/announcements/create');
  assert.equal(await page.getByRole('button',{name:'General',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Department',exact:true}).count(),0);
  await page.getByRole('button',{name:'Class',exact:true}).waitFor();
  await page.getByLabel('Title *',{exact:true}).fill('Browser class announcement');
  await page.getByLabel('Content *',{exact:true}).fill('Selected section browser test');
  await page.locator('label').filter({hasText:'Browser C-1'}).getByRole('checkbox').check();
  await page.getByRole('button',{name:'Publish class announcement',exact:true}).click();
  await page.waitForURL(origin+'/announcements');
  await page.goto(origin+'/dashboard');
  await page.getByText('Browser general announcement',{exact:true}).waitFor();
  await page.getByText('DEPARTMENT',{exact:true}).waitFor();
  await signIn('student@my.nst.edu.ph');await page.goto(origin+'/announcements');
  await page.getByText('Browser department announcement',{exact:true}).waitFor();
  await page.getByText('Browser class announcement',{exact:true}).waitFor();
  await page.getByText('Browser general announcement',{exact:true}).waitFor();
  await page.goto(origin+'/dashboard');
  await page.getByText('Browser general announcement',{exact:true}).waitFor();
  await page.getByText('DEPARTMENT',{exact:true}).waitFor();
  await page.goto(origin+'/announcements');
  assert.equal(await page.getByRole('link',{name:'Create announcement',exact:true}).count(),0);
  assert.equal(await page.getByRole('link',{name:'Edit',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: Student/Teacher registration, login proxy, Admin General/Department publishing, TV proxy, Teacher Class publishing, and Student dashboard visibility.');
}catch(e){
  if(page) console.error("Browser diagnostics:",JSON.stringify({url:page.url(),labels:await page.locator("label").allTextContents(),body:(await page.locator("body").innerText()).slice(0,1800)}));
  throw e;
}finally{
  if(browser)await browser.close();
  if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
  await app.cleanup();
}
