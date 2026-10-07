import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { records, seedDisplayAnnouncements } from '../scripts/seed-display-announcements.js';

test('display importer rolls back when the Admin or ledger safety invariant fails', async () => {
  for (const scenario of ['no-admin','delivery']) {
    const calls=[];
    const client={query:async(sql)=>{
      calls.push(sql);
      if(sql.startsWith('SELECT id FROM users'))return {rows:scenario==='no-admin'?[]:[{id:1}]};
      if(sql.startsWith('INSERT'))return {rows:[{id:1}]};
      if(sql.startsWith('SELECT id, email_eligible'))return {rows:records.map((r,i)=>({id:i+1,email_eligible:false,type:'general',department_id:null}))};
      if(sql.startsWith('SELECT COUNT'))return {rows:[{total:1}]};
      return {rows:[]};
    }};
    await assert.rejects(seedDisplayAnnouncements(client),scenario==='no-admin'?/active Admin/:/delivery rows/);
    assert.equal(calls.at(-1),'ROLLBACK');assert.ok(!calls.includes('COMMIT'));
    assert.ok(!calls.some(sql=>/INSERT INTO announcement_email_deliveries/.test(sql)));
  }
});
test('display data has stable unique keys, sourced images and explicit historical/demo context',async()=>{
  assert.equal(new Set(records.map(r=>r.key)).size,13);
  assert.equal(records.filter(r=>r.status==='published').length,10);
  for(const record of records){
    assert.equal(new URL(record.source_url).hostname,'nst.edu.ph');
    assert.ok(record.content.startsWith('Demo display'));
    assert.ok(record.image_url.startsWith('/nst/'));
    await readFile(new URL('../../web/public'+record.image_url,import.meta.url));
  }
});
