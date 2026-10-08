import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
const settings={emailMode:'live',brevoApiKey:'fake-key',emailSender:'sender@example.test',emailSenderName:'Nova Schola Hub',emailEnabledAt:'2026-10-07T15:50:00Z'};
let announcement, recipients, schemaMissing=false, calls=[], claimed=false, sends=0;
mock.module('../../src/shared/config/env.js',{defaultExport:settings});
mock.module('../../src/features/announcements/announcementModel.js',{namedExports:{findById:async()=>announcement,resolveRecipients:async()=>recipients}});
mock.module('../../src/shared/config/db.js',{namedExports:{query:async(sql)=>{
 calls.push(sql);
 if(sql.startsWith('SELECT DISTINCT target_type'))return {rows:[{target_type:'student'}]};
 if(sql.startsWith('SELECT delivery_details') && schemaMissing)throw Object.assign(new Error('must never log this secret'),{code:'42703'});
 if(sql.startsWith('INSERT')){const rowCount=claimed?0:1;claimed=true;return {rowCount};}
 return {rows:[],rowCount:1};
}}});
mock.module('../../src/shared/services/emailService.js',{namedExports:{sendAnnouncementEmail:async()=>{sends++;return {status:'accepted',accepted:1,failed:0};}}});
mock.module('../../src/features/audit/auditService.js',{namedExports:{logAction:async()=>{}}});
const {deliverPublication}=await import('../../src/features/announcements/announcementEmail.js');
const reset=()=>{
 announcement={id:1,type:'class',status:'published',email_eligible:true,created_at:'2026-10-07T15:50:01Z'};
 recipients=[{email:'student@my.nst.edu.ph'}];schemaMissing=false;calls=[];claimed=false;sends=0;
 Object.assign(settings,{emailMode:'live',brevoApiKey:'fake-key'});
};

test('configuration, cutoff, unpublished and empty recipients do not consume first claim',async()=>{
 for(const scenario of ['disabled','key','old','draft','empty','ineligible']){
  reset();
  if(scenario==='disabled')settings.emailMode='disabled';
  if(scenario==='key')settings.brevoApiKey='';
  if(scenario==='old')announcement.created_at='2026-10-07T15:49:59Z';
  if(scenario==='draft')announcement.status='draft';
  if(scenario==='empty')recipients=[];
  if(scenario==='ineligible')announcement.email_eligible=false;
  await deliverPublication(1);
  assert.equal(claimed,false,scenario);assert.equal(sends,0,scenario);
  assert.ok(!calls.some(sql=>sql.startsWith('INSERT')));
 }
});

test('missing migration 008 logs safe category and does not poison first send',async()=>{
 reset();schemaMissing=true;
 const errors=[];const spy=mock.method(console,'error',(...args)=>errors.push(args));
 try{
  await deliverPublication(1);assert.equal(claimed,false);assert.equal(sends,0);
  assert.equal(errors[0][1].stage,'delivery_schema_check');
  assert.equal(errors[0][1].safe_error_category,'database_column_missing_run_migrations');
  assert.ok(!JSON.stringify(errors).includes('must never log this secret'));
  schemaMissing=false;await deliverPublication(1);assert.equal(sends,1);
 }finally{spy.mock.restore();}
});

test('first claim sends once and a repeated publish cannot send again',async()=>{
 reset();await deliverPublication(1);assert.equal(sends,1);
 await deliverPublication(1);assert.equal(sends,1);
 const claimIndex=calls.findIndex(sql=>sql.startsWith('INSERT'));
 assert.ok(claimIndex>calls.findIndex(sql=>sql.startsWith('SELECT delivery_details')));
 assert.ok(calls.some(sql=>sql.includes('SET status=$2')));
});
