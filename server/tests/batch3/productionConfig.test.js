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
