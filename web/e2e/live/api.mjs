// Real application + throwaway local database. Only external storage is stubbed.
import { mock } from 'node:test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { application } from '../../../server/tests/batch1/harness.js';
mock.module(new URL('../../../server/src/shared/config/b2.js',import.meta.url).href,{namedExports:{
  uploadBuffer:async()=>({key:'ui-test/school-image.jpg'}),
  getPresignedUrl:async()=> 'http://127.0.0.1:5056/fixture.jpg',
  deleteObject:async()=>{throw new Error('UI tests must preserve stored history');},
}});
const app=await application('ui_browser');
const departments=(await app.request('/auth/departments')).data.departments;
const department=departments.find(d=>d.code==='shs').id;
const section=(await app.db.query("INSERT INTO sections(name,grade_level,department_id) VALUES('UI STEM 12','12',$1) RETURNING id",[department])).rows[0].id;
await app.seed('uiadmin@nst.edu.ph','admin');await app.seed('uiteacher@tr.nst.edu.ph','teacher',department);
await app.seed('uistudent@my.nst.edu.ph','student',department,section);
const admin=await app.login('uiadmin@nst.edu.ph');
await app.request('/announcements/general',{token:admin,method:'POST',body:{title:'UI school bulletin',content:'A real General Announcement from the isolated test application.'}});
await app.request('/categories',{token:admin,method:'POST',body:{name:'UI School events'}});
const server=http.createServer(async(req,res)=>{
  if(req.url==='/fixture.jpg'){res.setHeader('Content-Type','image/jpeg');res.end(await readFile(new URL('../fixtures/tiny.jpg',import.meta.url)));return;}
  if(req.url==='/__cleanup'&&req.method==='POST'){await app.cleanup();res.end('Cleaned up test database');server.close();return;}
  const upstream=http.request(app.origin+req.url,{method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end('Isolated test API unavailable');});req.pipe(upstream);
});
server.listen(5056,'127.0.0.1',()=>process.stdout.write('Real isolated UI test API ready on 5056\n'));
