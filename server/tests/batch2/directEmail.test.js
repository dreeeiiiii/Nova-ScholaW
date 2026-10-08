import test from 'node:test';
import assert from 'node:assert/strict';
import { testBrevoEmail } from '../../scripts/test-brevo-email.js';
import { readEmailConfig } from '../../src/shared/config/emailConfig.js';
const settings = { emailMode:'live', brevoApiKey:'fake-key-never-log', emailSender:'sender@example.test', emailSenderName:'Nova Schola Hub', emailEnabledAt:'2026-10-07T15:50:00Z' };

test('direct script uses shared service, exact request and no database/storage settings', async () => {
 const output=[], calls=[];
 const result = await testBrevoEmail('student@my.nst.edu.ph', { settings, print: v=>output.push(v), transport: async (url,init)=>{
  calls.push({url,init}); return {ok:true,status:201,json:async()=>({messageId:'<direct-test>'})};
 }});
 assert.equal(result.status,'accepted'); assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.brevo.com/v3/smtp/email');
 assert.equal(calls[0].init.method,'POST');
 assert.equal(calls[0].init.headers['api-key'],settings.brevoApiKey);
 assert.equal(calls[0].init.headers['Content-Type'],'application/json');
 const body=JSON.parse(calls[0].init.body);
 assert.deepEqual(body.sender,{email:settings.emailSender,name:settings.emailSenderName});
 assert.deepEqual(body.to,[{email:'student@my.nst.edu.ph'}]);
 assert.equal(body.subject,'Nova Schola Hub Direct Email Test');
 assert.equal(body.textContent,'This is a direct transactional email test from Nova Schola Hub.');
 assert.ok(body.htmlContent.includes(body.textContent)); assert.equal(body.templateId,undefined);
 assert.deepEqual(output.at(-1),{http_status:201,messageId:'<direct-test>'});
 assert.ok(!JSON.stringify(output).includes(settings.brevoApiKey));
});

test('direct script prints sanitized 400/401/403/429/network errors', async () => {
 for (const status of [400,401,403,429,null]) {
  const output=[];
  const result=await testBrevoEmail('student@my.nst.edu.ph',{settings,print:v=>output.push(v),transport:async()=>{
   if(status===null)throw Error(settings.brevoApiKey);
   return {ok:false,status,json:async()=>({message:settings.brevoApiKey})};
  }});
  assert.equal(result.status,'failed'); assert.equal(output.at(-1).http_status,status);
  assert.ok(output.at(-1).sanitized_error); assert.ok(!JSON.stringify(output).includes(settings.brevoApiKey));
 }
});

test('email environment trims values and parses UTC milliseconds with scheduler absent', () => {
 const result=readEmailConfig({ NODE_ENV:'production', EMAIL_MODE:' live ', BREVO_API_KEY:' fake ', EMAIL_SENDER_ADDRESS:' sender@example.test ', EMAIL_SENDER_NAME:' Nova Schola Hub ', EMAIL_ENABLED_AT:' 2026-10-07T15:50:00.123Z ' });
 assert.equal(result.emailMode,'live'); assert.equal(result.emailEnabledAt,'2026-10-07T15:50:00.123Z');
 assert.equal(result.emailSender,'sender@example.test'); assert.equal(result.brevoApiKey,'fake');
});

test('direct connectivity test works with only key and sender configuration',async()=>{
 const result=await testBrevoEmail('student@my.nst.edu.ph',{settings:{...settings,emailEnabledAt:''},print:()=>{},transport:async()=>({ok:true,status:201,json:async()=>({messageId:'<only-email-settings>'})})});
 assert.equal(result.status,'accepted');
});

test('CLI entrypoint succeeds against mocked Brevo with no database or B2 environment',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {pathToFileURL}=await import('node:url');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const temp=await mkdtemp(join(tmpdir(),'nova-brevo-test-'));
 try{
  const preload=join(temp,'mock-provider.mjs');
  await writeFile(preload,`import assert from 'node:assert/strict';globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');const body=JSON.parse(init.body);assert.equal(body.to.length,1);assert.equal(body.subject,'Nova Schola Hub Direct Email Test');return {ok:true,status:201,json:async()=>({messageId:'<cli-mocked>'})};};`);
  const env={...process.env,EMAIL_MODE:'live',BREVO_API_KEY:'fake-cli-key',EMAIL_SENDER_ADDRESS:'sender@example.test',EMAIL_SENDER_NAME:'Nova Schola Hub',DOTENV_CONFIG_PATH:'no-such.env'};
  for(const key of Object.keys(env))if(key.startsWith('B2_')||key.startsWith('DATABASE_URL')||key==='EMAIL_ENABLED_AT')delete env[key];
  const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,'scripts/test-brevo-email.js','student@my.nst.edu.ph'],{cwd:new URL('../../',import.meta.url),env,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(result.status,0,result.stderr);assert.ok(result.stdout.includes('http_status: 201'));assert.ok(result.stdout.includes('<cli-mocked>'));assert.ok(result.stdout.includes('api_key_configured: true'));assert.ok(!result.stdout.includes('fake-cli-key'));
 }finally{await rm(temp,{recursive:true,force:true});}
});
