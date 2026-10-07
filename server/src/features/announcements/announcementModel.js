import { query, getClient } from '../../shared/config/db.js';

// One predicate serves both list/count and details, including publication windows.
export function visibility(user, params) {
  if (user?.role === 'admin') return "a.type IN ('general','department')";
  const add = value => { params.push(value ?? null); return '$' + params.length; };
  const published = "(a.status = 'published' AND (a.publish_at IS NULL OR a.publish_at <= NOW()) AND (a.expires_at IS NULL OR a.expires_at > NOW()))";
  if (!user) return `(${published} AND a.type = 'general')`;
  const department = add(user.department_id);
  const school = `(a.type = 'general' OR (a.type = 'department' AND a.department_id = ${department}))`;
  if (user.role === 'teacher') return `((${published} AND ${school}) OR (a.type = 'class' AND a.author_id = ${add(user.id)}))`;
  if (user.role !== 'student') return 'FALSE';
  return `(${published} AND (${school} OR (a.type = 'class' AND EXISTS (
    SELECT 1 FROM announcement_targets t WHERE t.announcement_id = a.id AND (
      (t.target_type = 'student' AND t.student_id = ${add(user.id)}) OR
      (t.target_type = 'section' AND t.section_id = ${add(user.section_id)}) OR
      (t.target_type = 'course' AND t.course_id = ${add(user.course_id)})
    )))))`;
}
export function canModify(user, announcement) {
  return (user.role === 'admin' && ['general','department'].includes(announcement.type)) ||
    (user.role === 'teacher' && announcement.type === 'class' && String(user.id) === String(announcement.author_id));
}
const conditions = ({ user, type, status, q, id, upcoming = false } = {}) => {
  const params = [], filters = [visibility(user, params)];
  for (const [field,value] of [['type',type],['status',status],['id',id]]) {
    if (value !== undefined) { params.push(value); filters.push(`a.${field} = $${params.length}`); }
  }
  if (q) { params.push('%'+q+'%'); filters.push(`(a.title ILIKE $${params.length} OR a.content ILIKE $${params.length})`); }
  if (upcoming) filters.push("a.status = 'scheduled' AND a.publish_at > NOW()");
  return { params, where: filters.join(' AND ') };
};
export const listAnnouncements = async (options = {}) => {
  const { params,where } = conditions(options);
  const { rows } = await query(`SELECT a.*, u.full_name AS author_name, d.name AS department_name
    FROM announcements a LEFT JOIN users u ON u.id = a.author_id LEFT JOIN departments d ON d.id = a.department_id
    WHERE ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params,options.limit??50,options.offset??0]);
  return rows;
};
export const countAnnouncements = async options => {
  const { params,where } = conditions(options);
  return (await query(`SELECT COUNT(*)::int AS total FROM announcements a WHERE ${where}`,params)).rows[0].total;
};
export const findById = async id => (await query('SELECT * FROM announcements WHERE id = $1',[id])).rows[0]??null;
export const findVisibleById = async (id,user) => (await listAnnouncements({id,user,limit:1}))[0]??null;
export const getTargets = async id => (await query(`SELECT t.*,s.name AS section_name,c.name AS course_name,
  u.full_name AS student_full_name,u.email AS student_email FROM announcement_targets t
  LEFT JOIN sections s ON s.id = t.section_id LEFT JOIN courses c ON c.id = t.course_id LEFT JOIN users u ON u.id = t.student_id
  WHERE t.announcement_id = $1 ORDER BY t.id`,[id])).rows;
export async function validateTargets(targets) {
  for (const [key,table,student] of [['section_ids','sections',false],['course_ids','courses',false],['student_ids','users',true]]) {
    const ids=targets[key];
    if (!ids.length) continue;
    const count=(await query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE id = ANY($1::bigint[]) ${student?"AND role = 'student' AND is_active = TRUE":''}`,[ids])).rows[0].n;
    if (count!==ids.length) return 'Targets must identify existing sections/classes or active Students.';
  }
  return null;
}
async function replaceTargets(client,id,targets) {
  await client.query('DELETE FROM announcement_targets WHERE announcement_id = $1',[id]);
  for (const [key,type,column] of [['section_ids','section','section_id'],['course_ids','course','course_id'],['student_ids','student','student_id']]) {
    for (const target of targets[key]) await client.query(`INSERT INTO announcement_targets(announcement_id,target_type,${column}) VALUES($1,$2,$3)`,[id,type,target]);
  }
}
const writable=['author_id','type','department_id','title','content','image_url','b2_key','show_on_tv','status','publish_at','expires_at'];
export async function saveAnnouncement({ id, fields, targets }) {
  const client=await getClient();
  try {
    await client.query('BEGIN');
    if (id) await client.query('SELECT id FROM announcements WHERE id = $1 FOR UPDATE',[id]);
    const keys=writable.filter(k=>fields[k]!==undefined),values=keys.map(k=>fields[k]);
    const sql=id
      ? `UPDATE announcements SET ${keys.map((k,i)=>`${k} = $${i+1}`).join(', ')}, updated_at = NOW() WHERE id = $${values.length+1} RETURNING *`
      : `INSERT INTO announcements(${keys.join(', ')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(', ')}) RETURNING *`;
    const announcement=(await client.query(sql,id?[...values,id]:values)).rows[0];
    if(targets) await replaceTargets(client,announcement.id,targets);
    await client.query('COMMIT'); return announcement;
  } catch(e){await client.query('ROLLBACK');throw e;} finally {client.release();}
}
// Shared recipient resolver used by the backend publication email service.
export const resolveRecipients = async id => (await query(`SELECT DISTINCT u.id,u.email,u.full_name
  FROM users u JOIN announcements a ON a.id = $1 WHERE u.is_active = TRUE AND (
    (a.type = 'general' AND u.role = 'student') OR
    (a.type = 'department' AND u.role IN ('student','teacher') AND u.department_id = a.department_id) OR
    (a.type = 'class' AND u.role = 'student' AND EXISTS (SELECT 1 FROM announcement_targets t WHERE t.announcement_id = a.id AND (
      (t.target_type = 'student' AND t.student_id = u.id) OR
      (t.target_type = 'section' AND t.section_id = u.section_id) OR
      (t.target_type = 'course' AND t.course_id = u.course_id)
    )))
  ) AND ((u.role = 'student' AND lower(u.email) ~ '^[^@[:space:]]+@my[.]nst[.]edu[.]ph$') OR
    (u.role = 'teacher' AND lower(u.email) ~ '^[^@[:space:]]+@tr[.]nst[.]edu[.]ph$')) ORDER BY u.id`,[id])).rows;
export const publishDueAnnouncements = async () => (await query(`UPDATE announcements a SET status = 'published',updated_at = NOW()
  WHERE status = 'scheduled' AND publish_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
    AND EXISTS (SELECT 1 FROM users author WHERE author.id = a.author_id AND author.is_active = TRUE
      AND ((a.type IN ('general','department') AND author.role = 'admin') OR (a.type = 'class' AND author.role = 'teacher')))
  RETURNING a.id,a.type,a.author_id`)).rows;
