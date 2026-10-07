import test from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',B2_BUCKET_NAME:'fake',B2_BUCKET_ID:'fake',B2_ENDPOINT:'localhost',B2_REGION:'fake',B2_KEY_ID:'fake',B2_APPLICATION_KEY:'fake',EMAIL_MODE:'mock'});
const {sendAnnouncementEmail}=await import('../../src/shared/services/emailService.js');
const announcement={id:1,title:'Hello',content:'Public content',created_at:'2026-10-06T10:00:00Z'};
const recipients=[{email:'one@my.nst.edu.ph'},{email:'ONE@my.nst.edu.ph'},{email:'two@my.nst.edu.ph'}];
const settings={emailMode:'test',isProduction:false,brevoApiKey:'secret-never-log',emailSender:'sender@example.test',emailSenderName:'Test',emailEnabledAt:'2026-10-06T09:00:00Z',emailTestRecipient:'safe@example.test'};

test('invalid sender address/name and blank key block transport',async()=>{
 for(const extra of [{emailSender:'invalid'},{emailSender:'name@example.test\nBcc: private@example.test'},{emailSenderName:' '},{brevoApiKey:' '}]){
  const result=await sendAnnouncementEmail(announcement,recipients,{settings:{...settings,...extra},transport:()=>assert.fail('Invalid configuration must not send')});
  assert.equal(result.status,'configuration_blocked');
 }
});
test('mock deduplicates normalized addresses without any network request',async()=>{
 const result=await sendAnnouncementEmail(announcement,recipients,{settings:{...settings,emailMode:'mock'},transport:()=>{throw new Error('Network must not be called');}});
 assert.deepEqual(result,{status:'mock',accepted:2,failed:0});
});
test('test override never exposes intended recipients to provider',async()=>{
 const calls=[];const result=await sendAnnouncementEmail(announcement,recipients,{settings,transport:async(url,init)=>{calls.push({url,init});return {ok:true};}});
 assert.equal(result.status,'accepted');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.brevo.com/v3/smtp/email');
 assert.deepEqual(JSON.parse(calls[0].init.body).to,[{email:'safe@example.test'}]);assert.equal(calls[0].init.headers['api-key'],'secret-never-log');
});
test('HTTP errors, timeout/network exceptions remain redacted and do not throw',async()=>{
 for(const transport of [async()=>({ok:false}),async()=>{throw new Error('secret-never-log password payload');}]){
 const result=await sendAnnouncementEmail(announcement,recipients,{settings,transport});assert.equal(result.status,'failed');assert.equal(result.failed,1);assert.ok(!JSON.stringify(result).includes('secret-never-log'));
 }
});
test('historical cutoff, unsafe live mode and missing override block network',async()=>{
 for(const config of [{...settings,emailEnabledAt:'2026-10-07T00:00:00Z'},{...settings,emailMode:'live'},{...settings,emailTestRecipient:''},{...settings,emailEnabledAt:''}]){
 const result=await sendAnnouncementEmail(announcement,recipients,{settings:config,transport:()=>assert.fail('Unsafe request')});assert.equal(result.status,'configuration_blocked');
 }
});
test('live messages keep addresses private and report partial failure',async()=>{
 const calls=[];const result=await sendAnnouncementEmail(announcement,recipients,{settings:{...settings,emailMode:'live',isProduction:true},transport:async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:calls.length===1};}});
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.to.length===1));assert.deepEqual(result,{status:'partial_failure',accepted:1,failed:1});
});

test('disabled mode never calls Brevo', async () => {
 assert.deepEqual(await sendAnnouncementEmail(announcement, recipients, { settings: {...settings,emailMode:'disabled'}, transport:()=>assert.fail('disabled network') }), {status:'skipped',accepted:0,failed:0});
});
test('personal env sender, HTML/text and subject are independent of authenticated author', async () => {
 const details=[], calls=[];
 const result=await sendAnnouncementEmail({...announcement,author_email:'admin@nst.edu.ph',title:'Title <safe>',content:'Hello <script>\nNext & line'},recipients,{settings:{...settings,emailMode:'live',isProduction:true,emailSender:'controlled@gmail.com',emailSenderName:'Nova Schola Hub',emailTestRecipient:''},onDelivery:async d=>details.push({...d}),transport:async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:true,status:201,json:async()=>({messageId:'<fake-id>'})};}});
 assert.equal(result.accepted,2);assert.deepEqual(calls.map(c=>c.to[0].email),['one@my.nst.edu.ph','two@my.nst.edu.ph']);
 assert.deepEqual(calls[0].sender,{email:'controlled@gmail.com',name:'Nova Schola Hub'});assert.equal(calls[0].subject,'Title <safe>');assert.equal(calls[0].textContent,'Hello <script>\nNext & line');assert.ok(calls[0].htmlContent.includes('Hello &lt;script&gt;<br>Next &amp; line'));
 assert.equal(details.length,4);assert.equal(details[0].status,'processing');assert.equal(details[1].message_id,'<fake-id>');assert.equal(details[1].recipient_email,'one@my.nst.edu.ph');assert.ok(details[1].completed_at);
});
test('zero/null/invalid recipients do not call transport',async()=>{
 const r=await sendAnnouncementEmail(announcement,[{email:null},{email:''},{email:'invalid'}],{settings,transport:()=>assert.fail('empty network')});
 assert.deepEqual(r,{status:'no_recipients',accepted:0,failed:0});
});
test('cutoff boundary allows new announcements, rejects old/invalid created dates',async()=>{
 for(const created_at of ['2026-10-06T08:59:59Z','invalid'])assert.equal((await sendAnnouncementEmail({...announcement,created_at},recipients,{settings,transport:()=>assert.fail('old network')})).status,'configuration_blocked');
 assert.equal((await sendAnnouncementEmail({...announcement,created_at:settings.emailEnabledAt},recipients,{settings,transport:async()=>({ok:true})})).status,'accepted');
});
test('401/403/400/429/5xx and uncertain network attempts persist safe useful errors without retry',async()=>{
 for(const [status,error] of [[401,'authentication_rejected'],[403,'sender_or_permission_rejected'],[400,'provider_request_rejected'],[429,'rate_limited'],[500,'provider_unavailable'],[503,'provider_unavailable']]){
  let calls=0;const details=[];const r=await sendAnnouncementEmail(announcement,recipients,{settings,onDelivery:async d=>details.push({...d}),transport:async()=>{calls++;return {ok:false,status,json:async()=>({message:'secret-never-log password'})};}});
  assert.equal(calls,1);assert.equal(r.status,'failed');assert.equal(details[1].error,error);assert.equal(details[1].http_status,status);assert.ok(!JSON.stringify(details).includes('secret-never-log'));
 }
 const details=[];await sendAnnouncementEmail(announcement,recipients,{settings,onDelivery:async d=>details.push({...d}),transport:async()=>{throw new Error('secret-never-log');}});
 assert.equal(details[1].status,'uncertain');assert.equal(details[1].error,'network_or_timeout');
 const senderDetails=[];await sendAnnouncementEmail(announcement,recipients,{settings,onDelivery:async d=>senderDetails.push({...d}),transport:async()=>({ok:false,status:400,json:async()=>({message:'Sender is not verified secret-never-log'})})});
 assert.equal(senderDetails[1].error,'sender_rejected_or_unverified');assert.ok(!JSON.stringify(senderDetails).includes('secret-never-log'));
});
test('ledger write failure prevents an unrecorded send',async()=>{
 await assert.rejects(sendAnnouncementEmail(announcement,recipients,{settings,onDelivery:async()=>{throw new Error('ledger unavailable');},transport:()=>assert.fail('unrecorded network')}),/ledger unavailable/);
});
