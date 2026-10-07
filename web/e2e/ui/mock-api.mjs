// Disposable browser-test API. No database, email, B2, or external network calls.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const departments = [{id:1,name:'College'},{id:2,name:'Senior High School'},{id:3,name:'Junior High School'}];
const sections = [{id:1,name:'STEM 12 – Curie',grade_level:'12',student_count:24,department_id:2}];
const userFor = role => ({id: role==='admin'?1:role==='teacher'?2:3,full_name:`Nova ${role}`,email:`${role}@${role==='student'?'my.':role==='teacher'?'tr.':''}nst.edu.ph`,role,department_id:2,department_name:'Senior High School',section_id:1,section_name:sections[0].name,course_id:null,is_active:true});
const defaultAnnouncements = ['general','department','class'].map((type,i)=>({id:i+1,title:['A new chapter begins','Senior High School assembly','Class project reminders'][i],content:'Keep up with school life. Read the details carefully and reach out to your teacher if you have questions. This announcement contains a longer message to exercise readable previews and detail views on small screens.',type,author_id:2,author_name:'Nova teacher',created_at:'2026-10-07T00:00:00Z',status:'published'}));
let announcements = defaultAnnouncements;
const displayRecords = JSON.parse(await readFile(new URL("../../../server/scripts/data/display-announcements.json", import.meta.url), "utf8"));
const displayFeed = displayRecords.map((a,i) => ({ ...a, id:100+i, type:"general", author_id:1, author_name:"Nova admin", display_import:true, display_import_key:a.key, created_at:(a.source_date||"2026-10-08")+"T00:00:00Z", publish_at:a.source_date?a.source_date+"T00:00:00Z":null }));
let media = ['pending','approved','rejected'].map((status,i)=>({id:i+1,title:`Campus moment ${i+1}`,caption:`Campus moment ${i+1}`,file_url:'http://127.0.0.1:5055/fixture.jpg',media_type:'image',original_filename:'school-event.jpg',category_id:1,category_name:'School events',uploader_id:3,uploader_name:'Nova student',uploader_email:'student@my.nst.edu.ph',created_at:'2026-10-07T00:00:00Z',status,rejection_reason:status==='rejected'?'Please choose a clearer school event image.':null}));
const defaultMedia = media;
const nstRecords = JSON.parse(await readFile(new URL("../../../server/scripts/data/nst-gallery.json", import.meta.url), "utf8"));
const nstMedia = nstRecords.map((r,i)=>({...defaultMedia[1],id:900+i,caption:r.caption,original_filename:r.filename,file_url:r.localPath,b2_key:"gallery/ui-only-"+r.filename,category_name:r.category,status:"approved",reviewed_by:1,uploader_id:1,uploader_name:"Nova admin",uploader_email:"admin@nst.edu.ph",created_at:"2026-10-08T00:00:00Z"}));
const writes=[];
let galleryEmpty = false;
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
  // Disposable visual-test toggle; never backed by production data or storage.
  if(path==='/__gallery-nst' && req.method==='POST'){media=body.enabled?nstMedia:defaultMedia;galleryEmpty=false;reply({count:media.length});return;}
  if(path==='/__gallery-empty' && req.method==='POST'){galleryEmpty=body.empty===true;reply({empty:galleryEmpty});return;}
  if(path==='/__tv-feed' && req.method==='POST'){announcements=body.mode==='empty'?[]:body.mode==='display'?displayFeed:body.mode==='mixed'?[{...displayFeed[0],image_url:null},...displayFeed.slice(1),{...displayFeed[0],id:301,title:"Future scheduled demo",status:"scheduled",publish_at:"2099-01-01T00:00:00Z"},{...displayFeed[0],id:302,title:"Expired demo",expires_at:"2020-01-01T00:00:00Z"},...defaultAnnouncements.filter(a=>a.type!=='general')]:defaultAnnouncements;reply({count:announcements.length});return;}
  if(path==='/__writes'){reply(writes);return;}
  if(path==='/api/auth/login'){const role=body.email?.split('@')[0];if(!['admin','teacher','student'].includes(role)||body.password!=='UiTest123!'){reply({message:'Invalid email or password.'},401);return;}reply({token:`ui-${role}`,user:userFor(role)});return;}
  if(path==='/api/auth/me'){if(!['admin','teacher','student'].includes(role)){reply({message:'Unauthorized'},401);return;}reply({user:userFor(role)});return;}
  if(req.method!=='GET'){writes.push({path,method:req.method,body,contentType:req.headers['content-type'],bytes:raw.length});reply({message:'Saved successfully.',id:999,announcement:{...announcements[2],...body,id:999},media:{...media[0],id:999},category:{id:999,...body},section:{id:999,...body}});return;}
  if(path==='/api/auth/departments'||path==='/api/departments'){reply({departments});return;}
  if(path==='/api/auth/sections'){const departmentId=Number(url.searchParams.get('department_id'));reply({sections:sections.filter(s=>s.department_id===departmentId),courses:departmentId===2?[{id:1,name:'STEM',code:'STEM'},{id:2,name:'ABM',code:'ABM'}]:[],levels:departmentId===2?['Grade 11','Grade 12','12']:['1st Year','2nd Year']});return;}
  if(path.includes('sections')){reply({sections});return;}
  if(path==='/api/courses'){reply({courses:[{id:1,name:'STEM',student_count:24}]});return;}
  if(path==='/api/categories'){reply({categories:[{id:1,name:'School events',description:'Campus life',media_count:2}]});return;}
  if(path==='/api/users/students/search'){reply({students:[userFor('student')]});return;}
  if(path==='/api/users'){reply({users:[userFor(url.searchParams.get('role')||'student')],total:1});return;}
  if(path==='/api/dashboard/stats'){reply({users:{total:30,admin:1,teacher:5,student:24},announcements:{total:3,general:1,department:1,class:1},gallery:{total:3,pending:1,approved:1,rejected:1}});return;}
  if(path==='/api/audit-logs'){reply({logs:[{id:1,user_name:'Nova teacher',user_email:'teacher@tr.nst.edu.ph',action:'announcement.create',entity_type:'announcement',entity_id:3,details:{type:'class',title:'Class project reminders'},ip_address:'127.0.0.1',created_at:'2026-10-07T00:00:00Z'}],total:1});return;}
  if(path.startsWith('/api/announcements/')){if(path.endsWith('public')||path.endsWith('tv')){const rows=announcements.filter(a=>a.type==='general');const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||100);reply({announcements:rows.slice(offset,offset+limit),total:rows.length});}else reply({announcement:announcements.find(a=>String(a.id)===path.split('/').at(-1))||announcements[2],targets:[]});return;}
  if(path==='/api/announcements'){const type=url.searchParams.get('type');const rows=url.searchParams.get('upcoming')?[]:announcements.filter(a=>!type||a.type===type);reply({announcements:rows,total:rows.length});return;}
  if(path.startsWith('/api/gallery')){const rows=path.endsWith('pending')?media.filter(m=>m.status==='pending'):path.endsWith('mine')||path.endsWith('recent')?media:galleryEmpty?[]:media.filter(m=>m.status==='approved');const offset=Number(url.searchParams.get("offset")||0),limit=Number(url.searchParams.get("limit")||100);reply({media:rows.slice(offset,offset+limit),total:rows.length});return;}
  reply({message:`Unhandled UI fixture route: ${path}`},404);
 }catch(error){res.writeHead(500);res.end(String(error));}
});
server.listen(5055,'127.0.0.1',()=>process.stdout.write('Isolated UI fixture API ready on 5055\n'));
