import { getClient } from '../../shared/config/db.js';
import { registrationOptions, resolveRegistrationSection } from '../academic/registrationSection.js';
import { signToken } from '../../shared/utils/jwt.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { getRoleEmailDomain,isRoleEmail,normalizeEmail } from '../../shared/utils/nstEmail.js';
import { nullableId,readMembership,validPassword } from '../../shared/utils/academicInput.js';
import { audit } from '../audit/auditService.js';
import * as users from '../users/userModel.js';
import { listDepartments,validateMembership } from '../academic/departmentModel.js';

export const login = async (req,res,next) => {
  try {
    const email=normalizeEmail(req.body?.email),password=req.body?.password;
    if(!email || typeof password!=='string' || !password) return res.status(400).json({message:'Email and password are required.'});
    const user=await users.findByEmailWithHash(email);
    if(!user || !await comparePassword(password,user.password_hash) || !isRoleEmail(email,user.role)) {
      await audit(req,'auth.login_failure','auth',null,{email});
      return res.status(401).json({message:'Invalid email or password.'});
    }
    if(!user.is_active) return res.status(403).json({message:'This account has been deactivated. Please contact the administrator.'});
    await users.updateLastLogin(user.id);
    await audit({...req,user},'auth.login_success','auth',user.id,{email});
    const token=signToken({userId:user.id,role:user.role,version:user.token_version});
    const {password_hash:_hash,token_version:_version,...safe}=user;
    return res.json({token,user:{...safe,last_login_at:new Date().toISOString()}});
  } catch(error){next(error);}
};
export const me = async (req,res,next) => {
  try {res.json({user:await users.findByIdWithJoins(req.user.id)});} catch(error){next(error);}
};
export const logout = (_req,res) => res.json({message:'Logged out. Discard the client token.'});
export const register = async (req,res,next) => {
  try {
    const body=req.body??{},role=body.role??'student';
    if(!['student','teacher'].includes(role)) return res.status(400).json({message:'Public registration is available only to Students and Teachers.'});
    const email=normalizeEmail(body.email),full_name=typeof body.full_name==='string'?body.full_name.trim():'';
    if(!full_name || full_name.length>100) return res.status(400).json({message:'Full name must be between 1 and 100 characters.'});
    if(!isRoleEmail(email,role)) return res.status(400).json({message:`Use an @${getRoleEmailDomain(role)} email for this role.`});
    if(!validPassword(body.password)) return res.status(400).json({message:'Password must contain at least 8 characters and no more than 72 UTF-8 bytes.'});
    const membership=readMembership(body);
    let user, resolved;
    if(role==='student') {
      const password_hash=await hashPassword(body.password);
      const client=await getClient();
      try {
        await client.query('BEGIN');
        resolved=await resolveRegistrationSection(client,membership,body);
        membership.section_id=resolved.section.id;
        user=await users.createUser({email,full_name,role,...membership,password_hash},client);
        await client.query('COMMIT');
      } catch(error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
      if(resolved.created) await audit({...req,user},'section.created_during_registration','section',resolved.section.id,{
        section_name:resolved.section.name,department_id:membership.department_id,course_id:membership.course_id,grade_level:resolved.section.grade_level,
      });
    } else {
      const error=await validateMembership({role,...membership});
      if(error) return res.status(400).json({message:error});
      if(body.new_section_name!==undefined) return res.status(400).json({message:'Only Students may create a section during registration.'});
      if(await users.findByEmail(email)) return res.status(409).json({message:'Email already registered.'});
      user=await users.createUser({email,full_name,role,...membership,password_hash:await hashPassword(body.password)});
    }
    await audit(req,'users.register','user',user.id,{role,department_id:membership.department_id});
    return res.status(201).json({message:'Account created. You can now log in.'});
  } catch(error){if(error.status===400)return res.status(400).json({message:error.message});if(error.code==='23505')return res.status(409).json({message:'Email already registered.'});next(error);}
};
export const listRegistrationDepartments = async (_req,res,next) => {
  try {res.json({departments:await listDepartments()});} catch(error){next(error);}
};
export const listSections = async (req,res,next) => {
  try {
    const id=nullableId(req.query.department_id);
    if(!id)return res.status(400).json({message:'department_id is required.'});
    const options=await registrationOptions(id);
    const courseId=nullableId(req.query.course_id);
    if(courseId && !options.courses.some(c=>String(c.id)===String(courseId))) return res.status(400).json({message:'Invalid course for this department.'});
    const grade=typeof req.query.grade_level==='string'?req.query.grade_level.trim().replace(/\s+/g,' '):'';
    res.json({...options,sections:grade?options.sections.filter(s=>s.grade_level.trim().replace(/\s+/g,' ').toLowerCase()===grade.toLowerCase()):options.sections});
  } catch(error){next(error);}
};
export const changePassword = async (req,res,next) => {
  try {
    const {current_password,new_password}=req.body??{};
    if(typeof current_password!=='string' || !validPassword(new_password)) return res.status(400).json({message:'Current password and a valid new password are required.'});
    const user=await users.findByIdWithHash(req.user.id);
    if(!user || !await comparePassword(current_password,user.password_hash)) return res.status(400).json({message:'Current password is incorrect.'});
    if(current_password===new_password)return res.status(400).json({message:'Choose a different new password.'});
    if(!await users.changePassword(user.id,await hashPassword(new_password),user.token_version)) return res.status(409).json({message:'Password changed concurrently. Sign in again.'});
    await audit(req,'auth.password_change','user',user.id,null);
    res.json({message:'Password changed. Sign in again.'});
  } catch(error){next(error);}
};
