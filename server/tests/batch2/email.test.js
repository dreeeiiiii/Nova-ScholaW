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
