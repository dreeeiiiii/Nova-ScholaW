// Disposable browser-test API. No database, email, B2, or external network calls.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const departments = [{id:1,name:'College'},{id:2,name:'Senior High School'},{id:3,name:'Junior High School'}];
const sections = [{id:1,name:'STEM 12 – Curie',grade_level:'12',student_count:24,department_id:2}];
const userFor = role => ({id: role==='admin'?1:role==='teacher'?2:3,full_name:`Nova ${role}`,email:`${role}@${role==='student'?'my.':role==='teacher'?'tr.':''}nst.edu.ph`,role,department_id:2,department_name:'Senior High School',section_id:1,section_name:sections[0].name,course_id:null,is_active:true});
const announcements = ['general','department','class'].map((type,i)=>({id:i+1,title:['A new chapter begins','Senior High School assembly','Class project reminders'][i],content:'Keep up with school life. Read the details carefully and reach out to your teacher if you have questions. This announcement contains a longer message to exercise readable previews and detail views on small screens.',type,author_id:2,author_name:'Nova teacher',created_at:'2026-10-07T00:00:00Z',status:'published'}));
const media = ['pending','approved','rejected'].map((status,i)=>({id:i+1,title:`Campus moment ${i+1}`,caption:`Campus moment ${i+1}`,file_url:'http://127.0.0.1:5055/fixture.jpg',media_type:'image',original_filename:'school-event.jpg',category_id:1,category_name:'School events',uploader_id:3,uploader_name:'Nova student',uploader_email:'student@my.nst.edu.ph',created_at:'2026-10-07T00:00:00Z',status,rejection_reason:status==='rejected'?'Please choose a clearer school event image.':null}));
const writes=[];
const server=http.createServer(async (req,res)=>{
 try {
  const url=new URL(req.url,'http://127.0.0.1:5055');
  const path=url.pathname;
  res.setHeader('Access-Control-Allow-Origin','*');
  if(path==='/fixture.jpg'){res.setHeader('Content-Type','image/jpeg');res.end(await readFile(new URL('../fixtures/tiny.jpg',import.meta.url)));return;}
  let raw='';for await(const chunk of req)raw+=chunk;
  let body={};try{body=JSON.parse(raw);}catch{}
  const role=(req.headers.authorization||'').replace('Bearer ui-','');
  const reply=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(path==='/__writes'){reply(writes);return;}
  if(path==='/api/auth/login'){const role=body.email?.split('@')[0];if(!['admin','teacher','student'].includes(role)||body.password!=='UiTest123!'){reply({message:'Invalid email or password.'},401);return;}reply({token:`ui-${role}`,user:userFor(role)});return;}
  if(path==='/api/auth/me'){if(!['admin','teacher','student'].includes(role)){reply({message:'Unauthorized'},401);return;}reply({user:userFor(role)});return;}
  if(req.method!=='GET'){writes.push({path,method:req.method,body,contentType:req.headers['content-type'],bytes:raw.length});reply({message:'Saved successfully.',id:999,announcement:{...announcements[2],...body,id:999},media:{...media[0],id:999},category:{id:999,...body},section:{id:999,...body}});return;}
  if(path==='/api/auth/departments'||path==='/api/departments'){reply({departments});return;}
  if(path.includes('sections')){reply({sections});return;}
  if(path==='/api/courses'){reply({courses:[{id:1,name:'STEM',student_count:24}]});return;}
  if(path==='/api/categories'){reply({categories:[{id:1,name:'School events',description:'Campus life',media_count:2}]});return;}
  if(path==='/api/users/students/search'){reply({students:[userFor('student')]});return;}
  if(path==='/api/users'){reply({users:[userFor(url.searchParams.get('role')||'student')],total:1});return;}
  if(path==='/api/dashboard/stats'){reply({users:{total:30,admin:1,teacher:5,student:24},announcements:{total:3,general:1,department:1,class:1},gallery:{total:3,pending:1,approved:1,rejected:1}});return;}
  if(path==='/api/audit-logs'){reply({logs:[{id:1,user_name:'Nova teacher',user_email:'teacher@tr.nst.edu.ph',action:'announcement.create',entity_type:'announcement',entity_id:3,details:{type:'class',title:'Class project reminders'},ip_address:'127.0.0.1',created_at:'2026-10-07T00:00:00Z'}],total:1});return;}
  if(path.startsWith('/api/announcements/')){if(path.endsWith('public')||path.endsWith('tv'))reply({announcements:announcements.filter(a=>a.type==='general')});else reply({announcement:announcements.find(a=>String(a.id)===path.split('/').at(-1))||announcements[2],targets:[]});return;}
  if(path==='/api/announcements'){const type=url.searchParams.get('type');const rows=url.searchParams.get('upcoming')?[]:announcements.filter(a=>!type||a.type===type);reply({announcements:rows,total:rows.length});return;}
  if(path.startsWith('/api/gallery')){const rows=path.endsWith('pending')?media.filter(m=>m.status==='pending'):path.endsWith('mine')||path.endsWith('recent')?media:media.filter(m=>m.status==='approved');reply({media:rows,total:rows.length});return;}
  reply({message:`Unhandled UI fixture route: ${path}`},404);
 }catch(error){res.writeHead(500);res.end(String(error));}
});
server.listen(5055,'127.0.0.1',()=>process.stdout.write('Isolated UI fixture API ready on 5055\n'));
