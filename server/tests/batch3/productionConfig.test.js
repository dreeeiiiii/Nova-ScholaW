import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('production configuration needs no obsolete upload/domain variables',()=>{
 const env={...process.env,NODE_ENV:'production',DATABASE_URL:'postgresql://fake@localhost/test',JWT_SECRET:'fake-configuration-test-secret',CLIENT_ORIGIN:'https://frontend.example.test',DOTENV_CONFIG_PATH:'no-such-production-config.env'};
 for(const key of ['NST_STUDENT_EMAIL_DOMAIN','NST_TEACHER_EMAIL_DOMAIN','NST_ADMIN_EMAIL_DOMAIN'])delete env[key];
 delete env.UPLOAD_DIR;delete env.NST_EMAIL_DOMAIN;delete env.MAX_IMAGE_SIZE_MB;
 const r=spawnSync(process.execPath,['--input-type=module','-e',"import config from './src/shared/config/env.js'; console.log(JSON.stringify({student:config.studentEmailDomain,teacher:config.teacherEmailDomain,admin:config.adminEmailDomain,emailMode:config.emailMode}));"],{cwd:new URL('../../',import.meta.url),env,encoding:'utf8',windowsHide:true});
 assert.equal(r.status,0,r.stderr);
 assert.deepEqual(JSON.parse(r.stdout.trim()),{student:'my.nst.edu.ph',teacher:'tr.nst.edu.ph',admin:'nst.edu.ph',emailMode:'mock'});
});

test('live config requires key/sender/name/UTC cutoff but not a test recipient',()=>{
 const env={...process.env,NODE_ENV:'production',EMAIL_MODE:'live',DATABASE_URL:'postgresql://fake@localhost/test',JWT_SECRET:'fake-secret',CLIENT_ORIGIN:'https://frontend.example.test',BREVO_API_KEY:'fake-api-secret',EMAIL_SENDER_ADDRESS:'controlled@gmail.com',EMAIL_SENDER_NAME:'Nova Schola Hub',EMAIL_ENABLED_AT:'2026-10-07T00:00:00Z',DOTENV_CONFIG_PATH:'no-such.env'};
 delete env.EMAIL_TEST_RECIPIENT;
 const run=e=>spawnSync(process.execPath,['--input-type=module','-e',"import './src/shared/config/env.js';"],{cwd:new URL('../../',import.meta.url),env:e,encoding:'utf8',windowsHide:true});
 assert.equal(run(env).status,0);
 for(const key of ['BREVO_API_KEY','EMAIL_SENDER_ADDRESS','EMAIL_SENDER_NAME','EMAIL_ENABLED_AT']){
  const invalid={...env};delete invalid[key];const r=run(invalid);assert.notEqual(r.status,0);assert.ok(r.stderr.includes(key));assert.ok(!r.stderr.includes('fake-api-secret'));
 }
 for(const value of ['invalid','2026-10-07','2026-10-07T08:00:00+08:00','2026-02-30T00:00:00Z'])assert.notEqual(run({...env,EMAIL_ENABLED_AT:value}).status,0);
 assert.notEqual(run({...env,EMAIL_MODE:'test'}).status,0);
 const defaultEnv={...env};delete defaultEnv.EMAIL_MODE;
 const r=spawnSync(process.execPath,['--input-type=module','-e',"import c from './src/shared/config/env.js'; console.log(c.emailMode);"],{cwd:new URL('../../',import.meta.url),env:defaultEnv,encoding:'utf8',windowsHide:true});
 assert.equal(r.stdout.trim(),'disabled');
});
