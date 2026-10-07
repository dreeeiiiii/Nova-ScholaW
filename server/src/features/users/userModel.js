import { query } from '../../shared/config/db.js';

const PUBLIC_COLUMNS = 'id, email, full_name, role, section_id, course_id, department_id, student_level, section_course, is_active, last_login_at, created_at, updated_at';
const editable = ['full_name', 'role', 'section_id', 'course_id', 'department_id'];
export const findById = async id => (await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id=$1`, [id])).rows[0] ?? null;
export const findByEmail = async email => (await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE email=$1`, [email])).rows[0] ?? null;
export const findByEmailWithHash = async email => (await query(`SELECT ${PUBLIC_COLUMNS}, password_hash, token_version FROM users WHERE email=$1`, [email])).rows[0] ?? null;
export const findByIdWithHash = async id => (await query('SELECT id,password_hash,token_version FROM users WHERE id=$1', [id])).rows[0] ?? null;
export const findByIdWithJoins = async id => (await query(
  `SELECT u.id,u.email,u.full_name,u.role,u.section_id,u.course_id,u.department_id,u.is_active,u.last_login_at,u.created_at,
    s.name AS section_name,c.name AS course_name,d.name AS department_name
    FROM users u LEFT JOIN sections s ON s.id=u.section_id LEFT JOIN courses c ON c.id=u.course_id
    LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=$1`, [id]
)).rows[0] ?? null;

const filter = ({role,search,department_id}={}) => {
  const conditions=[], params=[];
  if(role){params.push(role);conditions.push(`u.role=$${params.length}`);}
  if(department_id){params.push(department_id);conditions.push(`u.department_id=$${params.length}`);}
  if(search){params.push('%'+search+'%');conditions.push(`(u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);}
  return {where:conditions.length?'WHERE '+conditions.join(' AND '):'',params};
};
export const listUsers = async (options={}) => {
  const {where,params}=filter(options); params.push(options.limit??50, options.offset??0);
  return (await query(`SELECT u.id,u.email,u.full_name,u.role,u.section_id,u.course_id,u.department_id,u.is_active,u.last_login_at,u.created_at,u.updated_at,
    s.name AS section_name,c.name AS course_name,d.name AS department_name
    FROM users u LEFT JOIN sections s ON s.id=u.section_id LEFT JOIN courses c ON c.id=u.course_id LEFT JOIN departments d ON d.id=u.department_id
    ${where} ORDER BY u.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params)).rows;
};
export const countUsers = async options => {
  const {where,params}=filter(options);
  return (await query(`SELECT COUNT(*)::int AS total FROM users u ${where}`,params)).rows[0].total;
};
export const createUser = async ({email,password_hash,full_name,role,section_id=null,course_id=null,department_id=null,student_level=null,section_course=null}, db={query}) =>
  (await db.query(`INSERT INTO users(email,password_hash,full_name,role,section_id,course_id,department_id,student_level,section_course)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${PUBLIC_COLUMNS}`,
  [email,password_hash,full_name,role,section_id,course_id,department_id,student_level,section_course])).rows[0];
export const updateUser = async (id, fields={}) => {
  const params=[],sets=[];
  for(const field of editable) if(fields[field]!==undefined){params.push(fields[field]);sets.push(`${field}=$${params.length}`);}
  if(!sets.length)return findById(id);
  params.push(id);
  return (await query(`UPDATE users SET ${sets.join(',')},updated_at=NOW() WHERE id=$${params.length} RETURNING ${PUBLIC_COLUMNS}`,params)).rows[0]??null;
};
const setActive = async (id,active) => (await query(`UPDATE users SET is_active=$2,token_version=CASE WHEN $2 THEN token_version ELSE token_version+1 END,updated_at=NOW() WHERE id=$1 RETURNING ${PUBLIC_COLUMNS}`,[id,active])).rows[0]??null;
export const activateUser = id => setActive(id,true);
export const deactivateUser = id => setActive(id,false);
export const updateLastLogin = id => query('UPDATE users SET last_login_at=NOW() WHERE id=$1',[id]);
export const changePassword = async (id, hash, version) => (await query(
  'UPDATE users SET password_hash=$2,token_version=token_version+1,updated_at=NOW() WHERE id=$1 AND token_version=$3 RETURNING id',
  [id,hash,version]
)).rows[0]??null;
export const searchStudents = async ({q,limit=20}) => (await query(
  "SELECT id,full_name,email,section_id,course_id,department_id FROM users WHERE role='student' AND is_active=TRUE AND (full_name ILIKE $1 OR email ILIKE $1) ORDER BY full_name LIMIT $2",
  ['%'+q+'%',Math.min(Math.max(Number(limit)||20,1),50)]
)).rows;
