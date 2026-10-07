import * as users from './userModel.js';
import { hashPassword } from '../../shared/utils/password.js';
import { isRoleEmail,normalizeEmail } from '../../shared/utils/nstEmail.js';
import { readMembership,nullableId,validPassword } from '../../shared/utils/academicInput.js';
import { validateMembership } from '../academic/departmentModel.js';
import { parseId } from '../../shared/utils/parseId.js';
import { normalizeLimit,normalizeOffset } from '../../shared/utils/normalize.js';
import { audit } from '../audit/auditService.js';

export const listUsers=async(req,res,next)=>{try{
  const role=['admin','teacher','student'].includes(req.query.role)?req.query.role:undefined;
  const options={role,search:typeof req.query.search==='string'?req.query.search.trim():undefined,department_id:nullableId(req.query.department_id),limit:normalizeLimit(req.query.limit),offset:normalizeOffset(req.query.offset)};
  res.json({users:await users.listUsers(options),total:await users.countUsers(options)});
}catch(error){next(error);}};
export const searchStudents=async(req,res,next)=>{try{
  const q=typeof req.query.q==='string'?req.query.q.trim():'';
  if(!q)return res.status(400).json({message:'q is required.'});
  res.json({students:await users.searchStudents({q,limit:req.query.limit})});
}catch(error){next(error);}};
export const getUser=async(req,res,next)=>{try{
  const id=parseId(req.params.id);if(id===null)return res.status(400).json({message:'Invalid user id.'});
  const user=await users.findById(id);if(!user)return res.status(404).json({message:'User not found.'});
  res.json({user});
}catch(error){next(error);}};
export const createUser=async(req,res,next)=>{try{
  const body=req.body??{},role=body.role,email=normalizeEmail(body.email),full_name=typeof body.full_name==='string'?body.full_name.trim():'';
  if(!['student','teacher'].includes(role))return res.status(400).json({message:'Only Student and Teacher accounts can be created here.'});
  if(!full_name || full_name.length>150 || !isRoleEmail(email,role) || !validPassword(body.password)) return res.status(400).json({message:'Valid name, official role email, and password are required.'});
  const membership=readMembership(body),error=await validateMembership({role,...membership});
  if(error)return res.status(400).json({message:error});
  if(await users.findByEmail(email))return res.status(409).json({message:'Email already exists.'});
  const user=await users.createUser({email,full_name,role,...membership,password_hash:await hashPassword(body.password)});
  await audit(req,'user.create','user',user.id,{role,...membership});
  res.status(201).json({user});
}catch(error){if(error.code==='23505')return res.status(409).json({message:'Account already exists.'});next(error);}};
export const updateUser=async(req,res,next)=>{try{
  const id=parseId(req.params.id);if(id===null)return res.status(400).json({message:'Invalid user id.'});
  const existing=await users.findById(id);if(!existing)return res.status(404).json({message:'User not found.'});
  const body=req.body??{},role=body.role??existing.role;
  if(!['admin','student','teacher'].includes(role))return res.status(400).json({message:'Invalid role.'});
  if((existing.role==='admin' && role!=='admin') || (existing.role!=='admin' && role==='admin'))return res.status(400).json({message:'The centralized Administrator role cannot be granted or removed here.'});
  if(!isRoleEmail(existing.email,role))return res.status(400).json({message:'Email domain does not match the role.'});
  if(body.password!==undefined || body.email!==undefined && normalizeEmail(body.email)!==existing.email) return res.status(400).json({message:'Use Account to change passwords. Email changes are not supported.'});
  const membership=readMembership(body,existing);
  const error=await validateMembership({role,...membership},{allowUnassigned:!existing.department_id && body.department_id===undefined && String(membership.section_id)===String(existing.section_id) && String(membership.course_id)===String(existing.course_id)});
  if(error)return res.status(400).json({message:error});
  const fields={role,...membership};
  if(body.full_name!==undefined){if(typeof body.full_name!=='string'||!body.full_name.trim()||body.full_name.trim().length>150)return res.status(400).json({message:'Invalid name.'});fields.full_name=body.full_name.trim();}
  const user=await users.updateUser(id,fields);await audit(req,'user.update','user',id,{
    role, updated_fields:Object.keys(fields), ...membership,
    previous_department_id:existing.department_id, previous_section_id:existing.section_id, previous_course_id:existing.course_id,
  });res.json({user});
}catch(error){next(error);}};
const setStatus=active=>async(req,res,next)=>{try{
  const id=parseId(req.params.id);if(id===null)return res.status(400).json({message:'Invalid user id.'});
  const existing=await users.findById(id);if(!existing)return res.status(404).json({message:'User not found.'});
  if(existing.role==='admin')return res.status(400).json({message:'The centralized Administrator cannot be deactivated here.'});
  const user=await(active?users.activateUser(id):users.deactivateUser(id));
  await audit(req,active?'user.activate':'user.deactivate','user',id,null);res.json({user});
}catch(error){next(error);}};
export const activateUser=setStatus(true);
export const deactivateUser=setStatus(false);
