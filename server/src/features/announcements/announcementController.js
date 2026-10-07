import { deliverPublication } from './announcementEmail.js';
import * as repo from './announcementModel.js';
import { audit } from '../audit/auditService.js';
import { nullableId } from '../../shared/utils/academicInput.js';
import { findDepartmentById } from '../academic/departmentModel.js';
import * as b2 from '../../shared/config/b2.js';

const fail = message => { const e=new Error(message);e.status=400;throw e; };
const idFrom = value => { const id=nullableId(value);if(!id)fail('Invalid announcement id.');return id; };
const types=['general','department','class'],statuses=['draft','scheduled','published','archived'];
const targetsFrom = (body,existing=[]) => {
  const result={};
  for(const [key,type,column] of [['section_ids','section','section_id'],['course_ids','course','course_id'],['student_ids','student','student_id']]){
    const input=body[key]===undefined?existing.filter(t=>t.target_type===type).map(t=>t[column]):body[key];
    if(!Array.isArray(input))fail(key+' must be an array.');
    result[key]=[...new Set(input.map(value=>{const id=nullableId(value);if(!id)fail('Invalid target id.');return id;}))];
  }
  if(!Object.values(result).some(ids=>ids.length))fail('Select at least one intended Student, class, or section.');
  return result;
};
const date = value => {
  if(value===null||value==='')return null;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail('Invalid announcement date.');
  return new Date(value).toISOString();
};
async function readFields(body,type,existing) {
  if(body.type!==undefined && body.type!==type)fail('Announcement type cannot be changed.');
  const fields={show_on_tv:type==='general'};
  for(const key of ['title','content']){
    const value=body[key]??existing?.[key];
    if(typeof value!=='string'||!value.trim()||(key==='title'&&value.trim().length>255))fail('Valid title and content are required.');
    fields[key]=value.trim();
  }
  for(const key of ['image_url','b2_key']){
    if(Object.hasOwn(body,key)){
      if(body[key]!==null && typeof body[key]!=='string')fail('Invalid image reference.');
      fields[key]=body[key]||null;
      if(key==='b2_key'&&fields[key]&&!fields[key].startsWith('announcements/')&&fields[key]!==existing?.b2_key)fail('Invalid announcement storage key.');
    }
  }
  for(const key of ['publish_at','expires_at'])fields[key]=body[key]===undefined?existing?.[key]??null:date(body[key]);
  const future=fields.publish_at && new Date(fields.publish_at)>new Date();
  const status=body.status??(existing?.status==='draft'||existing?.status==='archived'?existing.status:future?'scheduled':'published');
  if(!statuses.includes(status))fail('Invalid status.');
  if(status==='scheduled'&&!fields.publish_at)fail('Scheduled announcements require a publication date.');
  fields.status=status==='published'&&future?'scheduled':status;
  if(fields.expires_at && (fields.publish_at || !existing || Object.hasOwn(body,'expires_at')) && new Date(fields.expires_at)<=new Date(fields.publish_at??Date.now()))fail('Expiry must be after publication.');
  if(type==='department'){
    fields.department_id=body.department_id===undefined?existing?.department_id:nullableId(body.department_id);
    if(!fields.department_id||!await findDepartmentById(fields.department_id))fail('Select exactly one valid department.');
  } else {
    if(body.department_id!==undefined&&body.department_id!==null)fail('Only Department Announcements have a department.');
    fields.department_id=null;
  }
  if(type!=='class'&&['student_ids','section_ids','course_ids'].some(key=>body[key]!==undefined))fail('General and Department Announcements do not accept manual targets.');
  return fields;
}
const attach = async row => {
  if(row?.b2_key?.startsWith('announcements/'))row.image_url=await b2.getPresignedUrl(row.b2_key);
  return row;
};
const create = type => async(req,res,next)=>{
  try{
    const fields=await readFields(req.body??{},type);
    const targets=type==='class'?targetsFrom(req.body??{}):undefined;
    if(targets){const error=await repo.validateTargets(targets);if(error)fail(error);}
    const announcement=await repo.saveAnnouncement({fields:{...fields,type,author_id:req.user.id},targets});
    await audit(req,'announcement.create','announcement',announcement.id,{type,status:announcement.status,department_id:announcement.department_id});
    if(announcement.status==='published'){await audit(req,'announcement.publish','announcement',announcement.id,{type});await deliverPublication(announcement.id);}
    res.status(201).json({announcement:await attach(announcement),targets:type==='class'?await repo.getTargets(announcement.id):[]});
  }catch(e){next(e);}
};
export const createGeneralAnnouncement=create('general'),createDepartmentAnnouncement=create('department'),createClassAnnouncement=create('class');
export const listAnnouncements=async(req,res,next)=>{
  try{
    if(req.query.type!==undefined&&!types.includes(req.query.type))fail('Invalid type.');
    if(req.query.status!==undefined&&!statuses.includes(req.query.status))fail('Invalid status.');
    const upcoming=req.query.upcoming==='true';
    if(upcoming&&req.query.status!==undefined)fail('Upcoming cannot be combined with status.');
    const options={user:req.user,type:req.query.type,status:req.query.status,upcoming,
      q:typeof req.query.q==='string'?req.query.q.trim():undefined,
      limit:Math.min(Math.max(parseInt(req.query.limit,10)||50,1),100),offset:Math.max(parseInt(req.query.offset,10)||0,0)};
    const [rows,total]=await Promise.all([repo.listAnnouncements(options),repo.countAnnouncements(options)]);
    res.json({announcements:await Promise.all(rows.map(attach)),total});
  }catch(e){next(e);}
};
export const getAnnouncement=async(req,res,next)=>{
  try{
    const id=idFrom(req.params.id),announcement=await repo.findVisibleById(id,req.user);
    if(!announcement)return res.status(404).json({message:'Announcement not found.'});
    // Students receive the content, never the other recipients' personal information.
    const targets=req.user.role==='student'||announcement.type!=='class'?[]:await repo.getTargets(id);
    res.json({announcement:await attach(announcement),targets});
  }catch(e){next(e);}
};
export const updateAnnouncement=async(req,res,next)=>{
  try{
    const id=idFrom(req.params.id),existing=await repo.findById(id);
    if(!existing)return res.status(404).json({message:'Announcement not found.'});
    if(!repo.canModify(req.user,existing))return res.status(403).json({message:'You cannot edit this announcement.'});
    const fields=await readFields(req.body??{},existing.type,existing);
    if(fields.status==='scheduled' && existing.type!=='class' && String(existing.author_id)!==String(req.user.id))fail('Historical General announcements require immediate Administrator review/publication; original authorship is preserved.');
    const hasTargets=['section_ids','course_ids','student_ids'].some(key=>Object.hasOwn(req.body??{},key));
    const targets=existing.type==='class'&&hasTargets?targetsFrom(req.body,await repo.getTargets(id)):undefined;
    if(targets){const error=await repo.validateTargets(targets);if(error)fail(error);}
    const announcement=await repo.saveAnnouncement({id,fields,targets});
    await audit(req,'announcement.update','announcement',id,{updated_fields:Object.keys(fields)});
    if(existing.status!=='published'&&announcement.status==='published'){await audit(req,'announcement.publish','announcement',id,{type:announcement.type});await deliverPublication(id);}
    res.json({announcement:await attach(announcement),targets:existing.type==='class'?await repo.getTargets(id):[]});
  }catch(e){next(e);}
};
export const tvAnnouncements=async(req,res,next)=>{
  try{
    const limit=Math.min(Math.max(parseInt(req.query.limit,10)||20,1),100);
    const offset=Math.max(parseInt(req.query.offset,10)||0,0);
    const [rows,total]=await Promise.all([repo.listAnnouncements({type:'general',limit,offset}),repo.countAnnouncements({type:'general'})]);
    const announcements=await Promise.all(rows.map(async row=>{
      await attach(row);
      const {id,type,title,content,image_url,created_at,publish_at,expires_at,status}=row;
      return {id,type,title,content,image_url,created_at,publish_at,expires_at,status,display_import:!!row.display_import_key};
    }));
    res.json({announcements,total});
  }catch(e){next(e);}
};
export const deleteAnnouncement=async(req,res,next)=>{
  try{
    const id=idFrom(req.params.id),existing=await repo.findById(id);
    if(!existing)return res.status(404).json({message:'Announcement not found.'});
    if(!repo.canModify(req.user,existing))return res.status(403).json({message:'You cannot archive this announcement.'});
    await repo.saveAnnouncement({id,fields:{status:'archived'}});
    await audit(req,'announcement.archive','announcement',id,{type:existing.type});
    res.json({message:'Announcement archived. Historical content and targets are preserved.'});
  }catch(e){next(e);}
};
export const uploadAnnouncementImage=async(req,res,next)=>{
  try{
    if(!req.file)return res.status(400).json({message:'No image file provided.'});
    const {key}=await b2.uploadBuffer(req.file.buffer,{folder:'announcements',contentType:req.file.mimetype,filename:req.file.originalname});
    res.status(201).json({image_url:await b2.getPresignedUrl(key),b2_key:key});
  }catch(e){next(e);}
};
